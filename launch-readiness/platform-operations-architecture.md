# Platform Operations & Enterprise Readiness — Architecture

> **Status:** Design Study  
> **Date:** 2026-03-13  
> **Author:** Claude Opus 4.6 (code-verified)  
> **Sponsor:** Johan (product owner)  
> **Scope:** How development, sandbox, preview, staging, and production environments connect — and how this scales to enterprise isolation  
> **Principle:** Lekbanken ska kunna beskrivas som en säker, driftsbar och revisionsbar plattform innan den beskrivs som en feature-rik plattform.

---

## 1. Executive Summary

This document defines how Lekbanken's development, deployment, and operations infrastructure should be organised. It covers five interconnected areas:

1. **Vercel-hosted sandbox/staging** — moving sandbox from local-only to a shared remote environment
2. **WSL2 local engineering baseline** — standardising the local development environment
3. **Vercel + Supabase operating model** — how environments connect and deploy
4. **Enterprise isolated deployment provisioning** — how isolated targets are created and maintained
5. **Multi-target release management** — how releases reach all deploy targets safely

These five areas are not independent projects. They form a single **platform operations foundation** that enables both SaaS scaling and enterprise isolation.

---

## 1.1 Workstream Relationship Map

Three strategic workstreams are active. They are related but have distinct scopes and timelines. This section prevents drift between them.

```
┌────────────────────────────────────────────────────────────┐
│  Phase 1B — Environment Isolation (IMMEDIATE)          │
│  • Get preview/dev off production data plane           │
│  • Create sandbox Supabase + Vercel project             │
│  • Resolves OPS-SAND-001 (P1)                           │
│  • Owner: Engineering                                   │
│  • Docs: next-phase-execution-plan.md                   │
└──────────────────────────────┴─────────────────────────────┘
                               │
                        enables ▼
┌────────────────────────────────────────────────────────────┐
│  Platform Operations (OPERATING MODEL)                │
│  • How dev/sandbox/prod/enterprise connect              │
│  • WSL2 baseline, observability, release mgmt           │
│  • 6 phases (Phase 1–6)                                 │
│  • Owner: Engineering + Ops                             │
│  • Docs: platform-operations-*.md                       │
└──────────────────────────────┴─────────────────────────────┘
                               │
                      scales to ▼
┌────────────────────────────────────────────────────────────┐
│  Enterprise Isolation (FUTURE TOPOLOGY)                │
│  • Level A/B/C isolation model                         │
│  • Per-customer Supabase + Vercel projects              │
│  • Activated on first enterprise contract                │
│  • Owner: Engineering + Commercial/Legal                │
│  • Docs: enterprise-isolation-*.md                      │
└────────────────────────────────────────────────────────────┘
```

| Workstream | Scope | Timeline | Trigger |
|------------|-------|----------|--------|
| **Phase 1B** | Immediate sandbox isolation | Now | OPS-SAND-001 (preview → prod) |
| **Platform Operations** | Operating model across all environments | Ongoing (6 phases) | Operational maturity requirement |
| **Enterprise Isolation** | Per-customer isolated deployments | On first enterprise contract | Svenska kyrkan / kommun interest |

> **Key distinction:** Phase 1B is an **execution task** (get sandbox live). Platform Operations is an **operating model** (how all environments work). Enterprise Isolation is a **topology model** (how isolated customers are provisioned). They build on each other but must not be conflated.

---

## 2. Environment Topology — Target State

### 2.1 Environment Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub Repo (main)                           │
│                   Same codebase, single source of truth             │
└─────┬──────────┬──────────┬──────────┬──────────┬──────────────────┘
      │          │          │          │          │
 ┌────▼────┐┌────▼────┐┌────▼────┐┌────▼────┐┌────▼─────────────┐
 │  Local  ││ Preview ││ Sandbox ││  Prod   ││  Enterprise      │
 │  Dev    ││ Deploy  ││(Remote) ││         ││  (Level B/C)     │
 │ (WSL2) ││(Vercel) ││(Vercel) ││(Vercel) ││  (Vercel)        │
 └────┬────┘└────┬────┘└────┬────┘└────┬────┘└────┬─────────────┘
      │          │          │          │          │
 ┌────▼────┐┌────▼────┐┌────▼────┐┌────▼────┐┌────▼─────────────┐
 │Supabase ││Supabase ││Supabase ││Supabase ││ Supabase         │
 │ Local   ││  Prod*  ││ Sandbox ││  Prod   ││ Per-customer     │
 │ (CLI)   ││(shared) ││(remote) ││ (main)  ││ (isolated)       │
 └─────────┘└─────────┘└─────────┘└─────────┘└──────────────────┘
```

*Note: Preview deployments now point at sandbox Supabase — resolved by ADR-005 (2026-03-13). Config isolation verified via Vercel Dashboard. Runtime verification pending (5 sandbox RLS errors).

### 2.2 Environment Purposes

| Environment | Purpose | Database | Destructive OK? | Customer Data? |
|-------------|---------|----------|-----------------|----------------|
| **Local Dev** (WSL2) | Day-to-day development, feature work | Supabase CLI (local Docker) | ✅ Yes | ❌ Never |
| **Preview Deploy** | PR review, visual QA | Sandbox Supabase (remote) | ✅ Yes | ❌ Never |
| **Sandbox** (remote) | Integration testing, demos, sharing | Sandbox Supabase (remote) | ✅ Yes (with caution) | ❌ Never |
| **Production** | Live service | Prod Supabase | ❌ Never | ✅ Real data |
| **Enterprise** (Level B) | Customer-isolated deployment | Customer Supabase | ❌ Never | ✅ Customer data |

### 2.3 Key Principle: Environment Isolation

> **No development or preview traffic should ever hit the production database.**
>
> Preview deployments now target the sandbox Supabase project (`vmpdejhgpsrfulimsoqn`). ADR-005 (Environment Isolation — Alt B) was decided 2026-03-13. Config isolation verified. Runtime verification pending.

---

## 3. WSL2 Local Engineering Baseline

### 3.1 Why WSL2

| Concern | WSL2 Solution |
|---------|---------------|
| Supabase CLI requires Docker | WSL2 provides native Linux Docker support |
| Cross-platform scripts (`bash`, `jq`) | WSL2 runs bash/shell natively |
| Node.js tool consistency | Same runtime as CI/Vercel |
| File system performance | WSL2 ext4 is faster than NTFS for Node.js |
| Reproducibility | Same environment for all developers |
| CI parity | GitHub Actions runs Ubuntu — WSL2 is closest local match |

### 3.2 WSL2 Developer Setup Specification

| Component | Version | Source |
|-----------|---------|--------|
| WSL2 distribution | Ubuntu 22.04 or 24.04 | Microsoft Store |
| Node.js | 20 LTS (match CI) | `nvm` (version pinned via `.nvmrc`) |
| npm | Bundled with Node 20 | — |
| Supabase CLI | Latest | `npm install -g supabase` or `brew install supabase` |
| Docker Engine | Latest | WSL2 systemd or Docker Desktop |
| Git | Bundled with Ubuntu | — |
| VS Code | Windows host | Remote-WSL extension |
| PowerShell | Windows host (for Windows-specific scripts) | — |

### 3.3 What This Enables

| Capability | Current | With WSL2 |
|------------|---------|-----------|
| Local Supabase (full stack) | ❌ Not documented | ✅ `supabase start` → local Docker |
| Run all migrations locally | ⚠️ Manual | ✅ `supabase db reset` |
| RLS tests locally | ✅ CI only (rls-tests.yml) | ✅ Local + CI |
| Seed data testing | ❌ Manual SQL | ✅ `supabase db seed` |
| Shell scripts | ⚠️ PowerShell only | ✅ Bash + PowerShell |
| E2E tests (future) | ❌ | ✅ Playwright in WSL2 |
| `deploy-migrations.sh` | ❌ | ✅ Native bash |

### 3.4 Missing Config to Create

| File | Purpose | Content |
|------|---------|---------|
| `.nvmrc` | Pin Node.js version | `20` |
| `.env.local.example` | Document required env vars | Template from `lib/config/env.ts` |
| `supabase/config.toml` | Local Supabase CLI config | Project ref, region, ports |
| `docs/DEVELOPER_SETUP.md` | Onboarding guide | WSL2 + Node + Supabase CLI + first run |
| `scripts/setup-dev.sh` | Automated dev setup | Install deps, start Supabase, apply migrations, seed |

---

## 4. Vercel-Hosted Sandbox Strategy

### 4.1 Current State vs Target

| Aspect | Current | Target |
|--------|---------|--------|
| Sandbox location | Local only (dev machine) | Remote on Vercel |
| Sandbox Supabase | Production (⚠️ risk) | Dedicated sandbox project |
| Preview deploys | → Production Supabase | → Sandbox Supabase |
| Demo access | `demo.lekbanken.no` | `sandbox.lekbanken.no` |
| Shareability | ❌ Local only | ✅ Anyone with URL |
| Data reset | Manual | `supabase db reset` on sandbox project |
| Feature previews | Local screenshot | Vercel preview URL |

### 4.2 Sandbox Architecture

```
┌─────────────────────────────┐
│     Vercel Project:         │
│     lekbanken-sandbox       │
│                              │
│  Domain: sandbox.lekbanken.no│
│  Branch: main (or develop)  │
│  Auto-deploy: ✅ Yes         │
└──────────┬──────────────────┘
           │
  ┌────────▼─────────┐
  │  Supabase:       │
  │  lekbanken-      │
  │  sandbox         │
  │                  │
  │  Region: EU-North│
  │  Plan: Free/Pro  │
  │  Data: seed only │
  └──────────────────┘
```

### 4.3 What This Changes

| Benefit | Impact |
|---------|--------|
| Preview deploys are safe | No production data exposure during PR review |
| Demos are shareable | Send `sandbox.lekbanken.no` link to design partners |
| Data is resettable | `supabase db reset` on sandbox without affecting production |
| Integration testing | Full-stack Vercel + Supabase without local setup |
| Validates enterprise model | Sandbox IS a Level B-style deployment — proves the model works |

### 4.4 Relationship to ADR-005

This sandbox strategy is the implementation of ADR-005 (Environment Isolation). Successfully deploying a sandbox environment is a prerequisite for enterprise isolation — it proves the multi-project deployment model end-to-end.

---

## 5. Vercel + Supabase Operating Model

### 5.1 Project Organisation

| Vercel Project | Supabase Project | Domain | Purpose |
|----------------|-----------------|--------|---------|
| `lekbanken-prod` | `lekbanken-prod` | `app.lekbanken.no` | Production |
| `lekbanken-prod` (Preview scope) | `lekbanken-sandbox` | Vercel preview URLs | Preview isolation |
| `lekbanken-{customer}` | `lekbanken-{customer}` | `{customer}.lekbanken.no` | Enterprise (Level B) |

### 5.2 Deployment Flow

```
                    Developer pushes to main
                              │
                     ┌────────▼────────┐
                     │  GitHub Actions  │
                     │  (CI checks)     │
                     │  - typecheck     │
                     │  - unit tests    │
                     │  - RLS tests     │
                     │  - i18n audit    │
                     └────────┬────────┘
                              │ All pass
                     ┌────────▼────────┐
                     │  Vercel Build    │
                     │  (auto-deploy)   │
                     └────────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         ┌────▼────┐    ┌─────▼─────┐   ┌─────▼──────┐
         │  Prod   │    │  Sandbox  │   │ Enterprise │
         │ (auto)  │    │  (auto)   │   │ (manual    │
         │         │    │           │   │  trigger)  │
         └────┬────┘    └─────┬─────┘   └─────┬──────┘
              │               │               │
         ┌────▼────┐    ┌─────▼─────┐   ┌─────▼──────┐
         │  DB:    │    │  DB:      │   │  DB:       │
         │ migrate │    │  reset +  │   │  migrate   │
         │ (push)  │    │  seed     │   │  (push)    │
         └─────────┘    └───────────┘   └────────────┘
```

### 5.3 Branch Strategy

| Branch | Deploys To | Auto? | Database |
|--------|-----------|-------|----------|
| `main` | Production + Sandbox | ✅ Yes | Prod: push migrations. Sandbox: reset + seed |
| `develop` (if used) | Sandbox only | ✅ Yes | Sandbox |
| Feature branches | Vercel preview | ✅ Yes | Sandbox |
| Enterprise targets | Triggered manually or via release tag | ❌ Manual | Enterprise customer DB |

### 5.4 Secrets & Environment Variable Management

| Scope | Storage | Access |
|-------|---------|--------|
| Production env vars | Vercel project settings (encrypted) | Project owner |
| Sandbox env vars | Vercel project settings (encrypted) | Project members |
| Enterprise env vars | Vercel project settings (per-customer project) | Project owner |
| CI secrets | GitHub Actions secrets | Repo admin |
| Local dev secrets | `.env.local` (git-ignored) | Developer |
| Supabase project secrets | Supabase Dashboard | Project owner |

> **No secrets in code.** All secrets are managed in hosting platform dashboards. `.env.local` is git-ignored and must be created manually from `.env.local.example`.

### 5.5 Cron & Background Jobs

| Job | Schedule | Scope | Per-Project? |
|-----|----------|-------|-------------|
| Token cleanup | `0 4 * * *` (daily 04:00 UTC) | `vercel.json` | ✅ Each Vercel project gets its own |

Future cron jobs should be added to `vercel.json` (same for all targets) or conditionally via env var.

### 5.6 Storage Architecture

| Bucket | Scope | Isolation |
|--------|-------|-----------|
| `game-media` | Game images, audio | Per-Supabase-project |
| `tenant-media` | Tenant branding | Per-Supabase-project |
| `media-images` | General media | Per-Supabase-project |
| `media-audio` | Audio files | Per-Supabase-project |
| `custom_utmarkelser` | Achievement badges | Per-Supabase-project |

All upload paths are tenant-prefixed: `${tenantId}/${timestamp}-${file}`. Within an isolated deployment, the tenant prefix still applies (defense-in-depth).

---

## 6. Release Management Across Deploy Targets

### 6.1 Release Model

| Component | Shared Platform | Enterprise Target |
|-----------|----------------|-------------------|
| **App code** | Auto-deploy on push to `main` | Manual trigger or tag-based deploy |
| **DB migrations** | `supabase db push` to prod | `deploy-migrations.sh` orchestrates all targets |
| **Seed data** | N/A (prod has real data) | `supabase db seed` on first setup only |
| **Rollback** | Vercel instant rollback | Vercel instant rollback (same mechanism) |

### 6.2 Release Cadence

| Target | Cadence | Lag OK? |
|--------|---------|---------|
| Production | Continuous (every merge to `main`) | — |
| Sandbox | Continuous (same as prod) | — |
| Enterprise (Level B) | Same-day or next-day | ✅ Up to 24h lag acceptable |
| Enterprise (Level C) | Coordinated release window | ✅ Customer-agreed schedule |

### 6.3 Migration Safety

All migrations must be:
- Sequential and deterministic
- No environment-specific SQL
- No `IF deployment = X` conditionals
- Applicable to any Supabase project from scratch (Guardrail G5)

Migration orchestration script (`scripts/deploy-migrations.sh`) ensures all targets stay at the same schema version. CI drift check (optional) warns if any target falls behind.

---

## 7. Observability & Incident Handling

### 7.1 Current Observability Stack

| Tool | Purpose | Status | Per-Deploy? |
|------|---------|--------|-------------|
| Sentry | Error tracking | ⚠️ Not yet implemented (DSN env var exists) | Shared DSN + `DEPLOY_TARGET` tag, or separate DSN for Level C |
| PostHog | Product analytics | ⚠️ Partial (demo error capture, cookie consent) | Shared or separate |
| `lib/utils/logger.ts` | Structured logging | ✅ In use | Vercel logs per project |
| `/api/health` | Binary health check | ✅ Public | Per deploy target |
| `/api/system/metrics` | Detailed metrics | ✅ system_admin | Per deploy target |
| `/admin/system-health` | Health dashboard | ✅ Admin UI | Per deploy target |
| `tenant_audit_logs` | Audit trail | ✅ 6 audit tables | Per database |
| k6 smoke test | Load testing | ✅ Script exists | Configurable target URL |

### 7.2 Per-Deployment Monitoring

Each deploy target provides its own:
- Vercel dashboard (deploys, functions, logs, analytics)
- Supabase dashboard (database, auth, storage, realtime, logs)
- `/api/health` endpoint
- `/api/system/metrics` endpoint (system_admin gated)
- Sentry error stream (shared DSN with `deploy_target` tag, or separate)

### 7.3 Incident Handling Model

| Scope | Process | Runbook |
|-------|---------|---------|
| Shared platform incident | Standard SEV process (`docs/ops/incident_response.md`) | `launch-readiness/incident-playbook.md` |
| Enterprise deployment incident | Same process, customer-specific escalation | Per-customer SLA + shared runbook |
| Cross-deployment incident (e.g. release regression) | Rollback all targets, investigate | `deploy-migrations.sh` + Vercel rollback |
| Schema drift | `deploy-migrations.sh` + verification | CI drift check |

---

## 8. Architecture Decisions (Platform Operations)

| ID | Decision | Status | Notes |
|----|----------|--------|-------|
| OPS-001 | WSL2 as local engineering baseline | 🟡 Proposed | Enables Supabase CLI, bash scripts, CI parity |
| OPS-002 | Sandbox Supabase + Preview env vars in existing Vercel project | ✅ Done | Isolates preview from prod data without extra Vercel project |
| OPS-003 | One Vercel project per deploy target | ⏳ Deferred | Relevant for enterprise customers and persistent staging |
| OPS-004 | Continuous deploy for prod/sandbox, manual trigger for enterprise | 🟡 Proposed | Enterprise customers may want release coordination |
| OPS-005 | All deploy targets tracked in `.deploy-targets.json` | 🟡 Proposed | Central registry for migration orchestration |

---

## 9. Relationship to Enterprise Isolation

This workstream is the **operational backbone** of the enterprise isolation strategy. Enterprise isolation (ADR-E1) answers "can we run multiple deployments?" — this workstream answers "how do we run them well?"

| Enterprise Isolation | Platform Operations |
|---------------------|-------------------|
| Architecture proves hybrid deployment is possible | Operations makes hybrid deployment sustainable |
| Defines isolation levels (A/B/C) | Defines how each level is provisioned, deployed, monitored |
| Guardrails protect code purity | Release management ensures consistency across targets |
| Design study — strategic | Implementation — tactical |

---

## 10. What This Is Not

This document does **not** propose:
- Moving away from Vercel or Supabase (current stack is appropriate)
- Kubernetes or container orchestration (not needed at current scale)
- Multi-region active-active deployment (Supabase project per region is sufficient)
- Custom CI/CD replacing Vercel auto-deploy (Vercel deployment model is retained)
- Immediate implementation — this is a design study that should be executed incrementally

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **Deploy target** | A specific Vercel project + Supabase project combination |
| **Sandbox** | A non-production deployment used for testing, demos, and preview |
| **Preview deploy** | Vercel-generated URL for a PR or branch, used for review |
| **Control plane** | Centrally managed: repo, CI, release process, seeds, migrations, docs |
| **Data plane** | Per-deployment: DB, auth, storage, secrets, domain, webhooks |
| **Provisioning** | The process of creating a new deploy target from scratch |
| **Schema drift** | When deploy targets have different migration versions applied |
| **Engineering baseline** | The standard local development environment specification |
