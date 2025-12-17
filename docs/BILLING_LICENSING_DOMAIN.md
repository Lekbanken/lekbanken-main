# BILLING & LICENSING DOMAIN

## Metadata
- **Status:** Active
- **Last updated:** 2025-12-17
- **Source of truth:** Repo code + `supabase/migrations/*` (schema) + `types/supabase.ts` (generated)

## Scope
Billing & Licensing owns:
- What customers can buy (plans/products) and what they include
- Tenant subscriptions (status, renewal, seats purchased)
- Seat assignment (who consumes a seat)
- Invoicing and payments (and Stripe-backed flows)
- Admin visibility over billing/licensing state

Non-goals:
- Product catalog semantics (domain `products` table). Billing has its own `billing_products` today.
- General tenant lifecycle (owned by Tenant Domain).

## Related code (repo-anchored)

### Docs
- Stripe integration (detailed): `docs/STRIPE.md`
- Admin UX references: `docs/ADMIN_DESIGN_SYSTEM.md`

### API routes (App Router)
- Products:
  - `app/api/billing/products/route.ts`
- Stripe subscription creation:
  - `app/api/billing/create-subscription/route.ts`
- Stripe webhooks:
  - `app/api/billing/webhooks/stripe/route.ts`
- Tenant subscription:
  - `app/api/billing/tenants/[tenantId]/subscription/route.ts`
- Seats:
  - `app/api/billing/tenants/[tenantId]/seats/route.ts`
  - `app/api/billing/tenants/[tenantId]/seats/[seatId]/route.ts`
- Stripe customer mapping:
  - `app/api/billing/tenants/[tenantId]/stripe-customer/route.ts`
- Invoices:
  - `app/api/billing/tenants/[tenantId]/invoices/route.ts`
  - `app/api/billing/tenants/[tenantId]/invoices/[invoiceId]/route.ts`
  - `app/api/billing/tenants/[tenantId]/invoices/stripe/route.ts`
- Payments:
  - `app/api/billing/tenants/[tenantId]/invoices/[invoiceId]/payments/route.ts`
  - `app/api/billing/tenants/[tenantId]/invoices/[invoiceId]/payments/[paymentId]/route.ts`

### Stripe client config
- `lib/stripe/config.ts`

### UI
- Checkout:
  - `components/billing/SubscriptionCheckout.tsx`
  - `components/billing/StripePaymentElement.tsx`
- Admin pages:
  - `app/admin/billing/page.tsx`
  - `app/admin/billing/subscriptions/page.tsx`
  - `app/admin/licenses/page.tsx`

## Data model (current)

The billing API routes are built around these tables:
- `billing_products` (+ `billing_product_features`) – sellable plans/products in billing context
- `tenant_subscriptions` – latest subscription per tenant (status, seats, renewal)
- `tenant_seat_assignments` – per-user seat consumption for a tenant subscription
- `billing_accounts` – links tenant/user to provider customer (Stripe)
- `invoices` – tenant invoices (draft/issued/sent/paid/overdue/canceled)
- `payments` – invoice payments, including Stripe identifiers when relevant
- `billing_events` – audit log of inbound Stripe webhook events
- `payment_methods` – stored payment methods (if enabled)

### Important drift/legacy surfaces
There are still legacy/placeholder paths in the repo that refer to older tables/fields:
- `lib/services/billingService.ts` uses `billing_plans`, `subscriptions`, `billing_history` (legacy model)
- `app/admin/licenses/page.tsx` currently derives "licenses" from `tenants.subscription_tier` and `tenants.subscription_status` and uses member counts as a proxy for seats

Treat the API routes under `app/api/billing/**` as the primary implementation surface for the modern Billing domain.

## Core flows

### 1) List products (pricing/plans)
- `GET /api/billing/products`
- Returns active `billing_products` and attached `billing_product_features`.

### 2) Create subscription (Stripe Payment Element)
- `POST /api/billing/create-subscription`
- Uses Stripe (`lib/stripe/config.ts`) to create a subscription and returns a PaymentIntent `client_secret`.
- Inserts a row into `tenant_subscriptions` when the incoming Stripe price maps to `billing_products.stripe_price_id`.

See `docs/STRIPE.md` for environment variables and local testing with Stripe CLI.

### 3) Keep local state in sync (Stripe webhook)
- `POST /api/billing/webhooks/stripe`
- Verifies signature with the configured webhook secret.
- Logs every event into `billing_events`.
- Updates local `tenant_subscriptions`/`invoices`/`payments` for selected event types.

### 4) Seats (license consumption)
- `GET /api/billing/tenants/:tenantId/seats`
- `POST /api/billing/tenants/:tenantId/seats`

Seat assignment enforces capacity:
- Counts active assignments for the subscription
- Prevents assignment when `count >= tenant_subscriptions.seats_purchased`

### 5) Invoices and payments
- `GET /api/billing/tenants/:tenantId/invoices` (+ optional `?status=...&limit=...`)
- `POST /api/billing/tenants/:tenantId/invoices`
- Payment endpoints are nested under invoice id.
- Stripe invoice creation exists at `POST /api/billing/tenants/:tenantId/invoices/stripe`.

## API surface (summary)
- `GET /api/billing/products`
- `POST /api/billing/create-subscription`
- `POST /api/billing/webhooks/stripe`
- `GET|POST|PATCH /api/billing/tenants/:tenantId/subscription`
- `GET|POST /api/billing/tenants/:tenantId/seats`
- `GET|PATCH /api/billing/tenants/:tenantId/seats/:seatId`
- `POST /api/billing/tenants/:tenantId/stripe-customer`
- `GET|POST /api/billing/tenants/:tenantId/invoices`
- `GET|PATCH /api/billing/tenants/:tenantId/invoices/:invoiceId`
- `GET|POST /api/billing/tenants/:tenantId/invoices/:invoiceId/payments`
- `GET|PATCH /api/billing/tenants/:tenantId/invoices/:invoiceId/payments/:paymentId`
- `POST /api/billing/tenants/:tenantId/invoices/stripe`

## Security model (as implemented)

### AuthN
- Billing routes use `createServerRlsClient()` and require a signed-in user.

### AuthZ
- Read endpoints generally require any tenant membership.
- Write endpoints require tenant role `owner` or `admin`.
- Webhook endpoint uses admin client patterns to bypass RLS and must rely on Stripe signature verification.

## Validation checklist
- `GET /api/billing/products` returns active products.
- `POST /api/billing/create-subscription` returns a `clientSecret` when Stripe is enabled.
- Stripe webhook signature verification is active and events appear in `billing_events`.
- `GET /api/billing/tenants/:tenantId/subscription` returns the latest `tenant_subscriptions` row.
- Seat assignment blocks at capacity (`seats_purchased`).
- Invoice endpoints enforce tenant membership (read) and owner/admin (write).

## Known gaps / next hardening steps
- Unify legacy `billing_plans/subscriptions` paths with the newer `billing_products/tenant_subscriptions` model.
- Decide the canonical source for "licenses": `tenant_subscriptions` + `tenant_seat_assignments` is the most complete today; `tenants.subscription_*` looks like a placeholder.
- Cross-domain integration: connect domain `products` table to `billing_products` (or replace billing_products) to avoid drift.
