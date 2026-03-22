# Wave 1 Batch B — Post-Fix Verification

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-19
- Last updated: 2026-03-21
- Last validated: 2026-03-19

> Historical postfix verification snapshot for the Wave 1 Batch B fixes. Use this as bounded closure evidence rather than an active operating guide.

> Created: 2026-03-19
> Author: Claude (implementation + verification agent)
> Scope: BUG-019+025 second pass, BUG-022 second pass, BUG-006 phase 2

---

## Summary

| Bug | Fix Applied | Verdict | Status |
|-----|-------------|---------|--------|
| BUG-019+025 | Remove broken `provisioning` claim; fix split-brain on partial failure | **CLOSED** | ✅ KLAR |
| BUG-022 | Skip legacy path when `!userId` | **CLOSED** | ✅ KLAR |
| BUG-006 | Route param canonical for 9 pages | **CLOSED** | ✅ KLAR |

---

## BUG-019 + BUG-025 — Cart provisioning split-brain (second pass)

### Problems found

1. **CHECK constraint violation**: First-pass idempotency guard used `status: 'provisioning' as never`. The `purchase_intents_status_chk` constraint only allows `draft|awaiting_payment|paid|provisioned|failed|expired`. The TypeScript `as never` cast bypassed TS but not PostgreSQL — every webhook invocation would fail at the DB level.

2. **Split-brain**: If product 2/3 failed entitlement insert, `provisioningFailed = true` but intent was marked `provisioned` unless ALL products failed (`provisionedEntitlementIds.length === 0`). User paid for 3, received 2, status said "provisioned."

### Fix applied

**File:** `app/api/billing/webhooks/stripe/route.ts`

1. Removed `provisioning` intermediate status and its claim guard entirely
2. Added `metadata` to initial intent SELECT (for preserving existing metadata on partial-failure update)
3. Added early return for `failed` status (terminal — manual intervention)
4. Post-loop logic now has three branches:
   - ALL products failed → mark `failed` (terminal)
   - Partial failure → leave as `paid`, store `metadata.partial_provisioning`, return (Stripe retries)
   - ALL products succeeded → mark `provisioned` ✅

### Verification

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Single product, success | ✅ | ✅ |
| Single product, failure | ✅ | ✅ |
| Multi-product, all succeed | ✅ | ✅ |
| Multi-product, all fail | ✅ | ✅ |
| Multi-product, partial fail | ❌ `provisioned` (split-brain) | ✅ stays `paid`, retry heals |
| Concurrent webhooks | ❌ CHECK constraint violation | ✅ both run, idempotent per-entitlement |
| Replay after `provisioned` | ✅ | ✅ |
| Replay after `failed` | ❌ not handled | ✅ early return |

### Idempotency preserved

- Existing entitlement check before insert → no duplicate entitlements
- Seat assignment 23505 tolerance → no duplicate seats
- Membership 23505 tolerance → no duplicate memberships
- Intent final update is idempotent (same status)

### Status: CLOSED ✅

---

## BUG-022 — Legacy billing fallback (second pass)

### Problem found

The canonical entitlement path skips when `!userId` (lines 44-48). The legacy `tenant_subscriptions` path ran unconditionally — request with `tenantId` but no `userId` could get products via legacy.

### Fix applied

**File:** `app/api/games/utils.ts`

Added early return before legacy path when `!userId`, matching canonical path's guard.

### Why no seat enforcement

The `tenant_subscriptions` RLS policy (`tenant_subscriptions_admin`) restricts to system admins and tenant admin/owner. This policy already serves as an access gate. Adding seat enforcement would break legacy tenants that haven't migrated to the entitlement model. The correct long-term fix is migrating all tenants to entitlements, at which point the legacy block can be removed.

### Verification

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Auth user with userId, active sub | ✅ products returned | ✅ same |
| Auth user with userId, paused sub | ✅ no products (pass 1 fix) | ✅ same |
| No userId, active sub | ❌ products leaked | ✅ early return, no products |
| Non-member auth user, active sub | ✅ RLS blocks | ✅ RLS blocks + userId guard |

### Status: CLOSED ✅

---

## BUG-006 — Tenant context drift (phase 2)

### Problem found

All 9 context-dependent pages under `/admin/tenant/[tenantId]/` used `useTenant()` to get `tenantId`, relying on TenantRouteSync to bridge the route param into context. This created a race condition on initial load/navigation — context could be null or stale momentarily.

### Fix applied

9 pages converted from `useTenant()` to `use(params)` (React 19 pattern):

| Page | Change | Notes |
|------|--------|-------|
| analytics/page.tsx | `useTenant()` → `use(params)` | Import removed |
| billing/page.tsx | `useTenant()` → `use(params)` | Import removed |
| content/page.tsx | `useTenant()` → `use(params)` | Import removed |
| games/page.tsx | `useTenant()` → `use(params)` | Import removed |
| gamification/page.tsx | `useTenant()` → `use(params)` | Import removed |
| gamification/achievements/page.tsx | `useTenant()` → `use(params)` for ID | `useTenant()` kept for `currentTenant?.name` display |
| licenses/page.tsx | `useTenant()` → `use(params)` | Import removed |
| members/page.tsx | `useTenant()` → `use(params)` | Import removed |
| subscription/page.tsx | `useTenant()` → `use(params)` | Import removed |

### Current architecture (post-fix)

| Sourcing Method | Count | Pages |
|----------------|-------|-------|
| Route param (use(params) / await params) | 16 | sessions, participants, legal, security/mfa, analytics, billing, content, games, gamification, achievements, licenses, members, subscription |
| Static (no tenant data) | 2 | dashboard, settings |
| useTenant() correctly (no route param available) | 13 | Pages under `/admin/` outside `[tenantId]` segment |

### Status: CLOSED ✅

---

## Type Safety

`npx tsc --noEmit` → 0 errors after all three fixes.

---

## Files Modified

| File | Bug | Change |
|------|-----|--------|
| `app/api/billing/webhooks/stripe/route.ts` | BUG-019+025 | Removed `provisioning` claim; 3-branch post-loop (all-fail/partial/success); metadata tracking |
| `app/api/games/utils.ts` | BUG-022 | Early return when `!userId` before legacy path |
| `app/admin/tenant/[tenantId]/analytics/page.tsx` | BUG-006 | `use(params)` replaces `useTenant()` |
| `app/admin/tenant/[tenantId]/billing/page.tsx` | BUG-006 | `use(params)` replaces `useTenant()` |
| `app/admin/tenant/[tenantId]/content/page.tsx` | BUG-006 | `use(params)` replaces `useTenant()` |
| `app/admin/tenant/[tenantId]/games/page.tsx` | BUG-006 | `use(params)` replaces `useTenant()` |
| `app/admin/tenant/[tenantId]/gamification/page.tsx` | BUG-006 | `use(params)` replaces `useTenant()` |
| `app/admin/tenant/[tenantId]/gamification/achievements/page.tsx` | BUG-006 | `use(params)` for ID; `useTenant()` kept for `.name` |
| `app/admin/tenant/[tenantId]/licenses/page.tsx` | BUG-006 | `use(params)` replaces `useTenant()` |
| `app/admin/tenant/[tenantId]/members/page.tsx` | BUG-006 | `use(params)` replaces `useTenant()` |
| `app/admin/tenant/[tenantId]/subscription/page.tsx` | BUG-006 | `use(params)` replaces `useTenant()` |

---

## Remaining Related Bugs (NOT addressed by Batch B)

| Fixed Bug | Related Bug | Relationship | Status |
|-----------|-------------|-------------|--------|
| BUG-019+025 | BUG-020 | Seat oversubscription race (TOCTOU) | Blocked on DD-RACE-1 |
| BUG-022 | BUG-026 | No-product tenant = all games hidden | Wave 2 |
| BUG-006 | — | No related open bugs in this family | — |
