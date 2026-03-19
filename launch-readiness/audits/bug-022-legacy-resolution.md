# DD-LEGACY-1 / BUG-022 — Legacy Billing Resolution

> Created: 2026-03-19  
> Author: Claude (analysis + implementation agent)  
> Decision: **Option A — Hard Cleanup (Strict Consolidation)**  
> Status: **PHASE 1 COMPLETE — Legacy fallback removed**

---

## 1. Problem Statement

`getAllowedProductIds()` in `app/api/games/utils.ts` resolves game access through **two independent paths** with inconsistent enforcement:

| Aspect | Canonical Path | Legacy Fallback |
|--------|---------------|-----------------|
| Tables | `tenant_product_entitlements` → `tenant_entitlement_seat_assignments` | `tenant_subscriptions` → `billing_products` → `products` |
| Seat enforcement | ✅ Per-user seat required | ❌ RLS role-gate only |
| Who gets access | Users with active seat assignment | Admin/owner of tenant (via RLS) |
| Status filter | `active` with date-range validation | `active`, `trial` |
| Write path | Stripe webhook (`checkout.session.completed`) | `create-subscription` route (legacy) |

**The bypass:** Any tenant admin/owner with a legacy `tenant_subscriptions` record gets game access without holding a per-user seat. This violates the canonical entitlement model.

---

## 2. Current State Map

### Write paths to `tenant_subscriptions` (legacy — 5 operations)

| File | Operation | Triggered by |
|------|-----------|-------------|
| `app/api/billing/create-subscription/route.ts` | INSERT | UI: `SubscriptionCheckout.tsx` (sandbox only) |
| `app/api/billing/tenants/[tenantId]/subscription/route.ts` POST | INSERT | Admin management |
| `app/api/billing/tenants/[tenantId]/subscription/route.ts` PATCH | UPDATE | Admin management |
| `app/api/billing/webhooks/stripe/route.ts` (subscription.updated) | UPDATE | Stripe webhook |
| `app/api/billing/webhooks/stripe/route.ts` (subscription.deleted) | UPDATE → canceled | Stripe webhook |

### Write paths to `tenant_product_entitlements` (canonical — 3 operations)

| File | Operation | Triggered by |
|------|-----------|-------------|
| `app/api/billing/webhooks/stripe/route.ts` (checkout.session.completed) | INSERT + seat assignment | Stripe webhook (via cart/checkout) |
| `app/api/billing/webhooks/stripe/route.ts` (subscription.deleted) | UPDATE → inactive | Stripe webhook |
| `app/api/admin/licenses/grant-personal/route.ts` | INSERT/UPDATE + seat | System admin grant |

### Read paths from `tenant_subscriptions` (legacy consumers)

| File | Purpose |
|------|---------|
| `app/api/games/utils.ts` (lines 75-115) | **BUG-022** — Legacy fallback access resolution |
| `app/api/billing/tenants/[tenantId]/subscription/route.ts` GET | Subscription management page |
| `features/admin/organisations/organisationDetail.server.ts` | Admin org detail view |
| `features/admin/organisations/organisationList.server.ts` | Admin org list view |
| `app/api/billing/subscription/my/route.ts` | User's subscription view |

### Canonical checkout flow (clean path)

```
User → cart/checkout → purchase_intent → Stripe → webhook
  → tenant_product_entitlements INSERT
  → tenant_entitlement_seat_assignments INSERT (auto-assign to purchaser)
```

### Legacy checkout flow (problematic path)

```
User → SubscriptionCheckout.tsx → /api/billing/create-subscription
  → tenant_subscriptions INSERT (no entitlements, no seats)
  → Stripe → webhook (subscription.updated) → tenant_subscriptions UPDATE only
```

---

## 3. Risk Assessment

| Risk | Severity | Mitigated? |
|------|----------|-----------|
| Regular members bypass seat enforcement | ❌ Does not happen — RLS blocks non-admin access to `tenant_subscriptions` | ✅ |
| Admin/owners bypass seat enforcement | ⚠️ Active risk — admin/owner sees legacy subs without seat check | ❌ **This is BUG-022** |
| Paused subscriptions grant access | Was active, now fixed | ✅ Wave 1 pass 1 |
| Unauthenticated access via legacy | Was active, now fixed | ✅ Wave 1 pass 2 |
| Legacy `create-subscription` still creates orphan records | Active — but only used in sandbox | ⚠️ Low production risk |

---

## 4. Canonical Architecture (Target State)

**Single Source of Truth:** `tenant_product_entitlements` + `tenant_entitlement_seat_assignments`

### Access resolution (after cleanup)

```
getAllowedProductIds(supabase, tenantId, userId)
  → tenant_product_entitlements WHERE tenant_id AND status='active' AND date valid
    → tenant_entitlement_seat_assignments WHERE user_id AND status='active'
      → product_id set
  → (NO legacy fallback)
```

### Database tables

| Table | Role | Status |
|-------|------|--------|
| `tenant_product_entitlements` | **Canonical** entitlement store | ✅ Keep |
| `tenant_entitlement_seat_assignments` | Per-user seat enforcement | ✅ Keep |
| `tenant_subscriptions` | Legacy billing record | ⚠️ **Retain for Stripe sync only** — not for access gating |
| `billing_products` | Product catalog (Stripe mapping) | ✅ Keep (reference data) |
| `products` | Game product catalog | ✅ Keep |

### Key principle

`tenant_subscriptions` is a **Stripe accounting record**, not an access-control table. It tracks billing state. Access is always resolved through entitlements + seats.

---

## 5. Legacy Path Classification

### DELETE (remove from access resolution)

| Item | Action | Risk |
|------|--------|------|
| Legacy fallback block in `getAllowedProductIds()` (lines 75-115) | **Remove entirely** | Low — admin/owners lose ungated access; must have proper entitlements |
| `SubscriptionCheckout.tsx` caller of `create-subscription` | Mark as sandbox-only | None — already sandbox-only |

### KEEP (operational, not for access gating)

| Item | Reason |
|------|--------|
| `tenant_subscriptions` table | Stripe webhook sync — billing record of truth |
| Webhook `subscription.updated/deleted` handlers | Keeps billing status current |
| `[tenantId]/subscription` GET/POST/PATCH routes | Admin management of billing records |
| Admin org detail/list views reading `tenant_subscriptions` | Display billing status |

### BRIDGE (ensure existing legacy tenants aren't broken)

| Item | Action |
|------|--------|
| Tenants with `tenant_subscriptions` but no `tenant_product_entitlements` | Need data migration (SQL) |
| `create-subscription` route | Should also provision entitlements + seats (bridge write) |

---

## 6. Migration Plan

### Phase 1: Remove legacy access gating (this commit)

**Code change:** Remove the legacy fallback block from `getAllowedProductIds()`.

After removal, the function only uses the canonical entitlement + seat path. No more dual-path access resolution.

### Phase 2: Data migration (SQL — assess post-cleanup)

**Goal:** For every `tenant_subscriptions` record (active/trial) that has no matching `tenant_product_entitlements`, create the missing entitlement + seat assignment.

This is a post-cleanup safety net — ensures no tenant loses access due to the removal. Should be run as a migration script with a dry-run mode.

**Query to identify affected tenants:**
```sql
SELECT ts.tenant_id, ts.id AS subscription_id, bp.billing_product_key, ts.status
FROM tenant_subscriptions ts
JOIN billing_products bp ON bp.id = ts.billing_product_id
LEFT JOIN tenant_product_entitlements tpe
  ON tpe.tenant_id = ts.tenant_id
  AND tpe.product_id = (
    SELECT p.id FROM products p WHERE p.product_key = bp.billing_product_key LIMIT 1
  )
  AND tpe.status = 'active'
WHERE ts.status IN ('active', 'trial')
  AND tpe.id IS NULL;
```

### Phase 3: Bridge `create-subscription` route (future)

If `create-subscription` is still used in production (currently sandbox-only), update it to also create entitlements + seat assignments. Low priority since canonical path is cart/checkout → webhook.

---

## 7. Decision Record

**Decision:** Option A — Hard Cleanup  
**Date:** 2026-03-19  
**Decided by:** Product owner (explicit override of Option B recommendation)

**Rationale:** The legacy dual-path creates structural ambiguity that compounds over time. With the canonical entitlement model fully operational (cart/checkout → webhook → entitlements + seats), the legacy fallback is no longer providing value — it's only providing a bypass. Removing it now, while the audit trail is fresh, is lower risk than deferring.

**Accepted trade-off:** Admin/owners of legacy-subscription-only tenants will lose ungated access until the data migration (Phase 2) provisions their entitlements. This is the correct behavior — access should require entitlements.

---

## 8. Rollout & Migration Readiness Note

> Added: 2026-03-19 — operational closure for post-DD-LEGACY-1 consequences.

### 8.1 Legacy-only tenant detection

Tenants that depend solely on `tenant_subscriptions` (no canonical entitlement data) are identified by this query:

```sql
SELECT
  ts.tenant_id,
  ts.id AS subscription_id,
  bp.billing_product_key,
  ts.status AS sub_status,
  t.name AS tenant_name
FROM tenant_subscriptions ts
JOIN billing_products bp ON bp.id = ts.billing_product_id
JOIN tenants t ON t.id = ts.tenant_id
LEFT JOIN tenant_product_entitlements tpe
  ON tpe.tenant_id = ts.tenant_id
  AND tpe.product_id = (
    SELECT p.id FROM products p
    WHERE p.product_key = bp.billing_product_key
    LIMIT 1
  )
  AND tpe.status = 'active'
WHERE ts.status IN ('active', 'trial')
  AND tpe.id IS NULL;
```

This returns every tenant that has a paying/trialing subscription but **no matching entitlement record**. These tenants are the migration targets.

**Action required:** Run this query against production (`supabase db execute` or admin dashboard) to determine the count **before any deploy that includes this commit**.

### 8.2 Migration consequence — what breaks without intervention

After the DD-LEGACY-1 code change, `getAllowedProductIds()` returns `[]` for any tenant without entitlements. The downstream effect:

| Route | Behavior when `allowedProductIds = []` | Impact |
|-------|----------------------------------------|--------|
| `/api/games/featured` | Returns `{ games: [] }` immediately | **No games shown on dashboard** |
| `/api/games/search` | Returns `{ games: [], total: 0 }` immediately (non-elevated users) | **Search returns nothing** |
| `/api/games/[gameId]` | Returns `404` (non-elevated users) | **Cannot open any game** |
| `/api/games/[gameId]/related` | Returns `{ games: [] }` | **No related games** |
| `/api/browse/filters` | Returns empty filter sets | **Browse UI shows no filters** |

**Severity classification:** This is a **controlled rollout risk**, not a launch risk. The situation only affects tenants that:
1. Were created through the legacy `create-subscription` path, AND
2. Have not gone through the canonical cart/checkout flow

If the query in §8.1 returns **zero rows**, there is no rollout risk — all tenants already have canonical entitlements.

If it returns **non-zero rows**, those tenants will lose game access until the Phase 2 migration runs. The recommended migration (§6 Phase 2) provisions entitlements + seat assignments for each affected tenant.

### 8.3 BUG-026 classification

**Classification: Rollout risk + Wave 2 design item**

BUG-026 ("Tenant with no products = all games hidden, including free/global") is **two distinct problems**:

#### Problem A — Legacy-only tenants losing access (rollout risk)

This is a direct consequence of DD-LEGACY-1. The fix is the Phase 2 data migration: provision canonical entitlements for every legacy-subscription-only tenant. Once migrated, these tenants have `allowedProductIds` and see their games.

**Status:** Covered by §8.1 + §8.2 above. Resolved by migration.

#### Problem B — Free/global games invisible to no-entitlement tenants (design gap)

This is a **separate design issue** that existed before DD-LEGACY-1. The current architecture assumes every tenant has at least one product entitlement. Tenants with zero entitlements see zero games — even games with `product_id IS NULL` (free) or `owner_tenant_id IS NULL` (global).

Five routes implement an early-return guard:
- `app/api/games/featured/route.ts` — line 32
- `app/api/games/search/route.ts` — line 162
- `app/api/games/[gameId]/route.ts` — line 32
- `app/api/games/[gameId]/related/route.ts` — line 79
- `app/api/browse/filters/route.ts` — line 145

Each returns empty results when `allowedProductIds.length === 0`, without querying for free/global games.

**The fix:** These guards should allow through queries for `product_id IS NULL` games even when `allowedProductIds` is empty. This is a code change (not a data migration) that belongs in **Wave 2**.

**Recommendation:**
- Problem A → resolve with Phase 2 data migration (pre-deploy)
- Problem B → **Wave 2 item** (requires design decision: what's the free-game visibility model?)

### 8.4 Wave 1 closure statement

**Wave 1 code/architecture remediation: COMPLETE (23/23)**

All 23 Wave 1 bugs are closed. All three design decisions (DD-MFA-1, DD-RACE-1, DD-LEGACY-1) are resolved and implemented. The codebase is structurally clean.

**Data migration / rollout follow-up: STILL REQUIRED where applicable**

The DD-LEGACY-1 code change (removing the legacy billing fallback) may affect tenants that were provisioned through the legacy `create-subscription` path and never went through canonical cart/checkout. Before deploying this commit to production:

1. **Run the detection query** (§8.1) to count affected tenants
2. **If count > 0:** Run the Phase 2 migration (§6) to provision entitlements before or alongside the deploy
3. **If count = 0:** Safe to deploy — all tenants already have canonical entitlements

BUG-026 Problem B (free/global game visibility for zero-entitlement tenants) is a separate Wave 2 item that requires a design decision on the free-game model.
