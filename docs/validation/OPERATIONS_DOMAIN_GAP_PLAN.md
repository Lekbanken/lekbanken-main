# Operations Domain – Gap Plan

Status: needs_work  
Date: 2025-12-11  
Owner: Ops/Platform

## Findings
- Backups / DR: no documented backup schedule or tested restore runbook.
- Incident management: no incident log template, no severity/escalation policy.
- Alerting: no PagerDuty/Slack hooks defined; monitoring exists but no notifications.
- Deployment pipeline: GitHub Actions present but not documented as ops runbook (rollback, envs, secrets).
- Load/performance: no load test scripts, no performance budget/targets.

## Action Plan
**P0**
- Define and document backup schedule (daily full + hourly WAL, retention, location) and add restore test procedure (quarterly at minimum).
- Create incident response runbook (sev levels, roles, communication channels, timelines) and an incident log template in `docs/ops/incidents.md`.
- Wire alerting for critical signals (auth errors, 5xx rate spikes, DB latency, queue backlog) to Slack/PagerDuty; document thresholds and owners.

**P1**
- Document CI/CD pipeline (build, lint/typecheck, tests, deploy steps, secrets/vars) and rollback playbook (what to revert, how to disable feature flags).
- Add minimal load/performance test (e.g., k6/Artillery) for top 2-3 critical endpoints; define SLOs (P95 latency/throughput) and when to run (pre-release or weekly).

**P2**
- Disaster recovery drill cadence (simulate region loss, credential rotation).
- Cost/usage monitoring playbook (who reviews, cadence, thresholds).

## Deliverables
- `docs/ops/backup_dr.md` – schedule, retention, storage, restore test checklist.
- `docs/ops/incident_response.md` – sev matrix, on-call/contacts, comms, logging template.
- `docs/ops/alerting.md` – signals, thresholds, destinations, runbook links.
- `docs/ops/cicd_pipeline.md` – pipeline steps, environments, rollback path.
- `tests/load/` – basic load test scripts + how-to-run + targets.
