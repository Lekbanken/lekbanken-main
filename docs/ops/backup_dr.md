# Backups & Disaster Recovery

## Metadata

- Owner: Ops/Platform
- Status: active
- Date: 2025-12-11
- Last updated: 2026-03-21
- Last validated: 2025-12-17

> Active runbook for backup and disaster-recovery expectations, restore drills, and repo-verifiable recovery steps.

## Related code (source of truth)

- DB schema/migrations: `supabase/migrations/`
- RLS audit: `supabase/verify_rls_coverage.sql`
- Type generation: `npm run db:types:remote`, `scripts/regenerate-types.ps1`
- Migrations helpers (optional): `scripts/run-psql-migrations.ps1`

What this repo can verify:
- The schema source of truth is `supabase/migrations/*`.
- Type generation uses Supabase CLI (`supabase gen types ... --linked`) via `npm run db:types:remote` / `scripts/regenerate-types.ps1`.

## Backup Strategy
- **Scope:** Supabase Postgres (data), storage assets (if used), and configuration (env vars, keys in secrets).
- **Cadence / Retention:** **TBD** (depends on Supabase plan + ops requirements). Start by defining target $RPO$ and $RTO$.
- **Storage Targets:**
  - Primary: Supabase-managed backups (verify in Supabase project settings).
  - Optional secondary copy: external object storage (bucket/path **TBD**).
- **Encryption:** At-rest/in-transit is provider-specific (verify for your setup).

## Restore & Verification
- **Quarterly restore test (recommended):** Restore latest backup to a dedicated restore target or temporary non-production project/DB, run `npm run type-check` + critical smoke (accounts, participants join/rejoin) against that restore target.
- **RPO/RTO:** **TBD** (set targets and validate them with restore drills).
- **Runbook (high level):**
  1) Trigger restore from Supabase dashboard to a temporary restore project or restored DB instance.
  2) Re-point non-production env vars in the hosting platform (or local) to the restored project's keys.
  3) Validate schema alignment:
    - Confirm migrations in `supabase/migrations/` are applied.
    - Regenerate types: `npm run db:types:remote` (or `scripts/regenerate-types.ps1`).
    - Run `npm run type-check`.
  4) Validate RLS coverage by running `supabase/verify_rls_coverage.sql` in Supabase SQL Editor.
  5) Run smoke tests; validate tenant isolation on the restore target.

## Access & Permissions
- Backup/restore limited to platform admins with access to Supabase project + secrets.
- Credentials stored only in secret managers (not code).

## Monitoring
- Alert on backup failures and missed schedules (hook into Supabase backup alerts or external cron monitor).
- Log all restore events with timestamp, initiator, reason, and validation result in `docs/ops/incidents.md` or ticket system.

## Open Items
- Automate secondary copy to object storage and add checksum verification.
- Fill in actual bucket name and project ref once confirmed.

## Validation checklist
- DR steps do not rely on repo-specific hardcoded project refs.
- DB schema source of truth is `supabase/migrations/` and is reflected in `types/supabase.ts` after `db:types:remote`.
- RLS coverage audit remains runnable via `supabase/verify_rls_coverage.sql`.
