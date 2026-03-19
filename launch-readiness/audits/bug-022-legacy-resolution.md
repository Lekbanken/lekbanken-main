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
