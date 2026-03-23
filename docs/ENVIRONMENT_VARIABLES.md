# Environment Variables Documentation

This document provides a comprehensive reference for all environment variables used in the Lekbanken application.

## Metadata

> **Status:** active
> **Owner:** -
> **Date:** 2025-12-10
> **Last updated:** 2026-03-23
> **Last validated:** 2026-03-23

## Validation checklist

- Source of truth for validation rules: `lib/config/env.ts`.
- `.env.local.example` exists and includes the local-first Supabase variables plus `APP_ENV` and `DEPLOY_TARGET`.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required (the app fails fast if missing).
- `APP_ENV` is validated strictly when set (`local`, `staging`, `production`).
- `SKIP_ENV_VALIDATION` is documented as a CI/build-only bypass, not a normal runtime setting.
- Other variables are optional and should be documented as feature-gated or ops-only.

## Quick Start

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

   On Windows PowerShell:
   ```powershell
   Copy-Item .env.local.example .env.local
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

**Storage Notes (Development):**
- Media upload flows depend on Supabase Storage buckets + RLS policies existing in your project.
- For artifact media uploads (hotspot images + audio), the app expects private buckets `media-images` and `media-audio`.
   - Migration: [supabase/migrations/20251229090000_media_artifact_buckets.sql](supabase/migrations/20251229090000_media_artifact_buckets.sql)
   - Apply locally by replaying migrations with `npm run db:reset`
   - Apply remotely only through the guarded workflow: `npm run db:push`

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
| `VAULT_ENCRYPTION_KEY` | ⭕ | 64-char hex key for AES-256-GCM vault encryption | - | `0123abcd...` |

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
- For encrypted vault data, rotate `VAULT_ENCRYPTION_KEY` by moving the old value to `VAULT_ENCRYPTION_KEY_V<N>` and updating the active key

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
| `FEATURE_AI` | ⭕ | Master switch for user-facing AI features | `false` | `true` |
| `FEATURE_AI_SUGGESTIONS` | ⭕ | Enable AI-powered game suggestions | `false` | `true` |
| `FEATURE_PARTICIPANTS` | ⭕ | Enable Participants Domain (anonymous sessions) | `false` | `true` |
| `FEATURE_SIGNALS` | ⭕ | Enable signals primitives in play/lobby | `true` in dev, `false` otherwise | `true` |
| `FEATURE_TIME_BANK` | ⭕ | Enable time-bank primitives in play mode | `true` in dev, `false` otherwise | `true` |
| `FEATURE_SESSION_COCKPIT` | ⭕ | Enable unified host shell for lobby/director mode | `true` in dev, `false` otherwise | `true` |
| `FEATURE_DIRECTOR_MODE_DRAWER` | ⭕ | Use drawer-based director mode UI | `true` in dev, `false` otherwise | `true` |
| `FEATURE_LEADER_SCRIPT` | ⭕ | Enable host-only leader script UI | `true` in dev, `false` otherwise | `true` |
| `FEATURE_REALTIME_SESSION_EVENTS` | ⭕ | Enable realtime session event feed/subscriptions | `true` in dev, `false` otherwise | `true` |
| `FEATURE_TRIGGER_KILL_SWITCH` | ⭕ | Emergency kill switch for trigger execution | `true` in dev, `false` otherwise | `false` |

**Checking in Code:**
```typescript
import { isFeatureEnabled } from '@/lib/config/env';

if (isFeatureEnabled('participantsDomain')) {
  // Show participants UI
}
```

---

### Deployment Identity & Build Controls

These variables define where the app is running and how strict runtime validation should be.

| Variable | Required | Purpose | Default | Example |
|----------|----------|---------|---------|---------|
| `APP_ENV` | ⭕ | Data environment identifier used for safety guards (`local`, `staging`, `production`) | `local` | `production` |
| `DEPLOY_TARGET` | ⭕ | Deployment target tag used for observability and release routing | `development` | `prod` |
| `NEXT_PUBLIC_SITE_URL` | ⭕ | Canonical app URL for server-driven redirects and links | - | `https://www.lekbanken.no` |
| `SKIP_ENV_VALIDATION` | ⭕ | Build/CI-only bypass for runtime env validation | `false` | `true` |

**Notes:**
- `APP_ENV` is validated strictly when present; unknown values fail startup.
- `DEPLOY_TARGET` is used for observability tagging and deployment identity.
- `NEXT_PUBLIC_SITE_URL` is used by server-side flows such as reset links and canonical URL generation.
- `SKIP_ENV_VALIDATION=true` is only appropriate for build-only CI checks where production secrets are intentionally unavailable.

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

# Recommended
⭕ SUPABASE_SERVICE_ROLE_KEY (for admin features)
⭕ TENANT_COOKIE_SECRET (change from default)
⭕ APP_ENV=local
⭕ DEPLOY_TARGET=development

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
✅ TENANT_COOKIE_SECRET (strong random value)
✅ APP_ENV=production
✅ DEPLOY_TARGET=prod

# If using Stripe
⭕ STRIPE_ENABLED=true
⭕ NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY
⭕ STRIPE_LIVE_SECRET_KEY
⭕ STRIPE_LIVE_WEBHOOK_SECRET

# Operationally important
⭕ NEXT_PUBLIC_SITE_URL
⭕ VAULT_ENCRYPTION_KEY
```

---

## Validation

The application validates environment variables at startup using `lib/config/env.ts`.

**Validation Strategy:**
- **Required variables:** Throw error immediately if missing
- **Optional variables:** Warn if missing (but continue)
- **Feature-gated variables:** Only validate if feature is enabled
- **Strict environment guard:** `APP_ENV` rejects unknown values at startup
- **Build-only bypass:** `SKIP_ENV_VALIDATION=true` is allowed for CI/build pipelines only

**Error Messages:**
```
❌ Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL
   Please add it to your .env.local file.
   See .env.local.example for reference.
```

**Success Message (Development):**
```
✅ Environment variables validated successfully
```

---

## Troubleshooting

### "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL"
- Copy `.env.local.example` to `.env.local`
- Fill in your Supabase project URL from https://app.supabase.com

### "Rate limiting disabled"
- (Deprecated note) The codebase does not currently validate or require Upstash vars.
- If rate limiting is reintroduced, document the variables and wire them into `lib/config/env.ts`.

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

5. **Consider error tracking in production**
   - Not currently implemented in this repo
   - If introduced, document required env vars and wire validation into `lib/config/env.ts`

---

## See Also

- `.env.local.example` - Template with all variables
- `lib/config/env.ts` - Validation logic and type-safe access
- `docs/toolkit/developer-guide/DEVELOPER_SETUP.md` - App environment model (`APP_ENV`, `DEPLOY_TARGET`)
- `docs/database/environments.md` - Database target rules and guarded migration workflow
- `docs/platform/PLATFORM_DOMAIN.md` - Platform infrastructure documentation
- Supabase Docs: https://supabase.com/docs
- Stripe Docs: https://stripe.com/docs
