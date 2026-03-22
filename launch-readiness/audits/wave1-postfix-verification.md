# Wave 1 Post-Fix Verification

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-18
- Last updated: 2026-03-21
- Last validated: 2026-03-18

> Historical postfix verification snapshot for the first wave of bug fixes. Use this as bounded closure evidence, not as an active operating guide.

> **Created:** 2026-03-18  
> **Purpose:** Independent verification pass after Wave 1 implementation  
> **Scope:** 6 implementation families, 9 bug IDs  
> **Result:** 4 CLOSED, 3 NEEDS SECOND PASS, 2 BLOCKED (unchanged)

---

## Summary

| Family | Bug IDs | Status | Verdict |
|--------|---------|--------|---------|
| 1. Publish bypass | BUG-029, BUG-031, BUG-034 | **CLOSED** | All 4 create/update paths verified — `status: 'draft'` forced |
| 2. MFA-004 | MFA-004 | **CLOSED** | Correct columns, fail-hard, tenant-scoped device delete verified |
| 3. Search auth | BUG-027 | **CLOSED** | Intersection logic verified — no bypass possible |
| 4. Cart provisioning | BUG-019, BUG-025 | **NEEDS SECOND PASS** | Multi-product loop works; partial-failure split-brain risk |
| 5. Tenant context | BUG-006 | **PARTIALLY REMEDIATED** | Context sync fixed; pages still use context not route param |
| 6. Legacy fallback | BUG-022 | **PARTIALLY REMEDIATED** | Paused excluded; seat bypass + no-user guard still open |

---

## Family 1 — Publish Workflow Bypass

**Bug IDs:** BUG-029, BUG-031, BUG-034  
**Status:** ✅ CLOSED  

### Code paths verified

| File | Change | Verified |
|------|--------|----------|
| `app/api/games/route.ts` L51 | `status: 'draft'` (was `body.status \|\| 'draft'`) | ✅ Hardcoded, no caller override possible |
| `app/api/games/builder/route.ts` L226 | `status: 'draft' as const` (was `asGameStatus(core.status)`) | ✅ Hardcoded on create |
| `app/api/games/builder/[id]/route.ts` L497 | Conditional spread: omits status if 'published' | ✅ Cannot set published via update; can set draft |
| `app/api/games/csv-import/route.ts` L555 | `status: 'draft' as const` (was `normalizedGame.status`) | ✅ CSV data cannot override |

### Edge cases checked

- `asGameStatus()` helper (builder `[id]/route.ts` L93): Returns 'published' only for exact string 'published', else 'draft'. The conditional spread ensures even if it returns 'published', the status field is omitted from the update payload.
- **Only** `app/api/games/[gameId]/publish/route.ts` can set published status — this route was not modified and retains its cover-image + role validation.

### Remaining risks: None

---

## Family 2 — MFA-004 Silent-Fail Reset

**Bug IDs:** MFA-004  
**Status:** ✅ CLOSED  

### Code paths verified

| Check | Result |
|-------|--------|
| Column names match `types/supabase.ts` schema | ✅ `enrolled_at`, `last_verified_at`, `methods`, `grace_period_end` |
| `as unknown as SupabaseClient` cast removed | ✅ Uses typed `supabase` RLS client |
| Fail-hard on `clearError` | ✅ Returns 500, does not continue |
| Device delete tenant-scoped | ✅ `.eq('tenant_id', tenantId)` |
| Membership verification before reset | ✅ Checks `user_tenant_memberships` |
| Self-reset prevention | ✅ `userId === adminUserId` check |

### Remaining risks: None

---

## Family 3 — BUG-027 Search Auth Filter

**Bug IDs:** BUG-027  
**Status:** ✅ CLOSED  

### Code paths verified

- `games/search/route.ts` L168: `products.filter((p: string) => allowedProductIds.includes(p))`
- If caller sends products NOT in `allowedProductIds`, they are filtered out (intersection)
- If caller sends empty products, falls back to full `allowedProductIds` (server-controlled)
- No other code path between `getAllowedProductIds()` return and `effectiveProductFilter` usage

### Remaining risks: None

---

## Family 4 — BUG-019 + BUG-025 Cart Provisioning

**Bug IDs:** BUG-019, BUG-025  
**Status:** ⚠️ NEEDS SECOND PASS  

### What was verified ✅

| Check | Result |
|-------|--------|
| ID domain consistency | ✅ Cart uses `price.product_id` (UUID); webhook reads same IDs from Stripe metadata; writes to `tenant_product_entitlements.product_id` — same domain |
| Replay/idempotency | ✅ Atomic intent status transition (`draft\|awaiting_payment\|paid` → `provisioning`). Replay = early return. Existing entitlement lookup before insert. Seat `23505` tolerance |
| Entitlement per product | ✅ Loop creates entitlement for each product ID |
| Seat per product | ✅ Seat assignment runs for each provisioned entitlement |
| Bundle expansion per product | ✅ Runs per product, not just primary |

### What is NOT yet safe ⚠️

**Partial-failure split-brain:**
- If product 2 of 3 fails entitlement insert: `provisioningFailed = true`, loop continues
- If products 1 and 3 succeed: intent marked `'provisioned'`
- User paid for 3, received 2. **No mechanism to:**
  - Retry the failed product
  - Record which specific products failed
  - Alert admins
  - Distinguish `provisioned` (all OK) from `partially_provisioned`

**Impact:** Financial — user is charged full amount but missing product access. Admin has no visibility.

### Second pass requirements

1. Store failed product IDs in intent metadata (e.g., `metadata.failed_product_ids`)
2. Use `'partially_provisioned'` status when `provisioningFailed && provisionedEntitlementIds.length > 0`
3. Add structured logging / admin alert for partial failures
4. Consider admin dashboard surface to retry failed provisioning

---

## Family 5 — BUG-006 Tenant Admin Context

**Bug IDs:** BUG-006  
**Status:** ⚠️ PARTIALLY REMEDIATED  

### What was fixed ✅

| Change | Effect |
|--------|--------|
| `selectTenant` fallback for system admins | When no membership exists, falls back to direct tenant read. RLS `tenants_select_sysadmin` policy ensures only system admins succeed. |
| `TenantRouteSync` always enabled | Removed `enabled={!isSystemAdmin && hasTenantAccess}` guard. System admins now get context synced on route navigation. |

### Why it's not fully closed ⚠️

**All admin pages still use context as primary tenant source:**

| Page | Source | Pattern |
|------|--------|---------|
| `members/page.tsx` | `useTenant()` → `currentTenant?.id` | CONTEXT |
| `licenses/page.tsx` | `useTenant()` → `currentTenant?.id` | CONTEXT |
| `achievements/page.tsx` | `useTenant()` → `currentTenant?.id` | CONTEXT |
| `billing/page.tsx` | `useTenant()` → `currentTenant?.id` | CONTEXT |
| `content/page.tsx` | `useTenant()` → `currentTenant?.id` | CONTEXT |
| `analytics/page.tsx` | `useTenant()` → `currentTenant?.id` | CONTEXT |
| `games/page.tsx` | `useTenant()` → `currentTenant?.id` | CONTEXT |
| `legal/page.tsx` | Route params (RSC) | ROUTE_PARAM ✅ |
| `participants/page.tsx` | `use(params)` → prop | ROUTE_PARAM ✅ |
| `sessions/page.tsx` | `use(params)` → prop | ROUTE_PARAM ✅ |

**Risk scenario:** If TenantRouteSync `selectTenant()` call fails silently (e.g., network error, RLS denial), the page renders with stale context from previous navigation. The fix reduces this likelihood but doesn't eliminate it.

### Phase 2 requirements

1. **Canonical route param:** Admin pages under `/admin/tenant/[tenantId]/` should read tenant ID from `useParams()` or layout-provided props — not from `useTenant()` context.
2. **Context as sync target only:** TenantRouteSync stays but becomes the mechanism for keeping context in sync, not the source of truth for pages.
3. **Scope:** 7 client-component pages need migration (see table above). 3 RSC pages already use route params correctly.

---

## Family 6 — BUG-022 Legacy Billing Fallback

**Bug IDs:** BUG-022  
**Status:** ⚠️ PARTIALLY REMEDIATED  

### What was fixed ✅

- Status filter changed from `['active', 'trial', 'paused']` to `['active', 'trial']`
- Paused subscriptions no longer grant product access

### Why root cause is still open ⚠️

**Bypass vector 1 — No seat enforcement:**
- Canonical path: `entitlement → seat assignment (user-specific) → product access`
- Legacy path: `subscription → billing_product_key → product` → **adds to productIds directly**
- A tenant with an active legacy subscription grants product access to **all users** in that tenant, regardless of seat assignment

**Bypass vector 2 — No userId guard:**
- Canonical path: skips when `!userId` (line 43–44)
- Legacy path: runs unconditionally
- A request with `tenantId` but no `userId` (unauthenticated endpoint) can resolve products from legacy subscriptions

**5 runtime callers:** `browse/filters`, `games/featured`, `games/[gameId]`, `games/[gameId]/related`, `games/search`

### Second pass requirements

1. **Skip legacy path when `!userId`** (match canonical path behavior)
2. **Add seat enforcement to legacy path OR remove legacy path entirely** if migration to entitlement model is complete for all tenants
3. Data audit: check whether any active tenants rely solely on `tenant_subscriptions` without corresponding `tenant_product_entitlements`

---

## Overall Wave 1 Status

| Category | Count | IDs |
|----------|-------|-----|
| ✅ CLOSED | 4 | MFA-004, BUG-027, BUG-029 (+031, +034) |
| ⚠️ NEEDS SECOND PASS | 3 | BUG-019, BUG-025 (partial failure), BUG-006 (context), BUG-022 (seat bypass) |
| ⏳ BLOCKED | 2 | MFA-005 (DD-MFA-1), BUG-020 (DD-RACE-1) |

### Documents updated

- `post-launch-cluster-triage.md` — Corrected statuses to CLOSED / PARTIALLY REMEDIATED / NEEDS SECOND PASS; reclassified BUG-030..042 as CODEX-REPORTED; updated verdict key
- `post-launch-remediation-waves.md` — Updated family statuses with verification findings and second-pass requirements
