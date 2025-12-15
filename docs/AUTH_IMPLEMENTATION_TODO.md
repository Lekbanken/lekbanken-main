# Auth/Tenant Implementation TODO

**Status:** Active  
**Created:** 2025-12-15  
**Goal:** Fix auth, authorization, and multi-tenant architecture across all surfaces  

---

## Pre-Flight Checklist

- [ ] **Migration applied:** `supabase/migrations/20251215000000_fix_profile_sync_on_update.sql`
- [ ] **Backup current state:** `git checkout -b auth-redesign-backup`
- [ ] **Create working branch:** `git checkout -b feature/auth-redesign`

---

## Phase 1: Foundation (Days 1-2)

### 1.1 Types
- [ ] `types/auth.ts`: GlobalRole, TenantRole, AuthContext, UserProfile
- [ ] `types/tenant.ts`: TenantMembership, TenantResolution, TenantWithMembership
- [ ] `types/index.ts`: export new types

### 1.2 Server Auth Context
- [ ] `lib/auth/server-context.ts`: `getServerAuthContext(pathname?)`, `deriveEffectiveGlobalRole`
  - Fetch user/profile/memberships
  - Resolve tenant (path override, signed `lb_tenant`, primary/first membership)
  - Return `activeTenant` + `activeTenantRole`

### 1.3 Tenant Resolver
- [ ] `lib/tenant/resolver.ts`: `resolveTenant`, `resolveTenantForMiddleware`

---

## Phase 2: Proxy (Days 3-4)

### 2.1 Enable proxy
- [ ] Ensure **only** `proxy.ts` exists (no `middleware.ts`)
- [ ] Matcher:
  ```ts
  export const config = {
    matcher: [
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
  };
  ```

### 2.2 Auth + guest-only (claims-only; no DB)
- [ ] Use `@supabase/ssr` to read session
- [ ] Unauth on `/app/*` or `/admin/*` → `/auth/login?redirect=...`
- [ ] Guest-only `/auth/login|/auth/signup` (exclude callback/signout/recovery) → if authenticated, redirect `/app`

### 2.3 Admin gate (claims)
- [ ] JWT claim `app_metadata.role` (system_admin | superadmin | admin) or `global_role` claim; else redirect `/app`

### 2.4 Tenant resolution + headers
- [ ] `resolveTenantForMiddleware(request, user)` (path override, signed `lb_tenant`, membership fallback)
- [ ] Set `x-tenant-id` and refresh signed httpOnly `lb_tenant`
- [ ] Invalid/absent: multi → `/app/select-tenant`, none → `/app/no-access`

### 2.5 Helpers
- [ ] `lib/auth/middleware-helpers.ts`: `deriveEffectiveGlobalRoleFromClaims`, `resolveTenantForMiddleware`
- [ ] Import into `proxy.ts`

---

## Phase 3: AuthProvider/TenantProvider (Days 5-6)
- [ ] `lib/supabase/auth.tsx`: server hydration props, memberships, `effectiveGlobalRole`, deprecate `userRole`
- [ ] `lib/context/TenantContext.tsx`: initial tenant/memberships props; expose tenantRole; avoid refetch if hydrated

---

## Phase 4: Root Providers (Day 7)
- [ ] `app/server-providers.tsx` (server) wraps client `Providers` with initial auth data
- [ ] `app/providers.tsx` accepts initial data
- [ ] `app/layout.tsx` uses `ServerProviders`

---

## Phase 5: Sandbox Reference (Days 8-9)
- [ ] `app/sandbox/auth-demo/*` + `components/sandbox/AuthDebugPanel.tsx`
- [ ] Demonstrate server-hydrated auth/tenant

---

## Phase 6: /app (Days 10-12)
- [ ] `app/app/layout.tsx` server component with auth/tenant guard (login, select-tenant, no-access)
- [ ] Add/select-tenant and no-access pages
- [ ] Replace `userRole` usages with `effectiveGlobalRole`

---

## Phase 7: /admin (Days 13-15)
- [ ] `app/admin/layout.tsx` server; require system_admin via `effectiveGlobalRole`
- [ ] `components/admin/AdminShell.tsx` uses `effectiveGlobalRole`
- [ ] `useRbac` uses `effectiveGlobalRole` + tenantRole
- [ ] Tenant/system sub-layouts enforce roles

---

## Phase 8: Marketing (Days 16-17)
- [ ] Ensure auth optional/non-blocking; skeletons instead of full-page spinners
- [ ] Preserve `?redirect=` flow

---

## Phase 9: API Audit (Days 18-19)
- [ ] `lib/api/auth-guard.ts`: `requireAuth`, `requireSystemAdmin`, `requireTenantRole`
- [ ] Update API routes to use guards; tenant header handling

---

## Phase 10: Database (Day 20)
- [ ] `20251216000000_consolidate_roles.sql`: map legacy `users.role` → `global_role`; update `is_system_admin`

---

## Phase 11: Cleanup (Days 21-22)
- [ ] Remove `userRole` alias when safe
- [ ] Ensure no `middleware.ts`
- [ ] Deduplicate tenant resolvers; tidy initAuth fallbacks

---

## Phase 12: Documentation (Days 23-24)
- [ ] Update docs to reference `proxy.ts` (not `middleware.ts`)
- [ ] Auth/Tenant/Roles/Routes/Debugging docs
- [ ] Archive legacy auth reports

---

## Marketing/App/Admin Auth Cleanup Plan (new)
- [ ] Audit marketing/app/admin for `useAuth` usage; replace `userRole` with `effectiveGlobalRole`
- [ ] Ensure server layouts fetch/hydrate auth/tenant to avoid client-only gating
- [ ] Ensure tenant-aware pages read `tenantRole` and memberships from context
- [ ] Verify guest-only vs protected route behavior matches `proxy.ts`

---

## Verification Checklist
- Proxy redirects (unauth/protected, guest-only)
- Tenant selection (none/one/many, path override)
- Admin gating (system_admin via claims/effectiveGlobalRole)
- Marketing non-blocking rendering
- Session persistence/signout clears `lb_tenant`
- RLS sanity (cross-tenant access denied)

---

## Rollback
- Revert `proxy.ts` and helpers if needed:
  ```bash
  git checkout HEAD~1 -- proxy.ts lib/auth/middleware-helpers.ts
  ```

---

## Definition of Done
- Verification checklist passes; no TS errors; docs updated; deployed to staging/prod.
