# Enterprise Isolation Architecture

## Metadata

- Owner: -
- Status: draft
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Draft architecture study for hybrid and enterprise-isolated deployment models. Use this as design guidance together with the paired audit and implementation plan, not as proof that enterprise delivery is already operationally complete.

> **Status:** Design Study (ADR-E1)  
> **Date:** 2026-03-13  
> **Author:** Claude Opus 4.6 (code-verified architecture study)  
> **Sponsor:** Johan (product owner)  
> **Context:** Svenska kyrkan design partner, 80 youth leaders in pilot group  
> **Principle:** Shared-by-default, isolated-when-required  

---

## 1. Executive Summary

Lekbanken's current architecture is **surprisingly well-positioned** for hybrid deployment. The multi-tenant model already enforces strong logical isolation via 994 RLS policies, per-tenant data scoping, signed tenant cookies, and defense-in-depth API-layer validation. The remaining work is primarily in **deployment topology and operations**, not in application code.

### Verdict

> **Lekbanken can support hybrid deployment (shared + isolated) without a product fork.**
>
> The codebase is already env-driven, tenant-scoped, and RLS-enforced. What's missing is deployment orchestration, not application architecture.

> ⚠️ **Important:** This verdict covers **architectural readiness**. It does not mean enterprise delivery is "complete". Before a customer deployment is production-ready, additional work is needed in three tiers:
>
> 1. **Minimum technical enablement** — seed scripts, migration tooling, env config (~3 days)
> 2. **Operational readiness** — backup/restore, incident handling, secrets management, release coordination
> 3. **Customer-facing compliance packaging** — DPA/GDPR documentation, hosting description, security posture documentation
>
> See `enterprise-isolation-implementation-plan.md` for the full readiness path.

### Recommended Model

| Customer Type | Isolation Level | Deploy Target |
|---------------|-----------------|---------------|
| Standard (95%) | **Level A** — Shared tenant | `shared-prod` |
| Enterprise (regulated) | **Level B** — Isolated data plane | `church-se-prod`, `church-no-prod` |
| Government/compliance | **Level C** — Fully isolated | Dedicated deployment per contract |

---

## 2. Isolation Levels — Definition

### Level A — Shared Tenant

* Same app deployment (`app.lekbanken.no`)
* Same Supabase project (shared DB)
* Tenant isolation via RLS + `user_tenant_memberships`
* Shared storage buckets (tenant-prefixed paths)
* Shared Stripe account
* Shared release cycle

**Who it's for:** Individual users, small organisations, sports clubs, schools, private tenants.

### Level B — Isolated Data Plane

* **Same app codebase and release artifact** (same Vercel project, same repo)
* **Separate Supabase project** (own DB, own auth, own storage)
* Separate env vars pointing to dedicated Supabase
* Optional: separate region (EU-north, EU-west)
* Optional: separate custom domain (`kyrkan.lekbanken.no`)
* Shared Stripe account (separate Stripe Customer per tenant)
* **Same release process** — deploy same build, different env

**Who it's for:** Svenska kyrkan, Norska kyrkan, large kommuner — customers who require data residency or physical separation.

**Key constraint:** Same app code runs against a different DB. No code fork.

### Level C — Fully Isolated Deployment

* Separate Vercel project (or other hosting)
* Separate Supabase project
* Separate secrets, env vars, domain
* Separate release window (can lag behind shared platform)
* Optional: self-hosted or sovereign cloud
* Optional: separate Stripe account

**Who it's for:** Government agencies, defence-adjacent, strict compliance requirements.

**Key constraint:** Same repo, same build artifacts, different deploy targets. No code fork.

---

## 3. Current Architecture — What Already Supports This

### 3.1 Tenant Model ✅

**File:** `supabase/migrations/20251129000000_initial_schema.sql` + `20251209100000_tenant_domain.sql`

The tenant model is already designed for isolation:

| Feature | Status | Evidence |
|---------|--------|----------|
| Tenant table with types/status | ✅ | `tenants` — types: school, sports, workplace, private, demo |
| User-tenant membership (M:M) | ✅ | `user_tenant_memberships` — role, is_primary, status |
| Tenant settings/features/branding | ✅ | 3 separate config tables per tenant |
| Tenant audit logs | ✅ | `tenant_audit_logs` — actor, event, payload |
| Tenant invitations | ✅ | Token-based invitation with expiry |
| Custom domains | ✅ | `tenant_domains` table + `get_tenant_id_by_hostname()` RPC |

**Isolation implication:** In Level B/C, the tenant model is identical — just running in a separate database. A Level B customer's Supabase project contains only their tenants.

### 3.2 RLS — 994 Policies ✅

**Files:** Across 304+ migrations

All RLS policies use the same three helper functions:

```sql
is_system_admin()          — JWT claim check (no DB access)
has_tenant_role(id, role)  — Membership lookup + system_admin bypass
get_user_tenant_ids()      — Returns user's tenant IDs (system_admin → all)
```

**Isolation implication:** RLS policies are **database-local**. They work identically in a shared or isolated Supabase project. No changes needed.

### 3.3 Environment-Driven Configuration ✅

**File:** `lib/config/env.ts`

All infrastructure references are env vars, not hardcoded:

```typescript
env.supabase.url          // NEXT_PUBLIC_SUPABASE_URL
env.supabase.anonKey      // NEXT_PUBLIC_SUPABASE_ANON_KEY
env.supabase.serviceRoleKey // SUPABASE_SERVICE_ROLE_KEY
env.stripe.testSecretKey  // STRIPE_TEST_SECRET_KEY
env.stripe.liveSecretKey  // STRIPE_LIVE_SECRET_KEY
```

**Isolation implication:** Swapping `NEXT_PUBLIC_SUPABASE_URL` + keys is sufficient to point the same app code at a different database. Already proven by the Phase 1B sandbox strategy.

### 3.4 Supabase Client Creation ✅

**File:** `lib/supabase/server.ts`

Three client types, all env-driven:

| Client | Created Via | RLS | Scope |
|--------|-------------|-----|-------|
| `createServerRlsClient()` | Anon key + user JWT cookie | ✅ Yes | Per-request |
| `createServiceRoleClient()` | Service role key | ❌ No | Singleton |
| `createBrowserClient()` | Anon key + browser JWT | ✅ Yes | Per-session |

**Isolation implication:** All clients read URL/keys from env. No hardcoded project refs in code.

### 3.5 Storage — Tenant-Scoped Paths ✅

**Files:** `app/api/media/upload/route.ts`, `lib/services/design.ts`

Upload paths are tenant-prefixed:

```typescript
filePath = `${tenantId}/${timestamp}-${sanitizedFileName}`
```

Storage buckets: `game-media`, `tenant-media`, `media-images`, `media-audio`, `custom_utmarkelser`

**Isolation implication:** In Level B, the customer's Supabase project has its own storage. Bucket names stay the same (convention), but data is physically separate.

### 3.6 Billing — Per-Tenant Subscriptions ✅

**Files:** `app/api/billing/`, billing migrations

| Table | Scope | Level B Impact |
|-------|-------|----------------|
| `billing_accounts` | per tenant | Separate in customer DB |
| `tenant_subscriptions` | 1:1 with tenant | Separate in customer DB |
| `purchase_intents` | per tenant | Separate in customer DB |
| `invoices` / `payments` | per tenant | Separate in customer DB |

Stripe integration uses a single Stripe account with per-tenant Stripe Customers.

**Isolation implication:** Level B customers' billing data lives in their DB. Stripe Customer ID maps 1:1. Same Stripe account can serve multiple Supabase projects. Level C could use a separate Stripe account.

### 3.7 Auth — JWT-Based, Stateless ✅

**File:** `proxy.ts` (tenant resolution), `lib/utils/tenantCookie.ts`

Auth is Supabase Auth (per-project). JWT carries:
- `auth.uid()` — user identity
- `role` claim — system_admin check
- Cookie: `lb_tenant` (HMAC-signed, per-domain)

**Isolation implication:** Level B customer has separate Supabase Auth. Users are project-local. System admin access per project. No cross-project auth leakage.

### 3.8 Tenant Context Propagation ✅

**File:** `proxy.ts` lines 420-775, `lib/tenant/resolver.ts`

Resolution priority:
1. Path: `/app/t/[tenantId]`
2. Cookie: `lb_tenant` (signed)
3. Hostname: custom domain → `tenant_domains` lookup
4. Membership fallback

**Isolation implication:** Hostname-based resolution already supports custom domains. Level B customer with `kyrkan.lekbanken.no` → separate Vercel deployment pointing at their Supabase project.

---

## 4. Current Architecture — What Blocks or Complicates This

### 4.1 Single Supabase URL Assumption ⚠️

**File:** `lib/config/env.ts`, `lib/supabase/server.ts`

The app reads **one** `NEXT_PUBLIC_SUPABASE_URL` at build time. Next.js inlines `NEXT_PUBLIC_*` vars during build.

**Impact:** You cannot serve multiple Supabase projects from the same Vercel deployment. Each Level B customer needs a separate Vercel project (or Vercel deployment with different env vars).

**Severity:** Low — this is the **intended design** for Level B. Same repo → different Vercel project → different env vars.

### 4.2 Global Platform Tables ⚠️

**Files:** `supabase/migrations/20251129000000_initial_schema.sql`

These tables have **no `tenant_id` column** — they are shared platform resources:

| Table | Content | Level B Impact |
|-------|---------|----------------|
| `products` | Product catalog (licenses, subscriptions) | Must seed identically |
| `purposes` | Educational taxonomy | Must seed identically |
| `categories` | Game categories | Must seed identically |
| `product_purpose_map` | M:M junction | Must seed identically |

**Impact:** Level B customers need the same product/purpose/category data. This requires a **seed sync mechanism**.

**Severity:** Medium — solvable via idempotent seed scripts (partially exist in `supabase/seeds/`).

### 4.3 Migration Orchestration ⚠️

**Current state:** `supabase db push` against one linked project.

**Impact:** For Level B/C, every migration must be applied to:
- `shared-prod` (standard platform)
- `church-se-prod` (Svenska kyrkan)
- `church-no-prod` (Norska kyrkan)
- etc.

**Severity:** Medium — the migrations are SQL files, all idempotent/sequential. Orchestration is a script, not a code change.

### 4.4 Admin Panel — Single-Instance ⚠️

**File:** `app/admin/`

The admin panel assumes one database:
- System admin sees all tenants
- Tenant admin scope: `app/admin/tenant/[tenantId]/`

**Impact:** Level B customer's admin would be a separate deployment. System admin (Lekbanken team) needs to access multiple admin panels.

**Severity:** Low — operational, not architectural. Admin accesses `admin.church-se.lekbanken.no` instead of `admin.lekbanken.no`.

### 4.5 Cron Jobs — Vercel-Scoped ⚠️

**File:** `vercel.json`

Single cron: `/api/participants/tokens/cleanup` at 04:00 UTC.

**Impact:** Each Vercel project (Level B) gets its own cron config. Same endpoint, same schedule. No cross-project cron coordination needed.

**Severity:** Low — works by default.

### 4.6 Stripe Webhook Routing ⚠️

**File:** `app/api/billing/webhooks/stripe/route.ts`

Single webhook endpoint. Stripe sends events to one URL.

**Impact:** Level B customer's Vercel project has its own webhook URL. Needs separate Stripe webhook endpoint configuration per project.

**Severity:** Low — standard Stripe multi-endpoint setup.

### 4.7 Hardcoded Domain References ⚠️

| Reference | File | Impact |
|-----------|------|--------|
| `.lekbanken.no` | `app/auth/demo/route.ts` | Cookie domain for demo |
| `demo.lekbanken.no` | `app/auth/demo/route.ts`, `app/legal/accept/page.tsx` | Demo redirect |
| `privacy@lekbanken.no` | `app/legal/privacy/page.tsx` | Privacy contact |
| `support@lekbanken.no` | Docs only | Docs reference |

**Impact:** Level C customers may need their own legal pages / contact info. Level B can use subdomains of `lekbanken.no`.

**Severity:** Low — contact details are easily configurable. Demo routes are irrelevant for enterprise.

### 4.8 Sentry / Analytics — Shared DSN ⚠️

**Env:** `NEXT_PUBLIC_SENTRY_DSN`

**Impact:** Level C might want separate Sentry project for compliance. Level B can share or separate via env var.

**Severity:** Very low.

---

## 5. Deployment Topology

### 5.1 Target Architecture

```
              ┌──────────────────────────────────────────────────┐
              │                 GitHub Repo (main)                │
              │         Same codebase, same CI/CD pipeline        │
              └─────────┬──────────────┬──────────────┬──────────┘
                        │              │              │
                   ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐
                   │ Vercel  │   │  Vercel   │  │ Vercel  │
                   │ shared- │   │ church-   │  │ church- │
                   │  prod   │   │  se-prod  │  │ no-prod │
                   └────┬────┘   └─────┬─────┘  └────┬────┘
                        │              │              │
                   ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐
                   │Supabase │   │ Supabase  │  │Supabase │
                   │ shared  │   │ church-se │  │church-no│
                   │  prod   │   │   prod    │  │  prod   │
                   │(EU-N)   │   │  (EU-N)   │  │ (EU-N)  │
                   └─────────┘   └───────────┘  └─────────┘
                        │              │              │
                   ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐
                   │ Stripe  │   │  Stripe   │  │ Stripe  │
                   │ shared  │   │  (same    │  │ (same   │
                   │ account │   │  account) │  │ account)│
                   └─────────┘   └───────────┘  └─────────┘
```

### 5.2 Same Repo, Different Deploy Targets

```bash
# shared-prod (default)
vercel --prod

# church-se-prod (separate Vercel project, same repo)
vercel --prod --scope church-se

# church-no-prod
vercel --prod --scope church-no
```

Each Vercel project has its own:
- Environment variables (Supabase URL/keys, Stripe keys, domain)
- Custom domain (`kirkja.lekbanken.no`)
- Cron configuration
- Preview deployments

### 5.3 Migration Orchestration

```bash
# scripts/deploy-migrations.sh (proposed)

TARGETS=("shared-prod" "church-se-prod" "church-no-prod")

for target in "${TARGETS[@]}"; do
  echo "Applying migrations to: $target"
  supabase link --project-ref "$target"
  supabase db push
  supabase db verify  # proposed verification step
done
```

---

## 6. Critical Questions — Answered

### Q1: Can today's product run against multiple separate Supabase projects without code fork?

**Yes.** The app is fully env-driven. `NEXT_PUBLIC_SUPABASE_URL` + keys are the only Supabase-specific config. All 994 RLS policies are database-local. All client creation is via env vars. Deploying the same build artifact with different env vars works today.

### Q2: Which parts of the system assume a single global control plane?

| Component | Global Assumption | Isolation Impact |
|-----------|-------------------|------------------|
| Product catalog (`products`) | No `tenant_id` | Must seed identically across DBs |
| Purpose taxonomy (`purposes`) | No `tenant_id` | Must seed identically |
| Category catalog (`categories`) | No `tenant_id` | Must seed identically |
| System admin role | JWT claim | Per-project; separate admin users per isolated DB |
| Sentry DSN | Single env var | Configurable per project |
| Stripe account | Single account | Can share; Level C can separate |

### Q3: How should migrations run for isolated environments?

**Sequential orchestration.** Same 304+ SQL files applied via `supabase db push` to each project. A simple loop script handles this. No migration code changes needed.

**Rollout strategy:**
1. Apply to `shared-staging` first (canary)
2. Apply to `shared-prod`
3. Apply to isolated projects (can lag 1-2 hours / same release day)

### Q4: How should release management work?

**Same repo, same CI, different deploy targets:**

| Phase | Shared Platform | Isolated Customer |
|-------|-----------------|-------------------|
| Build | CI builds once | Same artifact |
| Test | Staging deploy + smoke test | Same + customer-specific seed test |
| Deploy | Vercel `--prod` | Vercel `--prod --scope <customer>` |
| Migrate | `supabase db push` to shared | `supabase db push` to customer DB |
| Verify | Health check + readiness endpoint | Same |
| Rollback | Vercel instant rollback | Same |

**Release windows:**
- Shared platform: continuous deployment
- Isolated customers: coordinated release windows (optional lag, e.g., 24h delay)

### Q5: How are billing, analytics, support, observability, and incident handling affected?

| Area | Level A (Shared) | Level B (Isolated Data) | Level C (Fully Isolated) |
|------|-------------------|-------------------------|--------------------------|
| **Billing** | Single Stripe, shared DB | Same Stripe, separate DB | Optional separate Stripe |
| **Analytics** | Shared Sentry + PostHog | Shared or separate DSN | Separate |
| **Support** | Single admin panel | Separate admin panel | Separate |
| **Observability** | Shared readiness endpoint | Per-project readiness | Per-project |
| **Incidents** | Single runbook | Per-project runbook | Per-project |
| **Cron** | Single Vercel cron | Per-project Vercel cron | Per-project |

### Q6: What minimum design adaptation should be done now?

See §7.

---

## 7. Design Guardrails — Lock Now

These decisions should be locked immediately to prevent future architectural drift:

### Guardrail G1: No Customer-Specific Code Forks

> **Samma produkt, olika deploy targets.**

Every customer — shared or isolated — runs the same build artifact. Feature differences are controlled via:
- `tenant_features` table (per-tenant feature flags)
- `tenant_settings` table (per-tenant configuration)
- Environment variables (per-deployment infrastructure config)

**Never:** `if (tenantId === 'svenska-kyrkan') { ... }`

### Guardrail G2: All Infrastructure References Via Environment

> **No hardcoded Supabase URLs, Stripe keys, or domain names in application code.**

Verified: `lib/config/env.ts` already centralizes all env vars. Demo domain references (`demo.lekbanken.no`) are the only hardcoded domains and are irrelevant for enterprise.

### Guardrail G3: Global Catalog Managed Via Idempotent Seeds

> **Products, purposes, and categories are platform data — they must be seedable.**

Current state: `supabase/seeds/` contains 3 seed files. These must be:
- Idempotent (ON CONFLICT DO NOTHING / DO UPDATE)
- Version-controlled
- Applied as part of any new project bootstrap

### Guardrail G4: Tenant Features Drive Behavior, Not Deployment Target

Future features (custom block types [ADR-K1], content sharing [ADR-K2]) must be tenant-scoped, not deployment-scoped. A Level B customer's features work identically to a Level A customer's features.

### Guardrail G5: Migration Compatibility

All migrations must remain:
- Sequential and deterministic
- No environment-specific SQL
- No `IF deployment = X` conditionals
- Applicable to any Supabase project from scratch

---

## 8. Relationship to Other ADRs

| ADR | Subject | Interaction |
|-----|---------|-------------|
| ADR-005 | Environment Isolation (dev/preview/sandbox) | **Foundation** — Phase 1B sandbox proves the multi-project model |
| ADR-K1 | Tenant-Defined Block Types | **Compatible** — tenant_block_types is per-DB, no conflict |
| ADR-K2 | Course Block Convergence | **Compatible** — schema changes via standard migrations |
| ADR-K3 | Groups Before Hierarchy | **Compatible** — groups are tenant-scoped, per-DB |
| DD-1 | System Admin in Wrapper | **Compatible** — JWT claim, per-project |
| DD-2 | Participant Auth | **Compatible** — tokens are DB-local |

---

## 9. What This Is Not

This architecture study **does not** propose:
- Multi-database routing within a single deployment (Level A stays single-DB)
- Per-request database switching (not needed — deployment-level separation)
- Separate code branches for enterprise customers
- A migration to Kubernetes or self-hosting (Vercel + Supabase remain)
- Immediate implementation — this is design protection

---

## 10. Control Plane vs Data Plane — Explicit Model

When moving from shared SaaS to hybrid deployment, it is critical to separate what remains centrally owned ("control plane") from what is isolated per customer ("data plane / deploy plane"). This separation makes deployment topology decisions clean and prevents scope creep.

### Shared Control Plane (Lekbanken-owned)

These components remain **centrally managed** across all deploy targets. They are never customer-specific.

| Component | Scope | Rationale |
|-----------|-------|----------|
| **Git repository** (`main` branch) | Single repo | No customer forks — Guardrail G1 |
| **CI/CD pipeline** | GitHub Actions | TypeCheck, RLS tests, i18n audit — all targets use same checks |
| **Release process** | Vercel deploy from `main` | Same build artifact deployed to all targets |
| **Seed data sources** | `supabase/seeds/` | Canonical product/purpose/category definitions |
| **Migration source** | `supabase/migrations/` | Sequential SQL files — single source of truth |
| **Internal documentation** | `launch-readiness/`, `docs/` | Architecture decisions, ops runbooks |
| **Admin tooling** (internal) | Internal portal (future Phase 4) | Links to per-deployment admin panels |
| **Design system / UI** | `features/`, `components/` | Shared component library |

### Isolated Data Plane / Deploy Plane (per customer)

These components are **instantiated per deployment**. Each enterprise customer gets their own copy, fully independent.

| Component | Scope | Notes |
|-----------|-------|-------|
| **Vercel project** | Per deploy target | Own env vars, domain, preview deploys |
| **Supabase project** | Per deploy target | Own DB, Auth, Storage, Realtime |
| **Auth namespace** | Per Supabase project | Users are project-local, no cross-project leakage |
| **Storage buckets** | Per Supabase project | Same bucket names, separate data |
| **Secrets / env vars** | Per Vercel project | `SUPABASE_URL`, keys, cookie secrets, etc. |
| **Stripe webhook endpoint** | Per Vercel project URL | Same Stripe account, separate webhook signing secret |
| **Custom domain** | Per deploy target | `kyrkan.lekbanken.no` or `lekar.svenskakyrkan.se` |
| **Cron execution** | Per Vercel project | `vercel.json` crons execute per-project |
| **Sentry / telemetry** | Per deploy target | `DEPLOY_TARGET` tag for shared DSN, or separate DSN |
| **Region / data residency** | Per Supabase project | EU-North, EU-West, etc. |

### Key Boundary Rule

> **Control plane changes affect all deploy targets. Data plane changes are per-customer.**
>
> A new migration is a control plane change (applied everywhere via `deploy-migrations.sh`).  
> A new tenant, user, or game is a data plane operation (exists only in one deployment's database).

This separation ensures that Lekbanken can scale to multiple enterprise customers without fragmentation of the product.

---

## 11. Enterprise Provisioning Model

Creating a new isolated enterprise environment must follow a **repeatable, documented flow**. This starts as a manual checklist and should evolve toward scripted automation.

### Provisioning Sequence

```
┌──────────────────────────────────────────────────────┐
│             Enterprise Provisioning Flow              │
│                                                       │
│  1. Define deploy target specification                │
│  2. Create Supabase project                           │
│  3. Apply all migrations (supabase db push)           │
│  4. Run idempotent seed scripts                       │
│  5. Create Vercel project (same repo)                 │
│  6. Set all environment variables                     │
│  7. Connect custom domain                             │
│  8. Configure Stripe webhook (if billing enabled)     │
│  9. Create system admin user + initial tenant         │
│ 10. Run readiness verification suite                  │
│ 11. Register target in deploy target inventory        │
│                                                       │
│  Start: manual checklist                              │
│  Goal:  scripted (scripts/provision-target.sh)        │
└──────────────────────────────────────────────────────┘
```

### Step Detail

| # | Step | Tool | Output | Owner | Time |
|---|------|------|--------|-------|------|
| 1 | Define deploy target | `.deploy-targets.json` entry | Name, region, customer, isolation level | **Commercial/Legal** + Engineering | 5 min |
| 2 | Create Supabase project | Supabase Dashboard | Project ref, URL, anon key, service role key, DB password | **Engineering** | 10 min |
| 3 | Apply migrations | `supabase link && supabase db push` | 304+ migrations applied, schema match | **Engineering** | 5 min |
| 4 | Run seeds | `supabase db seed` | Product catalog, purposes, categories populated | **Engineering** | 2 min |
| 5 | Create Vercel project | `vercel link --repo lekbanken-main --project <name>` | Vercel project linked to same repo | **Engineering** | 5 min |
| 6 | Set env vars | Vercel Dashboard or CLI | All 22+ env vars configured | **Ops** | 15 min |
| 7 | Connect domain | Vercel + DNS | Custom domain live with SSL | **Ops** + Engineering | 10 min |
| 8 | Configure Stripe | Stripe Dashboard → Webhooks → Add endpoint | Webhook signing secret | **Ops** | 5 min |
| 9 | Create admin + tenant | New deployment's admin panel | System admin user, initial customer tenant | **Support/Admin** | 10 min |
| 10 | Verify readiness | `GET /api/health` + smoke test | All checks green | **Engineering** | 15 min |
| 11 | Register in inventory | Add to `.deploy-targets.json` | Target tracked for migrations + releases | **Engineering** | 5 min |

**Total provisioning time (manual):** ~90 minutes per new enterprise customer.

### Owner Responsibility Matrix

| Role | Steps | Responsibility |
|------|-------|---------------|
| **Engineering** | 2–5, 10–11 | Infrastructure creation, schema deployment, readiness verification |
| **Ops** | 6–8 | Secrets management, env var configuration, Stripe/domain setup |
| **Support/Admin** | 9 | Initial customer admin account, tenant onboarding |
| **Commercial/Legal** | 1, pre-provisioning | Deploy target specification, DPA/hosting description, SLA, region requirements |

> **Note:** In early stage (customer 1–3), Engineering performs all roles. The separation above documents the intended responsibility split as the team scales.

### Readiness Verification Checklist

After provisioning, ALL of the following must pass before customer handover:

- [ ] `GET /api/health` → 200
- [ ] Admin login → tenant list visible
- [ ] Create tenant → success
- [ ] Invite user → email received
- [ ] Browse game library → catalog populated (seed data present)
- [ ] Create plan → save succeeds
- [ ] Start session → session active
- [ ] Upload media → file accessible
- [ ] Billing flow → Stripe checkout (if enabled)

### Evolution Path

| Stage | Approach | When |
|-------|----------|------|
| **Manual** | Checklist-driven (this document) | Customer 1–2 |
| **Semi-automated** | `scripts/provision-target.sh` wraps steps 2–6, 11 | Customer 3+ |
| **Fully automated** | Internal admin portal triggers provisioning | 10+ deployments |

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **Shared platform** | The default Lekbanken deployment serving 95% of customers |
| **Isolated deployment** | A separate Vercel + Supabase project for an enterprise customer |
| **Data plane** | Database + storage + auth — the stateful layer |
| **Control plane** | Application code + routing + business logic — the stateless layer |
| **Deploy target** | A specific Vercel project + Supabase project combination |
| **Seed sync** | Process of keeping platform catalog data identical across DBs |
| **Release artifact** | The built Next.js application (same for all targets) |
