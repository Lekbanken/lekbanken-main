# Auth/Tenant Implementation TODO

**Status:** Active  
**Created:** 2025-12-15  
**Goal:** Fix auth, authorization, and multi-tenant architecture across all surfaces  

---

## Pre-Flight Checklist

Before starting, verify these are complete:

- [ ] **Migration applied:** `supabase/migrations/20251215000000_fix_profile_sync_on_update.sql`
- [ ] **Backup current state:** `git checkout -b auth-redesign-backup`
- [ ] **Create working branch:** `git checkout -b feature/auth-redesign`

---

## Phase 1: Foundation (Days 1-2)

### 1.1 Create Type Definitions

**File:** `types/auth.ts` (create new)

```typescript
export type GlobalRole = 'system_admin' | 'private_user' | 'demo_private_user' | 'member';
export type TenantRole = 'owner' | 'admin' | 'editor' | 'member';

export interface AuthContext {
  user: User | null;
  profile: UserProfile | null;
  effectiveGlobalRole: GlobalRole | null;
  memberships: TenantMembership[];
  activeTenant: Tenant | null;
  activeTenantRole: TenantRole | null;
}
```

- [ ] **1.1.1** Create `types/auth.ts` with GlobalRole, TenantRole, Permission types
- [ ] **1.1.2** Create `types/tenant.ts` with TenantMembership, TenantResolution types
- [ ] **1.1.3** Update `types/index.ts` to export new types

---

### 1.2 Create Server Auth Context Helper

**File:** `lib/auth/server-context.ts` (create new)

- [ ] **1.2.1** Create `getServerAuthContext()`:
  - Uses `createServerRlsClient()`
  - If no user → return nulls
  - Fetch profile + memberships in parallel
  - Resolve `effectiveGlobalRole`
  - Resolve tenant server-side (path override `/app/t/[tenantId]`, httpOnly signed `lb_tenant`, fallback primary/first membership) and set `activeTenant` + `activeTenantRole`
- [ ] **1.2.2** Create `deriveEffectiveGlobalRole(profile, user): GlobalRole | null`  
  Priority: `profile.global_role` → `user.app_metadata.role === 'system_admin'` → legacy `profile.role in (superadmin|admin) => system_admin` → otherwise **null** (not `private_user`) for unresolved.
- [ ] **1.2.3** Create `lib/auth/index.ts` barrel export

---

### 1.3 Create Tenant Resolution Helper

**File:** `lib/tenant/resolver.ts` (create new)

- [ ] **1.3.1** `resolveTenant(request, memberships, cookieStore)`:
  1) Path override `/app/t/[tenantId]/...`
  2) Signed httpOnly cookie `lb_tenant` (`lib/utils/tenantCookie.ts`)
  3) Memberships: primary > single > picker/no-access
  Returns `{ tenantId, source, redirect?, clearCookie? }`
- [ ] **1.3.2** `validateTenantAccess(memberships, tenantId)` → bool + redirect target
- [ ] **1.3.3** `lib/tenant/index.ts` barrel export

---

## Phase 2: Middleware (Days 3-4)

### 2.1 Create/enable middleware

**File:** `middleware.ts` (replace `proxy.ts` usage so Next actually runs it)

- [ ] **2.1.1** Rename/replace `proxy.ts` with `middleware.ts`.
- [ ] **2.1.2** Matcher:
  ```typescript
  export const config = {
    matcher: [
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
  };
  ```

### 2.2 Auth + guest-only checks (claims only; no DB in middleware)

- [ ] **2.2.1** Use `@supabase/ssr` to read session; do NOT query DB (edge-safe).
- [ ] **2.2.2** Unauth on `/app/*` or `/admin/*` → redirect to `/auth/login?redirect=...`.
- [ ] **2.2.3** Guest-only `/auth/login|/auth/signup` (exclude `/auth/callback`, `/auth/signout`, `/auth/recovery`) → if authenticated, redirect to `/app`.

### 2.3 Admin gate (claims-based)

- [ ] **2.3.1** Derive role from JWT claims only (`app_metadata.role === 'system_admin'` or `global_role` claim). If not system_admin and path starts `/admin`, redirect to `/app`.

### 2.4 Tenant resolution + headers (httpOnly, signed cookie)

- [ ] **2.4.1** Use lightweight `resolveTenantForMiddleware(request, user)`:
  - Path override `/app/t/[tenantId]/...`
  - Signed httpOnly `lb_tenant` via `lib/utils/tenantCookie.ts`
  - Fallback to claim-based memberships/primary if available (no DB)
  - Return `{ tenantId, source, redirect?, clearCookie? }`
- [ ] **2.4.2** If tenantId resolved, set `x-tenant-id` header and refresh `lb_tenant` httpOnly signed cookie.
- [ ] **2.4.3** If invalid/absent and multiple memberships → redirect `/app/select-tenant`; if none → `/app/no-access`.

### 2.5 Helpers for middleware

- [ ] **2.5.1** Create `lib/auth/middleware-helpers.ts`:
  - `deriveEffectiveGlobalRoleFromClaims(token)`
  - `resolveTenantForMiddleware(request, user)`
- [ ] **2.5.2** Import helpers into `middleware.ts`.

---

## Phase 3: Update AuthProvider (Days 5-6)

### 3.1 Refactor AuthProvider for Server Hydration

**File:** `lib/supabase/auth.tsx`

- [ ] **3.1.1** Props for initial server data:
  ```typescript
  interface AuthProviderProps {
    children: ReactNode;
    initialUser?: User | null;
    initialProfile?: UserProfile | null;
    initialMemberships?: TenantMembership[];
  }
  ```
- [ ] **3.1.2** State init:
  ```typescript
  const [user, setUser] = useState(initialUser ?? null);
  const [userProfile, setUserProfile] = useState(initialProfile ?? null);
  const [memberships, setMemberships] = useState(initialMemberships ?? []);
  const [isLoading, setIsLoading] = useState(initialUser === undefined);
  ```
  `isLoading` should become `false` immediately if server provided data.
- [ ] **3.1.3** `effectiveGlobalRole = useMemo(() => deriveEffectiveGlobalRole(userProfile, user), [userProfile, user])`
- [ ] **3.1.4** Init logic: skip `initAuth()` if `initialUser` is provided; still allow a “fill gaps” fetch if profile missing.
- [ ] **3.1.5** `onAuthStateChange`: handle SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED only; skip INITIAL_SESSION.
- [ ] **3.1.6** Deprecate `userRole`, expose `effectiveGlobalRole` + `memberships`; keep alias `userRole` temporarily for compatibility.
- [ ] **3.1.7** Export `AuthContext` type and `deriveEffectiveGlobalRole`.

### 3.2 Update TenantProvider for Server Hydration

**File:** `lib/context/TenantContext.tsx` (or new `lib/tenant/TenantContext.tsx`)

- [ ] **3.2.1** Props: `initialTenant?: Tenant | null`, `initialRole?: TenantRole | null`, `initialMemberships?: TenantMembership[]`
- [ ] **3.2.2** Skip `resolveCurrentTenant` when initial tenant provided; keep ability to refresh on SIGNED_IN.
- [ ] **3.2.3** Expose `tenantRole` in context and keep memberships in sync with AuthProvider state.

---

## Phase 4: Root Providers (Day 7)

### 4.1 Server wrapper for providers

Current `app/providers.tsx` is a client component; it cannot be async.

- [ ] **4.1.1** Create `app/server-providers.tsx` (server component):
  ```typescript
  export default async function ServerProviders({ children }: { children: ReactNode }) {
    const authContext = await getServerAuthContext();
    return (
      <AuthProvider
        initialUser={authContext.user}
        initialProfile={authContext.profile}
        initialMemberships={authContext.memberships}
      >
        {children}
      </AuthProvider>
    );
  }
  ```
- [ ] **4.1.2** Update `app/layout.tsx` to use `ServerProviders` (or fetch auth context in layout and pass as props to a client Providers).
- [ ] **4.1.3** Ensure TenantProvider gets initial tenant from server context (layout-level or nested).

---

## Phase 5: Sandbox Reference (Days 8-9)

### 5.1 Create Auth Demo in Sandbox

**File:** `app/sandbox/auth-demo/page.tsx` (create new)

- [ ] **5.1.1** `app/sandbox/auth-demo/layout.tsx` (server):
  ```typescript
  const authContext = await getServerAuthContext();
  return (
    <AuthProvider
      initialUser={authContext.user}
      initialProfile={authContext.profile}
      initialMemberships={authContext.memberships}
    >
      <TenantProvider
        initialTenant={authContext.activeTenant}
        initialRole={authContext.activeTenantRole}
      >
        <AuthDebugPanel context={authContext} />
        {children}
      </TenantProvider>
    </AuthProvider>
  );
  ```
- [ ] **5.1.2** `app/sandbox/auth-demo/page.tsx` with test scenarios
- [ ] **5.1.3** `components/sandbox/AuthDebugPanel.tsx` showing all auth/tenant state
- [ ] **5.1.4** Test scenarios per verification checklist

---

## Phase 6: Port /app Surface (Days 10-12)

### 6.1 Update /app Layout

**File:** `app/app/layout.tsx`

- [ ] **6.1.1** Convert to server component; fetch `authContext = getServerAuthContext()`.
- [ ] **6.1.2** Defense-in-depth: if no user → redirect `/auth/login`.
- [ ] **6.1.3** Resolve tenant server-side (use `authContext.activeTenant`); if multiple and none selected → `/app/select-tenant`; if zero → `/app/no-access`.
- [ ] **6.1.4** Render with server-provided providers (no `'use client'` in layout):
  ```typescript
  <AuthProvider ...initials>
    <TenantProvider initialTenant={authContext.activeTenant} initialRole={authContext.activeTenantRole}>
      <AppShell>{children}</AppShell>
    </TenantProvider>
  </AuthProvider>
  ```
- [ ] **6.1.5** Move client-only interactivity to child components.

### 6.2 Tenant Selection Pages

- [ ] **6.2.1** `app/app/select-tenant/page.tsx`: list tenants, set `lb_tenant` via server action, redirect to `/app`.
- [ ] **6.2.2** `app/app/no-access/page.tsx`: shown when no memberships; offer create/request access.

### 6.3 Update App Pages to New Context

- [ ] **6.3.1** Audit all `app/app/**` for `useAuth()`.
- [ ] **6.3.2** Replace `userRole` with `effectiveGlobalRole`.
- [ ] **6.3.3** Remove blocking full-page spinners on initial render; rely on server-hydrated state.

---

## Phase 7: Port /admin Surface (Days 13-15)

### 7.1 Fix AdminShell

**File:** `components/admin/AdminShell.tsx`

- [ ] **7.1.1** Use `effectiveGlobalRole === 'system_admin'` for global admin.
- [ ] **7.1.2** Remove hardcoded `admin/superadmin` checks.
- [ ] **7.1.3** Consume tenant role from TenantProvider/memberships for tenant-scoped admin.

### 7.2 Update /admin Layout

**File:** `app/admin/layout.tsx`

- [ ] **7.2.1** Server component fetching auth context; defense-in-depth redirect if not system_admin.
- [ ] **7.2.2** Pass initial data to AdminShell/TenantProvider; remove `'use client'` from layout.

### 7.3 Fix useRbac Hook

**File:** `features/admin/shared/hooks/useRbac.ts`

- [ ] **7.3.1** Use `effectiveGlobalRole` + memberships; tenant role from current tenant.
- [ ] **7.3.2** Ensure permissions map uses canonical roles.

### 7.4 Update Admin Sub-Layouts

- [ ] **7.4.1** `app/admin/(system)/layout.tsx`: require `system_admin` only.
- [ ] **7.4.2** `app/admin/tenant/[tenantId]/layout.tsx`: require tenant role (owner/admin).
- [ ] **7.4.3** Remove duplicate role checks in pages once layouts guard.

---

## Phase 8: Marketing Hardening (Days 16-17)

### 8.1 Marketing should never block on auth

- [ ] **8.1.1** Audit `app/(marketing)/*` for `useAuth()`.
- [ ] **8.1.2** If `isLoading`, render skeleton/placeholder, never blank/redirect.
- [ ] **8.1.3** Test states: logged out, logged in (single/multi-tenant), expired session.

### 8.2 Redirect handling

- [ ] **8.2.1** Ensure `?redirect=` is preserved through login.
- [ ] **8.2.2** Logged-in users on marketing can navigate to `/app` without re-auth.

---

## Phase 9: API Route Audit (Days 18-19)

### 9.1 Standardize API auth guards

- [ ] **9.1.1** Create `lib/api/auth-guard.ts`:
  - `requireAuth()` → returns `AuthContext`
  - `requireSystemAdmin()` → `effectiveGlobalRole === 'system_admin'`
  - `requireTenantRole(roles)` → uses `x-tenant-id` header or cookie + memberships
- [ ] **9.1.2** Audit all `app/api/**` using `createServerRlsClient`; switch to guards.
- [ ] **9.1.3** Ensure a single RLS client per request; avoid redundant `createServerRlsClient` calls.

### 9.2 Tenant header propagation

- [ ] **9.2.1** Tenant-scoped API routes read `x-tenant-id`; fallback to cookie if absent.
- [ ] **9.2.2** Client fetch wrapper adds `x-tenant-id` from `lb_tenant` cookie.

---

## Phase 10: Database Cleanup (Day 20)

### 10.1 Role consolidation migration

**File:** `supabase/migrations/20251216000000_consolidate_roles.sql` (create new)

- [ ] **10.1.1** Map legacy `users.role` to `global_role` only when `global_role` is null/member; do not overwrite non-member values.
- [ ] **10.1.2** Comment `users.role` as deprecated.
- [ ] **10.1.3** Ensure `is_system_admin()` uses `global_role`; verify RLS functions updated accordingly.

---

## Phase 11: Cleanup (Days 21-22)

- [ ] **11.1** Remove `userRole` from AuthContext once all usages migrated.
- [ ] **11.2** Delete `proxy.ts` (or archive) after middleware live.
- [ ] **11.3** Remove unused `initAuth()` paths if superseded by server hydration.
- [ ] **11.4** Deduplicate tenant resolution helpers; ensure single source (`lib/tenant/resolver.ts`).
- [ ] **11.5** Update `types/index.ts` exports; provide shims if needed.

---

## Phase 12: Documentation (Days 23-24)

- [ ] **12.1** `docs/auth/architecture.md`: server-first flow, middleware duties, cookies/headers, env requirements.
- [ ] **12.2** `docs/auth/tenant.md`: resolver priority, `lb_tenant` spec, path override, picker flow.
- [ ] **12.3** `docs/auth/roles.md`: GlobalRole vs TenantRole, `effectiveGlobalRole`, legacy mapping, permission matrix.
- [ ] **12.4** `docs/auth/routes.md`: protected routes, guest-only routes, redirect behavior.
- [ ] **12.5** `docs/auth/debugging.md`: common issues, inspect session/cookies, RLS debugging, AuthDebugPanel usage.
- [ ] **12.6** Archive to `docs/_archived/`: `AUTHORIZATION_SYSTEM_REPORT.md`, `ADMIN_AUTH_INVESTIGATION_REPORT.md`, `NAVIGATION_AUTH_FLOW_REPORT.md`.
- [ ] **12.7** Update `PROJECT_STATUS.md` auth/tenant sections.

---

## Verification Checklist

### Middleware Tests
- [ ] `GET /app` (unauth) → 302 `/auth/login?redirect=/app`
- [ ] `GET /admin` (unauth) → 302 `/auth/login?redirect=/admin`
- [ ] `GET /auth/login` (auth) → 302 `/app`
- [ ] `GET /auth/callback` (auth) → 200 (no redirect loop)
- [ ] `GET /admin` (auth, non-system_admin) → 302 `/app`
- [ ] `GET /admin` (auth, system_admin) → 200

### Tenant Tests
- [ ] User with 0 tenants → `/app/no-access`
- [ ] User with 1 tenant → auto-selected, httpOnly signed `lb_tenant` set
- [ ] User with N tenants, no cookie → `/app/select-tenant`
- [ ] User with N tenants, valid cookie → uses cookie tenant
- [ ] User with N tenants, invalid cookie → clears cookie, `/app/select-tenant`
- [ ] Path override `/app/t/[id]/...` → overrides cookie
- [ ] `x-tenant-id` header present on app requests

### Role Tests
- [ ] `system_admin` can access `/admin/(system)/*`
- [ ] `system_admin` can access `/admin/tenant/[id]/*`
- [ ] Tenant `owner`/`admin` can access `/admin/tenant/[id]/*`
- [ ] Tenant `member` cannot access `/admin/tenant/[id]/*`
- [ ] `private_user` cannot access `/admin/*`
- [ ] Login redirect respects `effectiveGlobalRole`

### Marketing Tests
- [ ] `/` renders without blocking on auth
- [ ] Header shows skeleton during auth load (not blank)
- [ ] `?redirect=/app/games` preserved through login flow
- [ ] Logged-in user can navigate marketing freely

### Session Tests
- [ ] Fresh login → profile displayed correctly
- [ ] Page refresh → profile persists (no flash)
- [ ] Session refresh → silent
- [ ] Multiple tabs → state synced
- [ ] Signout → clears `sb-*` and `lb_tenant`, redirects `/auth/login`
- [ ] `/auth/signout` POST clears all cookies

### RLS Tests
- [ ] User cannot read other tenant data
- [ ] User cannot read other user’s profile details
- [ ] `system_admin` can read across tenants
- [ ] Tenant role respected on writes

---

## Rollback Plan

### If Middleware fails
```bash
# Revert middleware helpers and middleware.ts
git checkout HEAD~1 -- middleware.ts lib/auth/middleware-helpers.ts
```

### If AuthProvider changes fail
```bash
git checkout HEAD~1 -- lib/supabase/auth.tsx lib/context/TenantContext.tsx
```

### If Database migration fails
```sql
-- Revert role consolidation (see migration file for down script)
```

### Full Rollback
```bash
git checkout auth-redesign-backup
git branch -D feature/auth-redesign
```

---

## Definition of Done

- [ ] All verification checklist items pass
- [ ] No TypeScript errors related to auth/tenant types
- [ ] No console errors on any surface
- [ ] E2E/manual checks pass (middleware, tenant, roles, marketing)
- [ ] Documentation complete and reviewed
- [ ] Code reviewed and merged to main
- [ ] Deployed to staging and verified
- [ ] Deployed to production

---

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| 1. Foundation | Not Started | | | |
| 2. Middleware | Not Started | | | |
| 3. AuthProvider | Not Started | | | |
| 4. Root Providers | Not Started | | | |
| 5. Sandbox | Not Started | | | |
| 6. /app | Not Started | | | |
| 7. /admin | Not Started | | | |
| 8. Marketing | Not Started | | | |
| 9. API Audit | Not Started | | | |
| 10. Database | Not Started | | | |
| 11. Cleanup | Not Started | | | |
| 12. Documentation | Not Started | | | |

---

**Total Estimated Time:** 24 working days  
**Recommended Pace:** 2-3 tasks per day with testing
