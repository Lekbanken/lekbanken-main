# DD-1 Execution Plan: tenantAuth → Wrapper Migration

## Metadata

> **Date:** 2025-07-18  
> **Last updated:** 2026-03-21  
> **Last validated:** 2026-03-21  
> **Status:** active  
> **Prerequisite for:** Batch 4 (tenantAuth, 52 routes)  
> **Depends on:** DD-1 decision (✅ decided: `deriveEffectiveGlobalRole` is canonical, `tenantAuth.isSystemAdmin` deprecated)  
> **Goal:** Map every tenantAuth auth pattern to a wrapper `AuthLevel`, identify required infrastructure changes, define sub-batch execution order  
> **Note:** Active execution plan for remaining wrapper migration work. Use `launch-control.md` for the program-level status.

### Route Count Reconciliation (source of truth)

Previous documents referenced **72** or **57** tenantAuth routes. Fresh inventory (2025-07-18) found:

| Scope | Count | Notes |
|-------|-------|-------|
| **Batch 4: tenantAuth API routes** | **52** | Files under `app/api/` importing from `@/lib/utils/tenantAuth` |
| Batch 6: non-tenantAuth admin patterns | ~40 | Local `isSystemAdmin`, RPC `is_system_admin`, `effectiveGlobalRole`, `deriveEffectiveGlobalRole` (some already wrapped) |
| Server actions (out of scope) | 12 | Files under `app/actions/` importing from tenantAuth — not API routes |
| **Total admin-auth routes** | **~92** | But only 52 are in Batch 4; the rest are Batch 6 or already done |

**Why the discrepancy:**
- The original "72" (remediation plan) likely included non-tenantAuth admin patterns and/or server actions
- The "57" (launch-control auth classification) was an earlier scan that counted some routes differently
- **52 is the verified count** from recursive `grep -r "from '@/lib/utils/tenantAuth'" app/api/`

---

## 1. Core Infrastructure Gap

### The Problem

The wrapper's `{ tenantRole }` auth mode calls `requireTenantRole()` in `auth-guard.ts`, which does **NOT** include system_admin bypass:

```typescript
// auth-guard.ts — current behavior
export async function requireTenantRole(roles: TenantRole[], tenantId?: string | null) {
  const ctx = await requireAuth()
  // ... resolve tenantId ...
  const membership = ctx.memberships.find((m) => m.tenant_id === resolvedTenantId)
  const tenantRole = membership?.role as TenantRole | null
  if (!tenantRole || !roles.includes(tenantRole)) {
    throw new AuthError('Forbidden', 403) // ← system_admin with no membership → 403
  }
  // ...
}
```

The legacy `assertTenantAdminOrSystem()` in `tenantAuth.ts` does:
```typescript
export async function assertTenantAdminOrSystem(tenantId: string, user: UserLike) {
  if (isSystemAdmin(user)) return true   // ← system_admin always passes
  return isTenantAdmin(tenantId, user.id) // ← tenant admin/owner passes
}
```

**Gap:** `{ tenantRole: ['admin', 'owner'] }` ≠ `assertTenantAdminOrSystem`. A system_admin who isn't a tenant member gets 403 from the wrapper but passes `assertTenantAdminOrSystem`.

### The Fix: Enhance `requireTenantRole` with system_admin bypass

```typescript
export async function requireTenantRole(roles: TenantRole[], tenantId?: string | null) {
  const ctx = await requireAuth()

  // System admins bypass tenant role checks (matches assertTenantAdminOrSystem semantics)
  if (ctx.effectiveGlobalRole === 'system_admin') {
    return {
      ...ctx,
      activeTenantRole: null,  // no synthetic role — system admin has global access
      activeTenant: ctx.activeTenant,
    }
  }

  // ... existing tenant role check logic unchanged ...
}
```

**Why this is safe:**
1. **0 routes** currently use `auth: { tenantRole }` in production — no existing behavior changes
2. **Precedent:** `requireSessionHost` already has identical system_admin bypass: `if (ctx.effectiveGlobalRole === 'system_admin') return ctx`
3. **Semantic match:** The principle "system_admin can do everything a tenant admin can do" is universal across the codebase
4. `activeTenantRole` is set to `null` (not a synthetic role) to avoid confusing downstream code that checks the specific role

**Type change needed:** The return type of `requireTenantRole` currently always returns `activeTenantRole: TenantRole`. With the bypass, `activeTenantRole` becomes `TenantRole | null`. Any handler that reads `activeTenantRole` must handle `null` (system_admin case).

---

## 2. Route Classification

### TenantRole enum values (from database)

```
owner | admin | editor | member | organisation_admin | organisation_user | demo_org_admin
```

### 52 tenantAuth API routes → 4 groups

#### Group A: Pure system_admin (15 routes) — `auth: 'system_admin'`

All methods require `isSystemAdmin(user)` as the sole gate. No tenant role checks. Direct mapping to `auth: 'system_admin'`.

| # | Route | Methods | Notes |
|---|-------|---------|-------|
| 1 | `admin/categories/route.ts` | GET, POST, PATCH | All system_admin |
| 2 | `admin/categories/sync-bundle/route.ts` | POST | |
| 3 | `admin/analytics/overview/route.ts` | GET | Uses `createServiceRoleClient` for cross-tenant |
| 4 | `admin/analytics/sessions/[sessionId]/route.ts` | GET | Uses `createServiceRoleClient` |
| 5 | `admin/products/[productId]/route.ts` | GET, PATCH | All system_admin |
| 6 | `admin/products/[productId]/status/route.ts` | PATCH | |
| 7 | `admin/products/[productId]/sync-stripe/route.ts` | POST | |
| 8 | `admin/products/[productId]/audit/route.ts` | GET | |
| 9 | `admin/products/[productId]/games/route.ts` | GET | |
| 10 | `admin/products/[productId]/games/[gameId]/route.ts` | DELETE | |
| 11 | `admin/products/bundles/route.ts` | GET | |
| 12 | `admin/products/exists/route.ts` | GET | |
| 13 | `admin/products/search/route.ts` | POST | |
| 14 | `admin/products/bulk/route.ts` | POST | |
| 15 | `admin/gamification/awards/requests/[requestId]/route.ts` | PATCH | Has rate limit |

#### Group A-mixed: Mixed public/system_admin (3 routes)

Some methods are public or user-auth, others require system_admin. Each method gets a separate `apiHandler()` call.

| # | Route | Auth per method |
|---|-------|----------------|
| 16 | `products/route.ts` | GET=`auth:'public'`, POST=`auth:'system_admin'` |
| 17 | `products/[productId]/route.ts` | GET=`auth:'public'`, PATCH=`auth:'system_admin'`, DELETE=`auth:'system_admin'` |
| 18 | `tenants/route.ts` | GET=`auth:'user'` (soft role filter in handler), POST=`auth:'system_admin'` |

#### Group B: assertTenantAdminOrSystem (9 routes) — `auth: { tenantRole: ['admin', 'owner'] }`

Use `assertTenantAdminOrSystem` as their primary auth gate. With the enhanced `requireTenantRole`, these map to `{ tenantRole: ['admin', 'owner'] }`.

**Requires:** `requireTenantRole` enhancement (Section 1) — system_admin bypass must be in place first.

| # | Route | Methods | tenantId source |
|---|-------|---------|----------------|
| 19 | `gamification/coins/transaction/route.ts` | POST | from request body or header |
| 20 | `admin/gamification/levels/route.ts` | GET, PATCH | from query param |
| 21 | `admin/gamification/campaigns/route.ts` | GET, POST | from query param / body |
| 22 | `admin/gamification/campaigns/[campaignId]/analytics/route.ts` | GET | from query param |
| 23 | `admin/gamification/campaign-templates/route.ts` | GET, POST | from query param / body |
| 24 | `admin/gamification/automation/route.ts` | GET, POST | from query param / body |
| 25 | `admin/gamification/analytics/route.ts` | GET | from query param |
| 26 | `admin/gamification/analytics/rollups/refresh/route.ts` | POST | from body |
| 27 | `admin/marketplace/items/route.ts` | GET, POST | from query param / body |

**Important:** tenantId resolution for these routes often comes from query params or request body, NOT from URL path params. The wrapper's `{ tenantRole }` auth resolves tenantId via param → header → ctx.activeTenant → first membership chain. If these routes rely on body/query tenantId, we may need to pass it via `x-tenant-id` header or enhance the wrapper. **This needs per-route verification during implementation.**

#### Group C: Hybrid system_admin + tenant_role (21 routes)

Routes that use both `isSystemAdmin` and `isTenantAdmin`/`assertTenantAdminOrSystem` with different semantics per code path. These have dual-path auth: system_admin gets global access, tenant admin/owner gets scoped access.

**Sub-group C1: `isSystemAdmin(user) || isTenantAdmin(tenantId, user.id)` pattern (8 routes)**

These match `assertTenantAdminOrSystem` semantics → `{ tenantRole: ['admin', 'owner'] }` after enhancement.

| # | Route | Methods |
|---|-------|---------|
| 28 | `tenants/[tenantId]/route.ts` | GET, PATCH, DELETE |
| 29 | `tenants/[tenantId]/status/route.ts` | PATCH |
| 30 | `tenants/[tenantId]/settings/route.ts` | GET, PATCH |
| 31 | `tenants/[tenantId]/members/route.ts` | GET, POST |
| 32 | `tenants/[tenantId]/members/[userId]/route.ts` | PATCH, DELETE |
| 33 | `tenants/[tenantId]/invitations/route.ts` | GET, POST |
| 34 | `tenants/[tenantId]/branding/route.ts` | GET, PUT |
| 35 | `tenants/[tenantId]/audit-logs/route.ts` | GET |

**tenantId source:** URL path param `[tenantId]` — maps cleanly to wrapper config `{ tenantRole: ['admin', 'owner'], tenantId: params.tenantId }`.

**Sub-group C2: Dual-path (`isSystemAdmin` → global, `assertTenantAdminOrSystem` → scoped) (6 routes)**

These have complex dual-path: system_admin bypasses all scoping, tenant admin gets tenant-scoped results only. Auth gate is the same (`assertTenantAdminOrSystem`), but query scoping differs.

| # | Route | Methods | Notes |
|---|-------|---------|-------|
| 36 | `games/route.ts` | POST | tenant-scoped: `assertTenantAdminOrSystem`, global: `isSystemAdmin` |
| 37 | `games/csv-import/route.ts` | POST | tenant-scoped import |
| 38 | `games/csv-export/route.ts` | POST | tenant-scoped export |
| 39 | `admin/coach-diagrams/route.ts` | GET, POST | CREATE: `assertTenantAdminOrSystem`, LIST: scoped by role |
| 40 | `admin/coach-diagrams/[diagramId]/route.ts` | GET, PUT, DELETE | Owner OR system_admin |
| 41 | `admin/gamification/awards/route.ts` | GET, POST | LIST/CREATE scoped |

**Sub-group C3: `isSystemAdmin` as membership bypass (7 routes)**

System_admin bypasses `requireTenantMembership` (any-role membership check, not admin-only). Normal users need active tenant membership.

| # | Route | Methods | Membership check |
|---|-------|---------|-----------------|
| 42 | `shop/route.ts` | GET, POST | `isSystemAdmin` OR `requireTenantMembership` |
| 43 | `shop/powerups/consume/route.ts` | POST | Same |
| 44 | `cosmetics/loadout/route.ts` | GET, POST | Same |
| 45 | `gamification/pins/route.ts` | GET, POST | Same |
| 46 | `gamification/events/route.ts` | POST | `isSystemAdmin` OR `isTenantAdmin` |
| 47 | `admin/award-builder/presets/route.ts` | GET, POST | `assertTenantAdminOrSystem` + `isSystemAdmin` |
| 48 | `admin/award-builder/exports/route.ts` | GET, POST | `assertTenantAdminOrSystem` + `isSystemAdmin` |

#### Group D: Anomalous (4 routes)

Routes with non-standard auth patterns that need individual investigation.

| # | Route | Issue |
|---|-------|-------|
| 49 | `admin/award-builder/exports/[exportId]/route.ts` | `assertTenantAdminOrSystem` + `isSystemAdmin` — per-method split |
| 50 | `admin/award-builder/seed-test-badges/route.ts` | GET has **zero auth** (!), POST uses `createServiceRoleClient` for `getUser()` (suspicious) |
| 51 | `admin/award-builder/presets/[presetId]/route.ts` | Most methods only require login (not system_admin). PUT allows creator OR system_admin but doesn't hard-enforce. |
| 52 | `tenants/invitations/[token]/accept/route.ts` | User auth + demo-tenant block (system_admin bypasses demo gate only) |

---

## 3. Non-tenantAuth Admin Patterns (separate scope)

These routes have admin checks but don't import from `tenantAuth`. They are **NOT part of Batch 4** but are cataloged here for Batch 6+ planning.

| Pattern | Route Count | Example | Batch |
|---------|-------------|---------|-------|
| Local `isSystemAdmin` function/const | 9 | `purposes/route.ts`, `admin/stripe/*`, `admin/games/*` | Batch 6 |
| RPC `is_system_admin` / `has_tenant_role` | 9 | `admin/gamification/{leaderboard,rules,dashboard,sinks,refund}`, `billing/{promo-codes,usage/*}` | Batch 6 |
| `ctx.effectiveGlobalRole` (already in wrapper) | 8 | `admin/toolbelt/conversation-cards/*`, `games/builder/*` | Batch 6 (inline → wrapper auth) |
| `authContext.effectiveGlobalRole` (getServerAuthContext) | 5 | `admin/scheduled-jobs`, `admin/tenant/[tenantId]/mfa/*` | Batch 6 |
| `deriveEffectiveGlobalRole` inline | 7 | `plans/*` (most already migrated in 3B-2b) | Remaining in Batch 6 |
| Special (`authRoles`, `isElevated`) | 2 | `accounts/whoami`, `games/search` | Batch 6 |

**Total non-tenantAuth admin routes: ~40** (some already wrapped from earlier batches).

---

## 4. Batch 4 Sub-Batches

### Batch 4a: Pure system_admin (18 routes) — ✅ KLAR (2025-07-18)

**Status:** Complete. 18 files (28 handlers) migrated. Coverage 134→152 (53.0%). `tsc --noEmit` = 0 errors.

**Prerequisite:** None (no wrapper changes needed, `auth: 'system_admin'` already works).

**Scope:** Group A (15 pure) + Group A-mixed (3 mixed auth per method).

**Pattern:**
```typescript
// Before:
export async function GET(request: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // ...
}

// After:
export const GET = apiHandler({
  auth: 'system_admin',
  handler: async ({ req, auth, params }) => {
    // isSystemAdmin check removed — wrapper enforces via requireSystemAdmin()
    // ...
  },
})
```

**For mixed-auth routes (products/, products/[productId], tenants/):**
```typescript
// products/route.ts
export const GET = apiHandler({
  auth: 'public',  // or 'user' if RLS client needs auth
  handler: async ({ req }) => { /* ... */ },
})

export const POST = apiHandler({
  auth: 'system_admin',
  handler: async ({ req, auth }) => { /* ... */ },
})
```

**Expected gains:**
- Coverage: 134 → 152 = **53.0%** (+6.3%)
- 18 routes fully migrated, `tenantAuth` imports removed from all 18
- All `admin/products/*` routes wrapped (8 routes, largest uniform group)

### Batch 4b: Pure assertTenantAdminOrSystem (9 routes) — ✅ KLAR (2025-06-28)

**Prerequisite:** `requireTenantRole` enhancement (Section 1) — ✅ merged.

**Scope:** Group B (9 routes using only `assertTenantAdminOrSystem`).

**Pattern used (option b — safer tenantId resolution):**
```typescript
// Before:
const user = (await supabase.auth.getUser()).data.user
const tenantId = searchParams.get('tenantId') || body.tenantId
const hasAccess = await assertTenantAdminOrSystem(tenantId, user)
if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

// After:
export const GET = apiHandler({
  auth: 'user',
  handler: async ({ req, auth }) => {
    const tenantId = url.searchParams.get('tenantId')
    await requireTenantRole(['admin', 'owner'], tenantId)
    // ...
  },
})
```

**Decision:** Used `auth: 'user'` + inline `requireTenantRole(roles, tenantId)` (option b) instead of `auth: { tenantRole }` to preserve exact tenantId resolution from body/query params. This avoids security regressions where wrapper resolves a different tenant than the one in the request.

**Noteringar:**
- `requireTenantRole` enhanced with `system_admin` bypass (mirrors `requireSessionHost`)
- System admins return `activeTenantRole: 'admin'` as synthetic role
- All 9 files: `assertTenantAdminOrSystem` import removed, `createServerRlsClient` import removed
- POST/PATCH handlers use wrapper `input:` for Zod validation (removes boilerplate)
- GET handlers validate query params inline (no body to validate)
- 15 handlers total across 9 files
- `tsc --noEmit` = 0 errors

**Results:**
- Coverage: 152 → 161 = **56.1%** (+3.1%)
- 9 routes fully migrated, 15 handlers wrapped
- `assertTenantAdminOrSystem` usage reduced from 18 to 9 (remaining are Group C/D hybrids)

### Batch 4c: Hybrid routes (21 routes) — HIGH RISK

**Prerequisite:** Batch 4b complete + verified `requireTenantRole` bypass behavior.

**Scope:** Group C (Sub-groups C1 + C2 + C3).

**Sub-group C1 (8 `tenants/[tenantId]/*` routes)** — after enhancement, map to `{ tenantRole: ['admin', 'owner'], tenantId: params.tenantId }`. tenantId comes from URL param → clean mapping.

**Sub-group C2 (6 dual-path routes)** — need case-by-case analysis. Auth gate maps to `{ tenantRole: ['admin', 'owner'] }`, but query scoping (global vs tenant-scoped results) must be preserved in handler.

**Sub-group C3 (7 membership-bypass routes)** — use `{ tenantRole: ['member', 'admin', 'owner', 'editor', 'organisation_admin', 'organisation_user', 'demo_org_admin'] }` (all roles) to replace `requireTenantMembership`. OR use `auth: 'user'` + inline check if the role set is too broad for the wrapper config.

**Expected gains:**
- Coverage: 161 → 182 = **63.4%** (+7.3%)

### Batch 4d: Anomalous routes (4 routes) — needs investigation

**Scope:** Group D — routes with broken, missing, or unusual auth patterns.

Must be triaged individually before migration:
- `seed-test-badges` — fix the zero-auth GET first
- `presets/[presetId]` — clarify intent (is it really owner-only? or system_admin-only?)
- `exports/[exportId]` — verify per-method auth
- `invitations/[token]/accept` — special demo-gate logic

---

## 5. Execution Order

```
Step 0: Enhance requireTenantRole with system_admin bypass
  ↓ tsc clean, 0 behavior change (no callers use { tenantRole } yet)
  ↓
Batch 4a: Pure system_admin (18 routes)           — LOW RISK, no wrapper change needed
  ↓ ~53% coverage
  ↓
Batch 4b: assertTenantAdminOrSystem (9 routes)    — MEDIUM RISK, uses enhanced requireTenantRole
  ↓ ~56% coverage, first real use of { tenantRole } auth mode
  ↓
Batch 4c-C1: tenants/[tenantId]/* (8 routes)     — ✅ KLAR (2025-06-28) — 8 files, 14 handlers. `auth: 'user'` + `requireTenantRole(['admin', 'owner'], params.tenantId)`. Demo guards preserved. MFA enforcement preserved.
  ↓
Batch 4c-C3: Membership bypass routes (4 routes)  — ✅ KLAR (2025-06-28) — 4 files, 8 handlers. `auth: 'user'` + inline `requireTenantMembership`. POST handlers use `input: postSchema`.
  ↓
Batch 4c-C2: Dual-path routes (6 routes)          — ✅ KLAR (2025-06-28) — 6 files, 9 handlers. `auth: 'user'` + `requireTenantRole(['admin', 'owner'], tenantId)` for scoped, `effectiveGlobalRole` check for global. Removed `createServerRlsClient` from 3 files, local `requireAuth()` from 3 files.
  ↓
Batch 4d: Anomalous (7 routes)                     — ✅ KLAR (2025-07-08) — 7 files, 15 handlers. Route-by-route anomaly migration. Awards (POST), events (POST), seed-test-badges (POST+GET), presets/[presetId] (4 methods), exports/[exportId] (3 methods), coach-diagrams/[diagramId] (3 methods), invitations/[token]/accept (POST). Scope-based auth via `authorizeScope()` helper, `requireTenantRole`, `system_admin` level, `auth: 'public'` for preview. tenantAuth backlog → 0.
  ↓
```

> **Coverage note:** Canonical coverage is code-scanned (`.NET ReadAllText`): **186/287 files (64.8%)**, **272/408 handlers (66.7%)**. See `launch-control.md`.

---

## 6. `tenantAuth.ts` Deprecation Plan

After all Batch 4 routes are migrated:

1. **`isSystemAdmin`** → replaced by `auth: 'system_admin'` wrapper mode (which calls `requireSystemAdmin` → `ctx.effectiveGlobalRole === 'system_admin'`)
2. **`isTenantAdmin`** → replaced by `auth: { tenantRole: ['admin', 'owner'] }` wrapper mode (which calls enhanced `requireTenantRole`)
3. **`assertTenantAdminOrSystem`** → replaced by `auth: { tenantRole: ['admin', 'owner'] }` with system_admin bypass

**Remaining callers after Batch 4:** 12 server action files (`app/actions/*`) still import from tenantAuth. These are out of scope for the API wrapper migration but should be migrated to use `deriveEffectiveGlobalRole` / `getServerAuthContext` in a future task.

**Final state of `tenantAuth.ts`:** Can be deprecated-marked after Batch 4 + server actions cleanup. File deletion deferred until all 12 action files are migrated.

---

## 7. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `requireTenantRole` enhancement changes system_admin behavior | system_admins could access tenant-scoped data they shouldn't | `activeTenantRole: null` prevents synthetic role confusion. System admin already has full access via service role in most routes. |
| tenantId resolution mismatch (query param vs header) | Wrong tenant's data returned | Per-route verification in Batch 4b. Frontend may need to send `x-tenant-id` header. |
| `activeTenantRole: null` breaks downstream code | Handler uses role for scoping decisions | grep for `activeTenantRole` in handlers — if used, add null-check |
| 52 routes in one batch is too large | Regression risk | Split into 4a/4b/4c/4d with separate tsc + smoke check per sub-batch |
| Non-tenantAuth admin patterns (40 routes) not covered | Incomplete migration | Tracked as Batch 6, separate from Batch 4 |

---

## 8. Batch 4a Detailed Route Specifications

> This section provides implementation-ready specs for the 18 Batch 4a routes.

### Sub-batch 4a-1: `admin/products/*` (10 routes, 14 handlers)

All routes follow identical pattern: `getUser()` → `isSystemAdmin(user)` → 403. Uses `createServiceRoleClient()` for queries.

| Route | Methods | Wrapper Config |
|-------|---------|---------------|
| `admin/products/[productId]` | GET, PATCH | `auth: 'system_admin'` × 2 |
| `admin/products/[productId]/status` | PATCH | `auth: 'system_admin'` |
| `admin/products/[productId]/sync-stripe` | POST | `auth: 'system_admin'` |
| `admin/products/[productId]/audit` | GET | `auth: 'system_admin'` |
| `admin/products/[productId]/games` | GET | `auth: 'system_admin'` |
| `admin/products/[productId]/games/[gameId]` | DELETE | `auth: 'system_admin'` |
| `admin/products/bundles` | GET | `auth: 'system_admin'` |
| `admin/products/exists` | GET | `auth: 'system_admin'` |
| `admin/products/search` | POST | `auth: 'system_admin'` |
| `admin/products/bulk` | POST | `auth: 'system_admin'` |

### Sub-batch 4a-2: `admin/categories/*` + `admin/analytics/*` (4 routes, 6 handlers)

| Route | Methods | Wrapper Config |
|-------|---------|---------------|
| `admin/categories` | GET, POST, PATCH | `auth: 'system_admin'` × 3 |
| `admin/categories/sync-bundle` | POST | `auth: 'system_admin'` |
| `admin/analytics/overview` | GET | `auth: 'system_admin'` |
| `admin/analytics/sessions/[sessionId]` | GET | `auth: 'system_admin'` |

### Sub-batch 4a-3: Other pure system_admin (1 route)

| Route | Methods | Wrapper Config | Notes |
|-------|---------|---------------|-------|
| `admin/gamification/awards/requests/[requestId]` | PATCH | `auth: 'system_admin'`, `rateLimit` | Has existing `applyRateLimitMiddleware` → move to wrapper config |

### Sub-batch 4a-4: Mixed auth (3 routes, 7 handlers)

| Route | Method | Wrapper Config |
|-------|--------|---------------|
| `products/` | GET | `auth: 'public'` (no auth, RLS scoped) |
| `products/` | POST | `auth: 'system_admin'` |
| `products/[productId]` | GET | `auth: 'public'` |
| `products/[productId]` | PATCH | `auth: 'system_admin'` |
| `products/[productId]` | DELETE | `auth: 'system_admin'` |
| `tenants/` | GET | `auth: 'user'` (soft role filter in handler) |
| `tenants/` | POST | `auth: 'system_admin'` |

---

## 9. Success Criteria

### Per sub-batch:
- `npx tsc --noEmit` = 0 errors
- Smoke-check: each route returns expected response with valid auth
- Auth-check: 401 without auth (except `auth: 'public'`), 403 with wrong role
- `tenantAuth` import removed from migrated files

### Batch 4 complete:
- 52 tenantAuth API route files migrated
- Coverage ≥ 63%
- `tenantAuth.ts` only imported by server actions (12 files)
- No auth regressions in admin panel operations

### Post-Batch 4:
- Update `launch-control.md`: coverage, auth classification, changelog
- Update `api-consistency-remediation.md`: Batch 4 status → ✅ KLAR
- Mark APC-008 as resolved
