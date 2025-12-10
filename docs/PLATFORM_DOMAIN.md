# Platform Domain Documentation

**Version:** 1.0  
**Last Updated:** 2024-12-10  
**Status:** Production-Ready (with P0+P1 fixes implemented)

---

## 1. Overview

The Platform Domain encompasses the **foundational infrastructure** that supports all other domains in the Lekbanken application. It includes deployment, monitoring, security, database, storage, and operational systems.

### Key Responsibilities

| Area | Scope |
|------|-------|
| **Deployment** | Vercel hosting, CI/CD, environment management |
| **Database** | Supabase PostgreSQL, RLS policies, migrations |
| **Storage** | Supabase Storage for media assets |
| **Auth** | Supabase Auth with SSR-ready cookie sessions |
| **Monitoring** | Sentry error tracking, structured logging |
| **Security** | Rate limiting, RLS enforcement, environment validation |
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
│   Next.js 15 (App Router)                                      │
│   React 18                                                      │
│   TypeScript 5.x                                                │
│   Tailwind CSS + Catalyst UI Kit                               │
│                                                                 │
│   Backend                                                       │
│   ────────────                                                 │
│   Next.js API Routes                                            │
│   Supabase PostgreSQL (Database)                               │
│   Supabase Auth (Authentication)                               │
│   Supabase Storage (Media files)                               │
│   Upstash Redis (Rate limiting)                                │
│                                                                 │
│   Monitoring & Operations                                       │
│   ──────────────────────────                                   │
│   Sentry (Error tracking, APM)                                 │
│   Structured Logging (lib/utils/logger.ts)                     │
│   Environment Validation (lib/config/env.ts)                   │
│                                                                 │
│   Deployment                                                    │
│   ──────────────                                               │
│   Vercel (Hosting + Edge Network)                              │
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
- Shared monitoring (Sentry, structured logs)
- Shared security (rate limiting, environment validation)

---

## 3. Deployment

### 3.1 Hosting: Vercel

**Production URL:** https://app.lekbanken.no  
**Deployment:** Automatic on push to `main` branch

**Vercel Features Used:**
- **Edge Network** - Global CDN for static assets
- **Serverless Functions** - API routes deployed as serverless functions
- **Preview Deployments** - Unique URL per pull request
- **Environment Variables** - Secure storage for secrets
- **Analytics** - Web Vitals monitoring
- **Automatic HTTPS** - SSL/TLS certificates

**Build Configuration:**
```json
// next.config.ts
{
  "experimental": {
    "turbo": true  // Uses Turbopack for faster builds
  }
}
```

**Build Command:** `npm run build`  
**Output Directory:** `.next`  
**Install Command:** `npm install`

### 3.2 CI/CD: GitHub Actions

**Workflow:** `.github/workflows/type-check.yml`

```yaml
name: Type Check
on: [push, pull_request]
jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run type-check
```

**Checks on Every Push:**
- ✅ TypeScript compilation (`tsc --noEmit`)
- ✅ Vercel preview deployment (automatic)
- ⏳ Planned: ESLint, unit tests, E2E tests

### 3.3 Environment Management

**Environments:**
- **Development** - Local (`npm run dev`)
- **Preview** - Vercel preview deployments (per PR)
- **Production** - Vercel production (`main` branch)

**Environment Variables:**
- Development: `.env.local` (not committed)
- Vercel: Dashboard → Settings → Environment Variables

**Critical Variables (Must be set in Vercel):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `TENANT_COOKIE_SECRET`
- `NEXT_PUBLIC_SENTRY_DSN` (recommended)

See `docs/ENVIRONMENT_VARIABLES.md` for full reference.

---

## 4. Database

### 4.1 Supabase PostgreSQL

**Provider:** Supabase (hosted PostgreSQL)  
**Version:** PostgreSQL 15+  
**Access:** Via Supabase client (server-side) or RESTful API (client-side)

**Key Tables:**
- `tenants` - Multi-tenant organization data
- `users` - Extended user profiles (links to `auth.users`)
- `games` - Game catalog
- `plans` - Activity plans
- `products` - Product categories
- `purposes` - Educational purposes
- `media` - Media asset metadata
- `achievements` - Gamification achievements
- (More tables per domain)

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

**Example Policy:**
```sql
-- Users can only see games in their tenant
CREATE POLICY "Users see own tenant games" ON games
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants 
      WHERE user_id = auth.uid()
    )
  );
```

**RLS Audit Script:**
Run `supabase/verify_rls_coverage.sql` in Supabase SQL Editor to verify all tables have RLS enabled.

**Critical:** Always test RLS policies with non-admin users.

### 4.3 Supabase Client Usage

**Server-Side (API Routes):**
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('games').select('*');
  // RLS policies automatically enforced based on user session
}
```

**Client-Side (React Components):**
```typescript
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const supabase = createBrowserSupabaseClient();
const { data } = await supabase.from('games').select('*');
```

**Admin Operations (Service Role):**
```typescript
import { createAdminClient } from '@/lib/supabase/server';

// Bypasses RLS - use with extreme caution!
const adminClient = await createAdminClient();
const { data } = await adminClient.from('games').select('*');
```

---

## 5. Storage

### 5.1 Supabase Storage

**Buckets:**
- `media` - User-uploaded images, videos
- `avatars` - User profile pictures
- `achievements` - Badge icons, achievement assets
- `custom_utmarkelser` - Custom achievement badges

**Access Control:**
- Public buckets: Anyone can read
- Private buckets: RLS policies enforce access
- Upload: Authenticated users only

**Upload Example:**
```typescript
const { data, error } = await supabase.storage
  .from('media')
  .upload(`${tenantId}/${fileName}`, file);
```

### 5.2 Media Management

**Media Picker Component:** `components/ui/media-picker.tsx`
- Upload images directly from browser
- Supports drag & drop
- Progress indication
- Error handling with structured logging

**Media API Routes:**
- `POST /api/media` - Create media record
- `GET /api/media` - List media (tenant-scoped)
- `PATCH /api/media/[id]` - Update metadata
- `DELETE /api/media/[id]` - Delete media + file
- `POST /api/media/upload` - Get signed upload URL

---

## 6. Authentication

### 6.1 Supabase Auth

**Provider:** Supabase Auth (built on PostgreSQL + GoTrue)  
**Session Storage:** HTTP-only cookies (SSR-ready)  
**Session Duration:** 7 days (refresh tokens)

**Auth Providers:**
- Email/Password ✅
- Magic Link ✅
- OAuth (Google, GitHub, etc.) - Future

**Auth Flow:**
```
1. User signs in → Supabase creates session
2. Session stored in HTTP-only cookie
3. Middleware reads cookie on every request
4. Supabase client auto-authenticates API calls
5. RLS policies enforce based on auth.uid()
```

**Server-Side Session Access:**
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';

const supabase = await createServerSupabaseClient();
const { data: { user } } = await supabase.auth.getUser();
```

**Client-Side:**
```typescript
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const supabase = createBrowserSupabaseClient();
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

### 7.1 Error Tracking: Sentry

**Sentry Configuration:**
- **Client:** `sentry.client.config.ts` - Browser errors
- **Server:** `sentry.server.config.ts` - API route errors
- **Edge:** `sentry.edge.config.ts` - Middleware errors

**Sampling Rates:**
- **Production:** 10% trace sampling, 100% error sampling
- **Development:** Disabled (logs to console instead)

**Features Used:**
- **Error Capture** - Uncaught exceptions, promise rejections
- **Performance Monitoring** - Page load, API response times
- **Session Replay** - Replay user sessions on errors
- **User Context** - userId, email, tenant attached to errors

**Manual Error Reporting:**
```typescript
import { logger } from '@/lib/utils/logger';

try {
  // risky operation
} catch (error) {
  logger.error('Operation failed', error, {
    endpoint: '/api/games',
    userId: user.id,
    tenantId: tenant.id,
  });
  // Error automatically sent to Sentry if DSN configured
}
```

### 7.2 Structured Logging

**Logger:** `lib/utils/logger.ts`

**Log Levels:**
- `debug` - Verbose debugging info
- `info` - General informational messages
- `warn` - Warning messages (e.g., rate limit exceeded)
- `error` - Error messages (automatically sent to Sentry)
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
logger.warn('Rate limit approached', { 
  remaining: 5, 
  limit: 100 
});

// Error (sends to Sentry)
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

**Implementation:** Upstash Redis + `@upstash/ratelimit`  
**Configuration:** `lib/ratelimit.ts`

**Rate Limits:**
| Endpoint Pattern | Limit | Window | Identifier |
|------------------|-------|--------|------------|
| `/api/*` (general) | 100 | 1 minute | IP address |
| `/api/auth/*` | 10 | 15 minutes | IP address |
| `/api/media/upload` | 10 | 1 minute | userId |
| `/api/play/join` | 10 | 1 minute | IP address |
| `/api/play/rejoin` | 30 | 1 minute | IP address |
| `/api/play/state` | 60 | 1 minute | participantToken |

**Response on Limit Exceeded:**
```json
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1702213200
Retry-After: 45

{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 45
}
```

**Adding Rate Limiting to API Routes:**
```typescript
import { applyRateLimit } from '@/lib/utils/rate-limit-helpers';

export async function POST(request: Request) {
  // Check rate limit
  const rateLimitResult = await applyRateLimit(request, 'auth');
  if (rateLimitResult) return rateLimitResult; // 429 if exceeded
  
  // Continue with normal request handling...
}
```

**Graceful Degradation:**
If Upstash Redis is not configured, rate limiting is disabled (logs warning on startup).

### 8.2 Environment Validation

**Validator:** `lib/config/env.ts`

**Validates on Startup:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` (required)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` (warns if missing)
- ⚠️ Stripe keys (if `STRIPE_ENABLED=true`)
- ⚠️ Upstash Redis (warns if missing)

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
-- Sample output:
-- ✅ tenants (RLS enabled)
-- ✅ games (RLS enabled)
-- ❌ logs (RLS not enabled) ⚠️
```

**Critical Tables with RLS:**
- `tenants` ✅
- `users` ✅
- `games` ✅
- `plans` ✅
- `products` ✅
- `purposes` ✅
- `media` ✅
- `achievements` ✅

---

## 9. Health Checks

### 9.1 Health Endpoint

**Endpoint:** `GET /api/health`

**Response (Healthy):**
```json
HTTP/1.1 200 OK

{
  "timestamp": "2024-12-10T10:30:00Z",
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
- Same as general API: 100 requests/minute per IP
- Prevents health check abuse

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

# Format code
npm run format
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
- ✅ All required variables set in Vercel dashboard
- ✅ `TENANT_COOKIE_SECRET` changed from default
- ✅ `SENTRY_DSN` configured for error tracking
- ✅ Upstash Redis credentials configured

### Security
- ✅ RLS enabled on all tables (run `verify_rls_coverage.sql`)
- ✅ Service role key only in server-side code
- ✅ Rate limiting tested and working
- ✅ HTTPS enforced (Vercel automatic)

### Monitoring
- ✅ Sentry project created and tested
- ✅ Structured logging implemented in critical paths
- ✅ Health endpoint responding

### Testing
- ✅ Type-check passes (`npm run type-check`)
- ✅ Build succeeds (`npm run build`)
- ✅ Manual testing in preview deployment
- ✅ Database migrations applied

### Documentation
- ✅ `ENVIRONMENT_VARIABLES.md` up to date
- ✅ `PLATFORM_DOMAIN.md` (this file) accurate
- ✅ README.md has deployment instructions

---

## 13. Known Issues & Limitations

### Resolved (P0+P1 Fixes)
- ✅ Missing environment validation (fixed: `lib/config/env.ts`)
- ✅ No RLS audit (fixed: `verify_rls_coverage.sql`)
- ✅ No error tracking (fixed: Sentry integration)
- ✅ No structured logging (fixed: `lib/utils/logger.ts`)
- ✅ No rate limiting (fixed: Upstash Redis integration)

### Pending (P2 - Medium Priority)
- ⏳ Automated database migrations (Supabase CLI in CI/CD)
- ⏳ Comprehensive test coverage (unit, integration, E2E)
- ⏳ Performance monitoring dashboard (Sentry APM)
- ⏳ API response caching strategy
- ⏳ CDN configuration for media assets

### Future (P3 - Low Priority)
- 🔮 Multi-region deployment (lower latency for global users)
- 🔮 Database read replicas (scale reads independently)
- 🔮 Advanced monitoring (custom Grafana dashboards)
- 🔮 Kubernetes migration (if Vercel limitations hit)

---

## 14. Support & Troubleshooting

### Common Issues

**1. "Missing required environment variable"**
- Solution: Copy `.env.local.example` to `.env.local` and fill in values

**2. "Rate limiting disabled" (warning)**
- Impact: Non-blocking, app works fine
- Solution: Add Upstash Redis credentials (production only)

**3. Database connection errors**
- Check: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Verify: Supabase project is not paused (free tier auto-pauses after inactivity)

**4. RLS policy blocks legitimate access**
- Debug: Check user's tenant membership in `user_tenants` table
- Verify: Policy uses `auth.uid()` correctly

### Getting Help

- **Documentation:** `docs/` folder
- **Code Examples:** Search codebase for similar patterns
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs

---

## 15. Appendix

### File Structure

```
lekbanken-main/
├── app/                      # Next.js 15 App Router
│   ├── (marketing)/          # Marketing pages
│   ├── admin/                # Admin routes
│   ├── api/                  # API routes
│   │   ├── auth/             # Auth endpoints
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
│   │   └── rate-limit-helpers.ts
│   └── ratelimit.ts          # Rate limiting config
│
├── supabase/
│   ├── migrations/           # Database migrations
│   └── verify_rls_coverage.sql
│
├── docs/                     # Documentation
│   ├── PLATFORM_DOMAIN.md    # This file
│   └── ENVIRONMENT_VARIABLES.md
│
├── proxy.ts                  # Auth proxy (NOT middleware.ts!)
├── sentry.client.config.ts   # Sentry browser config
├── sentry.server.config.ts   # Sentry server config
├── sentry.edge.config.ts     # Sentry edge config
└── .env.local.example        # Environment template
```

### Key Dependencies

```json
{
  "next": "^15.0.0",
  "react": "^18.0.0",
  "@supabase/supabase-js": "^2.x",
  "@supabase/ssr": "^0.x",
  "@sentry/nextjs": "^8.x",
  "@upstash/ratelimit": "^1.x",
  "@upstash/redis": "^1.x",
  "zod": "^3.x"
}
```

---

**End of Platform Domain Documentation**

For questions or improvements, please update this document and commit to the repo.
