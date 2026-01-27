# 🛒 Purchase Flow – Status Report & Completion Plan

**Date:** 2026-01-27  
**Author:** Architecture Analysis  
**Status:** APPROVED – Architecture Locked  
**Implementation Plan:** See [PURCHASE_FLOW_IMPLEMENTATION.md](./PURCHASE_FLOW_IMPLEMENTATION.md)

---

## Executive Summary

Lekbanken has a **solid foundation** for payments with Stripe integration, product/price sync, and an entitlement system. However, the **consumer (B2C) purchase flow is not implemented** – only the organization (B2B) path works end-to-end. Before public launch, critical gaps must be addressed: demo user purchase blocking, consumer checkout flow, and clearer access control.

### 🔒 Locked Architecture Decisions

These decisions are final and should not be revisited:

1. **Private user = private tenant** (type: 'private')
2. **Stripe = payments, Lekbanken = access control**
3. **Purchase intents as central state machine**
4. **Bundles expanded in webhook, not Stripe**

---

## 1. Current State Summary

### ✅ What Exists and Works

| Component | Status | Location |
|-----------|--------|----------|
| **Product Admin UI** | ✅ Complete | `features/admin/products/v2/` |
| **Product → Stripe sync** | ✅ Complete | `lib/stripe/product-sync.ts` |
| **Stripe Checkout (B2B)** | ✅ Complete | `app/api/checkout/start/route.ts` |
| **Webhook provisioning** | ✅ Complete | `app/api/billing/webhooks/stripe/route.ts` |
| **Entitlement creation** | ✅ Complete | Webhook creates `tenant_product_entitlements` |
| **Seat assignment** | ✅ Complete | Auto-assigns purchaser seat in webhook |
| **Purchase intent state machine** | ✅ Complete | `purchase_intents` table with status tracking |
| **Marketing pricing page** | ✅ Complete | `app/(marketing)/pricing/` |
| **Checkout start page** | ✅ Complete | `app/(marketing)/checkout/start/page.tsx` |
| **Return/polling page** | ✅ Complete | `app/(marketing)/checkout/return/page.tsx` |

### ⚠️ What Exists but is Incomplete

| Component | Gap | Risk |
|-----------|-----|------|
| **Consumer checkout** | Schema exists (`user_subscription` kind) but API hardcodes `organisation_subscription` | Consumers cannot purchase |
| **Demo purchase blocking** | RLS restricts content access but **no checkout blocker** | Demo users can accidentally pay |
| **Bundle checkout** | `product_type = 'bundle'` exists, but checkout doesn't handle bundle expansion | Cannot sell bundles |
| **Upgrade/downgrade** | No existing subscription detection or proration logic | Users create duplicate subscriptions |
| **Invoice portal** | Basic invoice tables exist but no customer-facing invoice UI | No self-service billing |

### ❌ What Does Not Exist

| Component | Impact |
|-----------|--------|
| **Inactive content upsell** | No "buy to unlock" in-app prompts |
| **Subscription cancellation UI** | Users must contact support to cancel |
| **Multi-product cart** | Cannot buy multiple items in single checkout |
| **Coupon/discount management** | Stripe allows promo codes but no admin UI |
| **Revenue analytics dashboard** | No MRR/churn visibility for product team |

---

## 2. Purchase Flow Diagram (Current B2B)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CURRENT B2B FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

User (authenticated)
       │
       ▼
┌──────────────────┐
│ /pricing         │ ← Marketing page lists products from products + product_prices
└────────┬─────────┘
         │ Click "Get Started"
         ▼
┌──────────────────┐
│ /checkout/start  │ ← User enters: organization name, selects plan, seats
└────────┬─────────┘
         │ POST /api/checkout/start
         │   → Creates purchase_intent (kind: organisation_subscription)
         │   → Creates Stripe Checkout Session
         │   → Returns checkout_url
         ▼
┌──────────────────┐
│ Stripe Checkout  │ ← Hosted Stripe page (card entry, 3D Secure)
└────────┬─────────┘
         │ Success
         ▼
┌──────────────────┐
│ /checkout/return │ ← Polls purchase_intent.status until 'provisioned'
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ STRIPE WEBHOOK (checkout.session.completed)                                  │
│                                                                              │
│ 1. Look up purchase_intent by metadata                                       │
│ 2. Create tenant (type: 'organisation')                                      │
│ 3. Create user_tenant_membership (role: owner, is_primary: true)             │
│ 4. Create tenant_product_entitlement (status: active)                        │
│ 5. Create tenant_entitlement_seat_assignment for purchaser                   │
│ 6. Update purchase_intent.status = 'provisioned'                             │
└──────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│ /app/dashboard   │ ← User redirected to their new organization
└──────────────────┘
```

---

## 3. Critical Architecture Decisions

### Decision 1: Private Users – Own Tenant vs Shared Consumer Tenant?

**Recommendation: Each private user gets their own tenant (type: 'private')**

| Approach | Pros | Cons |
|----------|------|------|
| **Own tenant per consumer** ✅ | Simple access control, same RLS patterns, easy upgrade to team | 1 tenant per user (minor DB cost) |
| **Shared "consumer tenant"** | Fewer tenants in DB | Complex RLS, hard to isolate data, migration nightmare if user wants team |

**Why own tenant wins:**
1. `tenant_product_entitlements` already works per-tenant – no code changes
2. User can later invite family members (upsell opportunity)
3. Consistent with existing `tenants.type = 'private'` enum value
4. RLS policies remain simple: `WHERE tenant_id = user's tenant`

**Implementation:**
```typescript
// In webhook provisioning, detect intent.kind
if (intent.kind === 'user_subscription') {
  // Create tenant with type: 'private' and single-seat entitlement
  // Name tenant after user: "Johan's Account"
}
```

### Decision 2: Bundle Logic – Stripe vs Lekbanken?

**Recommendation: Bundles live in Lekbanken, single Stripe price**

| Approach | Pros | Cons |
|----------|------|------|
| **Lekbanken bundles** ✅ | Full control, can change bundle contents, simpler Stripe | Must track bundle → product mapping |
| **Stripe multi-line-item** | Stripe handles line items | Complex webhook logic, hard to change bundles, price tied to Stripe |

**Implementation:**
1. Create `bundle_items` table: `bundle_product_id → child_product_id, quantity`
2. Bundle has single `product_prices` entry with total price
3. On webhook, expand bundle and create multiple entitlements:
```typescript
if (product.product_type === 'bundle') {
  const childProducts = await getBundleItems(product.id)
  for (const child of childProducts) {
    await createEntitlement(tenantId, child.product_id, child.quantity)
  }
}
```

### Decision 3: Guarantee Single Checkout per Purchase

**Current state:** Each purchase creates a new `purchase_intent` – good!

**Risk:** User can open multiple checkout tabs, or click buy twice.

**Solution (already partially implemented):**
1. `purchase_intent` has `stripe_checkout_session_id` – use Stripe's idempotency
2. Webhook checks `intent.status === 'provisioned'` before creating entities
3. Add unique constraint: `(user_id, product_id, status)` WHERE status = 'awaiting_payment'

**Implementation:**
```sql
CREATE UNIQUE INDEX purchase_intents_pending_unique 
ON purchase_intents(user_id, product_id) 
WHERE status IN ('draft', 'awaiting_payment');
```

### Decision 4: Inactive Content Upsell Flow

**Scenario:** User sees a locked game/feature, clicks to unlock.

**Recommended flow:**
```
┌─────────────────┐     ┌────────────────────────────┐
│ Locked Content  │ ──▶ │ Upsell Modal               │
│ (game/feature)  │     │ - Product name + price     │
└─────────────────┘     │ - "Unlock Now" button      │
                        └───────────┬────────────────┘
                                    │
                        ┌───────────▼────────────────┐
                        │ POST /api/checkout/start   │
                        │ (same flow, just targeted) │
                        └───────────┬────────────────┘
                                    ▼
                        ┌────────────────────────────┐
                        │ Stripe Checkout (one-time  │
                        │ or subscription upgrade)   │
                        └───────────┬────────────────┘
                                    ▼
                        ┌────────────────────────────┐
                        │ Webhook provisions access  │
                        │ → User returns to content  │
                        └────────────────────────────┘
```

**Key component:** `<UpsellButton productId={} />` that:
1. Checks current entitlement (if already owned, just enable)
2. Creates checkout for specific product
3. After success, reloads content access state

---

## 4. Phased Completion Plan

### Phase 1: Required for Launch 🚨

| Task | Effort | Priority | Owner |
|------|--------|----------|-------|
| **Block demo users from checkout** | 2h | P0 | Backend |
| Add `is_demo_user` check in `/api/checkout/start` | | | |
| Return 403 with "Demo accounts cannot purchase" | | | |
| **Consumer checkout flow** | 1d | P0 | Full-stack |
| Add `kind` parameter to checkout schema | | | |
| Create `type: 'private'` tenant in webhook when `kind = 'user_subscription'` | | | |
| UI toggle on checkout page: "For me" vs "For my organization" | | | |
| **Prevent duplicate pending intents** | 2h | P0 | Backend |
| Add unique index on `(user_id, product_id)` for pending status | | | |
| **Existing subscription detection** | 4h | P1 | Backend |
| Check if user/tenant already has active entitlement for product | | | |
| Show "You already own this" or redirect to upgrade flow | | | |
| **Cancel subscription UI** | 4h | P1 | Full-stack |
| Customer portal button → Stripe Customer Portal | | | |
| Link in `/app/settings/billing` | | | |

**Phase 1 Definition of Done:**
- [ ] Demo user sees error, cannot reach Stripe checkout
- [ ] Private user can purchase and gets own tenant
- [ ] Cannot buy same product twice
- [ ] Can cancel subscription via Stripe portal

---

### Phase 2: Revenue Optimization 💰

| Task | Effort | Priority |
|------|--------|----------|
| **Upsell component** | 2d | P2 |
| `<UpsellButton productId />` for locked content | | |
| Modal with price + buy button | | |
| Redirect back to content after purchase | | |
| **Bundle support in checkout** | 1d | P2 |
| Create `bundle_items` table | | |
| Expand bundle in webhook provisioning | | |
| **Upgrade/downgrade flow** | 2d | P2 |
| Detect existing subscription | | |
| Use Stripe proration for mid-cycle changes | | |
| **Coupon admin UI** | 1d | P2 |
| List/create Stripe promotion codes | | |
| Show redemption stats | | |
| **Invoice self-service** | 1d | P2 |
| `/app/settings/billing/invoices` page | | |
| List invoices with download PDF links (Stripe hosted) | | |

---

### Phase 3: Nice-to-Have / Scale 🚀

| Task | Notes |
|------|-------|
| **Multi-product cart** | Stripe Checkout supports multiple line items |
| **Revenue dashboard** | MRR, churn rate, LTV from `billing_events` |
| **Dunning management** | Failed payment retry logic, notifications |
| **Gift subscriptions** | Buy for someone else flow |
| **Enterprise quotes** | High-seat count flows with manual approval |
| **Usage-based billing** | Metered billing for API/session counts |

---

## 5. Explicit Risks if No Changes Are Made

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Demo user purchases by accident** | Medium | High (refund + support cost) | Phase 1: Block checkout |
| **Consumers cannot self-serve** | Certain | Critical (lost revenue) | Phase 1: Consumer flow |
| **Duplicate subscriptions** | Medium | Medium (confusion, refunds) | Phase 1: Unique index |
| **No cancellation → chargebacks** | Medium | High (fees, reputation) | Phase 1: Customer portal |
| **Locked content = dead end** | High | High (conversion loss) | Phase 2: Upsell component |
| **Bundle sales impossible** | Medium | Medium (product limitation) | Phase 2: Bundle support |
| **Member buys for org without permission** | Medium | High (billing disputes) | Phase 1: Ownership check |
| **Private tenant orphaned on user delete** | Low | Medium (data cleanup) | Phase 1: Lifecycle policy |

---

## 6. Additional Architecture Clarifications (from Review)

### 6.1 Ownership Check at Checkout

**Problem:** A member (not owner/admin) could accidentally become invoice owner.

**Rule:**
```typescript
if (kind === 'organisation_subscription' && tenantId) {
  assertUserRole(tenantId, ['owner', 'admin'])
}
```

**Applies to:** B2B purchases only. Personal purchases bypass this.

### 6.2 Private Tenant Lifecycle Policy

| Event | Action |
|-------|--------|
| User deleted | Private tenant → soft-delete (status: 'archived') |
| Subscription canceled | Entitlement → status: 'inactive', tenant remains |
| Chargeback | Entitlement → status: 'revoked', tenant remains |
| All entitlements inactive for 90 days | Candidate for cleanup (manual review) |

**Never:** Hard-delete private tenants automatically.

### 6.3 "Already Owned" Must Block Before Stripe

**Critical:** If user already has active entitlement for product:
- Never redirect to Stripe
- Show: "Already included" / "Manage subscription" / "Upgrade plan"
- This is both UX and refund prevention

### 6.4 Demo Exit Flow (Conversion Critical)

When demo user clicks purchase CTA:
1. Show modal: "You're using a demo account"
2. Options: "Create real account" | "Log in to existing"
3. Demo session ends
4. Continue to checkout

**Not:** Just show error and dead-end.

### 6.5 Bundle + Seats Semantics

| Purchase Type | Seats Meaning |
|---------------|---------------|
| Organisation bundle | Seats apply to bundle as whole (not per-child) |
| Private bundle | Always quantity = 1, no seats concept |
| Organisation single product | Seats per product |
| Private single product | Always quantity = 1 |

---

## 6. Database Schema Recommendations

### New table: `bundle_items`
```sql
CREATE TABLE bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  child_product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bundle_product_id, child_product_id)
);
```

### New index: Prevent duplicate pending purchases
```sql
CREATE UNIQUE INDEX purchase_intents_pending_unique 
ON purchase_intents(user_id, product_id) 
WHERE status IN ('draft', 'awaiting_payment');
```

### Consider: Consumer-specific tenant naming
```sql
-- In provisioning, use:
tenant_name = COALESCE(intent.tenant_name, user.display_name || '''s Account', 'My Account')
```

---

## 7. Code Change Checklist for Phase 1

### `/api/checkout/start/route.ts`
```typescript
// Add at top of POST handler:
const { data: user } = await supabaseAdmin
  .from('users')
  .select('is_demo_user')
  .eq('id', authUser.id)
  .single()

if (user?.is_demo_user) {
  return NextResponse.json(
    { error: 'Demo accounts cannot make purchases' }, 
    { status: 403 }
  )
}

// Update schema to accept optional `kind`:
const startCheckoutSchema = z.object({
  productPriceId: z.string().uuid(),
  tenantName: z.string().min(2).max(120).optional(), // Now optional for consumers
  quantitySeats: z.number().int().min(1).max(100000).optional(),
  kind: z.enum(['organisation_subscription', 'user_subscription']).default('organisation_subscription'),
})
```

### `/api/billing/webhooks/stripe/route.ts`
```typescript
// In provisionFromPurchaseIntent:
if (intent.kind === 'user_subscription') {
  // Create personal tenant
  tenantName = intent.tenant_name || `${userEmail.split('@')[0]}'s Account`
  tenantType = 'private' // Use enum value
  // quantitySeats = 1 (always for personal)
}
```

### `/checkout/start/page.tsx`
```typescript
// Add purchase type toggle:
const [purchaseType, setPurchaseType] = useState<'personal' | 'organization'>('organization')

// Conditionally show organization name field:
{purchaseType === 'organization' && (
  <Input 
    placeholder={t('fields.orgName.placeholder')} 
    value={tenantName} 
    onChange={(e) => setTenantName(e.target.value)} 
  />
)}
```

---

## Appendix: Key File Locations

| Purpose | Path |
|---------|------|
| Checkout API | `app/api/checkout/start/route.ts` |
| Webhook provisioning | `app/api/billing/webhooks/stripe/route.ts` |
| Stripe config | `lib/stripe/config.ts` |
| Product sync | `lib/stripe/product-sync.ts` |
| Marketing pricing | `app/(marketing)/pricing/page.tsx` |
| Checkout UI | `app/(marketing)/checkout/start/page.tsx` |
| Return polling | `app/(marketing)/checkout/return/page.tsx` |
| Entitlements schema | `supabase/migrations/20260121140000_entitlements_and_intents.sql` |
| Demo user schema | `supabase/migrations/20260114100000_demo_foundation.sql` |
| Billing domain docs | `docs/BILLING_LICENSING_DOMAIN.md` |
| Stripe docs | `docs/STRIPE.md` |

---

*End of Report*
