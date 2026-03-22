# Platform Domain Documentation

## Metadata

> **Status:** active
> **Owner:** -
> **Date:** 2025-12-10
> **Last updated:** 2026-03-22
> **Last validated:** 2025-12-17
> **Notes:** Repo-anchored platform reference; avoid hardcoded ops or provider details.

## Related code (source of truth)

- `next.config.ts`
- `proxy.ts`
- `lib/config/env.ts`
- `lib/utils/logger.ts`
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `app/api/health/route.ts`
- `app/api/media/*`
- `docs/media/MEDIA_DOMAIN.md`
- `.github/workflows/typecheck.yml`
- `supabase/migrations/`
- `supabase/verify_rls_coverage.sql`
- `lib/supabase/database.types.ts` (generated)
- `types/supabase.ts` (generated)

---

## 1. Overview

The Platform Domain encompasses the **foundational infrastructure** that supports all other domains in the Lekbanken application. It includes deployment, monitoring, security, database, storage, and operational systems.

### Key Responsibilities

| Area | Scope |
|------|-------|
| **Deployment** | Hosting/provider config (external), CI checks, environment management |
| **Database** | Supabase PostgreSQL, RLS policies, migrations |
| **Storage** | Supabase Storage for media assets |
| **Auth** | Supabase Auth with SSR-ready cookie sessions |
| **Monitoring** | Structured logging (error tracking not currently implemented) |
| **Security** | RLS enforcement, environment validation (rate limiting if/when introduced) |
| **API** | RESTful API routes, error handling, validation |

---

## 2. Architecture

### 2.1 Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                      LEKBANKEN PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Frontend                                                      │
│   ─────────────                                                │
│   Next.js 16 (App Router)                                      │
│   React 19                                                      │
│   TypeScript 5.x                                                │
│   Tailwind CSS + Catalyst UI Kit                               │
│                                                                 │
│   Backend                                                       │
│   ────────────                                                 │
│   Next.js API Routes                                            │
│   Supabase PostgreSQL (Database)                               │
│   Supabase Auth (Authentication)                               │
│   Supabase Storage (Media files)                               │
│   Rate limiting (not currently implemented)                    │
│                                                                 │
│   Monitoring & Operations                                       │
│   ──────────────────────────                                   │
│   Error tracking (not currently implemented)                    │
│   Structured Logging (lib/utils/logger.ts)                     │
│   Environment Validation (lib/config/env.ts)                   │
│                                                                 │
│   Deployment                                                    │
│   ──────────────                                               │
│   Hosting provider (external config)                            │
│   GitHub Actions (CI/CD)                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Domain-Driven Design

The application follows DDD principles with features organized by domain:

```
features/
├── admin/           # Admin Domain - system management
├── browse/          # Browse Domain - game discovery
├── gamification/    # Gamification Domain - achievements, badges
├── journey/         # Journey Domain - user progress
├── planner/         # Planner Domain - activity planning
├── play/            # Play Domain - game execution
└── profile/         # Profile Domain - user settings
```

**Platform Domain supports all other domains via:**
- Shared authentication (Supabase Auth)
- Shared database (Supabase PostgreSQL with RLS)
- Shared storage (Supabase Storage)
- Shared monitoring (structured logs)
- Shared security (environment validation; rate limiting if/when introduced)

---

## 3. Deployment

### 3.1 Hosting (provider-agnostic)

Repo:t är en Next.js-app och kan hostas hos valfri kompatibel hosting/provider. Exakta miljöer, domäner och deploy-trigger är **operativ konfiguration** och ska verifieras i hosting-projektets settings.

**Build Configuration:** se `next.config.ts`

- `turbopack.root = __dirname`
- `images.remotePatterns` tillåter Supabase Storage public URLs (hostname härleds från `NEXT_PUBLIC_SUPABASE_URL`) + localhost patterns för dev.

**Build Command:** `npm run build`  
**Output Directory:** `.next`  
**Install Command:** `npm install`

### 3.2 CI/CD: GitHub Actions

**Workflow:** `.github/workflows/typecheck.yml`

Triggers: `push` + `pull_request` på brancherna `main` och `develop`.

Checks:

- TypeScript (`npm run type-check`)
- Grep-gate för `as any` i `app/` + `lib/` (exkluderar `types/supabase.ts`)
- Build (`npm run build`) med `SKIP_ENV_VALIDATION=true` i workflow

**Checks on Every Push:**
- ✅ TypeScript compilation (`tsc --noEmit`)
- ✅ Check for `as any` casts in `app/` and `lib/` (excludes `types/supabase.ts`)
- ✅ Production build (`npm run build`)

### 3.3 Environment Management

**Environments:**
- **Development** - Local (`npm run dev`)
- **Preview** - Optional per-PR environment (if your hosting supports it)
- **Production** - Your primary production environment

**Environment Variables:**
- Development: `.env.local` (not committed)
- Hosting/provider: configure env vars in your hosting platform / secret manager

**Critical Variables (must be set in runtime env):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TENANT_COOKIE_SECRET`

If/when error tracking is introduced, document the required env vars in `docs/ENVIRONMENT_VARIABLES.md` and wire validation into `lib/config/env.ts`.

See `docs/ENVIRONMENT_VARIABLES.md` for full reference.

---

## 4. Database

### 4.1 Supabase PostgreSQL

**Provider:** Supabase (hosted PostgreSQL)  
**Version:** Provider-managed (verify in Supabase dashboard if needed)

**Schema source of truth:**
- Migrations: `supabase/migrations/*.sql`
- Generated types: `types/supabase.ts` (via `npm run db:types:remote`) and/or `lib/supabase/database.types.ts`

Avoid hardcoding “key table” lists here; they drift quickly. Link to domain docs for table-level details.

**Schema Management:**
- Migrations: `supabase/migrations/*.sql`
- Apply: Supabase Dashboard → SQL Editor
- Automated: Future (via Supabase CLI in CI/CD)

### 4.2 Row Level Security (RLS)

**Philosophy:** Database-level authorization, not application-level.

**RLS Policies Enforce:**
- **Tenant Isolation** - Users only see their tenant's data
- **Role-Based Access** - Admin vs regular user permissions
- **Privacy** - Users can only access their own data

RLS policies and grants should be treated as **migration-owned** (defined in `supabase/migrations/*`).
Avoid copy/pasting example policies into this doc as if they are active in the database.

**RLS Audit Script:**
Run `supabase/verify_rls_coverage.sql` in Supabase SQL Editor to verify all tables have RLS enabled.

**Critical:** Always test RLS policies with non-admin users.

### 4.3 Supabase Client Usage

**Server-Side (API Routes):**
```typescript
import { createServerRlsClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createServerRlsClient();
  const { data, error } = await supabase.from('games').select('*');
  // RLS policies automatically enforced based on user session
}
```

**Client-Side (React Components):**
```typescript
import { createBrowserClient } from '@/lib/supabase/client';

const supabase = createBrowserClient();
const { data } = await supabase.from('games').select('*');
```

**Admin Operations (Service Role):**
```typescript
import { createServiceRoleClient } from '@/lib/supabase/server';

// Bypasses RLS - use with extreme caution!
const adminClient = createServiceRoleClient();
const { data } = await adminClient.from('games').select('*');
```

---

## 5. Storage

### 5.1 Supabase Storage

Buckets and access rules are configured in Supabase. In this repo:
- The app uses a **signed upload URL** flow via `app/api/media/upload/route.ts` (and confirmation via `app/api/media/upload/confirm/route.ts`).
- Bucket names should be treated as code/config and verified in the upload route (avoid duplicating full bucket inventories here).

See `docs/media/MEDIA_DOMAIN.md` for the current, repo-validated media/storage flow.

### 5.2 Media Management

**Media Picker Component:** `components/ui/media-picker.tsx`
- Upload images directly from browser
- Supports drag & drop
- Progress indication
- Error handling with structured logging

**Media API surface:**
- Canonical implementation lives under `app/api/media/*`.
- Canonical documentation lives in `docs/media/MEDIA_DOMAIN.md`.

---

## 6. Authentication

### 6.1 Supabase Auth

**Provider:** Supabase Auth (built on PostgreSQL + GoTrue)  
**Session Storage:** HTTP-only cookies (SSR-ready)  
**Session Duration:** Provider/config-dependent (do not assume a fixed duration in docs)

**Auth Providers:**
- Email/Password ✅
- Magic Link ✅
- OAuth (Google, GitHub, etc.) - Future

**Auth Flow:**
```
1. User signs in → Supabase creates session
2. Session stored in HTTP-only cookie
3. Request layer (`proxy.ts`) enforces redirects + tenant resolution and sets `x-tenant-id` when applicable
4. Server code uses `@supabase/ssr` (`createServerRlsClient`) to read/refresh sessions via cookies
5. RLS policies enforce based on auth.uid()
```

**Server-Side Session Access:**
```typescript
import { createServerRlsClient } from '@/lib/supabase/server';

const supabase = await createServerRlsClient();
const { data: { user } } = await supabase.auth.getUser();
```

**Client-Side:**
```typescript
import { createBrowserClient } from '@/lib/supabase/client';

const supabase = createBrowserClient();
const { data: { session } } = await supabase.auth.getSession();
```

### 6.2 Multi-Tenant Session

**Tenant Selection:**
- Stored in cookie: `tenant-id`
- Encrypted with `TENANT_COOKIE_SECRET`
- Set via: `lib/context/TenantContext.tsx`

**Tenant Switching:**
Users can belong to multiple tenants. Active tenant is stored client-side and sent with API requests.

---

## 7. Monitoring

### 7.1 Structured Logging

**Logger:** `lib/utils/logger.ts`

**Log Levels:**
- `debug` - Verbose debugging info
- `info` - General informational messages
- `warn` - Warning messages (e.g., abuse prevention / throttling if introduced)
- `error` - Error messages
- `fatal` - Critical errors (app-breaking)

**Output Format:**
- **Development:** Pretty-printed to console
- **Production:** JSON (ready for log aggregators)

**Usage:**
```typescript
import { logger } from '@/lib/utils/logger';

// Info
logger.info('User logged in', { userId: user.id });

// Warning
logger.warn('Request spike detected', { 
  remaining: 5, 
  limit: 100 
});

// Error
logger.error('Database query failed', error, {
  query: 'SELECT * FROM games',
  userId: user.id,
});
```

**Context Logger (for API routes):**
```typescript
import { createContextLogger } from '@/lib/utils/logger';

const requestLogger = createContextLogger({
  requestId: headers.get('x-request-id'),
  endpoint: '/api/games',
});

requestLogger.error('Failed to fetch games', error);
// Automatically includes requestId and endpoint
```

---

## 8. Security

### 8.1 Rate Limiting

Rate limiting is **not currently implemented** in this codebase.

If/when it is introduced, document the implementation and wire it into:
- `lib/config/env.ts` (feature-gated env validation)
- API routes under `app/api/*` (consistent 429 responses)

### 8.2 Environment Validation

**Validator:** `lib/config/env.ts`

**Validates on Startup:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` (required)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` (warns if missing)
- ⚠️ Stripe keys (if `STRIPE_ENABLED=true`)

**Fail-Fast Behavior:**
If critical variables are missing, the app **will not start**:
```
❌ Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL
   Please add it to your .env.local file.
   See .env.local.example for reference.
```

**Usage:**
```typescript
import { env } from '@/lib/config/env';

const supabaseUrl = env.supabase.url; // Type-safe, validated
```

### 8.3 Row Level Security (RLS)

**Enforcement:** PostgreSQL RLS policies (database-level)

**Benefits:**
- Cannot be bypassed by malicious client code
- Works with any client (browser, mobile app, third-party)
- Centralized authorization logic

**Verification:**
Run `supabase/verify_rls_coverage.sql` in Supabase SQL Editor:
```sql
-- Output lists tables with/without RLS. Treat any missing RLS as a security issue.
```

Avoid hardcoding “critical tables” lists here; use the audit output + migrations as the canonical reference.

---

## 9. Health Checks

### 9.1 Health Endpoint

**Endpoint:** `GET /api/health`

**Response (Healthy):**
```json
HTTP/1.1 200 OK

{
  "timestamp": "2025-12-17T10:30:00Z",
  "status": "healthy",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "ok",
      "latency": 45
    },
    "storage": {
      "status": "ok",
      "latency": 23
    },
    "api": {
      "status": "ok",
      "message": "API responding"
    }
  }
}
```

**Response (Unhealthy):**
```json
HTTP/1.1 503 Service Unavailable

{
  "timestamp": "2024-12-10T10:30:00Z",
  "status": "unhealthy",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "error",
      "message": "Connection timeout",
      "latency": 5000
    },
    ...
  }
}
```

**Rate Limited:**
- Not currently rate limited (no rate limiting implementation in the repo).
- If rate limiting is introduced, consider exempting `/api/health` or setting a high limit to avoid false positives from uptime monitors.

**Usage:**
- Uptime monitoring (UptimeRobot, Pingdom, etc.)
- Kubernetes liveness/readiness probes (future)
- CI/CD smoke tests

---

## 10. API Design

### 10.1 Error Handling

**Standard Error Response:**
```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": { ... } // Optional
}
```

**Error Codes:**
- `validation_error` - Invalid input (400)
- `unauthorized` - Not authenticated (401)
- `forbidden` - Authenticated but no permission (403)
- `not_found` - Resource not found (404)
- `rate_limit_exceeded` - Too many requests (429)
- `internal_error` - Server error (500)

**Centralized Error Handler:**
```typescript
import { handleApiError } from '@/lib/api/errors';

export async function GET(request: Request) {
  try {
    // API logic...
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 10.2 Validation

**Input Validation:** Zod schemas

**Example:**
```typescript
import { z } from 'zod';

const createGameSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  age_min: z.number().int().min(0),
  age_max: z.number().int().max(100),
});

export async function POST(request: Request) {
  const body = await request.json();
  const validated = createGameSchema.parse(body);
  // TypeScript knows the shape of `validated`
}
```

---

## 11. Development Workflow

### 11.1 Local Setup

```bash
# 1. Clone repo
git clone https://github.com/Lekbanken/lekbanken-main.git
cd lekbanken-main

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.local.example .env.local

# 4. Fill in .env.local with Supabase credentials

# 5. Start dev server
npm run dev

# 6. Open http://localhost:3000
```

### 11.2 Common Commands

```bash
# Development server (with Turbopack)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type check (no build)
npm run type-check

# Lint
npm run lint
```

### 11.3 Database Migrations

**Manual (Current):**
1. Write SQL in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Open Supabase Dashboard → SQL Editor
3. Paste and run migration
4. Commit migration file to Git

**Automated (Future):**
```bash
# Via Supabase CLI
supabase db push
```

---

## 12. Production Checklist

Before deploying to production:

### Environment Variables
- ✅ All required variables set in the hosting/provider environment
- ✅ `TENANT_COOKIE_SECRET` changed from default

### Security
- ✅ RLS enabled on all tables (run `verify_rls_coverage.sql`)
- ✅ Service role key only in server-side code
- ✅ HTTPS enforced (provider config)

### Monitoring
- ✅ Structured logging implemented in critical paths
- ✅ Health endpoint responding

### Testing
- ✅ Type-check passes (`npm run type-check`)
- ✅ Build succeeds (`npm run build`)
- ✅ Manual testing in a preview/staging environment (if used)
- ✅ Database migrations applied

### Documentation
- ✅ `ENVIRONMENT_VARIABLES.md` up to date
- ✅ `platform/PLATFORM_DOMAIN.md` (this file) accurate
- ✅ README.md has deployment instructions

---

## 13. Known Issues & Limitations

### Resolved (P0+P1 Fixes)
- ✅ Missing environment validation (fixed: `lib/config/env.ts`)
- ✅ No RLS audit (fixed: `verify_rls_coverage.sql`)
- ✅ No structured logging (fixed: `lib/utils/logger.ts`)

### Pending (P2 - Medium Priority)
- ⏳ Automated database migrations (Supabase CLI in CI/CD)
- ⏳ Comprehensive test coverage (unit, integration, E2E)
- ⏳ Error tracking integration (if desired)
- ⏳ API response caching strategy
- ⏳ CDN configuration for media assets

### Future (P3 - Low Priority)
- 🔮 Multi-region deployment (lower latency for global users)
- 🔮 Database read replicas (scale reads independently)
- 🔮 Advanced monitoring (custom Grafana dashboards)
- 🔮 Kubernetes migration (if hosting/provider limitations hit)

---

## 14. Support & Troubleshooting

### Common Issues

**1. "Missing required environment variable"**
- Solution: Copy `.env.local.example` to `.env.local` and fill in values

**2. Database connection errors**
- Check: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Verify: Supabase project is not paused (free tier auto-pauses after inactivity)

**3. RLS policy blocks legitimate access**
- Debug: Check user's tenant membership in `user_tenant_memberships` table
- Verify: Policy uses `auth.uid()` correctly

### Getting Help

- **Documentation:** `docs/` folder
- **Code Examples:** Search codebase for similar patterns
- **Supabase Docs:** https://supabase.com/docs
- **Hosting provider docs:** (link your provider docs here)

---

## 15. Appendix

### File Structure

```
lekbanken-main/
├── app/                      # Next.js App Router
│   ├── (marketing)/          # Marketing pages
│   ├── admin/                # Admin routes
│   ├── api/                  # API routes
│   │   ├── accounts/         # Accounts/auth-related endpoints
│   │   ├── media/            # Media endpoints
│   │   ├── health/           # Health check
│   │   └── ...
│   └── layout.tsx            # Root layout
│
├── components/               # Shared components
│   ├── ui/                   # UI components
│   └── layout/               # Layout components
│
├── features/                 # Domain-specific features
│   ├── admin/
│   ├── browse/
│   ├── planner/
│   └── ...
│
├── lib/                      # Shared utilities
│   ├── config/
│   │   └── env.ts            # Environment validation
│   ├── supabase/
│   │   ├── client.ts         # Browser client
│   │   └── server.ts         # Server client
│   ├── utils/
│   │   ├── logger.ts         # Structured logging
│   │   └── ...
│   └── ...
│
├── supabase/
│   ├── migrations/           # Database migrations
│   └── verify_rls_coverage.sql
│
├── docs/                     # Documentation
│   ├── platform/PLATFORM_DOMAIN.md    # This file
│   └── ENVIRONMENT_VARIABLES.md
│
├── proxy.ts                  # Auth proxy (NOT middleware.ts!)
└── .env.local.example        # Environment template
```

### Key Dependencies

```json
{
  "next": "^16.0.7",
  "react": "^19.x",
  "@supabase/supabase-js": "^2.x",
  "@supabase/ssr": "^0.x",
  "zod": "^3.x"
}
```

---

**End of Platform Domain Documentation**

For questions or improvements, please update this document and commit to the repo.
