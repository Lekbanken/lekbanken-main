# Platform Operations & Enterprise Readiness — Implementation Plan

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active implementation plan for the platform-operations workstream. Use `launch-readiness/launch-control.md` for current program status and treat this file, `platform-operations-architecture.md`, and `platform-operations-audit.md` as the coordinated plan set for environment and operational readiness.

> **Status:** Design-Ready  
> **Date:** 2026-03-13  
> **Author:** Claude Opus 4.6  
> **Scope:** Incremental path from current state to enterprise-grade operations  
> **Principle:** Lekbanken ska kunna beskrivas som en säker, driftsbar och revisionsbar plattform.  

---

## 1. Principle

> **Operations maturity happens incrementally, not all at once.**
>
> Each phase makes Lekbanken more robust. Phase 1 is the minimum foundation. Later phases add enterprise-grade capabilities as customers demand them.

---

## 2. Implementation Phases

### Overview

| Phase | Name | When | Effort | Priority |
|-------|------|------|--------|----------|
| Phase 1 | Developer Baseline | Now (pre-launch stabilisation) | 1–2 days | High |
| Phase 2 | Sandbox on Vercel | Next (ADR-005 implementation) | 1–2 days | High |
| Phase 3 | Observability Foundation | Before first enterprise customer | 1 day | High |
| Phase 4 | Release Management Tooling | Before first enterprise customer | 1–2 days | High |
| Phase 5 | Enterprise Operational Readiness | With first enterprise contract | 2–3 days | Medium |
| Phase 6 | Ops Maturity & Automation | When 3+ deploy targets exist | 3–5 days | Low |

### Effort vs Impact Matrix

```
                    HIGH IMPACT
                        │
     Phase 2            │           Phase 3
     (Sandbox)          │           (Observability)
                        │
     Phase 1            │           Phase 4
     (Dev Baseline)     │           (Release Mgmt)
                        │
  ──────────────────────┼──────────────────────
     LOW EFFORT         │           HIGH EFFORT
                        │
     Phase 5            │           Phase 6
     (Enterprise Ops)   │           (Automation)
                        │
                    LOW IMPACT
```

---

## 3. Phase 1 — Developer Baseline

**When:** Now. This is independent of enterprise readiness and benefits all development.

### Step 1.1 — Create `.nvmrc`

```
20
```

Pin Node.js version to match CI (`typecheck.yml` uses Node 20).

**Effort:** 5 min.

### Step 1.2 — Create `.env.local.example`

Template derived from `lib/config/env.ts`:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>

# Stripe (optional for dev)
STRIPE_ENABLED=false
# STRIPE_TEST_SECRET_KEY=
# STRIPE_LIVE_SECRET_KEY=
# NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY=
# STRIPE_TEST_WEBHOOK_SECRET=

# Security
TENANT_COOKIE_SECRET=dev-secret-change-in-production
# VAULT_ENCRYPTION_KEY=<64-char-hex-for-aes256>

# Feature flags
DEMO_ENABLED=true
# DEMO_TENANT_ID=<uuid>

# Observability (optional)
# NEXT_PUBLIC_SENTRY_DSN=
# DEPLOY_TARGET=local-dev
```

**Effort:** 15 min.

### Step 1.3 — Create `supabase/config.toml`

```toml
[project]
id = "lekbanken-local"

[api]
port = 54321

[db]
port = 54322

[studio]
port = 54323
```

**Effort:** 10 min.

### Step 1.4 — Create Developer Setup Guide

Create `docs/DEVELOPER_SETUP.md`:

1. Install WSL2 + Ubuntu
2. Install Node.js 20 via `nvm`
3. Install Supabase CLI
4. Clone repo into WSL2 filesystem
5. Copy `.env.local.example` → `.env.local`
6. `npm install`
7. `supabase start`
8. `supabase db reset` (applies all migrations + seeds)
9. Update `.env.local` with local Supabase keys
10. `npm run dev`
11. Verify: `http://localhost:3000` loads

**Effort:** 1–2 hours (including testing the full flow).

### Step 1.5 — Create `scripts/setup-dev.sh`

Automated version of the setup guide:

```bash
#!/bin/bash
set -euo pipefail

echo "=== Lekbanken Developer Setup ==="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js required. Install via nvm."; exit 1; }
command -v supabase >/dev/null 2>&1 || { echo "Supabase CLI required."; exit 1; }

# Install dependencies
npm install

# Start Supabase (requires Docker)
supabase start

# Apply migrations + seeds
supabase db reset

# Create local env if not exists
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "Created .env.local from template. Update with local Supabase keys."
  echo "Keys from 'supabase status':"
  supabase status
fi

echo "=== Setup complete! Run 'npm run dev' to start. ==="
```

**Effort:** 30 min.

### Phase 1 Exit Criteria

- [ ] `.nvmrc` exists and `nvm use` works
- [ ] `.env.local.example` exists and is documented
- [ ] `supabase/config.toml` exists and `supabase start` works
- [ ] `docs/DEVELOPER_SETUP.md` exists and a new setup succeeds
- [ ] `scripts/setup-dev.sh` runs end-to-end on WSL2

---

## 4. Phase 2 — Preview Isolation via Sandbox Supabase

**When:** After Phase 1 or in parallel. This resolves OPS-SAND-001.

> **🔴 This phase resolves OPS-SAND-001** — the highest-priority open operational risk. Until preview env vars are set, every Vercel preview deployment can mutate production data. Första exekverbara operationsmål = få bort preview/dev från prod-data-plane.

> **Decision (GPT, 2026-03-13):** Use Preview-scoped env vars in the existing Vercel project instead of creating a separate Vercel sandbox project. Separate Vercel project deferred until persistent staging/demo/UAT is needed.

### Step 2.1 — Create Sandbox Supabase Project ✅ DONE

| Setting | Value |
|---------|-------|
| Name | `lekbanken-sandbox` |
| Ref | `vmpdejhgpsrfulimsoqn` |
| Region | EU (eu-west-3) |
| Status | ✅ Created, canonical baseline applied, schema verified (247/156/545/28) |

### Step 2.2 — Apply Canonical Baseline ✅ DONE

```bash
supabase link --project-ref vmpdejhgpsrfulimsoqn
supabase db reset --linked
```

### Step 2.3 — Set Preview Environment Variables

**Vercel Dashboard → existing project → Settings → Environment Variables**

Set with scope = **Preview** only:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vmpdejhgpsrfulimsoqn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role key |
| `DEPLOY_TARGET` | `preview` |
| `APP_ENV` | `staging` |

`NEXT_PUBLIC_*` vars are build-time, but Vercel builds each preview separately — Preview-scoped values are inlined at build-time for preview builds.

### Step 2.4 — Verify Preview Isolation

- [ ] Open PR → Vercel creates preview deployment
- [ ] Preview URL `/api/health` returns 200 (sandbox DB reachable)
- [ ] Create test data on preview → verify it appears in sandbox Supabase, NOT in prod
- [ ] View source on preview build → confirm sandbox Supabase URL in client bundle
- [ ] Production health check still returns 200

### Phase 2 Exit Criteria

- [ ] Preview-scoped env vars set in existing Vercel project
- [ ] Preview builds use sandbox Supabase (verified via client bundle inspection)
- [ ] Preview deploy creates data in sandbox DB, not production
- [ ] Production deploy/health unaffected
- [ ] OPS-SAND-001 can be marked as resolved

> **Deferred:** Separate Vercel sandbox project (`lekbanken-sandbox`), custom domain (`sandbox.lekbanken.no`), persistent staging/demo environment. These become relevant for enterprise isolation or design partner demos.

---

## 5. Phase 3 — Observability Foundation

**When:** Before first enterprise customer. Can be done in parallel with Phase 2.

### Step 3.1 — Implement Sentry

Create Sentry initialisation files:

- `sentry.client.config.ts` — Browser error tracking
- `sentry.server.config.ts` — Server-side error tracking  
- `sentry.edge.config.ts` — Edge runtime error tracking (if needed)
- `instrumentation.ts` — Next.js instrumentation hook

Add `DEPLOY_TARGET` tag:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  initialScope: {
    tags: {
      deploy_target: process.env.DEPLOY_TARGET || 'shared-prod',
    },
  },
});
```

**Effort:** ~2 hours (follow Next.js Sentry SDK guide).

### Step 3.2 — Fill Alerting Destinations

Update `docs/ops/alerting.md` with actual destinations:

| Alert | Destination | Priority |
|-------|-------------|----------|
| 5xx error spike | Sentry alert → email/Slack | P1 |
| Auth error spike | Sentry alert | P2 |
| Stripe webhook failure | Stripe Dashboard alert | P1 |
| DB latency spike | Supabase Dashboard | P2 |
| Cron job failure | Vercel Dashboard | P2 |

**Effort:** 30 min (once Sentry is configured).

### Step 3.3 — Add `DEPLOY_TARGET` Env Var

Add to `lib/config/env.ts`:

```typescript
deployTarget: process.env.DEPLOY_TARGET || 'shared-prod',
```

Use in Sentry, logging, admin panel header.

**Effort:** 10 min.

### Phase 3 Exit Criteria

- [ ] Sentry initialisation files exist and errors are captured
- [ ] `DEPLOY_TARGET` env var is read and used in Sentry tags
- [ ] Alerting destinations are documented (not TBD)
- [ ] `/api/health` and Sentry ping are both operational

---

## 6. Phase 4 — Release Management Tooling

**When:** Before first enterprise customer. Required for multi-target operations.

### Step 4.1 — Create Deploy Target Registry

Create `.deploy-targets.json`:

```json
[
  {
    "name": "shared-prod",
    "ref": "<prod-project-ref>",
    "url": "https://app.lekbanken.no",
    "level": "A",
    "status": "active"
  }
]
```

### Step 4.2 — Create Migration Orchestration Script

Create `scripts/deploy-migrations.sh`:

```bash
#!/bin/bash
set -euo pipefail

TARGETS_FILE="${TARGETS_FILE:-.deploy-targets.json}"

if [ ! -f "$TARGETS_FILE" ]; then
  echo "No deploy targets file: $TARGETS_FILE"
  exit 1
fi

echo "=== Lekbanken Migration Orchestration ==="
echo "Targets: $(jq length "$TARGETS_FILE") projects"

jq -c '.[]' "$TARGETS_FILE" | while read target; do
  name=$(echo "$target" | jq -r '.name')
  ref=$(echo "$target" | jq -r '.ref')
  status=$(echo "$target" | jq -r '.status')

  if [ "$status" != "active" ]; then
    echo "⏭️  $name: skipped (status: $status)"
    continue
  fi

  echo ""
  echo "--- Migrating: $name ($ref) ---"
  supabase link --project-ref "$ref"
  supabase db push --linked
  echo "✅ $name: migrations applied"
done

echo ""
echo "=== All active targets migrated ==="
```

### Step 4.3 — Document Release Process

Create `docs/ops/release-process.md`:

1. Developer merges to `main`
2. CI checks pass (typecheck, unit tests, RLS, i18n)
3. Vercel auto-deploys `shared-prod` and `sandbox`
4. If DB migrations exist: run `scripts/deploy-migrations.sh`
5. Verify `/api/health` on all targets
6. For enterprise targets: manual Vercel deploy trigger + migration push
7. Verify enterprise targets

### Phase 4 Exit Criteria

- [ ] `.deploy-targets.json` exists with shared-prod entry
- [ ] `scripts/deploy-migrations.sh` runs successfully
- [ ] `docs/ops/release-process.md` documents full release flow
- [ ] Release process tested with sandbox as second target

---

## 7. Phase 5 — Enterprise Operational Readiness

**When:** With first enterprise contract. These are Tier 2 readiness items.

### Step 5.1 — Backup/Restore Documentation

Complete `docs/ops/backup_dr.md`:

- Supabase Pro backup cadence: daily
- Supabase Pro PITR: available on Pro plan
- Restore test procedure: quarterly (sandbox restore)
- Per-deployment backup verification checklist
- Enterprise customer notification process for planned maintenance

### Step 5.2 — Secrets Management Process

Document `docs/ops/secrets-management.md`:

- Where each type of secret is stored (Vercel, Supabase, GitHub Actions)
- Rotation schedule (annual minimum, or on personnel change)
- Who has access to which project's secrets
- Emergency secret rotation procedure (compromised key)

### Step 5.3 — Per-Customer Incident Escalation

Extend `docs/ops/incident_response.md`:

- Add per-customer escalation contacts
- Add customer notification templates (incident start, update, resolution)
- Define SLA-specific response times per enterprise customer

### Step 5.4 — Compliance Documentation Package

Create per-customer compliance package template:

- Hosting description (Vercel EU, Supabase EU-North, data residency)
- Subprocessor list (Vercel, Supabase, Stripe, Sentry, PostHog)
- DPA template (Lekbanken as data processor)
- Data retention policy
- Security measures description
- Access control documentation

### Step 5.5 — Enterprise Customer Onboarding Checklist

Create `docs/ops/enterprise-onboarding-checklist.md`:

**Pre-sales:**
- [ ] Confirm isolation level (A/B/C)
- [ ] Confirm region requirement
- [ ] Confirm domain preference
- [ ] Confirm billing model
- [ ] Confirm compliance requirements (GDPR, sector-specific)

**Infrastructure:**
- [ ] Follow provisioning model (enterprise-isolation-architecture.md §11)
- [ ] All readiness verification checks pass

**Compliance:**
- [ ] DPA signed
- [ ] Hosting description delivered
- [ ] Subprocessor list approved

**Handover:**
- [ ] Customer admin accounts created and trained
- [ ] Support channel established
- [ ] SLA documented and agreed
- [ ] First monthly operations review scheduled

### Phase 5 Exit Criteria

- [ ] Backup/restore documentation complete (no TBD)
- [ ] Secrets management documented
- [ ] Per-customer incident escalation defined
- [ ] Compliance documentation package template ready
- [ ] Enterprise onboarding checklist approved

---

## 8. Phase 6 — Ops Maturity & Automation

**When:** 3+ deploy targets exist. This phase reduces operational toil.

### Step 6.1 — Provisioning Automation

Create `scripts/provision-target.sh`:

Wraps the 11-step provisioning model (enterprise-isolation-architecture.md §11) into a semi-automated script:

```bash
#!/bin/bash
# Input: customer name, region, isolation level
# Automates: Supabase link, migrations, seeds, deploy target registry update
# Manual: Supabase project creation, Vercel project creation, env vars, domain, Stripe
```

### Step 6.2 — Multi-Deploy Admin Portal

Internal page (`/admin/deployments`) listing all deploy targets:

| Target | URL | Health | Schema Version | Last Deploy |
|--------|-----|--------|----------------|-------------|
| shared-prod | app.lekbanken.no | ✅ | v304 | 2026-03-13 |
| sandbox | sandbox.lekbanken.no | ✅ | v304 | 2026-03-13 |
| church-se-prod | kyrkan.lekbanken.no | ✅ | v304 | 2026-03-13 |

### Step 6.3 — CI Migration Drift Check

GitHub Action that verifies all active deploy targets are on the same migration version after any migration merge.

### Step 6.4 — Automated Health Monitoring

Scheduled check (cron or external monitor) that pings `/api/health` on all deploy targets and alerts on failure.

### Phase 6 Exit Criteria

- [ ] Provisioning script exists and has been used for 1+ target
- [ ] Admin portal shows all deploy targets with health status
- [ ] CI drift check warns on schema version mismatch
- [ ] Automated health monitoring alerts on downtime

---

## 9. Timeline Visualisation

```
NOW                                SANDBOX LIVE            FIRST ENTERPRISE
 │                                      │                       │
 ├── Phase 1: Developer Baseline ───────┤                       │
 │   (.nvmrc, .env.example, WSL2 guide) │                       │
 │                                      │                       │
 ├── Phase 2: Sandbox on Vercel ────────┤                       │
 │   (proves multi-project model)       │                       │
 │                                      │                       │
 ├── Phase 3: Observability ────────────┼───────────────────────┤
 │   (Sentry, DEPLOY_TARGET, alerting)  │                       │
 │                                      │                       │
 │                                ┌─────┤                       │
 │                                │ Phase 4: Release Tooling ───┤
 │                                │ (deploy-migrations.sh)      │
 │                                └─────┤                       │
 │                                      │               ┌───────┤
 │                                      │               │ Phase 5
 │                                      │               │ (Ops)
 │                                      │               └───────┤
 │                                      │                       │
                                                          3+ TARGETS
                                                               │
                                                          ┌────┤
                                                          │ Phase 6
                                                          │ (Automation)
                                                          └────┤
```

---

## 10. Relationship to Enterprise Isolation

| Enterprise Isolation Phase | Platform Operations Phase | Connection |
|---------------------------|--------------------------|------------|
| Phase 0 (Design Guardrails) ✅ | — | Guardrails lock architecture |
| Phase 1 (Seed & Migration Tooling) | Phase 4 (Release Management) | Same scripts serve both purposes |
| Phase 2 (First Deployment) | Phase 2 (Sandbox) | Sandbox validates the deployment model |
| Phase 3 (Ops Runbook) | Phase 5 (Enterprise Ops Readiness) | Shared ops documentation |
| Phase 4 (Multi-Deploy Admin) | Phase 6 (Automation) | Same admin portal and monitoring |

**Key insight:** The sandbox deployment (Platform Ops Phase 2) is the cheapest way to validate the enterprise isolation model. If sandbox works as a Level B-style deployment, enterprise isolation is proven.

---

## 11. Decisions Required

| Decision | Status | Owner |
|----------|--------|-------|
| OPS-001: WSL2 as local engineering baseline | 🟡 Proposed | Johan |
| OPS-002: Sandbox Supabase + Preview env vars | 🟡 Proposed | Johan |
| OPS-003: One Vercel project per deploy target | ⏳ Deferred | Johan |
| OPS-004: Continuous deploy for prod/sandbox, manual for enterprise | 🟡 Proposed | Johan |
| OPS-005: Deploy targets tracked in `.deploy-targets.json` | 🟡 Proposed | Johan |

---

## 12.1 Next 3 Moves

To prevent getting stuck in architecture without forward motion, these are the three concrete next actions:

| # | Move | What | Resolves | Effort |
|---|------|------|----------|--------|
| 1 | **Sandbox Supabase + Preview env vars** | Set Preview-scoped env vars in existing Vercel project to point at sandbox Supabase | OPS-SAND-001 (P1), isolates preview from prod data | 0.5 day |
| 2 | **WSL2 developer baseline** | `.nvmrc`, `.env.local.example`, `supabase/config.toml`, `docs/DEVELOPER_SETUP.md`, `scripts/setup-dev.sh` | OPS-DEV-001–004, reproducible local setup | 1–2 days |
| 3 | **Deploy target registry + migration tooling** | `.deploy-targets.json`, `scripts/deploy-migrations.sh`, release process documentation | Foundation for enterprise + multi-target operations | 1 day |

> **Priority 4 (next after these 3):** Observability foundation — Sentry + `DEPLOY_TARGET` tag + alerting destinations.

These moves are designed to produce **visible operational progress** while each one independently improves platform robustness.

---

## 12. Summary

| What | Status |
|------|--------|
| Can Lekbanken support multiple environments? | ✅ Architecturally yes (enterprise isolation study) |
| Is the development workflow standardised? | ⚠️ No — Phase 1 resolves this |
| Is there a safe non-production environment? | ⚠️ No — Phase 2 resolves this |
| Is error tracking operational? | ⚠️ No — Phase 3 resolves this |
| Can releases reach multiple targets safely? | ⚠️ No — Phase 4 resolves this |
| Is Lekbanken operationally ready for enterprise? | ⚠️ No — Phase 5 resolves this |
| Is operations automated and scalable? | ❌ No — Phase 6 resolves this |

> **Bottom line:** Lekbanken is architecturally ready for enterprise. The remaining work is operational — and it's incremental, not transformational.
