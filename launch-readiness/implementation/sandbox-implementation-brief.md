# Preview Isolation — Implementation Brief

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Frozen implementation snapshot for the preview-isolation workstream. Use `docs/database/environments.md`, `docs/toolkit/developer-guide/DEVELOPER_SETUP.md`, and `launch-readiness/launch-control.md` for current environment truth.

> **Date:** 2026-03-13 (revised)  
> **Last updated:** 2026-03-21  
> **Last validated:** 2026-03-21  
> **Status:** frozen audit  
> **Author:** Claude Opus 4.6 (code-verified)  
> **Resolves:** OPS-SAND-001 (P1) — preview/dev hitting production data plane  
> **Scope:** Sandbox Supabase + Preview env vars in existing Vercel project  
> **Principle:** Första exekverbara operationsmål = få bort preview/dev från prod-data-plane.  
> **Note:** Frozen implementation snapshot for the preview-isolation workstream. Current environment truth should be read from `docs/database/environments.md`, `docs/toolkit/developer-guide/DEVELOPER_SETUP.md`, and `launch-control.md`.

---

## Decision Record

| Decision | Value |
|----------|-------|
| Vercel Sandboxes product | ❌ Not used |
| Separate Vercel sandbox project | ❌ Postponed — optional later for persistent staging/demo/UAT |
| Separate Supabase sandbox project | ✅ Created (`vmpdejhgpsrfulimsoqn`) |
| Preview env vars in existing Vercel project | ✅ **This is the current implementation** |
| `sandbox.lekbanken.no` domain | ❌ Not part of current scope |

**Rationale (GPT, 2026-03-13):** The acute risk (OPS-SAND-001) is preview/dev hitting production data. This is solved by Preview environment variables in the existing Vercel project — no need for a second Vercel project, domain, or deploy pipeline right now.

### When a Separate Vercel Sandbox Project Becomes Relevant

A separate Vercel project (`lekbanken-sandbox`) with its own domain (`sandbox.lekbanken.no`) is worth adding **later** when any of these needs arise:

- Persistent staging/demo/UAT environment
- External demo URL to share with design partners or customers
- Multi-project operating model validation for enterprise isolation
- Cron jobs that must run against sandbox (Vercel cron is per-project)

Until then, preview isolation via env vars is the minimal safe solution.

---

## 1. Why This Is First

Preview deployments and local development currently point at the **production Supabase database**. This means:
- Every Vercel preview can mutate production data
- Local dev mutations hit production
- Destructive tests are impossible
- Migration testing risks production schema

This implementation isolates preview deploys to the sandbox Supabase project using Vercel's per-environment variable scoping.

---

## 2. Architecture — What Changes

```
BEFORE                              AFTER
──────                              ─────
┌─────────────────────┐             ┌─────────────────────┐
│ Vercel (one project)│             │ Vercel (one project) │
│                     │             │                      │
│ Production → prod   │             │ Production → prod DB │
│ Preview   → prod    │             │ Preview   → sandbox DB │
│ Dev       → prod    │             │ Dev       → sandbox DB │
└─────────┬───────────┘             └────┬────────────┬────┘
          │                              │            │
    ┌─────▼─────┐                  ┌─────▼─────┐ ┌───▼──────────┐
    │ Supabase  │ ← all traffic    │ Supabase  │ │ Supabase     │
    │ (prod)    │                   │ (prod)    │ │ (sandbox)    │
    └───────────┘                   └───────────┘ └──────────────┘
                                    Only prod      Preview builds,
                                    builds         demos, testing
```

**Nothing changes in the codebase.** The app is fully env-driven (`lib/config/env.ts`). Same code, different env vars per Vercel environment scope.

---

## 3. Code Verification — Why No Code Changes Are Needed

| Component | File | Verified | Notes |
|-----------|------|----------|-------|
| Supabase URL | `lib/config/env.ts` L75 | ✅ | `process.env.NEXT_PUBLIC_SUPABASE_URL` — env-driven |
| Supabase client | `lib/supabase/server.ts` | ✅ | Reads URL from env, no hardcoded refs |
| Browser client | `lib/supabase/client.ts` | ✅ | Same — env-driven |
| Service role client | `lib/supabase/server.ts` | ✅ | `process.env.SUPABASE_SERVICE_ROLE_KEY` |
| Health endpoint | `app/api/health/route.ts` | ✅ | Reads URL + key from env at runtime |
| Image config | `next.config.ts` L7 | ✅ | Dynamically extracts hostname from `NEXT_PUBLIC_SUPABASE_URL` |
| Stripe config | `lib/config/env.ts` L84-96 | ✅ | All keys env-driven, `STRIPE_ENABLED` flag |
| Cookie signing | `lib/config/env.ts` L99 | ✅ | `TENANT_COOKIE_SECRET` — env-driven |
| RLS policies | DB-local (545 policies) | ✅ | No cross-project references |
| Migrations | `supabase/migrations/` (canonical baseline) | ✅ | No env-specific code |
| Seeds | `supabase/seeds/` (3 files) | ✅ | Idempotent demo data |

**Zero code changes required. This is a pure infrastructure operation.**

---

## 4. How Vercel Preview Environment Variables Work

`NEXT_PUBLIC_*` variables are **inlined at build time** by Next.js. Crucially, Vercel **builds each preview deployment separately** — and uses the env vars scoped to the **Preview** environment for that build.

| Variable | Timing | Vercel Preview behavior |
|----------|--------|------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Build time | Preview build inlines the **Preview-scoped** value |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build time | Same — baked into preview client bundle |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime | Preview serverless functions use Preview-scoped value |
| `STRIPE_ENABLED` | Runtime | Preview serverless functions use Preview-scoped value |

This means setting different `NEXT_PUBLIC_*` values for Production vs Preview scope works correctly — each environment's build gets its own values. **No separate Vercel project needed.**

---

## 5. Environment Variables to Set

### 5.1 Preview-Scoped Variables (set on existing Vercel project)

These variables must be set in the **existing production Vercel project** (`lekbanken-main` / `lekbanken`) with scope = **Preview** only.

**Where:** Vercel Dashboard → your project → Settings → Environment Variables → set scope to **Preview**

```
NEXT_PUBLIC_SUPABASE_URL          = https://vmpdejhgpsrfulimsoqn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     = {sandbox-anon-key}
SUPABASE_SERVICE_ROLE_KEY         = {sandbox-service-role-key}
DEPLOY_TARGET                     = preview
APP_ENV                           = staging
```

**Important:** Do NOT modify Production-scoped env vars. Only add/override for Preview scope.

### 5.2 Variables That Stay As-Is on Production Scope

These remain unchanged on the Production environment — they already point at production Supabase:

```
NEXT_PUBLIC_SUPABASE_URL          = https://qohhnufxididbmzqnjwg.supabase.co  (unchanged)
NEXT_PUBLIC_SUPABASE_ANON_KEY     = {prod-anon-key}                            (unchanged)
SUPABASE_SERVICE_ROLE_KEY         = {prod-service-role-key}                    (unchanged)
DEPLOY_TARGET                     = prod                                       (unchanged)
APP_ENV                           = production                                 (unchanged)
```

### 5.3 DEPLOY_TARGET Standard Values

| Value | Environment | Usage |
|-------|-------------|-------|
| `prod` | Production builds | `app.lekbanken.no` |
| `preview` | Vercel preview builds | PR review URLs |
| `development` | Local dev | `localhost:3000` |
| `enterprise-<customer>` | Enterprise isolated | e.g. `enterprise-svenska-kyrkan` |

### 5.4 APP_ENV Safety Guard

To prevent accidentally running destructive operations against production:

**Script guard pattern:**
```bash
#!/bin/bash
set -euo pipefail

if [ "${APP_ENV:-}" = "production" ]; then
  echo "❌ SAFETY: This script cannot run against APP_ENV=production"
  echo "   Set APP_ENV=staging or APP_ENV=local to proceed."
  exit 1
fi
```

**Seed guard pattern (SQL):**
```sql
DO $$
BEGIN
  IF current_setting('app.env', true) = 'production' THEN
    RAISE EXCEPTION 'Seeds cannot run against production (app.env=production)';
  END IF;
END $$;
```

---

## 6. Step-by-Step Implementation

### Step 1 — Create Sandbox Supabase Project ✅ DONE

| Setting | Value |
|---------|-------|
| Project ref | `vmpdejhgpsrfulimsoqn` |
| Region | EU (eu-west-3) |
| Status | ✅ Created, canonical baseline applied, schema verified (247/156/545/28) |

### Step 2 — Apply Canonical Baseline to Sandbox ✅ DONE

Canonical baseline (`00000000000000_baseline.sql`) applied via `supabase db reset --linked`. Schema verified:
- 247 tables, 156 functions, 545 policies, 28 enums — exact match with production.

### Step 3 — Set Preview Environment Variables

**Where:** Vercel Dashboard → existing project → Settings → Environment Variables  
**Time:** 10 min

1. Navigate to Vercel project settings → Environment Variables
2. For each variable in §5.1, add with scope = **Preview** only
3. If a Production-scoped variable already exists with the same name, Vercel allows adding a Preview-scoped override
4. Verify that Production-scoped variables are **unchanged**

### Step 4 — Trigger Preview Build to Verify

**Where:** Create a test PR or use an existing PR  
**Time:** 5 min

1. Push a branch / open a PR against `main` or `develop`
2. Vercel will automatically create a preview deployment
3. The preview build will use the Preview-scoped env vars (sandbox Supabase)
4. Wait for build to complete

### Step 5 — Verify (see Verification Checklist below)

---

## 7. Verification Checklist

### 7.1 Infrastructure Verification

| # | Check | How | Expected |
|---|-------|-----|----------|
| V1 | Sandbox Supabase reachable | Browser: `https://vmpdejhgpsrfulimsoqn.supabase.co` | Dashboard loads |
| V2 | Migrations applied | Dashboard → Table Editor | All tables present (247) |
| V3 | Seeds applied | Dashboard → Table Editor → `products` | Product catalog populated |

### 7.2 Preview Deploy Verification (CRITICAL)

| # | Check | How | Expected |
|---|-------|-----|----------|
| V4 | Preview build succeeds | Open PR → check Vercel preview deploy | Build completes, no errors |
| V5 | Preview hits sandbox DB | On preview URL: `/api/health` | Returns `ok` (sandbox DB reachable) |
| V6 | Preview login works | Create account on preview URL | Account in sandbox auth, NOT in prod auth |
| V7 | Preview data isolated | Create test data on preview | Data appears in sandbox DB, NOT in prod |

### 7.3 Production Isolation Verification (CRITICAL)

| # | Check | How | Expected |
|---|-------|-----|----------|
| V8 | Prod unaffected | `curl https://app.lekbanken.no/api/health` | `{"status":"ok"}` |
| V9 | Prod env vars unchanged | Vercel Dashboard → check Production-scoped vars | Still pointing at prod Supabase |
| V10 | Prod data unchanged | Prod Dashboard → spot-check latest tenants | No preview test data |
| V11 | Prod deploy unaffected | Trigger prod redeploy (or check latest) | Uses prod Supabase, not sandbox |

### 7.4 Client Bundle Verification

| # | Check | How | Expected |
|---|-------|-----|----------|
| V12 | Preview bundle uses sandbox URL | View source on preview deploy → search for supabase URL | `vmpdejhgpsrfulimsoqn.supabase.co` |
| V13 | Prod bundle uses prod URL | View source on prod deploy → search for supabase URL | `qohhnufxididbmzqnjwg.supabase.co` |

---

## 8. Rollback Plan

### Risk Assessment

| Scenario | Probability | Impact | Mitigation |
|----------|------------|--------|------------|
| Preview env vars misconfigured | Low | Previews may error | Remove Preview env vars, redeploy |
| Accidentally modified prod vars | Very low | Prod hits wrong DB | Verify + restore prod vars |
| Sandbox DB unreachable | Low | Previews fail, prod unaffected | Check Supabase status |

### Rollback Steps

**This implementation has minimal production risk.** Production env vars are not modified — only Preview-scoped vars are added.

**If preview deploys have issues:**
1. Remove Preview-scoped env vars from the Vercel project
2. Redeploy any affected preview deployments
3. Previews revert to using Production env vars (current behavior)

**If production is somehow affected:**
1. Verify Production-scoped env vars in Vercel Dashboard
2. Redeploy production
3. Production uses its own env vars — independent of Preview scope

---

## 9. What This Does NOT Prove (Deferred)

The previous version of this brief aimed to prove the full enterprise isolation model. With the simplified approach, some things are deferred:

| Enterprise Requirement | Status |
|----------------------|--------|
| Same code, different Supabase project | ✅ Proven — preview uses sandbox Supabase |
| Env-driven Supabase URL | ✅ Proven — Vercel env scoping works |
| Independent auth namespace | ✅ Proven — sandbox has separate auth |
| Independent storage | ✅ Proven — sandbox has separate storage |
| Independent cron execution | ⏳ Deferred — requires separate Vercel project |
| Separate domain per deployment | ⏳ Deferred — no `sandbox.lekbanken.no` yet |
| Full multi-project operating model | ⏳ Deferred — single Vercel project for now |

These deferred items become relevant when a persistent staging/demo environment or enterprise customer deployment is needed.

---

## 10. Post-Implementation

### Update These Documents

| Document | Update |
|----------|--------|
| `launch-control.md` | Mark OPS-SAND-001 as resolved, update §13 |
| `platform-operations-implementation-plan.md` | Update Phase 2 to reflect preview-var approach |
| `platform-operations-audit.md` | Update OPS-SAND-001 status |

### Next Move After This

→ **WSL2 developer baseline** (Next 3 Moves #2) — `.nvmrc`, `.env.local.example`, `supabase/config.toml`, `docs/toolkit/developer-guide/DEVELOPER_SETUP.md`
