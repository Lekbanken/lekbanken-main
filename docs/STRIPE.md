# Stripe Integration Documentation

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

## Related code (source of truth)

- `lib/stripe/config.ts`
- `lib/config/env.ts`
- `app/api/billing/create-subscription/route.ts`
- `app/api/billing/webhooks/stripe/route.ts`
- `app/api/billing/tenants/[tenantId]/stripe-customer/route.ts`
- `app/api/billing/tenants/[tenantId]/subscription/route.ts`
- `app/api/billing/tenants/[tenantId]/invoices/stripe/route.ts`

## Validation checklist

- Environment variables described here exist in `lib/config/env.ts` and `.env.local.example`.
- Key selection logic matches `lib/stripe/config.ts` (`STRIPE_USE_LIVE_KEYS` + production behavior).
- Webhook route verifies signatures using the configured webhook secret.
- API authorization rules (tenant owner/admin) are enforced in the routes listed above.

## Overview

This document describes the complete Stripe integration in Lekbanken, including subscription management, payment processing, and webhook handling.

## Architecture

### Central Configuration (`lib/stripe/config.ts`)

All Stripe functionality is centralized in a single configuration file that:

- **Singleton Pattern**: Single Stripe client instance across the application
- **Environment-Aware**: Automatically switches between test/live keys based on `NODE_ENV`
- **Defensive Validation**: Throws clear errors if environment variables are missing
- **Utility Functions**: Common operations like amount conversion and error handling

```typescript
import { stripe, stripePublishableKey, stripeWebhookSecret } from '@/lib/stripe/config'
```

### Environment Variables

#### Test Mode (Development)
```env
STRIPE_ENABLED=true
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_TEST_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
```

#### Live Mode (Production)
```env
STRIPE_ENABLED=true
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_LIVE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
```

#### Override for Testing
```env
STRIPE_USE_LIVE_KEYS=true  # Force live keys in development (use with caution!)
```

## Database Schema

### `tenant_subscriptions`
Stores subscription records for tenants.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | Reference to tenant |
| `billing_product_id` | uuid | Reference to billing product |
| `stripe_subscription_id` | text | Stripe subscription ID (sub_xxx) |
| `status` | enum | `trial`, `active`, `canceled`, `paused` |
| `seats_purchased` | integer | Number of seats |
| `start_date` | date | Subscription start |
| `renewal_date` | date | Next billing date |
| `cancelled_at` | timestamptz | Cancellation timestamp |

### `billing_accounts`
Maps tenants/users to Stripe customers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | Tenant (if B2B) |
| `user_id` | uuid | User (if B2C) |
| `provider` | text | Always 'stripe' |
| `provider_customer_id` | text | Stripe customer ID (cus_xxx) |

### `payment_methods`
Stores saved payment methods (cards).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | Owner tenant |
| `stripe_payment_method_id` | text | Stripe PM ID (pm_xxx) |
| `type` | text | Payment method type (card) |
| `last4` | text | Last 4 digits |
| `brand` | text | Card brand (visa, mastercard) |
| `is_default` | boolean | Default payment method |

## API Endpoints

### `POST /api/billing/create-subscription`

Creates a new Stripe subscription with automatic tax calculation.

**Request:**
```json
{
  "tenantId": "uuid",
  "priceId": "price_xxx",
  "quantity": 5,
  "customerId": "cus_xxx",  // optional
  "paymentMethodId": "pm_xxx"  // optional
}
```

**Response:**
```json
{
  "subscriptionId": "sub_xxx",
  "clientSecret": "pi_xxx_secret_yyy",
  "status": "incomplete",
  "customerId": "cus_xxx"
}
```

**Authorization:** Requires tenant owner or admin role.

**Flow:**
1. Validates user has permission for tenant
2. Creates/retrieves Stripe customer
3. Creates subscription with `payment_behavior: default_incomplete`
4. Enables automatic tax calculation
5. Returns `client_secret` for Payment Element
6. Saves subscription record to database

### `POST /api/billing/webhooks/stripe`

Handles Stripe webhook events.

**Supported Events:**

#### Subscription Events
- `customer.subscription.created` - Initial subscription creation
- `customer.subscription.updated` - Status changes, renewals
- `customer.subscription.deleted` - Cancellations

**Actions:**
- Updates `tenant_subscriptions` status
- Updates `renewal_date` from `current_period_end`
- Sets `cancelled_at` on deletions

#### Invoice Events
- `invoice.paid` / `invoice.payment_succeeded` - Payment confirmed
- `invoice.payment_failed` - Payment declined

**Actions:**
- Updates invoice status in database
- Creates payment record
- Logs event to `billing_events`

#### Refund Events
- `charge.refunded` - Refund processed

**Actions:**
- Updates payment status to `refunded`
- Marks invoice as `canceled`

**Security:**
- Validates webhook signature using `STRIPE_WEBHOOK_SECRET`
- Logs all events to `billing_events` table for audit trail

### Legacy Endpoints (Migrated)

#### `POST /api/billing/tenants/[tenantId]/stripe-customer`
Creates or retrieves Stripe customer for tenant.

#### `POST /api/billing/tenants/[tenantId]/invoices/stripe`
Creates a send_invoice for B2B customers (14-day payment terms).

## Frontend Components

### `<SubscriptionCheckout>`
Complete checkout flow wrapper component.

**Props:**
```typescript
{
  tenantId: string;        // Tenant UUID
  priceId: string;         // Stripe price ID
  quantity?: number;       // Number of seats (default: 1)
  onSuccess?: (subId: string) => void;
  onError?: (error: string) => void;
}
```

**Usage:**
```tsx
import { SubscriptionCheckout } from '@/components/billing/SubscriptionCheckout'

<SubscriptionCheckout
  tenantId={tenantId}
  priceId="price_xxx"
  quantity={5}
  onSuccess={(subId) => router.push('/billing/success')}
  onError={(error) => console.error(error)}
/>
```

**Features:**
- Automatically calls `/api/billing/create-subscription`
- Initializes Stripe Elements with `clientSecret`
- Shows loading and error states
- Handles full payment flow

### `<StripePaymentElement>`
Payment form component (used internally by `SubscriptionCheckout`).

**Props:**
```typescript
{
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: string) => void;
  returnUrl?: string;  // Redirect after payment
}
```

**Features:**
- Renders Stripe Payment Element
- Handles `stripe.confirmPayment()`
- Error handling and validation
- Loading states during processing

## Testing with Stripe CLI

### Setup
```powershell
# Already authenticated with your account
stripe --version  # Should show 1.33.0
```

### Local Webhook Testing
```powershell
# Forward webhooks to local dev server
stripe listen --forward-to localhost:3000/api/billing/webhooks/stripe

# Output will show webhook signing secret:
# > Ready! Your webhook signing secret is whsec_xxx
# Add this to .env.local as STRIPE_TEST_WEBHOOK_SECRET
```

### Trigger Test Events
```powershell
# Test subscription created
stripe trigger customer.subscription.created

# Test subscription updated
stripe trigger customer.subscription.updated

# Test payment succeeded
stripe trigger invoice.payment_succeeded

# Test payment failed
stripe trigger invoice.payment_failed
```

### Test with Real Data
```powershell
# Create a test subscription
stripe subscriptions create \
  --customer cus_xxx \
  --items[0][price]=price_xxx

# Cancel a subscription
stripe subscriptions update sub_xxx --cancel-at-period-end=true

# Simulate failed payment
stripe invoices pay inv_xxx --failure-message="card_declined"
```

## Test Cards

Use these card numbers in test mode:

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0025 0000 3155` | 3D Secure required |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0069` | Charge expires before capture |

**Any future expiry date and any 3-digit CVC work.**

## Stripe Tax Configuration

The integration enables automatic tax calculation:

```typescript
automatic_tax: {
  enabled: true
}
```

**Requirements:**
1. Configure tax settings in Stripe Dashboard
2. Add business address to Stripe account
3. Enable tax registration for relevant regions

**Testing:**
- Use Norwegian address → 25% MVA applied
- Use Swedish address → 25% moms applied
- Use US address → Tax varies by state

## Error Handling

### Client-Side Errors
The integration provides user-friendly error messages:

```typescript
import { isStripeError, getStripeErrorMessage } from '@/lib/stripe/config'

try {
  const result = await stripe.confirmPayment(...)
} catch (error) {
  if (isStripeError(error)) {
    // Stripe-specific error handling
    const message = getStripeErrorMessage(error)
    // "Your card was declined" etc.
  }
}
```

### Common Stripe Error Codes
- `card_declined` - Card was declined by issuer
- `insufficient_funds` - Not enough funds
- `invalid_expiry_month` - Invalid expiration date
- `authentication_required` - 3D Secure needed
- `processing_error` - Temporary issue, retry

### Server-Side Errors
All API endpoints return structured errors:

```json
{
  "error": "Human readable message",
  "code": "stripe_error_code",
  "message": "Detailed technical message"
}
```

## Utility Functions

### Amount Conversion

```typescript
import { toStripeAmount, fromStripeAmount } from '@/lib/stripe/config'

// NOK 99.50 → 9950 øre (cents)
const amount = toStripeAmount(99.50, 'NOK')

// 9950 øre → NOK 99.50
const price = fromStripeAmount(9950, 'NOK')

// Handles zero-decimal currencies automatically
toStripeAmount(1000, 'JPY')  // Returns 1000 (no conversion)
```

### Error Type Guards

```typescript
import { isStripeError, getStripeErrorMessage } from '@/lib/stripe/config'

if (isStripeError(error)) {
  // TypeScript knows this is Stripe.errors.StripeError
  console.log(error.code, error.type)
}

// Get user-friendly message
const message = getStripeErrorMessage(error)
```

## Security Best Practices

### Environment Variables
✅ **DO:**
- Separate test and live keys with different variable names
- Use `STRIPE_TEST_*` prefix for test keys
- Use `STRIPE_LIVE_*` prefix for live keys
- Keep webhook secrets separate for test/live

❌ **DON'T:**
- Use the same variable name for test and live keys
- Commit `.env.local` to git
- Expose secret keys in client-side code
- Share webhook secrets across environments

### Webhook Security
✅ **DO:**
- Always verify webhook signature
- Log all webhook events to `billing_events`
- Handle idempotency (events may be sent multiple times)
- Use webhook signing secrets

❌ **DON'T:**
- Skip signature verification
- Trust webhook data without validation
- Process the same event multiple times without checks

### API Security
✅ **DO:**
- Verify user authentication
- Check tenant permissions (owner/admin)
- Validate all input parameters
- Use RLS policies on Supabase tables

❌ **DON'T:**
- Allow unauthenticated subscription creation
- Let users create subscriptions for other tenants
- Skip input validation

## Monitoring and Debugging

### Stripe Dashboard
- View all subscriptions, customers, invoices
- Test webhook delivery and payloads
- Check logs for API errors
- Monitor payment success rates

### Application Logs
All Stripe operations log to console:

```
[stripe-config] Initializing Stripe (test mode)
[stripe-config] Using test keys: sk_test_***abc, pk_test_***xyz
[stripe-webhook] Processing event: customer.subscription.created
[billing/create-subscription] Creating subscription for tenant xxx
```

### Database Audit Trail
The `billing_events` table stores all webhook events:

```sql
SELECT 
  event_type,
  status,
  created_at,
  payload
FROM billing_events
WHERE event_type LIKE 'customer.subscription%'
ORDER BY created_at DESC;
```

## Troubleshooting

### "Stripe not configured" Error
**Cause:** Missing environment variables.

**Solution:**
```env
# Check .env.local has these:
STRIPE_ENABLED=true
STRIPE_TEST_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
```

### Webhooks Not Received
**Cause:** Webhook endpoint not accessible or signature mismatch.

**Solution:**
1. Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/billing/webhooks/stripe`
2. Copy webhook secret to `.env.local`
3. Check Stripe Dashboard > Developers > Webhooks for delivery errors

### Payment Element Not Loading
**Cause:** Invalid `clientSecret` or Stripe.js not loaded.

**Solution:**
1. Check `/api/billing/create-subscription` returns valid `clientSecret`
2. Verify `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY` in `.env.local`
3. Check browser console for errors

### Tax Not Applied
**Cause:** Automatic tax not configured in Stripe account.

**Solution:**
1. Go to Stripe Dashboard > Settings > Tax
2. Add business address
3. Enable tax registration for relevant regions
4. Test with address in configured region

## Migration Notes

### Old Code Removed
The following patterns were replaced:

❌ **Old (Don't use):**
```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
})
```

✅ **New (Use this):**
```typescript
import { stripe } from '@/lib/stripe/config'
```

### Breaking Changes
- All Stripe endpoints now require `STRIPE_ENABLED=true`
- Test/live keys must use new variable names
- Webhook secret must match environment (test/live)

## Production Checklist

Before going live:

- [ ] Configure live Stripe keys in production `.env`
- [ ] Set up production webhook endpoint in Stripe Dashboard
- [ ] Configure Stripe Tax for business regions
- [ ] Test full subscription flow with test mode
- [ ] Verify webhook signature validation works
- [ ] Set up monitoring alerts for failed payments
- [ ] Document customer support procedures
- [ ] Test subscription cancellation flow
- [ ] Verify refund handling
- [ ] Load test subscription creation endpoint

## Support and Resources

- **Stripe Documentation:** https://stripe.com/docs
- **API Reference:** https://stripe.com/docs/api
- **Test Cards:** https://stripe.com/docs/testing
- **Stripe CLI:** https://stripe.com/docs/stripe-cli
- **Tax Documentation:** https://stripe.com/docs/tax

---

**Last Updated:** December 10, 2025  
**Stripe API Version:** 2024-06-20  
**Integration Status:** ✅ Complete and Production-Ready
