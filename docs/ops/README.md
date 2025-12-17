# Ops / runbooks

Canonical overview (domain doc): `docs/OPERATIONS_DOMAIN.md`

Status: active  
Owner: Ops/Platform  
Last validated: 2025-12-17

Runbooks och operativa rutiner. Dessa dokument är **repo-förankrade** där det går (workflows, scripts, API routes), och markerar tydligt vad som kräver ops-beslut/extern konfiguration (hosting, on-call, Slack/PagerDuty, backup-retention).

## Innehåll

- [Alerting](alerting.md)
- [Backups & DR](backup_dr.md)
- [CI/CD & rollback](cicd_pipeline.md)
- [Incident response](incident_response.md)
- [Incident log template](incidents.md)

## Source of truth

- **Repo (kan verifieras):** `.github/workflows/*`, `package.json`, `scripts/*`, `app/api/*`, `supabase/migrations/*`.
- **Extern (måste verifieras av ops):** hosting/deploy, env vars i hosting/Supabase, backup-konfiguration/retention, on-call/alert destinations.

## Validation checklist

- CI/CD-beskrivning matchar `.github/workflows/typecheck.yml` och `package.json` scripts.
- Runbooks hänvisar till faktiska API routes (`app/api/*`) och inte påhittade paths.
- Alla “channels / retention / RTO/RPO / verktyg” som inte finns i repo är tydligt markerade som **TBD**.
