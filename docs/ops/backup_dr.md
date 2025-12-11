# Backups & Disaster Recovery

Status: proposed  
Owner: Ops/Platform  
Last Updated: 2025-12-11

## Backup Strategy
- **Scope:** Supabase Postgres (data + WAL), storage assets (if used), config (env vars, service role keys stored in secrets).
- **Cadence:**
  - Full logical backup (pg_dump) daily.
  - WAL/incremental (if enabled) every hour.
  - Retention: 14 days hot, 60 days cold (object storage).
- **Storage Targets:** Primary: Supabase-managed backups; Secondary: copy to cloud object storage bucket (immutable) — `s3://<org>-supabase-backups/` (replace with actual).
- **Encryption:** At-rest via provider; in-transit via TLS.

## Restore & Verification
- **Quarterly restore test:** Restore latest backup to a staging DB, run `npm run type-check` + critical smoke (auth, participants join/rejoin) against staging.
- **RPO:** <= 1 hour (hourly WAL); **RTO:** <= 4 hours (staging restore + DNS/app redeploy).
- **Runbook (high level):**
  1) Trigger restore from Supabase dashboard/CLI to new instance. Example CLI:  
     `supabase db restore <backup-id> --project-ref <project-ref> --password <db-pass>`
  2) Re-point staging env vars to restored DB (`SUPABASE_DB_URL`, anon/service keys if new project).
  3) Run migrations diff check: `python scripts/run_migrations_cli.py --verify` (or `npm run db:verify`).
  4) Run smoke tests; validate tenant isolation/RLS on staging.
  5) If good: promote by swapping connection strings in prod env vars.

## Access & Permissions
- Backup/restore limited to platform admins with access to Supabase project + secrets.
- Credentials stored only in secret managers (not code).

## Monitoring
- Alert on backup failures and missed schedules (hook into Supabase backup alerts or external cron monitor).
- Log all restore events with timestamp, initiator, reason, and validation result in `docs/ops/incidents.md` or ticket system.

## Open Items
- Automate secondary copy to object storage and add checksum verification.
- Fill in actual bucket name and project ref once confirmed.
