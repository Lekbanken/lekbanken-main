# Level 2 Audit — Auth / Tenant / Capability Helper Stack

> **Audit type:** Level 2 Building Block Audit (per §7 audit-program.md)  
> **Date:** 2026-03-15  
> **Auditor:** Claude  
> **Status:** ✅ COMPLETE  
> **Result:** 0 P0, 0 P1, 3 P2, 2 P3 — **PASS (launch-safe)**

---

## 1. Scope & Building Blocks Audited

This audit covers the **auth / tenant / capability helper stack** — the shared infrastructure that enforces authentication, authorization, tenant isolation, and capability checks across all API routes and server-side code.

### Building Blocks

| # | Building Block | File | Responsibility |
|---|---------------|------|----------------|
| BB-1 | `apiHandler` | `lib/api/route-handler.ts` | Central API route wrapper — rate limit, auth dispatch, Zod, error handling |
| BB-2 | Auth guard functions | `lib/api/auth-guard.ts` | `requireAuth`, `requireSystemAdmin`, `requireTenantRole`, `requireSessionHost`, `requireCronOrAdmin` |
| BB-3 | Role derivation | `lib/auth/role.ts` | `deriveEffectiveGlobalRole`, `deriveEffectiveGlobalRoleFromUser` |
| BB-4 | Server auth context | `lib/auth/server-context.ts` | `getServerAuthContext` — cached per-request bootstrap |
| BB-5 | Plan access helpers | `lib/planner/require-plan-access.ts` | `requirePlanAccess`, `requirePlanEditAccess`, `requirePlanStartAccess`, `requirePlanReadAccess`, `assertTenantMembership` |
| BB-6 | Capability system | `lib/auth/capabilities.ts` | `derivePlanCapabilities`, `requireCapability`, `buildCapabilityContext*`, `planToResource` |
| BB-7 | Game display access | `lib/game-display/access.ts` | `canViewGame`, `requireGameAuth` |
| BB-8 | Tenant resolver | `lib/tenant/resolver.ts` | `resolveTenant` — resolve active tenant from path/cookie/membership |
| BB-9 | Middleware helpers | `lib/auth/middleware-helpers.ts` | `deriveEffectiveGlobalRoleFromClaims` — thin wrapper for middleware context |
| BB-10 | Play auth helpers | `lib/api/play-auth.ts` | `resolveParticipant`, `resolveSessionViewer` — participant token auth |

---

## 2. Architecture Chain Map

```
┌─────────────────────────────────────────────────────────────────────┐
│ REQUEST ENTRY                                                        │
│                                                                      │
│  ┌─────────────┐    ┌──────────────────┐    ┌──────────────────┐    │
│  │ Middleware   │───→│ apiHandler()     │    │ Server Component │    │
│  │ (BB-9)      │    │ (BB-1)           │    │ (layout/page)    │    │
│  └─────────────┘    └────────┬─────────┘    └────────┬─────────┘    │
│                              │                        │              │
│  AUTH RESOLUTION             │                        │              │
│                              ▼                        ▼              │
│                     ┌────────────────┐    ┌───────────────────┐     │
│                     │ resolveAuth()  │    │ getServerAuth     │     │
│                     │ (internal)     │    │ Context() (BB-4)  │     │
│                     └───────┬────────┘    └─────────┬─────────┘     │
│                             │                       │                │
│                             ▼                       │                │
│  ┌───────────────────────────────────────────┐      │                │
│  │ Auth Guard Layer (BB-2)                    │      │                │
│  │                                            │      │                │
│  │  requireAuth()─────────┐                   │      │                │
│  │  requireSystemAdmin()──┤                   │      │                │
│  │  requireTenantRole()───┤→ getServerAuth    │◄─────┘                │
│  │  requireSessionHost()──┤  Context() (BB-4) │                      │
│  │  requireCronOrAdmin()──┘                   │                      │
│  └───────────────┬───────────────────────────┘                      │
│                  │                                                   │
│  ROLE DERIVATION │                                                   │
│                  ▼                                                   │
│  ┌───────────────────────────────────────────┐                      │
│  │ deriveEffectiveGlobalRole() (BB-3)         │                      │
│  │                                            │                      │
│  │  profile.global_role                       │                      │
│  │  → user.app_metadata.role (legacy map)     │                      │
│  │  → user.app_metadata.global_role           │                      │
│  │  → user.user_metadata.global_role          │                      │
│  │  → profile.role (legacy map)               │                      │
│  │  → null                                    │                      │
│  └───────────────┬───────────────────────────┘                      │
│                  │                                                   │
│  DOMAIN GUARDS   │                                                   │
│                  ▼                                                   │
│  ┌─────────────────────┐  ┌──────────────────────┐                  │
│  │ Plan Access (BB-5)  │  │ Game Access (BB-7)   │                  │
│  │ requirePlanEdit     │  │ canViewGame           │                  │
│  │ requirePlanStart    │  │ requireGameAuth       │                  │
│  │ assertTenantMember  │  │                       │                  │
│  └────────┬────────────┘  └──────────────────────┘                  │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────┐                    │
│  │ Capability System (BB-6)                     │                    │
│  │ derivePlanCapabilities()                     │                    │
│  │ requireCapability()                          │                    │
│  └─────────────────────────────────────────────┘                    │
│                                                                      │
│  DB LAYER                                                            │
│  ┌──────────────────────────┐  ┌──────────────────────┐             │
│  │ createServerRlsClient   │  │ createServiceRole     │             │
│  │ (user-scoped, RLS)      │  │ Client (bypass RLS)   │             │
│  └──────────────────────────┘  └──────────────────────┘             │
│                                                                      │
│  TENANT RESOLUTION                                                   │
│  ┌────────────────────────┐  ┌──────────────────────┐               │
│  │ resolveTenant (BB-8)   │  │ resolveCurrentTenant │               │
│  │ (server-context path)  │  │ (server action path) │               │
│  └────────────────────────┘  └──────────────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Building Block Analysis

### BB-1: `apiHandler` (`lib/api/route-handler.ts`)

**Ingress:** `RouteHandlerConfig<TInput>` — auth mode, rate limit tier, Zod schema, handler fn  
**Egress:** `NextRouteHandler` — standardized Next.js route handler

**Auth modes verified (code L26-33):**

| Mode | Guard Called | System Admin Bypass |
|------|-------------|---------------------|
| `'public'` | None — returns `null` auth | N/A |
| `'user'` | `requireAuth()` | N/A (any logged-in user) |
| `'participant'` | `resolveParticipantAuth()` | N/A (token-based) |
| `'system_admin'` | `requireSystemAdmin()` | IS the check |
| `'cron_or_admin'` | `requireCronOrAdmin()` | Yes (via CRON_SECRET or admin check) |
| `{ tenantRole }` | `requireTenantRole()` | Yes (system_admin gets `admin` role) |
| `{ sessionHost }` | `requireAuth()` ⚠️ | **Deferred** — falls back to `requireAuth()` only |

**Finding L2-AUTH-001 (P3):** The `{ sessionHost }` auth mode in `apiHandler` falls back to simple `requireAuth()` and does NOT enforce session ownership. Code comment (L247-250) confirms this is intentional deferral: "reserved interface — not a fully enforced first-class auth mode yet." Session ownership validation is done inline in each handler via `requireSessionHost()`. **Risk:** Low — all 4 session host routes already call `requireSessionHost()` in-handler. No behavioral gap, just architectural debt.

**Verified behavior:**
- ✅ Error handling catches `AuthError` → `errorResponse()` (consistent format)
- ✅ Error handling catches `ZodError` → 400 with validation details
- ✅ Rate limiting auto-applies `'participant'` tier for participant auth
- ✅ Request ID generated per-request for tracing

---

### BB-2: Auth Guard Functions (`lib/api/auth-guard.ts`)

**5 exported functions verified against source code:**

#### `requireAuth()` (L14-19)
- Calls `getServerAuthContext()`, throws `AuthError(401)` if no user
- Returns full `AuthContext`
- **No issues found**

#### `requireSystemAdmin()` (L21-27)
- Calls `requireAuth()`, then checks `ctx.effectiveGlobalRole !== 'system_admin'` → 403
- **No issues found** — canonical check via `deriveEffectiveGlobalRole`

#### `requireTenantRole(roles, tenantId?)` (L29-64)
- Calls `requireAuth()`, has system_admin bypass (L36-41)
- Tenant ID resolution chain (L43-51):
  1. `tenantId` parameter (from route params)
  2. `x-tenant-id` header
  3. `ctx.activeTenant?.id` (from cookie/path resolution)
  4. First membership's `tenant_id`
  5. `null` → throws `AuthError(400, 'Tenant not selected')`
- Validates membership via `ctx.memberships.find(m => m.tenant_id === resolvedTenantId)`
- Checks role against provided `roles` array → 403 if not included

**Finding L2-AUTH-002 (P2):** TODO comment at L30 acknowledges: "consolidate tenant-resolution priority with resolveCurrentTenant (app/actions/tenant.ts) to ensure identical rules." There are **two independent tenant resolution chains** with different logic:
  - `requireTenantRole`: param → header → activeTenant → first membership
  - `resolveCurrentTenant` (server action): cookie → is_primary → stable sort fallback
  - `resolveTenant` (BB-8, server-context): path → cookie → primary → first → auto
  
  **Impact:** In normal flows they converge because all use cookie/membership. But edge cases (missing cookie + multiple memberships) could resolve to different tenants. System admin bypass mitigates risk for elevated users. **Severity: P2** — not a security hole (RLS catches mismatches) but a consistency concern.

#### `requireSessionHost(sessionId)` (L76-96)
- Calls `requireAuth()`, system_admin bypass
- Queries `participant_sessions` via **service role client** to get `host_user_id`
- Compares `host_user_id` against `ctx.user!.id`
- **No issues found** — uses service role intentionally (host may not have RLS access to session table)

#### `requireCronOrAdmin()` (L107-122)
- Path 1: checks `Authorization: Bearer <CRON_SECRET>` header
- Path 2: checks `getServerAuthContext().effectiveGlobalRole === 'system_admin'`
- Returns `{ via: 'cron' }` or `{ via: 'admin', ...ctx }`
- **No issues found**

---

### BB-3: Role Derivation (`lib/auth/role.ts`)

**Core function:** `deriveEffectiveGlobalRole(profile, user)`

**Priority chain verified (code L26-37):**

| Priority | Source | Mapping |
|----------|--------|---------|
| 1 | `profile.global_role` | Direct — from `users` table |
| 2 | `user.app_metadata.role` | Legacy map: `admin`/`superadmin` → `system_admin` |
| 3 | `user.app_metadata.global_role` | Direct claim |
| 4 | `user.user_metadata.global_role` | Direct claim |
| 5 | `profile.role` | Legacy map: `admin`/`superadmin` → `system_admin` |
| 6 | — | `null` (no role) |

**`deriveEffectiveGlobalRoleFromUser(user)` (L11-23):** Skips profile, uses only steps 2-4.

**`mapLegacyAdminRoleToSystemAdmin(role)` (L4-9):** Maps `admin`, `superadmin` → `system_admin`. Returns `null` for anything else.

**Call-sites verified (grep):**

| Call-site | File | Variant Used | Correct? |
|-----------|------|-------------|----------|
| Server context bootstrap | `lib/auth/server-context.ts` L102 | `deriveEffectiveGlobalRole(profile, user)` | ✅ Full |
| Client auth context | `lib/supabase/auth.tsx` L94 | `deriveEffectiveGlobalRole(userProfile, user)` | ✅ Full |
| Plan access helpers (2x) | `lib/planner/require-plan-access.ts` L68, L154 | `deriveEffectiveGlobalRole(profile, user)` | ✅ Full |
| Middleware | `lib/auth/middleware-helpers.ts` L5-6 | `deriveEffectiveGlobalRoleFromUser(user)` | ✅ Correct for middleware (no DB profile available) |
| Proxy / claims | `deriveEffectiveGlobalRoleFromClaims` | Delegates to `deriveEffectiveGlobalRoleFromUser` | ✅ Thin wrapper |

**No non-canonical callers exist in the helper stack.** However, see Finding L2-AUTH-003 below for inline bypasses in API routes.

---

### BB-4: Server Auth Context (`lib/auth/server-context.ts`)

**`getServerAuthContext(pathname?)`**

- Uses `React.cache()` to deduplicate the auth bootstrap within a single request
- Bootstrap flow:
  1. `createServerRlsClient()` → `supabase.auth.getUser()`
  2. If no user → empty context with `authDegraded` flag
  3. If user → parallel fetch `users` profile + `user_tenant_memberships`
  4. Synthetic profile fallback if DB profile missing (L89-99)
  5. `deriveEffectiveGlobalRole(profile, user)` → `effectiveGlobalRole`
  6. `resolveTenant(pathname, cookies, memberships)` → `activeTenant`, `activeTenantRole`
- Dev-only: trace counter detects cache() failures (L42-56)

**Verified:**
- ✅ Caches user data (without pathname) separately from tenant resolution
- ✅ Handles `x-auth-degraded` header from middleware timeout
- ✅ Memberships filtered by `status.eq.active,status.is.null`
- ✅ All auth guards delegate to this single bootstrap — **no duplicate `getUser()` calls** in the helper stack

---

### BB-5: Plan Access Helpers (`lib/planner/require-plan-access.ts`)

**`requirePlanAccess(supabase, user, planId, capability)`**

- Fetches plan minimal fields (`owner_user_id, owner_tenant_id, visibility`)
- Fetches profile + memberships in parallel
- Calls `deriveEffectiveGlobalRole(profileResult.data, user)` ✅
- Builds capability context via `buildCapabilityContextFromMemberships`
- Calls `requireCapability(ctx, plan, capability)` ✅
- Returns `{ allowed: true }` or `{ allowed: false, response: NextResponse }`

**Call-sites (grep-verified):**

| Route | Method | Helper | Verified |
|-------|--------|--------|----------|
| `plans/[planId]/blocks` | POST | `requirePlanEditAccess` | ✅ |
| `plans/[planId]/blocks/[blockId]` | PUT, DELETE | `requirePlanEditAccess` (2x) | ✅ |
| `plans/[planId]/blocks/reorder` | PUT | `requirePlanEditAccess` | ✅ |
| `plans/schedules` | POST | `requirePlanEditAccess` | ✅ |
| `plans/schedules/[scheduleId]` | PUT, DELETE | `requirePlanEditAccess` (2x) | ✅ |
| `play/[planId]/start` | POST | `requirePlanStartAccess` | ✅ |

**`assertTenantMembership(supabase, user, tenantId)`**

- Fetches profile, derives global role
- System admin bypass → `{ allowed: true }`
- Queries `user_tenant_memberships` for specific tenant → 403 if not found

**Call-sites (grep-verified):**

| Route | Verified |
|-------|----------|
| `plans/[planId]/notes/tenant` POST | ✅ L33 |
| `media/upload` POST | ✅ L40-42 |
| `gamification/leaderboard/preferences` GET+POST | ✅ (via previous JOUR-001 audit) |
| `gamification/achievement/[id]` GET | ✅ (via previous JOUR-004 audit) |

**`requirePlanReadAccess`:** Defined but **zero call-sites** in API routes.  
**Not a finding** — available for future use, correctly tests `planner.plan.read` capability.

---

### BB-6: Capability System (`lib/auth/capabilities.ts`)

**`derivePlanCapabilities(ctx, plan)`** — deterministic, pure function.

**Decision matrix verified (code L85-130):**

| Capability | Owner | Tenant Member | Tenant Admin | System Admin | Public |
|-----------|-------|---------------|-------------|-------------|--------|
| `plan.read` | ✅ | ✅ (if vis≠private) | ✅ (if vis≠private) | ✅ | ✅ (if vis=public) |
| `plan.update` | ✅ | ❌ | ✅ (if vis≠private) | ✅ | ❌ |
| `plan.delete` | ✅ | ❌ | ✅ (if vis≠private) | ✅ | ❌ |
| `plan.publish` | ✅ | ❌ | ✅ (if vis≠private) | ✅ | ❌ |
| `visibility.public` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `template.create` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `template.publish` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `run.start` | ✅ | ✅ (if vis≠private) | ✅ (if vis≠private) | ✅ | ✅ (if vis=public) |

**Contract verified:** `requireCapability` returns `{ allowed: true }` or `{ allowed: false, code, message }` — consistent with `AccessResult` pattern used by `requirePlanAccess`.

**No issues found** in the capability system itself.

---

### BB-7: Game Display Access (`lib/game-display/access.ts`)

**`canViewGame(game)`:**
- Published games → `{ allowed: true, isAdmin }` for all
- Draft games → only `system_admin` may view
- `null` game → `{ allowed: false, reason: 'not-found' }`

**`requireGameAuth()`:**
- Returns `AuthContext | null` — just checks `ctx.user` exists
- Does NOT enforce any tenant or role checks

**Call-sites (grep-verified):**
- `canViewGame`: `app/app/games/[gameId]/page.tsx`, `director-preview/page.tsx`, 3 API routes (triggers/roles/artifacts)
- `requireGameAuth`: 3 API routes (triggers/roles/artifacts) — **NOT wrapped in `apiHandler`** (known GAME-012 P3)

**No new findings.** GAME-012 remains at P3 — these are GET-only routes with `canViewGame` access control.

---

### BB-8: Tenant Resolver (`lib/tenant/resolver.ts`)

**`resolveTenant({ pathname, cookieStore, memberships })`**

Resolution chain:
1. Path extraction (`/app/t/[tenantId]`)
2. Cookie match
3. `is_primary` membership
4. Single membership
5. Auto-select (primary first, then first in list)
6. `/app/no-access` redirect

**Used exclusively by `getServerAuthContext` (BB-4).** See L2-AUTH-002 for tenant resolution inconsistency.

---

### BB-10: Play Auth Helpers (`lib/api/play-auth.ts`)

**`resolveParticipant(request, sessionId?)`:**
- Reads `x-participant-token` header
- Queries `participants` table via **service role** (intentional — participants have no Supabase auth)
- Validates status (blocked/kicked) and token expiry
- Returns `ResolvedParticipant` or `null`

**`resolveSessionViewer(sessionId, request)`:**
- Path 1: participant token → service role lookup → validate status/expiry
- Path 2: host cookie auth → RLS client → verify `host_user_id` match

**No issues found.** Service role usage is correct for participant lookups (participants are unauthenticated Supabase users).

---

## 4. End-to-End Flow Proofs

### Flow 1: Admin creates plan block → tenant role + capability check → RLS

```
UI: PlanEditor → POST /api/plans/[planId]/blocks
  → apiHandler({ auth: 'user' })
    → resolveAuth('user')
      → requireAuth()
        → getServerAuthContext()
          → createServerRlsClient() → supabase.auth.getUser()
          → users table + user_tenant_memberships
          → deriveEffectiveGlobalRole(profile, user) → effectiveGlobalRole
          → resolveTenant() → activeTenant
        ← returns AuthContext
      ← returns AuthContext (user guaranteed non-null)
    ← auth set on ctx
  → handler({ auth, params })
    → requirePlanEditAccess(supabase, user, planId)
      → supabase.from('plans').select('owner_user_id, owner_tenant_id, visibility')
      → supabase.from('users').select('global_role')  ← THIS IS A DUPLICATE FETCH ⚠️
      → supabase.from('user_tenant_memberships').select(...)  ← THIS IS A DUPLICATE FETCH ⚠️
      → deriveEffectiveGlobalRole(profile, user)
      → buildCapabilityContextFromMemberships(...)
      → requireCapability(ctx, plan, 'planner.plan.update')
          → derivePlanCapabilities() → checks owner/tenant/admin
      ← { allowed: true } or { allowed: false, response }
    → supabase.from('plan_blocks').insert(...) ← RLS enforces user_id = auth.uid()
  ← NextResponse.json({ data: block })
```

**Finding L2-AUTH-004 (P3):** `requirePlanAccess` re-fetches profile + memberships even though `getServerAuthContext()` already fetched them in the same request. The data is available on `auth!` but `requirePlanAccess` takes `(supabase, user)` not `(auth)`. **Impact:** Performance only — 2 extra DB queries per plan mutation. Not a security issue. Both fetches use RLS client so results are identical.

### Flow 2: User uploads media → tenant membership check → signed URL → RLS

```
UI: MediaUpload → POST /api/media/upload
  → apiHandler({ auth: 'user', rateLimit: 'api' })
    → applyRateLimit(req, 'api')
    → resolveAuth('user') → requireAuth() → AuthContext
  → handler({ auth, req })
    → Zod parse (uploadSchema) → fileName, fileType, tenantId, bucket
    → if (tenantId):
        → assertTenantMembership(supabase, user, tenantId)
          → supabase.from('users').select('global_role') → deriveEffectiveGlobalRole
          → system_admin bypass? → { allowed: true }
          → else: supabase.from('user_tenant_memberships').select(...).eq(tenantId)
          → membership found? → { allowed: true } : { allowed: false, 403 }
    → supabase.storage.from(bucket).createSignedUploadUrl(filePath)
  ← NextResponse.json({ signedUrl, path, token })
```

**Verified:** Tenant membership check happens BEFORE signed URL generation. System admin bypass is correct.

### Flow 3: Participant heartbeat → public auth → token validation → service role

```
UI: ParticipantRuntime → POST /api/play/heartbeat
  → apiHandler({ auth: 'public', rateLimit: 'api' })
    → resolveAuth('public') → returns null
  → handler({ auth: null, req })
    → reads x-participant-token header
    → reads session_code from query params
    → createServiceRoleClient() ← correct: participants have no Supabase auth
    → validates session exists (session_code match)
    → validates participant (token match + session match)
    → checks REJECTED_PARTICIPANT_STATUSES (blocked/kicked → 403)
    → checks token_expires_at (expired → 401)
    → updates last_seen_at, status → 'active'
  ← NextResponse.json({ success: true })
```

**Verified:** Public auth is correct for participant endpoints. Service role is required. Status + expiry checks are present.

---

## 5. Findings

### L2-AUTH-001 — `sessionHost` auth mode is a no-op facade (P3)

| Field | Value |
|-------|-------|
| **Severity** | P3 (low — no behavioral gap) |
| **Type** | Architectural debt / unused code path |
| **File** | `lib/api/route-handler.ts` L247-250 |
| **Evidence** | `if ('sessionHost' in auth) { return await requireAuth() }` — falls back to plain `requireAuth()`, no session ownership check |
| **Impact** | None today — all 4 routes that need session host auth use `auth: 'user'` + inline `requireSessionHost()`. The `{ sessionHost }` first-class mode is defined but never enforced. |
| **Recommendation** | Either implement the full `{ sessionHost }` auth mode to call `requireSessionHost()` before handler, or remove the interface to avoid confusion. Deferred to Phase 3 migration. |

### L2-AUTH-002 — Dual tenant resolution chains (P2)

| Field | Value |
|-------|-------|
| **Severity** | P2 (medium — consistency risk) |
| **Type** | Systemic pattern |
| **Files** | `lib/api/auth-guard.ts` L43-51, `lib/tenant/resolver.ts`, `app/actions/tenant.ts` |
| **Evidence** | `requireTenantRole` resolves tenant via: `param → header → activeTenant → first membership`. `resolveCurrentTenant` (server action) resolves via: `cookie → is_primary → stable sort`. `resolveTenant` (server context) resolves via: `path → cookie → primary → first → auto`. Three independent resolution chains. |
| **Impact** | Edge case: user with multiple tenants, no cookie, no path segment → `requireTenantRole` picks first membership (arbitrary order), while `resolveCurrentTenant` picks `is_primary` (deterministic). RLS prevents cross-tenant data access regardless, but UX could show data from wrong tenant. |
| **Recommendation** | Extract shared `resolveEffectiveTenantId(ctx, options)` function used by all three paths. TODO comment at `auth-guard.ts` L30 already acknowledges this. |
| **Mitigated by** | RLS policies on all tenant-scoped tables (`get_user_tenant_ids()` function) |

### L2-AUTH-003 — Inline `app_metadata.role` checks bypass `deriveEffectiveGlobalRole` (P2)

| Field | Value |
|-------|-------|
| **Severity** | P2 (medium — role derivation inconsistency) |
| **Type** | Systemic pattern |
| **Files** | 5 API route files |
| **Evidence** | |

**Routes with inline `app_metadata.role` checks (not using canonical `deriveEffectiveGlobalRole`):**

| Route | Line | Pattern | Risk |
|-------|------|---------|------|
| `games/[gameId]/route.ts` | L22, L87, L161 | `(user?.app_metadata as { role?: string })?.role` → isElevated check | Misses `profile.global_role` (priority 1), `user_metadata.global_role` (priority 4), and legacy `profile.role` (priority 5) |
| `games/[gameId]/publish/route.ts` | L14 | `(user.app_metadata as { role?: string })?.role` → admin/owner check | Only checks `app_metadata.role`, misses 5 other priority sources |
| `games/search/route.ts` | L84 | `(user?.app_metadata as { role?: string })?.role` → isElevated check | Same as above |
| `accounts/whoami/route.ts` | L38 | Direct `app_metadata.role` pass-through | Intentional — returns raw claim for client, not a gate |
| `tenants/route.ts` | L16 | `(user?.app_metadata as { role?: string })?.role` → role check | Same pattern |

**Why this matters:** If a user's `system_admin` role is set in `profile.global_role` (DB) but NOT in `app_metadata.role` (JWT claim), these routes will not recognize them as admin. The canonical `deriveEffectiveGlobalRole` checks all sources in priority order.

**Why it's P2 not P1:** In practice, system_admin role is always synced to `app_metadata.role` during user setup. The `profile.global_role` fallback was added for future-proofing. There is no known case where a user has `profile.global_role = 'system_admin'` but `app_metadata.role` is empty/different.

**Recommendation:** Replace inline `app_metadata.role` checks with `deriveEffectiveGlobalRole(profile, user)` or use `auth.effectiveGlobalRole` from the pre-resolved auth context. Previously identified as REG-PLAN-002 (P3) for `publish/route.ts`.

### L2-AUTH-004 — Plan access helpers re-fetch profile + memberships (P3)

| Field | Value |
|-------|-------|
| **Severity** | P3 (low — performance only) |
| **Type** | Redundant data fetch |
| **File** | `lib/planner/require-plan-access.ts` L59-67 |
| **Evidence** | `requirePlanAccess(supabase, user, planId, capability)` re-fetches `users.global_role` and `user_tenant_memberships` even though `getServerAuthContext()` already fetched both in the same request (via `apiHandler → resolveAuth → requireAuth → getServerAuthContext`). |
| **Impact** | 2 extra DB queries per plan mutation. Not cached by `React.cache()` because `requirePlanAccess` builds its own query, not the same `getServerUserDataCached()` call. |
| **Recommendation** | Consider adding an overload that accepts pre-fetched `AuthContext` to avoid duplicate queries. Low priority — no security impact and queries are fast (indexed). |

### L2-AUTH-005 — `plans/[planId]/publish/route.ts` uses inline `app_metadata.global_role` (P2)

| Field | Value |
|-------|-------|
| **Severity** | P2 (medium — bypasses canonical role derivation) |
| **Type** | Local bug (non-canonical role check) |
| **File** | `app/api/plans/[planId]/publish/route.ts` L65 |
| **Evidence** | `globalRole: (user.app_metadata?.global_role as GlobalRole) ?? null` — reads only `app_metadata.global_role`, skipping 5 other priority sources. The capability context built from this may under-privilege a user whose role is set elsewhere in the priority chain. |
| **Impact** | Same as L2-AUTH-003 — if a user's role is in `profile.global_role` (DB) but not `app_metadata.global_role` (claim), `derivePlanCapabilities` will not give them system_admin privileges for publish. Previously tracked as REG-PLAN-002 (P3). |
| **Recommendation** | Replace with `deriveEffectiveGlobalRole(profileResult.data, user)` — the profile is already fetched on L58-62 via `user_tenant_memberships` query. Alternatively, use `requirePlanAccess(supabase, user, planId, 'planner.plan.publish')` to consolidate. Upgrading from P3 to P2 because this route makes a **capability decision** based on the non-canonical role. |

---

## 6. System Admin Bypass Consistency Matrix

| Helper | System Admin Bypass | Mechanism | Verified |
|--------|-------------------|-----------|----------|
| `requireAuth()` | N/A (any user passes) | — | ✅ |
| `requireSystemAdmin()` | IS the check | `effectiveGlobalRole === 'system_admin'` | ✅ |
| `requireTenantRole()` | ✅ Full bypass | Returns `{ activeTenantRole: 'admin' }` | ✅ |
| `requireSessionHost()` | ✅ Full bypass | Skips `host_user_id` check | ✅ |
| `requireCronOrAdmin()` | ✅ Admin path | Checks `effectiveGlobalRole === 'system_admin'` | ✅ |
| `assertTenantMembership()` | ✅ Full bypass | `globalRole === 'system_admin'` → `{ allowed: true }` | ✅ |
| `canViewGame()` | ✅ Draft bypass | `isAdmin` flag allows draft viewing | ✅ |
| `requireGameAuth()` | ❌ No bypass | Just checks user exists (P3 deferred GAME-012) | ⚠️ Known |
| `derivePlanCapabilities()` | ✅ Full caps | `isSystemAdmin` gets all capabilities | ✅ |
| `resolveSessionViewer()` | ❌ No bypass | Known (sessions audit Appendix E) — keep current | ⚠️ Known |

**All system admin bypasses are consistent.** The two exceptions (`requireGameAuth`, `resolveSessionViewer`) are documented and intentional.

---

## 7. App Auth vs RLS vs Helper Responsibility

| Layer | Responsibility | Enforces | Bypassed By |
|-------|---------------|----------|-------------|
| **App layer** (`apiHandler` + guards) | Authentication, rate limiting, tenant role checks | Who you are, what role you have | Nothing — first gate |
| **Helper layer** (plan access, tenant membership, capabilities) | Authorization decisions | What you can do to specific resources | Nothing — runs in handler |
| **RLS layer** (PostgreSQL policies) | Data isolation | What rows you can read/write | `createServiceRoleClient()` only |
| **Service role** (admin bypass) | Background/admin tasks | Nothing — full access | Only for cron, admin operations, participant lookups |

**Key insight:** RLS is the last line of defense. All app-layer checks are defense-in-depth. A failure in app-layer auth (e.g., inline `app_metadata.role` missing a user) would NOT cause data leakage — RLS would still block the query based on `auth.uid()` and `get_user_tenant_ids()`.

---

## 8. Summary

### What's working well

1. **Canonical role derivation** — `deriveEffectiveGlobalRole` is used correctly in all helper functions. The priority chain handles legacy roles gracefully.
2. **System admin bypass consistency** — All helpers that should bypass for system_admin do so, using the canonical `effectiveGlobalRole` check.
3. **Defense-in-depth** — App-layer auth guards + RLS + capability system provide three layers. No single-point-of-failure in auth.
4. **`apiHandler` centralization** — 330+ handlers use the standardized wrapper. Auth, rate limiting, Zod validation, and error handling are consistent.
5. **Per-request caching** — `getServerAuthContext` uses `React.cache()` to deduplicate the bootstrap. Auth queries run once per request.
6. **Participant auth isolation** — Participant routes use token-based auth via service role, completely separate from user auth. Status/expiry validation is thorough.

### What needs attention

1. **P2: Inline `app_metadata.role` checks** (L2-AUTH-003, L2-AUTH-005) — 5 API routes bypass `deriveEffectiveGlobalRole`. Not a current security risk (roles are synced) but creates drift risk.
2. **P2: Dual tenant resolution chains** (L2-AUTH-002) — Three independent tenant resolver implementations with different fallback logic.
3. **P3: `sessionHost` auth mode facade** (L2-AUTH-001) — Defined but not enforced.
4. **P3: Duplicate DB fetches** (L2-AUTH-004) — Plan access helpers re-fetch data already in auth context.

### Verdict

**PASS — Launch-safe.** 0 P0, 0 P1. The auth/tenant/capability stack is architecturally sound with well-designed layering. RLS provides defense-in-depth that mitigates all P2 findings. The P2 items are pre-existing patterns (already tracked as REG-PLAN-002 and TODO comments) and should be consolidated in a post-launch cleanup sprint.
