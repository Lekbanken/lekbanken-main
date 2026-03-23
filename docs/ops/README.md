# Ops / runbooks

## Metadata

- Owner: Ops/Platform
- Status: active
- Date: 2025-12-17
- Last updated: 2026-03-23
- Last validated: 2026-03-23

> Active runbook cluster for operational workflows and production procedures. Use this folder for repo-verifiable operations guidance and mark external dependencies explicitly.

**Canonical overview (domain doc):** `docs/ops/OPERATIONS_DOMAIN.md`

Runbooks och operativa rutiner. Dessa dokument är **repo-förankrade** där det går (workflows, scripts, API routes), och markerar tydligt vad som kräver ops-beslut/extern konfiguration (hosting, on-call, Slack/PagerDuty, backup-retention).

## Innehåll

- [Day 1 operations runbook](day-1-operations-runbook.md)
- [Alerting](alerting.md)
- [Backups & DR](backup_dr.md)
- [CI/CD & rollback](cicd_pipeline.md)
- [Incident response](incident_response.md)
- [Incident log template](incidents.md)
- [Production migration workflow](prod-migration-workflow.md)
- [Release promotion checklist](release-promotion-checklist.md)
- [First production deploy runbook](first-deploy-runbook.md)
- [Security audit verification prompt](SECURITY_AUDIT_PROMPT_V2.md)

## Source of truth

- **Repo (kan verifieras):** `.github/workflows/*`, `package.json`, `scripts/*`, `app/api/*`, `supabase/migrations/*`.
- **Extern (måste verifieras av ops):** hosting/deploy, env vars i hosting/Supabase, backup-konfiguration/retention, on-call/alert destinations.

## Recommended entrypoints

- Use [Day 1 operations runbook](day-1-operations-runbook.md) when you need one starting point for launch-day checks, first-24h cadence, and escalation handoff.
- Use [Release promotion checklist](release-promotion-checklist.md) for the day-to-day local → preview → production flow.
- Use [First production deploy runbook](first-deploy-runbook.md) for the first live promotion or host-level smoke verification.
- Use [Production signals dashboard](production-signals-dashboard.md) plus [Anomaly detection playbook](anomaly-detection-playbook.md) for signal review and alert response.
- Use [Incident response](incident_response.md) once a production issue crosses into formal incident handling.

## Validation checklist

- CI/CD-beskrivning matchar `.github/workflows/typecheck.yml` och `package.json` scripts.
- Runbooks hänvisar till faktiska API routes (`app/api/*`) och inte påhittade paths.
- Alla “channels / retention / RTO/RPO / verktyg” som inte finns i repo är tydligt markerade som **TBD**.
- Entry-point guidance matches the current launch-day and recurring operations flow.
