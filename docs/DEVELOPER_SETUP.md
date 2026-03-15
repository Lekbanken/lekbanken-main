# Developer Setup — Lekbanken

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 22.x (pinned in `.nvmrc`) | [nodejs.org](https://nodejs.org/) or `nvm use` |
| **npm** | Ships with Node | — |
| **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Supabase CLI** | Latest | `npm install -g supabase` |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

## Quick Start

```bash
# 1. Clone & install
git clone <repo-url>
cd lekbanken-main
npm install

# 2. Start local Supabase (requires Docker running)
supabase start

# 3. Create .env.local from template
cp .env.local.example .env.local

# 4. Fill in local Supabase keys (from supabase status output)
#    Replace <from supabase status> placeholders with actual values

# 5. Seed the local database
npm run db:reset

# 6. Start Next.js dev server
npm run dev
```

The app runs at **http://localhost:3000**.

## Test Accounts (local only)

After `npm run db:reset`, these accounts are available:

| Email | Password | Role |
|-------|----------|------|
| `test-system-admin@lekbanken.no` | `TestAdmin123!` | System Admin |
| `test-tenant-admin@lekbanken.no` | `TestAdmin123!` | Tenant Admin (Demo Förskola) |
| `test-regular-user@lekbanken.no` | `TestUser123!` | Member (Demo Förskola) |

---

## SSoT — Environment Model

The project uses two environment identifiers. These are the **only** allowed values.

| Environment | `APP_ENV` | `DEPLOY_TARGET` | Supabase |
|-------------|-----------|-----------------|----------|
| **Local** | `local` | `development` | Docker CLI (`127.0.0.1:54321`) |
| **Vercel Preview** | `staging` | `preview` | Staging project (`vmpdejhgpsrful…`) |
| **Vercel Production** | `production` | `prod` | Production project (`qohhnufxidid…`) |

### Rules

- `APP_ENV` describes **which data environment** you're connected to
- `DEPLOY_TARGET` describes **how the code was deployed**
- The word **"sandbox"** refers only to the local design sandbox (`app/sandbox/`) — never to a deploy environment
- Invalid `APP_ENV` values cause a **startup error** (enforced in `lib/config/env.ts`)
- `TENANT_COOKIE_SECRET` must be set to a real secret in `APP_ENV=production` — the dev default is blocked at startup

### Environment diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  LOCAL           │    │  PREVIEW          │    │  PRODUCTION     │
│  APP_ENV=local   │    │  APP_ENV=staging  │    │  APP_ENV=       │
│  DEPLOY_TARGET=  │    │  DEPLOY_TARGET=   │    │    production   │
│    development   │    │    preview        │    │  DEPLOY_TARGET= │
│                  │    │                   │    │    prod         │
│  Supabase:       │    │  Supabase:        │    │  Supabase:      │
│  Docker CLI      │    │  Staging project  │    │  Prod project   │
│  127.0.0.1:54321 │    │  vmpdejhg…        │    │  qohhnu…        │
└────────┬─────────┘    └────────┬──────────┘    └────────┬────────┘
         │ git push              │ PR merge               │ auto
         ▼                       ▼                        ▼
    Nivå A+B checks         Nivå C CI gates          Vercel prod
    (pre-commit/push)       (GitHub Actions)         deployment
```

---

## Development Workflow

### 1. Local development

```bash
# Start Supabase + dev server
supabase start
npm run dev

# Reset database to clean state
npm run db:reset

# Generate TypeScript types from local schema
npm run db:types
```

### 2. Quality checks (automatic via Husky)

| Level | When | What runs |
|-------|------|-----------|
| **Nivå A** | Pre-commit | `lint-staged` (ESLint on staged files) + `tsc --noEmit` |
| **Nivå B** | Pre-push | `npm run verify` (full ESLint + tsc + i18n + tests) |
| **Nivå C** | PR to main | GitHub Actions: validate, unit-tests, typecheck, rls-tests, i18n-audit, baseline-check |

Run checks manually:

```bash
npm run verify        # Full check (same as Nivå B)
npm run verify:quick  # ESLint + tsc only
npm run type-check    # TypeScript only
npm run lint          # ESLint only
npm run test          # Unit tests
```

### 3. Feature branch → PR → merge

```
feature/my-change  ──push──▶  GitHub PR  ──CI green──▶  merge to main
                                  │
                                  ▼
                           Vercel Preview
                           (APP_ENV=staging)
                           Verify online before merge
```

1. Create feature branch from `main`
2. Push → PR opens automatically
3. Vercel builds a preview deployment (uses staging Supabase)
4. CI (Nivå C) must pass: lint, types, tests, RLS, baseline
5. Verify the preview URL works correctly
6. Merge to `main` → triggers production deployment

### 4. Database migrations

```bash
# Create a new migration
supabase migration new my_migration_name

# Edit the generated file in supabase/migrations/

# Test locally
npm run db:reset

# Push branch — CI runs baseline-check (validates schema counts)
# After merge, apply to production:
supabase link --project-ref qohhnufxididbmzqnjwg
supabase db push
```

**Migration safety rules:**
- Always use `IF NOT EXISTS` / `DROP IF EXISTS` for idempotency
- Test with `npm run db:reset` before pushing
- `baseline-check.yml` in CI validates minimum schema counts (tables, functions, policies, enums)

---

## MFA in Local Development

Local MFA enrollment depends on GoTrue settings in `supabase/config.toml`.

Required settings (already enabled in the repo):

```toml
[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true
```

If these are `false`, MFA enrollment will fail with `mfa_totp_enroll_not_enabled`.

After changing `supabase/config.toml`, restart local Supabase:

```bash
supabase stop --no-backup
supabase start
```

> **Note:** `supabase/config.toml` controls your **local** Supabase CLI environment only.
> Staging and production MFA are configured in the Supabase Dashboard under
> Authentication → Multi-Factor Authentication.

---

## Useful Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server |
| `npm run verify` | Full local quality check |
| `npm run db:reset` | Reset + seed local database |
| `npm run db:types` | Regenerate TypeScript types from local schema |
| `supabase start` | Start local Supabase |
| `supabase stop` | Stop local Supabase |
| `supabase status` | Show local Supabase URLs and keys |
| `supabase migration new <name>` | Create new migration file |

## Ports (local Supabase)

| Port | Service |
|------|---------|
| 54321 | Supabase API (PostgREST) |
| 54322 | PostgreSQL direct |
| 54323 | Supabase Studio (DB GUI) |
| 54324 | Mailpit (email testing) |
| 3000 | Next.js dev server |
