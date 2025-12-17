# OPERATIONS DOMAIN

## Metadata
- **Status:** Active
- **Last updated:** 2025-12-17
- **Source of truth:** Repo code + `docs/ops/*` runbooks + `.github/workflows/*` + `package.json` scripts

## Scope
Operations Domain owns (as implemented/documented in repo):
- Operational runbooks (incident response, alerting, backups/DR, CI expectations)
- System health/metrics surfaces used for ops visibility
- Migration/typegen operational workflow (process and tooling)

Non-goals:
- Product/domain behavior (e.g. Games, Billing) except where ops runbooks depend on them
- Hosting-provider configuration details that are not stored in repo (must be verified externally)

## Related docs
- Ops sub-index: `docs/ops/README.md`
- Alerting: `docs/ops/alerting.md`
- Incident response: `docs/ops/incident_response.md`
- CI/CD & rollback: `docs/ops/cicd_pipeline.md`
- Backups & DR: `docs/ops/backup_dr.md`
- Migrations/process: `docs/MIGRATIONS.md`
- Environment variables: `docs/ENVIRONMENT_VARIABLES.md`
- Platform runtime/deploy notes: `docs/PLATFORM_DOMAIN.md`

## Related code (repo-anchored)

### CI checks
- GitHub Actions workflow: `.github/workflows/typecheck.yml`
  - `npm ci` → `npm run type-check` → block `as any` casts in `app/` + `lib/` (excluding `types/supabase.ts`) → `npm run build` with `SKIP_ENV_VALIDATION=true`
- Scripts definitions: `package.json` (`type-check`, `build`, `db:types*`, `db:check-any`)

### Health & metrics
- Health endpoint: `app/api/health/route.ts`
  - Checks database + storage using `SUPABASE_SERVICE_ROLE_KEY` and returns `200` or `503`
- System metrics endpoint: `app/api/system/metrics/route.ts`
  - Builds basic metrics from DB tables (e.g. `error_tracking`, `page_views`, `media`, `tenants`)
- Admin UI surface:
  - `app/admin/(system)/system-health/page.tsx` (fetches `/api/system/metrics` + `/api/health`)

### Audit logs
- Tenant audit log API:
  - `app/api/tenants/[tenantId]/audit-logs/route.ts` (requires system admin or tenant admin)
- Admin UI:
  - `app/admin/(system)/audit-logs/page.tsx` (reads `tenant_audit_logs` and supports CSV export)

### Operational scripts (local/manual tooling)
Scripts in `scripts/` are part of ops workflows, primarily around migrations, typegen, seeding and verification. Examples:
- `scripts/regenerate-types.ps1` (typegen helper)
- `scripts/run-psql-migrations.ps1` / `scripts/run-migrations-*.py/js` (migration runners)
- `scripts/verify-migrations.sql` (verification)
- `scripts/verify-system.js` (system verification helper)

## Core concepts

### “Repo-anchored” vs “external” truth
Operations documentation is split by what the repo can prove versus what must be validated in the hosting/Supabase/Stripe consoles.

Repo-anchored (can be verified locally):
- CI workflow and scripts (`.github/workflows/*`, `package.json`)
- Migrations and schema (`supabase/migrations/*`)
- Health endpoints and admin system pages (`app/api/*`, `app/admin/(system)/*`)

External (must be verified by ops):
- Hosting provider deploy setup (auto-deploy rules, preview environments)
- Secret storage and rotation policy (Supabase keys, Stripe keys, etc.)
- Backup cadence/retention and restore procedures in the provider
- On-call destinations (Slack/PagerDuty/etc.)

### Health checks vs metrics
- **Health** is binary-ish and should be safe to call often (`/api/health`).
- **Metrics** are more exploratory and may depend on schema/logging coverage (`/api/system/metrics`).

## Validation checklist
- CI description matches `.github/workflows/typecheck.yml` and `package.json`.
- `/api/health` returns `503` when required env vars are missing or checks fail.
- `/admin/system-health` correctly reflects `/api/health` + `/api/system/metrics`.
- Audit log read paths enforce role checks:
  - API route uses system admin/tenant admin checks.
  - Admin UI reads `tenant_audit_logs` only for the current tenant.
- Backups/DR guidance stays explicit about what is external/TBD.
