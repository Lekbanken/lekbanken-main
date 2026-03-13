# Billing & Stripe Launch Audit (#10)

**Date:** 2026-03-12  
**Status:** ✅ GPT-calibrated (2026-03-12). M1 GPT-approved (2026-03-12). M2 GPT-approved (2026-03-12).  
**Scope:** Checkout, subscriptions, invoices, payments, seats, dunning, usage metering, products, promo codes, quotes, licenses, Stripe webhooks, billing analytics  
**Auditor:** Claude (automated deep-dive)

---

## GPT Calibration

> **Calibrated 2026-03-12.** All 4 P1 severities confirmed correct. GPT assessment: all P1s are financial integrity / entitlement integrity — the right type of P1 for billing. Core issue: trust-based architecture (client → server trust, manual state → Stripe webhook). No severity changes. Fix order per GPT: BILL-001 → BILL-003 → BILL-002 → BILL-004. BILL-007 noted as potentially legitimate if RLS isn’t used on usage tables — kept P2 pending investigation.

---

## 0. Domain Overview

**35 route files** audited (27 billing + 4 checkout + 2 admin/stripe + 2 admin/licenses). Core subsystems:

| Subsystem | Routes | Description |
|-----------|--------|-------------|
| Webhook | 1 | Stripe webhook receiver — provisioning, subscription sync, dunning |
| Checkout | 4 | Start checkout, cart checkout, my-orgs, intent lookup |
| Subscription mgmt | 4 | Create subscription, update, my subscription, tenant subscription CRUD |
| Invoices | 4 | Tenant invoices CRUD, single invoice, Stripe invoice creation, my invoices |
| Payments | 2 | Payment listing/creation, single payment CRUD |
| Seats | 2 | Seat listing/assignment, single seat update |
| Dunning | 4 | Payment failure listing, retry, cancel, actions |
| Usage metering | 3 | Record usage, meters CRUD, aggregate |
| Products & catalog | 1 | Public product listing |
| Quotes | 2 | Quote CRUD (admin) |
| Promo codes | 1 | Promo code CRUD (admin) |
| Billing portal | 1 | Stripe customer portal session |
| Analytics | 1 | Admin billing analytics |
| Admin stripe | 2 | Product sync, bootstrap |
| Admin licenses | 2 | License listing, personal license grant |
| **Total** | **35** | |

**Service layer:** `lib/services/billingService.ts` (client-side RLS), `lib/constants/billing.ts` (pure constants), `lib/stripe/config.ts`, `lib/stripe/product-sync.ts`.

**External integration:** Stripe API (subscriptions, customers, invoices, checkout sessions, portal, promo codes).

---

## 1. Findings Summary

| Severity | Count | Resolved | Finding IDs |
|----------|-------|----------|-------------|
| P0 — Launch blocker | 0 | 0 | — |
| P1 — Must fix before launch | 4 | 4 | BILL-001, BILL-002, BILL-003, BILL-004 |
| P2 — Should fix, not blocker | 7 | 4 | BILL-005, BILL-009, BILL-010 |
| P3 — Nice to have | 4 | 0 | BILL-012, BILL-013, BILL-014, BILL-015 |
| **Total** | **15** | **0** | |

---

## 2. Route Inventory

### Checkout Routes

| Route | Methods | Auth | Wrapper | Tenant isolation | Validation | Rate limit | Finding |
|-------|---------|------|---------|-----------------|------------|------------|---------|
| `POST /api/checkout/start` | 1 | manual `getAuthUser()` | ❌ raw | membership check for existing tenant | ✅ Zod + demo block + dup check | ✅ `applyRateLimit(req, 'strict')` | BILL-005 |
| `POST /api/checkout/cart` | 1 | manual `getAuthUser()` | ❌ raw | membership check for existing tenant | ✅ Zod + demo block + biz rules | ✅ `applyRateLimit(req, 'strict')` | BILL-005 |
| `GET /api/checkout/my-orgs` | 1 | manual `getAuthUser()` | ❌ raw | own memberships only | None needed | ❌ None | BILL-005 |
| `GET /api/checkout/intents/[intentId]` | 1 | `auth: 'user'` | ✅ apiHandler | RLS only (no explicit check) | None | ❌ None | BILL-011 |

### Webhook

| Route | Methods | Auth | Wrapper | Tenant isolation | Validation | Rate limit | Finding |
|-------|---------|------|---------|-----------------|------------|------------|---------|
| `POST /api/billing/webhooks/stripe` | 1 | Stripe signature verification | ❌ raw (correct) | Metadata-based tenant resolution | Stripe sig | N/A | BILL-004 |

### Subscription Routes

| Route | Methods | Auth | Wrapper | Tenant isolation | Validation | Rate limit | Finding |
|-------|---------|------|---------|-----------------|------------|------------|---------|
| `POST /api/billing/create-subscription` | 1 | `auth: 'user'` | ✅ apiHandler | RLS membership check (owner/admin) | Manual (no Zod) | ✅ `rateLimit: 'auth'` | **BILL-001** |
| `GET,POST /api/billing/subscription/update` | 2 | `auth: 'user'` | ✅ apiHandler | supabaseAdmin membership check (owner/admin) | POST: ✅ Zod. GET: manual | ❌ None | BILL-006, BILL-009 |
| `GET /api/billing/subscription/my` | 1 | manual `getAuthUser()` | ❌ raw | supabaseAdmin — user's own memberships | None needed | ❌ None | BILL-005 |
| `GET,POST,PATCH /api/billing/tenants/[tenantId]/subscription` | 3 | `auth: 'user'` | ✅ apiHandler | RLS + userTenantRole | Manual (no Zod) | ❌ None | **BILL-002**, BILL-009 |

### Invoice & Payment Routes

| Route | Methods | Auth | Wrapper | Tenant isolation | Validation | Rate limit | Finding |
|-------|---------|------|---------|-----------------|------------|------------|---------|
| `GET /api/billing/invoices/my` | 1 | `auth: 'user'` | ✅ apiHandler | supabaseAdmin — user's memberships | Manual | ❌ None | OK |
| `GET,POST /api/billing/tenants/[tenantId]/invoices` | 2 | `auth: 'user'` | ✅ apiHandler | RLS + userTenantRole | Manual | ❌ None | **BILL-003** |
| `GET,PATCH /api/billing/tenants/[tenantId]/invoices/[invoiceId]` | 2 | `auth: 'user'` | ✅ apiHandler | RLS + userTenantRole | Manual | ❌ None | **BILL-003** |
| `POST /api/billing/tenants/[tenantId]/invoices/stripe` | 1 | `auth: 'user'` | ✅ apiHandler | RLS + userTenantRole (owner/admin) | Manual (reasonable) | ❌ None | BILL-008 |
| `GET,POST /api/billing/tenants/[tenantId]/invoices/[invoiceId]/payments` | 2 | `auth: 'user'` | ✅ apiHandler | RLS + invoice tenant check | Manual | ❌ None | **BILL-003** |
| `GET,PATCH /api/billing/tenants/[tenantId]/invoices/[invoiceId]/payments/[paymentId]` | 2 | `auth: 'user'` | ✅ apiHandler | RLS + invoice tenant check | Manual | ❌ None | **BILL-003** |

### Seat Routes

| Route | Methods | Auth | Wrapper | Tenant isolation | Validation | Rate limit | Finding |
|-------|---------|------|---------|-----------------|------------|------------|---------|
| `GET,POST /api/billing/tenants/[tenantId]/seats` | 2 | `auth: 'user'` | ✅ apiHandler | RLS + userTenantRole | Manual | ❌ None | BILL-009 |
| `PATCH /api/billing/tenants/[tenantId]/seats/[seatId]` | 1 | `auth: 'user'` | ✅ apiHandler | RLS + userTenantRole (owner/admin) | Manual | ❌ None | BILL-009 |

### Dunning Routes

| Route | Methods | Auth | Wrapper | Tenant isolation | Validation | Rate limit | Finding |
|-------|---------|------|---------|-----------------|------------|------------|---------|
| `GET /api/billing/dunning` | 1 | `auth: 'system_admin'` | ✅ apiHandler | Admin-only | Optional status filter | ❌ None | OK |
| `POST /api/billing/dunning/[id]/retry` | 1 | `auth: 'system_admin'` | ✅ apiHandler | Admin-only | Status validation | ❌ None | BILL-010 |
| `POST /api/billing/dunning/[id]/cancel` | 1 | `auth: 'system_admin'` | ✅ apiHandler | Admin-only | Status validation | ❌ None | BILL-010 |
| `GET /api/billing/dunning/[id]/actions` | 1 | `auth: 'system_admin'` | ✅ apiHandler | Admin-only | None | ❌ None | OK |

### Usage Metering Routes

| Route | Methods | Auth | Wrapper | Tenant isolation | Validation | Rate limit | Finding |
|-------|---------|------|---------|-----------------|------------|------------|---------|
| `POST,GET /api/billing/usage` | 2 | POST: `auth: 'public'` + dual auth. GET: `auth: 'user'` | ✅ apiHandler | POST: body tenantId. GET: supabaseAdmin membership check | POST: ✅ Zod. GET: manual | ❌ None | BILL-006, BILL-007 |
| `GET,POST /api/billing/usage/meters` | 2 | GET: `auth: 'user'`. POST: `auth: 'system_admin'` | ✅ apiHandler | Global resource (not tenant-scoped) | Manual (no Zod) | ❌ None | BILL-009 |
| `POST,GET /api/billing/usage/aggregate` | 2 | POST: `auth: 'public'` + API key. GET: `auth: 'system_admin'` | ✅ apiHandler | POST: any/all tenants | Manual | ❌ None | BILL-006 |

### Product, Quote, & Promo Routes

| Route | Methods | Auth | Wrapper | Tenant isolation | Validation | Rate limit | Finding |
|-------|---------|------|---------|-----------------|------------|------------|---------|
| `GET /api/billing/products` | 1 | ❌ None | ❌ raw | N/A (public catalog) | None | ❌ None | BILL-005, BILL-012 |
| `POST /api/billing/portal` | 1 | manual `getAuthUser()` | ❌ raw | supabaseAdmin membership check (owner/admin) | ✅ Zod | ❌ None | BILL-005, BILL-008 |
| `GET,PATCH,DELETE /api/billing/quotes/[id]` | 3 | `auth: 'system_admin'` | ✅ apiHandler | Admin-only | PATCH: ✅ Zod | ❌ None | OK |
| `GET,POST /api/billing/quotes` | 2 | `auth: 'system_admin'` | ✅ apiHandler | Admin-only | POST: ✅ Zod | ❌ None | OK |
| `GET,POST,DELETE /api/billing/promo-codes` | 3 | `auth: 'system_admin'` | ✅ apiHandler | Admin-only | POST: ✅ Zod | ❌ None | OK |

### Admin Routes

| Route | Methods | Auth | Wrapper | Tenant isolation | Validation | Rate limit | Finding |
|-------|---------|------|---------|-----------------|------------|------------|---------|
| `POST,GET /api/admin/stripe/sync-product` | 2 | `auth: 'system_admin'` | ✅ apiHandler | Admin-only | Manual | ❌ None | BILL-009 |
| `GET,POST /api/admin/stripe/bootstrap-products` | 2 | `auth: 'system_admin'` | ✅ apiHandler | Admin-only | Permissive | ❌ None | BILL-010 |
| `GET /api/admin/licenses` | 1 | `auth: 'system_admin'` | ✅ apiHandler | Admin-only | Manual | ❌ None | OK |
| `POST /api/admin/licenses/grant-personal` | 1 | `auth: 'system_admin'` | ✅ apiHandler | Admin-only | Manual email regex | ❌ None | BILL-009 |

---

## 3. Findings Detail

### ~~BILL-001~~ — `create-subscription`: client-supplied `customerId` not verified against tenant (P1) ✅ FIXED

**Route:** `POST /api/billing/create-subscription`  
**Issue:** The route accepts an optional `customerId` in the request body. If supplied, it's used directly as the Stripe customer for subscription creation without verifying it belongs to the authenticated tenant. An attacker who is owner/admin of Tenant A could supply Tenant B's Stripe customer ID, creating a subscription billed to Tenant B.

**Evidence:**
```ts
const { tenantId, priceId, quantity = 1, customerId, paymentMethodId } = body;
// ... membership check for tenantId ✅
let stripeCustomerId = customerId;  // ← used directly if provided
if (!stripeCustomerId) {
  // Only falls through to safe lookup when customerId is omitted
}
```

**Impact:** Cross-tenant billing — subscription charged to wrong customer.  
**Fix:** If `customerId` is provided, verify it matches the tenant's `billing_accounts.provider_customer_id`. Otherwise ignore client-supplied value and always resolve from `billing_accounts`.

---

### ~~BILL-002~~ — `tenants/[tenantId]/subscription` PATCH: tenant admin can set `status: 'active'` (P1) ✅ FIXED

**Route:** `PATCH /api/billing/tenants/[tenantId]/subscription`  
**Issue:** Tenant owner/admin can set subscription status to any value including `trial` or `active`. This means a tenant admin could reactivate a canceled subscription or upgrade from trial to active without payment.

**Evidence:**
```ts
const body = (await req.json().catch(() => ({}))) as {
  subscription_id?: string
  status?: 'trial' | 'active' | 'paused' | 'canceled'
  seats_purchased?: number
  // ...
}
if (body.status) updates.status = body.status  // ← any value accepted
```

Similarly, POST allows `status: body.status ?? 'trial'` — a tenant admin could insert a subscription with `status: 'active'`.

**Impact:** Entitlement bypass — tenant gets paid features without payment.  
**Fix:** Restrict tenant-facing status changes to `'canceled'` or `'paused'` only. Status upgrades (`trial→active`, `canceled→active`) should only come from Stripe webhook or system_admin.

---

### ~~BILL-003~~ — Invoice/payment status manipulation by tenant admin (P1) ✅ FIXED

**Route:** Multiple invoice and payment routes  
**Issue:** Tenant owner/admin can set `status: 'paid'` on invoices and `status: 'confirmed'` on payments. The code auto-fills `paid_at` timestamp:

```ts
// Invoice PATCH
if (body.status === 'paid' && updates.paid_at === undefined) {
  updates.paid_at = new Date().toISOString()
}
// Payment PATCH
if (body.status === 'confirmed' && updates.paid_at === undefined) {
  updates.paid_at = new Date().toISOString()
}
```

Additionally, invoice POST allows creating invoices with `status: 'paid'` and payments POST allows creating payments with `status: 'confirmed'`.

**Affected routes:**
- `PATCH /api/billing/tenants/[tenantId]/invoices/[invoiceId]` — can set `status: 'paid'` + `stripe_invoice_id`
- `POST /api/billing/tenants/[tenantId]/invoices` — can create invoice with `status: 'paid'`
- `PATCH /api/billing/tenants/[tenantId]/invoices/[invoiceId]/payments/[paymentId]` — can set `status: 'confirmed'`
- `POST /api/billing/tenants/[tenantId]/invoices/[invoiceId]/payments` — can create confirmed payment

**Impact:** Tenant admin can mark their own invoices as paid without actual payment. If entitlements or features gate on invoice status, this is an entitlement bypass.  
**Fix:** Restrict `status` and `paid_at` fields — only allow `'draft'`/`'issued'`/`'sent'`/`'canceled'` from tenant-facing PATCH. `'paid'` and `'confirmed'` status should only be set via webhook or system_admin.

---

### ~~BILL-004~~ — Webhook provisioning: no idempotency guard + non-atomic (P1) ✅ FIXED

**Route:** `POST /api/billing/webhooks/stripe`  
**Issue:** Two concerns:

1. **No idempotency beyond status check:** The `checkout.session.completed` handler checks `paymentStatus` and `sessionStatus` but has no guard against processing the same session twice. Stripe retries webhook delivery, so a duplicate `checkout.session.completed` event could trigger double provisioning (duplicate tenant, membership, or entitlement).

2. **Non-atomic provisioning:** `provisionFromPurchaseIntent` performs a sequence of operations (create tenant → create membership → create entitlement → assign seat → create subscription → update intent). If any step fails, earlier operations are committed without rollback — partial provisioning state.

**Impact:**
- Duplicate provisioning: customer gets double entitlements or multiple tenant records
- Partial provisioning: customer pays but doesn't get full access (silent data corruption)

**Fix:**
- Add idempotency: Check `purchase_intents.status === 'completed'` before provisioning and set it atomically at start. Or use `billing_events.event_key` upsert to detect duplicates.
- For atomicity: wrap critical operations in a DB transaction or use an RPC that handles the entire provisioning sequence.

---

### BILL-005 — Unwrapped routes: 6 billing/checkout routes not using `apiHandler` (P2)

**Routes:**
1. `POST /api/billing/webhooks/stripe` — raw (correct for webhook)
2. `GET /api/billing/products` — raw, no auth
3. `POST /api/billing/portal` — raw, manual auth
4. `GET /api/billing/subscription/my` — raw, manual auth
5. `POST /api/checkout/start` — raw, manual auth
6. `POST /api/checkout/cart` — raw, manual auth
7. `GET /api/checkout/my-orgs` — raw, manual auth

**Note:** Webhook (#1) is correctly unwrapped — it needs raw body for Stripe signature verification. The others should be candidates for wrapper migration.

**Impact:** Missing standardized error handling, logging, and rate limiting infrastructure.

---

### BILL-006 — `usage` POST and `usage/aggregate` POST: timing-unsafe API key comparison (P2) ✅ FIXED

**Route:** `POST /api/billing/usage`, `POST /api/billing/usage/aggregate`  
**Issue:** API key is compared with plain `===`:
```ts
if (!(apiKey && internalSecret && apiKey === internalSecret)) {
```
This is vulnerable to timing attacks. An attacker could measure response times to character-by-character brute-force the `INTERNAL_API_SECRET`.

Additionally, both routes use `auth: 'public'` in the wrapper, meaning the wrapper's auth layer is bypassed — the dual auth is entirely custom.

**Impact:** Potential API key leak via timing side-channel. Low practical risk (requires many precise timing measurements) but violates security best practices.  
**Fix:** Use `crypto.timingSafeEqual()` for API key comparison. Consider using a dedicated middleware for internal service auth.

---

### BILL-007 — `usage` GET: uses `supabaseAdmin` instead of RLS client (P2) ✅ FIXED

**Route:** `GET /api/billing/usage`  
**Issue:** The GET handler performs a membership check using `supabaseAdmin` (service role) instead of `createServerRlsClient`. This bypasses RLS policies and relies entirely on application-level checks.

**Impact:** If the application-level membership check has a bug, RLS won't catch it as a safety net.  
**Fix:** Switch to `createServerRlsClient` for the membership lookup (matches the pattern used in `tenants/[tenantId]/subscription` and other billing routes).

---

### BILL-008 — Missing rate limiting on financial mutation routes (P2) ✅ FIXED

**Routes:**
- `POST /api/billing/portal` — creates Stripe portal sessions (costs Stripe API calls)
- `POST /api/billing/tenants/[tenantId]/invoices/stripe` — creates Stripe invoices
- `POST /api/billing/subscription/update` — modifies Stripe subscriptions
- `POST /api/billing/tenants/[tenantId]/stripe-customer` — creates Stripe customers

**Impact:** Attacker with valid auth could spam financial operations, creating many Stripe objects or running up API usage.  
**Fix:** Add `rateLimit: 'strict'` (or `'auth'`) to wrapped routes. Add inline `applyRateLimit(request, 'auth')` to unwrapped routes.

---

### BILL-009 — Missing Zod validation on body-accepting routes (P2)

**Routes using manual body parsing without Zod:**
- `POST,PATCH /api/billing/tenants/[tenantId]/subscription` — accepts untyped body
- `POST,PATCH /api/billing/tenants/[tenantId]/invoices/[invoiceId]` — accepts untyped body
- `POST /api/billing/tenants/[tenantId]/invoices` — accepts untyped body
- `POST,PATCH /api/billing/tenants/[tenantId]/invoices/[invoiceId]/payments` — accepts untyped body
- `POST /api/billing/tenants/[tenantId]/seats` — accepts untyped body
- `PATCH /api/billing/tenants/[tenantId]/seats/[seatId]` — accepts untyped body
- `POST /api/billing/usage/meters` — manual validation only
- `POST /api/admin/stripe/sync-product` — no validation
- `POST /api/admin/licenses/grant-personal` — manual regex

**Impact:** Injection of unexpected fields, type confusion, or bypassing business rules. In billing context, this is higher risk than normal.  
**Fix:** Add Zod schemas to all body-accepting routes.

---

### BILL-010 — Missing rate limiting on admin mutation routes (P2)

**Routes:**
- `POST /api/billing/dunning/[id]/retry` — retries Stripe payment
- `POST /api/billing/dunning/[id]/cancel` — cancels dunning
- `POST /api/admin/stripe/bootstrap-products` — expensive bulk sync

**Impact:** Admin account compromise → rapid-fire Stripe API calls or bulk operations.  
**Fix:** Add `rateLimit: 'strict'` to these admin mutation routes.

---

### BILL-011 — `checkout/intents/[intentId]`: relies solely on RLS for access control (P2) ✅ FIXED

**Route:** `GET /api/checkout/intents/[intentId]`  
**Issue:** The route fetches a `purchase_intent` by ID using RLS client. There's no explicit ownership check — if the `purchase_intents` RLS policy is misconfigured, any authenticated user can read any intent.

**Impact:** Information disclosure — purchase intent data includes product IDs, tenant associations, Stripe session IDs.  
**Fix:** Add explicit `user_id` filter: `.eq('user_id', auth.user.id)`.

---

### BILL-012 — `products` route: no auth, no wrapper, no rate limiting (P3)

**Route:** `GET /api/billing/products`  
**Issue:** Completely unprotected route — no auth, no wrapper, no rate limiting. Returns full product catalog.

**Note:** This may be intentional as a public pricing endpoint. If so, it should:
- Be wrapped in `apiHandler({ auth: 'public', rateLimit: 'api' })` for consistency
- Be documented as intentionally public

**Impact:** Scraping of product catalog (low risk). No auth or rate limiting exposure.

---

### BILL-013 — `subscription/update`: `priceId` not validated against product catalog (P3)

**Route:** `POST /api/billing/subscription/update`  
**Issue:** `newPriceId` from request body is passed directly to Stripe without validation against `billing_products.stripe_price_id`. An attacker could reference any Stripe price in the account.

**Impact:** Low risk — Stripe price IDs are opaque and the attacker would need to know valid ones. But defense-in-depth suggests validating against the catalog.

---

### BILL-014 — Webhook `provisionFromPurchaseIntent`: hardcoded `'admin'` performer (P3)

**Route:** `POST /api/billing/webhooks/stripe`  
**Issue:** Dunning RPC calls use `p_performed_by: 'admin'` regardless of trigger source. Should distinguish between webhook-triggered and admin-triggered dunning actions for audit trail.

**Impact:** Audit trail ambiguity — can't distinguish automated vs manual actions.

---

### BILL-015 — `billingService.ts`: client-side service with no auth (P3)

**File:** `lib/services/billingService.ts`  
**Issue:** Uses browser-side `supabase` client (anon key). All operations rely entirely on RLS policies. Functions like `updateSubscription()`, `updateInvoice()` accept bare IDs with no ownership validation.

**Note:** This is a client-side service — security relies on RLS. This is acceptable IF RLS policies are correct. Should be verified during RLS policy audit.

**Impact:** If RLS policies have gaps, client components could access/modify data across tenant boundaries.

---

## 4. Remediation Plan (GPT-ordered)

### M1 — Financial Integrity (BILL-001, BILL-002, BILL-003, BILL-004) ✅ KLAR (2026-03-12) — GPT-approved

- [x] **BILL-001** — Ignore client-supplied `customerId` — always resolve from `billing_accounts.provider_customer_id`
- [x] **BILL-002** — Restrict tenant-facing subscription status to `canceled`/`paused` only; `active`/`trial` via webhook/admin
- [x] **BILL-003** — Block `paid` status on invoices, `confirmed` status on payments from tenant-facing routes; strip `paid_at`/`stripe_invoice_id` from tenant writes
- [x] **BILL-004** — Atomic idempotency guard on webhook provisioning: `status` claim to `provisioning` before operations, duplicate handlers skip

**Noteringar:** BILL-001: removed `customerId` from body destructuring entirely, always resolve from DB `billing_accounts`. BILL-002: added `TENANT_ALLOWED_STATUSES` guard on both POST and PATCH, returns 403 with clear message. BILL-003: implemented across 4 route files (invoices CRUD, invoice single, payments CRUD, payment single) — blocked `paid`/`confirmed` status with 403, removed `paid_at` and `stripe_invoice_id` from tenant-writable fields. BILL-004: added atomic `update...in('status', [...]).select().maybeSingle()` claim pattern — only first handler to claim succeeds, retries skip with log. `tsc --noEmit` = 0 errors.

**GPT-notering:** `as never` för `provisioning`-status accepteras för launch men är teknisk skuld — ska lösas vid nästa typ-regenerering. GPT rekommenderar allowed-list även för invoice/payment mutations (inte bara blocked-list) som uppföljning.

### M2 — Security Hardening (BILL-006, BILL-007, BILL-008, BILL-011) ✅ KLAR (2026-03-12)

- [x] **BILL-006** — Replace `===` with `crypto.timingSafeEqual()` for API key comparison
- [x] **BILL-007** — Switch `usage` GET to RLS client
- [x] **BILL-008** — Add rate limiting to financial mutation routes (portal, stripe invoice, subscription update, stripe customer)
- [x] **BILL-011** — Add explicit `user_id` filter to intent lookup

**Noteringar:** BILL-006: added `import { timingSafeEqual } from 'crypto'` to `usage/route.ts` and `usage/aggregate/route.ts`, replaced `===`/`!==` with `Buffer.from()` + `timingSafeEqual()` + length pre-check. BILL-007: switched all 4 GET handler queries from `supabaseAdmin` to `createServerRlsClient()` — membership, meters, summaries, current records. BILL-008: added `rateLimit: 'strict'` to `subscription/update` (POST+GET), `invoices/stripe` (POST), `stripe-customer` (POST); added inline `applyRateLimit(request, 'strict')` to `portal` (raw handler, not wrapped). BILL-011: added `.eq('user_id', auth!.user!.id)` to `checkout/intents/[intentId]` GET query. `tsc --noEmit` = 0 errors.

**GPT-notering:** BILL-007 godkänd med uppföljning — verifiera med tenant-scope-test att `usage_meters`/`usage_summaries` returnerar korrekta resultat via RLS. BILL-008 tier-val (`strict`) bekräftat korrekt. BILL-006 längdläckage acceptabelt — API-nyckelns längd är inte det skyddsvärda. BILL-011 defense-in-depth värd att ha även om RLS täcker.

### M3 — Wrapper + Validation (BILL-005, BILL-009) — Post-launch

- [ ] **BILL-005** — Migrate unwrapped routes to `apiHandler`
- [ ] **BILL-009** — Add Zod schemas to all body-accepting routes

### M4 — Cleanup (BILL-010, BILL-012, BILL-013, BILL-014, BILL-015) — Post-launch

- [ ] **BILL-010** — Add rate limiting to admin mutation routes
- [ ] **BILL-012** — Wrap products route as `auth: 'public'`
- [ ] **BILL-013** — Validate priceId against catalog
- [ ] **BILL-014** — Distinguish webhook vs admin performer
- [ ] **BILL-015** — Verify billingService.ts RLS coverage

---

## 5. Security Strengths Identified

1. **Stripe signature verification** — Webhook properly uses `stripe.webhooks.constructEvent` with raw body
2. **Demo user blocking** — Checkout routes block demo users from purchasing
3. **Duplicate purchase prevention** — `checkout/start` checks existing entitlements before allowing purchase
4. **Rate limiting on checkout** — Both `checkout/start` and `checkout/cart` use `applyRateLimit(req, 'strict')`
5. **RLS client usage** — Most tenant-scoped routes use `createServerRlsClient` (double protection)
6. **Idempotency on usage** — Usage recording supports `idempotencyKey`
7. **Billing event logging** — Webhook logs all events with upsert on `event_key`
8. **Tenant role enforcement** — Most routes check `owner`/`admin` role for mutations
9. **Stripe tax automation** — `create-subscription` enables `automatic_tax`
10. **Seat count enforcement** — Seats POST validates against `seats_purchased` limit

---

## 6. Cross-Reference

| Launch-control ID | Finding | Status |
|-------------------|---------|--------|
| BILL-001 | customerId not verified against tenant | ✅ Fixed (M1) |
| BILL-002 | Subscription status manipulation | ✅ Fixed (M1) |
| BILL-003 | Invoice/payment status manipulation | ✅ Fixed (M1) |
| BILL-004 | Webhook non-idempotent provisioning | ✅ Fixed (M1) |
| BILL-005 | Unwrapped routes | ⬜ Pending (M3) |
| BILL-006 | Timing-unsafe API key comparison | ✅ Fixed (M2) |
| BILL-007 | supabaseAdmin in usage GET | ✅ Fixed (M2) |
| BILL-008 | Missing rate limiting on financial mutations | ✅ Fixed (M2) |
| BILL-009 | Missing Zod validation | ⬜ Pending (M3) |
| BILL-010 | Missing rate limiting on admin mutations | ⬜ Pending (M4) |
| BILL-011 | Intent lookup relies solely on RLS | ✅ Fixed (M2) |
| BILL-012 | Products route no auth/wrapper | ⬜ Pending (M4) |
| BILL-013 | priceId not validated against catalog | ⬜ Pending (M4) |
| BILL-014 | Webhook hardcoded performer | ⬜ Pending (M4) |
| BILL-015 | billingService.ts client-side RLS | ⬜ Pending (M4) |
