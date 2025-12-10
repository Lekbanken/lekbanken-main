# Environment Variables Documentation

This document provides a comprehensive reference for all environment variables used in the Lekbanken application.

## Quick Start

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in the required values (marked with ✅ in the tables below)

3. The application validates all required variables at startup and will fail fast with clear error messages if critical configuration is missing.

## Configuration Reference

### Supabase (Required)

All Supabase configuration is **required** for the application to function.

| Variable | Required | Purpose | Default | Example |
|----------|----------|---------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL | - | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key (public) | - | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | ⭕ | Supabase service role key (server-side only) | - | `eyJhbGc...` |

**Where to find:**
- Dashboard → Settings → API → Project URL & Keys
- URL: https://app.supabase.com/project/_/settings/api

**Security Notes:**
- `NEXT_PUBLIC_*` variables are exposed to the browser
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only, never expose in client code
- Service role key is optional but recommended for admin features

---

### Upstash Redis (Required for Rate Limiting)

Rate limiting protects API endpoints from abuse and spam attacks. These variables are **required** for production deployments.

| Variable | Required | Purpose | Default | Example |
|----------|----------|---------|---------|---------|
| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash Redis REST API endpoint | - | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash Redis authentication token | - | `AX...` |

**Where to find:**
- Create a free database at: https://console.upstash.com/
- Database → REST API → Copy REST URL and Token

**Rate Limits Configured:**
- **API General:** 100 requests/minute per IP
- **Auth Endpoints:** 10 requests/15 minutes per IP (strict to prevent brute force)
- **Media Upload:** 10 requests/minute per userId
- **Participants Join:** 10 requests/minute per IP
- **Participants Rejoin:** 30 requests/minute per IP
- **Participants State:** 60 requests/minute per participantToken

**Graceful Degradation:**
If Redis credentials are not configured, the application will:
- Log a warning on startup
- Disable rate limiting (fail open)
- Continue functioning normally

---

### Sentry (Optional - Production Monitoring)

Error tracking and performance monitoring for production environments.

| Variable | Required | Purpose | Default | Example |
|----------|----------|---------|---------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | ⭕ | Sentry project DSN | - | `https://xxx@sentry.io/yyy` |
| `SENTRY_ENVIRONMENT` | ⭕ | Environment name for Sentry | `NODE_ENV` value | `production` |
| `SENTRY_SEND_IN_DEV` | ⭕ | Send errors to Sentry in development | `false` | `false` |

**Where to find:**
- Create a project at: https://sentry.io/
- Project Settings → Client Keys (DSN)

**Behavior:**
- If `NEXT_PUBLIC_SENTRY_DSN` is not set, Sentry is disabled
- Errors are logged locally via `lib/utils/logger.ts`
- In development, Sentry is disabled by default (logs go to console)
- Set `SENTRY_SEND_IN_DEV=true` to test Sentry integration locally

**Sampling Rates:**
- Production: 10% trace sampling, 100% error sampling
- Development: 100% trace sampling (if enabled)

---

### Stripe (Optional - Payment Processing)

Payment processing for subscriptions and one-time purchases.

| Variable | Required | Purpose | Default | Example |
|----------|----------|---------|---------|---------|
| `STRIPE_ENABLED` | ⭕ | Enable Stripe integration | `false` | `true` |
| `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY` | ⭕* | Stripe test public key | - | `pk_test_xxx` |
| `STRIPE_TEST_SECRET_KEY` | ⭕* | Stripe test secret key | - | `sk_test_xxx` |
| `STRIPE_TEST_WEBHOOK_SECRET` | ⭕ | Stripe test webhook secret | - | `whsec_xxx` |
| `NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY` | ⭕* | Stripe live public key | - | `pk_live_xxx` |
| `STRIPE_LIVE_SECRET_KEY` | ⭕* | Stripe live secret key | - | `sk_live_xxx` |
| `STRIPE_LIVE_WEBHOOK_SECRET` | ⭕ | Stripe live webhook secret | - | `whsec_xxx` |
| `STRIPE_USE_LIVE_KEYS` | ⭕ | Use live keys in development | `false` | `false` |

*Required if `STRIPE_ENABLED=true`

**Where to find:**
- Test keys: https://dashboard.stripe.com/test/apikeys
- Live keys: https://dashboard.stripe.com/apikeys
- Webhook secrets: Dashboard → Developers → Webhooks

**Key Selection Logic:**
```javascript
if (NODE_ENV === 'production' || STRIPE_USE_LIVE_KEYS === 'true') {
  // Use live keys
} else {
  // Use test keys
}
```

**Security:**
- Never set `STRIPE_USE_LIVE_KEYS=true` in development
- Live secret keys should only be in production environment
- Test keys are safe to commit to `.env.local.example` for reference

---

### Security

| Variable | Required | Purpose | Default | Example |
|----------|----------|---------|---------|---------|
| `TENANT_COOKIE_SECRET` | ⭕ | Secret for encrypting tenant cookies | `'dev-secret-...'` | Random 32-char string |
| `JWT_SECRET` | ⭕ | Secret for signing JWT tokens | - | Random 32-char string |
| `MFA_ENFORCE_SYSTEM_ADMIN` | ⭕ | Require MFA for system admins | `false` | `true` |

**Generating Secrets:**
```bash
# On macOS/Linux:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Security Best Practices:**
- Change `TENANT_COOKIE_SECRET` from default in production
- Use different secrets for production vs staging
- Store secrets in Vercel environment variables (not in Git)
- Rotate secrets periodically (especially if compromised)

---

### Authentication (Optional - Testing)

Test credentials for automated testing and development.

| Variable | Required | Purpose | Default | Example |
|----------|----------|---------|---------|---------|
| `AUTH_TEST_EMAIL` | ⭕ | Test user email | - | `test@example.com` |
| `AUTH_TEST_PASSWORD` | ⭕ | Test user password | - | `test-password` |
| `NEXT_PUBLIC_AUTH_REDIRECT_URL` | ⭕ | Redirect URL after authentication | - | `http://localhost:3000` |

**Usage:**
- Only used in automated tests
- Not required for normal development
- Never use real user credentials

---

### Feature Flags

Enable or disable specific features.

| Variable | Required | Purpose | Default | Example |
|----------|----------|---------|---------|---------|
| `FEATURE_AI_SUGGESTIONS` | ⭕ | Enable AI-powered game suggestions | `false` | `true` |
| `FEATURE_PARTICIPANTS` | ⭕ | Enable Participants Domain (anonymous sessions) | `false` | `true` |

**Checking in Code:**
```typescript
import { isFeatureEnabled } from '@/lib/config/env';

if (isFeatureEnabled('participantsDomain')) {
  // Show participants UI
}
```

---

### System Environment

| Variable | Required | Purpose | Default | Example |
|----------|----------|---------|---------|---------|
| `NODE_ENV` | ✅ | Node.js environment | `'development'` | `production` |

**Values:**
- `development` - Local development
- `production` - Production deployment
- `test` - Automated testing

**Automatically set by:**
- Next.js development server (`next dev` → `development`)
- Next.js build/start (`next build` / `next start` → `production`)
- Vercel deployment (set to `production`)

---

## Deployment Checklists

### Development Setup
```bash
# Required
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ UPSTASH_REDIS_REST_URL
✅ UPSTASH_REDIS_REST_TOKEN

# Recommended
⭕ SUPABASE_SERVICE_ROLE_KEY (for admin features)
⭕ TENANT_COOKIE_SECRET (change from default)

# Optional
⭕ STRIPE_ENABLED=true (if testing billing)
⭕ NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY
⭕ STRIPE_TEST_SECRET_KEY
```

### Production Deployment (Vercel)
```bash
# Required
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ UPSTASH_REDIS_REST_URL
✅ UPSTASH_REDIS_REST_TOKEN
✅ TENANT_COOKIE_SECRET (strong random value)

# Recommended
⭕ NEXT_PUBLIC_SENTRY_DSN (error tracking)
⭕ SENTRY_ENVIRONMENT=production

# If using Stripe
⭕ STRIPE_ENABLED=true
⭕ NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY
⭕ STRIPE_LIVE_SECRET_KEY
⭕ STRIPE_LIVE_WEBHOOK_SECRET
```

---

## Validation

The application validates environment variables at startup using `lib/config/env.ts`.

**Validation Strategy:**
- **Required variables:** Throw error immediately if missing
- **Optional variables:** Warn if missing (but continue)
- **Feature-gated variables:** Only validate if feature is enabled

**Error Messages:**
```
❌ Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL
   Please add it to your .env.local file.
   See .env.local.example for reference.
```

**Success Message (Development):**
```
✅ Environment variables validated successfully
⚠️  Rate limiting disabled: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured
```

---

## Troubleshooting

### "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL"
- Copy `.env.local.example` to `.env.local`
- Fill in your Supabase project URL from https://app.supabase.com

### "Rate limiting disabled"
- This is a warning, not an error
- Application works without rate limiting (development only)
- For production, create Upstash Redis database and add credentials

### "Stripe is not enabled"
- Set `STRIPE_ENABLED=true` in `.env.local`
- Add test keys: `STRIPE_TEST_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY`

### "Cannot read properties of undefined (reading 'url')"
- This usually means `env.supabase.url` is undefined
- Check that `NEXT_PUBLIC_SUPABASE_URL` is set in `.env.local`
- Restart the dev server after changing `.env.local`

---

## Security Recommendations

1. **Never commit `.env.local` to Git**
   - Already in `.gitignore`
   - Use `.env.local.example` for reference

2. **Use different secrets for each environment**
   - Development secrets != staging secrets != production secrets
   - Rotate production secrets periodically

3. **Store production secrets in Vercel**
   - Dashboard → Settings → Environment Variables
   - Mark as "Production" only
   - Never in `.env.local` on your laptop

4. **Limit service role key access**
   - Only use in server-side code
   - Never expose to browser
   - Use for admin operations only

5. **Enable Sentry in production**
   - Catch errors before users report them
   - Monitor performance issues
   - Set up alerts for critical errors

---

## See Also

- `.env.local.example` - Template with all variables
- `lib/config/env.ts` - Validation logic and type-safe access
- `docs/PLATFORM_DOMAIN.md` - Platform infrastructure documentation
- Supabase Docs: https://supabase.com/docs
- Upstash Docs: https://docs.upstash.com/redis
- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Stripe Docs: https://stripe.com/docs
