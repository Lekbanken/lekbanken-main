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
- **Storage Targets:** Primary: Supabase-managed backups; Secondary: copy to cloud object storage bucket (immutable).
- **Encryption:** At-rest via provider; in-transit via TLS.

## Restore & Verification
- **Quarterly restore test:** Restore latest backup to a staging DB, run `npm run type-check` + critical smoke (auth, participants join/rejoin) against staging.
- **RPO:** <= 1 hour (hourly WAL); **RTO:** <= 4 hours (staging restore + DNS/app redeploy).
- **Runbook (high level):**
  1) Trigger restore from Supabase dashboard/CLI to new instance.
  2) Re-point staging env vars to restored DB.
  3) Run migrations diff check: `scripts/run_migrations_cli.py --verify`.
  4) Run smoke tests; validate tenant isolation/RLS on staging.
  5) If good: promote by swapping connection strings in prod env vars.

## Access & Permissions
- Backup/restore limited to platform admins with access to Supabase project + secrets.
- Credentials stored only in secret managers (not code).

## Monitoring
- Alert on backup failures and missed schedules.
- Log all restore events with timestamp, initiator, reason, and validation result.

## Open Items
- Automate secondary copy to object storage and add checksum verification.
- Document exact Supabase backup CLI commands with current project ID.
