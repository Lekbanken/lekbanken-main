# Enterprise Isolation Implementation Plan

## Metadata

- Owner: -
- Status: draft
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Draft implementation plan for enterprise-isolated deployments. Use this as a future-readiness roadmap triggered by a real enterprise customer need, not as an active execution tracker.

> **Status:** Design-Ready — No implementation before launch  
> **Date:** 2026-03-13  
> **Author:** Claude Opus 4.6  
> **Prerequisite:** Phase 1B (Environment Isolation) should be completed first  
> **Dependency:** ADR-005 (remote sandbox) validates the multi-project model  
> **Trigger:** First enterprise customer requiring physical isolation  

---

## 1. Principle

> **Shared-by-default, isolated-when-required.**
>
> Ingen kundspecifik fork av appen. Samma produkt, olika deploy targets.

---

## 2. Implementation Phases

### Overview

| Phase | Name | When | Effort | Blocks Enterprise Sales? |
|-------|------|------|--------|--------------------------|
| Phase 0 | Design Guardrails | ✅ NOW (this document) | Done | No |
| Phase 1 | Seed & Migration Tooling | Before first enterprise customer | 1–2 days | Yes |
| Phase 2 | First Isolated Deployment | With first enterprise contract | 1 day | Yes |
| Phase 3 | Operations Runbook | With first deployment | 0.5 days | No |
| Phase 4 | Multi-Deploy Admin | When 3+ deployments exist | 2–3 days | No |

### Readiness Tiers

Enterprise isolation readiness is **not a single milestone**. It has three distinct tiers:

| Tier | Name | Scope | Effort | Status |
|------|------|-------|--------|--------|
| **Tier 1** | Minimum technical enablement | Seed scripts, migration tooling, `DEPLOY_TARGET` env var, deploy target registry | ~3 days | Phases 1–2 above |
| **Tier 2** | Operational readiness | Backup/restore per deployment, incident handling, secrets management, release coordination, access control for ops/admin, monitoring/alerting | Additional | See `platform-operations-implementation-plan.md` |
| **Tier 3** | Customer-facing compliance packaging | DPA/GDPR documentation, hosting description, security posture documentation, SLA, subprocessor list, data retention policy | Additional | Must be tailored per customer |

> **Tier 1 (~3 days) is the minimum to deploy.** Tiers 2 and 3 are required before a deployment is **production-ready for an enterprise customer with compliance requirements.**
>
> Do not read "~3 days" as "enterprise-ready in 3 days". It means the technical plumbing can be stood up. Operations and compliance are separate workstreams.

---

## 3. Phase 0 — Design Guardrails ✅ DONE

Completed via this document set:

- [x] ADR-E1: Isolation levels defined (A/B/C)
- [x] Architecture study: 15 dimensions audited
- [x] Guardrail G1: No code forks (locked)
- [x] Guardrail G2: All infra via env vars (verified)
- [x] Guardrail G3: Global catalog via seeds (policy set)
- [x] Guardrail G4: Tenant features drive behavior (policy set)
- [x] Guardrail G5: Migration compatibility (policy set)

**Deliverables:** `enterprise-isolation-architecture.md`, `enterprise-isolation-audit.md`, this file.

---

## 4. Phase 1 — Seed & Migration Tooling

**When:** Before first enterprise customer contract is signed.

### Step 1.1 — Idempotent Seed Scripts

**What:** Enhance `supabase/seeds/` to be fully idempotent and complete.

**Current state:** 3 seed files exist, partially idempotent.

**Required:**

```sql
-- supabase/seeds/01_platform_catalog.sql

-- Products (ON CONFLICT = safe re-run)
INSERT INTO products (id, product_key, name, category, ...)
VALUES (...)
ON CONFLICT (product_key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category;

-- Purposes
INSERT INTO purposes (id, purpose_key, type, parent_id, ...)
VALUES (...)
ON CONFLICT (purpose_key) DO UPDATE SET
  type = EXCLUDED.type;

-- Categories
INSERT INTO categories (id, slug, ...)
VALUES (...)
ON CONFLICT (slug) DO UPDATE SET ...;

-- Product-Purpose mapping
INSERT INTO product_purpose_map (product_id, purpose_id)
VALUES (...)
ON CONFLICT (product_id, purpose_id) DO NOTHING;
```

**Verification:** Run `supabase db reset` on sandbox → all catalog data present.

**Effort:** ~2 hours.

### Step 1.2 — Multi-Project Migration Script

**What:** Script to apply migrations to all deploy targets sequentially.

**Proposed file:** `scripts/deploy-migrations.sh`

```bash
#!/bin/bash
set -euo pipefail

# Deploy target registry
TARGETS_FILE="${TARGETS_FILE:-.deploy-targets.json}"

if [ ! -f "$TARGETS_FILE" ]; then
  echo "No deploy targets file found: $TARGETS_FILE"
  echo "Create it with: [{\"name\": \"shared-prod\", \"ref\": \"...\"}]"
  exit 1
fi

echo "=== Lekbanken Migration Orchestration ==="
echo "Targets: $(jq length "$TARGETS_FILE") projects"

# Apply to each target
jq -c '.[]' "$TARGETS_FILE" | while read target; do
  name=$(echo "$target" | jq -r '.name')
  ref=$(echo "$target" | jq -r '.ref')

  echo ""
  echo "--- Migrating: $name ($ref) ---"
  supabase link --project-ref "$ref"
  supabase db push --linked

  echo "✅ $name: migrations applied"
done

echo ""
echo "=== All targets migrated ==="
```

**Deploy target registry file:** `.deploy-targets.json`

```json
[
  { "name": "shared-prod", "ref": "qohhnufxididbmzqnjwg" }
]
```

When a new enterprise customer is onboarded, add their ref:

```json
[
  { "name": "shared-prod", "ref": "qohhnufxididbmzqnjwg" },
  { "name": "church-se-prod", "ref": "abc123..." }
]
```

**Effort:** ~4 hours (script + testing + documentation).

### Step 1.3 — CI Migration Version Check (optional, recommended)

**What:** GitHub Action that verifies all deploy targets are on the same migration version.

**Trigger:** After any migration merge.

```yaml
# .github/workflows/migration-drift-check.yml
name: Migration Drift Check
on:
  push:
    paths: ['supabase/migrations/**']

jobs:
  check-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check migration versions
        run: |
          # Compare latest migration in repo vs each target
          LATEST=$(ls supabase/migrations/ | tail -1)
          echo "Latest migration: $LATEST"
          # Would need supabase CLI + project secrets to verify
          # For now, this serves as a reminder
```

**Effort:** ~2 hours.

---

## 5. Phase 2 — First Isolated Deployment

**When:** Enterprise customer contract is signed and requires Level B/C isolation.

### Step 2.0 — Provisioning Model

See `enterprise-isolation-architecture.md` §11 for the full 11-step provisioning sequence with time estimates.

The provisioning model defines the repeatable flow for standing up a new isolated enterprise environment:

1. Define deploy target specification
2. Create Supabase project
3. Apply migrations
4. Run idempotent seeds
5. Create Vercel project (same repo)
6. Set env vars
7. Connect domain
8. Configure Stripe webhook (if billing enabled)
9. Create system admin user + initial tenant
10. Run readiness verification suite
11. Register target in deploy target inventory

**Total provisioning time (manual):** ~90 minutes per new enterprise customer.

This starts as a manual checklist and should evolve toward `scripts/provision-target.sh` when 3+ deployments exist.

### Step 2.1 — Create Supabase Project

**Action:** Manual — Supabase Dashboard.

| Setting | Value |
|---------|-------|
| Name | `lekbanken-{customer}` (e.g., `lekbanken-church-se`) |
| Region | Same as production (EU-North) or customer-specified |
| Plan | Pro (or Enterprise for SLA) |
| Database password | Generate strong, store in secret manager |

**Deliverable:** Project ref, URL, anon key, service role key.

### Step 2.2 — Apply Migrations + Seeds

```bash
# Link to new project
supabase link --project-ref <new-ref>

# Apply all migrations
supabase db push --linked

# Apply seed data
supabase db seed --linked
```

**Verification:**
- All 304+ migrations pass
- Product/purpose/category catalog is populated
- RLS policies are created

### Step 2.3 — Create Vercel Project

**Action:** Vercel Dashboard or CLI.

```bash
# Create project from same repo
vercel link --repo lekbanken-main --project lekbanken-church-se
```

**Environment variables to set:**

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | New project URL | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | New project anon key | |
| `SUPABASE_SERVICE_ROLE_KEY` | New project service role key | |
| `TENANT_COOKIE_SECRET` | New unique secret | |
| `STRIPE_ENABLED` | `true` | If billing enabled |
| `STRIPE_LIVE_SECRET_KEY` | Same Stripe account key | Or separate for Level C |
| `STRIPE_LIVE_WEBHOOK_SECRET` | **New** per endpoint | |
| `NEXT_PUBLIC_SENTRY_DSN` | Same or separate | |
| `DEMO_ENABLED` | `false` | Enterprise doesn't need demo |
| `DEPLOY_TARGET` | `church-se-prod` | For observability tagging |

### Step 2.4 — Configure Domain

**Options:**
- Subdomain: `kyrkan.lekbanken.no` → Vercel custom domain
- Customer domain: `lekar.svenskakyrkan.se` → Vercel custom domain + DNS

**Vercel:** Project Settings → Domains → Add

### Step 2.5 — Configure Stripe Webhook

**Stripe Dashboard:**
1. Developers → Webhooks → Add endpoint
2. URL: `https://kyrkan.lekbanken.no/api/billing/webhooks/stripe`
3. Events: `charge.succeeded`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.*`
4. Copy signing secret → set as `STRIPE_LIVE_WEBHOOK_SECRET` in Vercel

### Step 2.6 — Create System Admin User

**In new Supabase project:**
1. Create user via Supabase Auth Dashboard
2. Set custom claim: `role: 'system_admin'`
3. Verify via `/api/readiness` endpoint

### Step 2.7 — Create Customer Tenant

**Via admin panel (now accessible):**
1. Log in as system admin at `kyrkan.lekbanken.no/admin`
2. Create new tenant (name: "Linköpings pastorat", type: "workplace")
3. Invite customer admin users

### Step 2.8 — Verify Deployment

**Checklist:**

- [ ] `https://kyrkan.lekbanken.no` loads
- [ ] `/api/health` returns 200
- [ ] `/api/readiness` returns all checks passed
- [ ] Admin login works
- [ ] Tenant creation works
- [ ] User invitation works
- [ ] Game browsing works (catalog data present)
- [ ] Plan creation works
- [ ] Session creation works
- [ ] Billing flow works (if enabled)
- [ ] Storage upload works

**Effort:** ~1 day (including verification).

---

## 6. Phase 3 — Operations Runbook

**When:** With first isolated deployment.

### Step 3.1 — Customer Onboarding Checklist

Create `docs/ops/enterprise-onboarding-checklist.md`:

```markdown
# Enterprise Customer Onboarding

## Pre-Sales
- [ ] Confirm isolation level (A/B/C) 
- [ ] Confirm region requirement
- [ ] Confirm domain preference
- [ ] Confirm billing model

## Infrastructure Setup
- [ ] Create Supabase project
- [ ] Apply migrations + seeds
- [ ] Create Vercel project
- [ ] Set all env vars
- [ ] Configure custom domain
- [ ] Configure Stripe webhook
- [ ] Create system admin user
- [ ] Create customer tenant
- [ ] Run verification checklist

## Handover
- [ ] Customer admin accounts created
- [ ] Customer admin trained (login, tenant mgmt, game library)
- [ ] Support channel established
- [ ] SLA documented
```

### Step 3.2 — Release Coordination Runbook

Create `docs/ops/enterprise-release-runbook.md`:

```markdown
# Enterprise Release Coordination

## Standard Release (same-day)
1. Merge to main
2. CI passes (typecheck, tests, RLS)
3. Vercel auto-deploys shared-prod
4. Run `scripts/deploy-migrations.sh` for DB migrations
5. Manually trigger deploy for each isolated Vercel project
6. Verify `/api/readiness` on all targets

## Migration-Only Release
1. Apply via `deploy-migrations.sh`
2. Verify schema version matches across all targets
3. No Vercel redeploy needed (stateless app)

## Hotfix
1. Same as standard, but immediate
2. All targets must receive hotfix same day
```

### Step 3.3 — Incident Runbook Extension

Add to existing `launch-readiness/incident-playbook.md`:

```markdown
## Enterprise Isolation Incidents

### Schema Drift
- Symptom: Isolated deployment errors on new features
- Cause: Migration not applied
- Fix: Run `deploy-migrations.sh`
- Prevention: CI drift check

### Isolated Deployment Down
- Symptom: Customer reports site unavailable
- Check: Vercel dashboard → project status
- Check: Supabase dashboard → project health
- Escalation: Same as shared platform
```

**Effort:** ~0.5 days.

---

## 7. Phase 4 — Multi-Deploy Admin (Future)

**When:** 3+ isolated deployments exist.

### Step 4.1 — Admin Portal Page

Add an internal page (system_admin only) that links to all deployment admin panels:

```
/admin/deployments
├── shared-prod → https://app.lekbanken.no/admin
├── church-se-prod → https://kyrkan.lekbanken.no/admin
└── church-no-prod → https://kirkja.lekbanken.no/admin
```

**Implementation:** Simple page with env-var-driven or DB-driven deployment registry. Not a cross-DB query — just a link list.

### Step 4.2 — Deployment Health Dashboard

Aggregate `/api/readiness` from all targets into a single view:

```
Deployment Health
━━━━━━━━━━━━━━━
shared-prod    ✅ Ready (v2.30, 304 migrations)
church-se-prod ✅ Ready (v2.30, 304 migrations)  
church-no-prod ⚠️ Needs migration (v2.29, 302 migrations)
```

**Effort:** ~2-3 days.

---

## 8. Minimum Design Changes Now

These are the only code changes recommended **before** an enterprise contract:

| Change | Type | Effort | Priority |
|--------|------|--------|----------|
| Add `DEPLOY_TARGET` env var read | Config | 10 min | Recommended |
| Add `deploy_target` tag to Sentry init | Observability | 10 min | Recommended |
| Make seed scripts fully idempotent | SQL | 2 hours | Required before Phase 2 |
| Create `.deploy-targets.json` with shared-prod | Config | 5 min | Recommended |

> **Note:** These are Tier 1 (minimum technical enablement) changes only. Tier 2 (operational readiness) and Tier 3 (compliance packaging) tasks are tracked in `platform-operations-implementation-plan.md`.

### Code Change: Sentry Deploy Target Tag

**File:** Wherever Sentry is initialized (likely `sentry.client.config.ts` / `instrumentation.ts`)

```typescript
Sentry.init({
  // ... existing config
  initialScope: {
    tags: {
      deploy_target: process.env.DEPLOY_TARGET || 'shared-prod',
    },
  },
});
```

This is the **only application code change** recommended now. Everything else is tooling/ops.

---

## 9. Cost Model (Per Level B Customer)

| Item | Monthly Cost | Notes |
|------|-------------|-------|
| Supabase Pro | ~$25/mo | Per-project pricing |
| Vercel Pro (additional project) | $0 extra | Covered by team plan (depending on usage) |
| Stripe | $0 extra | Same account, per-transaction |
| Domain | $0 extra | Subdomain of `lekbanken.no` |
| Custom domain (if customer wants) | ~$15/year | DNS record |
| Operations overhead | ~1 hour/month | Migration sync, monitoring |

**Total incremental cost per Level B customer:** ~$25-50/month infrastructure + ~1h/month ops.

This cost should be reflected in enterprise pricing.

---

## 10. Timeline

```
NOW                              FIRST ENTERPRISE CONTRACT
 │                                        │
 ├─ Phase 0: Design Guardrails ✅         │
 │                                        │
 │  (Continue standard development)       │
 │  (Phase 1B sandbox validates model)    │
 │                                        │
 ├─ Phase 1: Seed + Migration Tooling ────┤  (~2 days, anytime before contract)
 │                                        │
 │                                  ┌─────┤
 │                                  │ Phase 2: First Deployment (~1 day)
 │                                  │ Phase 3: Ops Runbook (~0.5 days)
 │                                  └─────┤
 │                                        │
                                    3+ CUSTOMERS
                                          │
                                    ┌─────┤
                                    │ Phase 4: Multi-Deploy Admin (~3 days)
                                    └─────┤
```

---

## 11. Decision Required

> **ADR-E1: Lekbanken ska vara byggt för shared-by-default, isolated-when-required.**

| Decision | Status |
|----------|--------|
| Approve 3-level isolation model (A/B/C) | ⏳ Awaiting Johan |
| Approve guardrails G1-G5 | ⏳ Awaiting Johan |
| Approve Phase 1 before enterprise sales | ⏳ Awaiting Johan |
| Approve minimum code changes now | ⏳ Awaiting Johan |

---

## 12. Relationship to Other Phases

| Phase | Relationship | Dependency |
|-------|-------------|------------|
| Phase 1B (Sandbox) | **Foundation** — proves multi-project model | Must complete before Phase 2 |
| Phase 2 (Test Foundation) | **Independent** — tests run per-project | No interaction |
| Phase 6 (Doc Cleanup) | **Update needed** — add enterprise docs | After Phase 3 |
| ADR-K1 (Custom blocks) | **Compatible** — runs per-DB | No interaction |
| ADR-K3 (Groups/hierarchy) | **Compatible** — tenant-scoped | No interaction |
| Product Roadmap (Kyrkan) | **Aligned** — kyrkan is first enterprise candidate | Phase 2 may coincide |
