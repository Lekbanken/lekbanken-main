# Day 1 Operations Runbook

## Metadata

- Owner: Ops/Platform
- Status: active
- Date: 2026-03-23
- Last updated: 2026-03-23
- Last validated: 2026-03-23

> Active entry-runbook for launch-day and early-production operations. Use this as the single starting point for who watches signals, when to escalate, and which deeper runbook to open next.

## Purpose

This document provides the missing top-level operations flow for the first production day and the first week after promotion.

It does not replace the deeper runbooks. It tells the operator which checks to run, in what order, and when to hand off into the detailed playbooks.

For detailed procedures, use:

- `docs/ops/release-promotion-checklist.md`
- `docs/ops/first-deploy-runbook.md`
- `docs/ops/production-signals-dashboard.md`
- `docs/ops/anomaly-detection-playbook.md`
- `docs/ops/incident_response.md`
- `docs/ops/prod-migration-workflow.md`

## External dependencies

The repository does not contain the real contact roster, on-call phone tree, Slack channel IDs, PagerDuty service IDs, or external stakeholder lists.

Before using this runbook in production, verify these external items outside the repo:

- primary operations channel
- escalation/on-call destination
- product owner contact
- database owner contact
- billing/Stripe contact if billing is in scope

## Operating roles

Use role ownership, not personal names, in the repo.

| Role | Responsibility | Detailed source |
|------|----------------|-----------------|
| Release commander | Owns promotion decision and first-hour coordination | `docs/ops/release-promotion-checklist.md` |
| Signal reviewer | Runs scheduled health and signal checks | `docs/ops/production-signals-dashboard.md` |
| Incident commander | Takes over on SEV1-SEV3 events | `docs/ops/incident_response.md` |
| Platform/DB operator | Handles rollback, migrations, env issues, Supabase checks | `docs/ops/prod-migration-workflow.md` |
| Feature owner | Investigates domain-specific regressions such as Realtime or economy alerts | `docs/ops/anomaly-detection-playbook.md` |

## When to use this runbook

Use this runbook for:

- the first production promotion of a release
- the first 24 hours after a production promotion
- the first week of signal review after a meaningful launch change
- any situation where the operator needs one entrypoint instead of choosing between multiple ops docs

## Launch-day flow

### 1. Pre-promotion owner check

Before promotion, the release commander confirms:

- preview verification is complete
- production env vars were checked
- migration path and rollback path are understood
- the operator knows who to escalate to outside the repo

If any item is unknown, stop and use `docs/ops/release-promotion-checklist.md` before continuing.

### 2. Immediate post-deploy verification (0-15 min)

Run the first-pass checks from `docs/ops/first-deploy-runbook.md`:

- app reachable on the actual production host
- `/api/health` returns OK
- auth path works
- affected feature works
- no immediate error spike in hosting or provider logs

If a deployment issue is obvious and user impact is active, move directly to `docs/ops/incident_response.md`.

### 3. First-hour signal sweep (15-60 min)

The signal reviewer checks the key operational surfaces:

- health/readiness endpoints
- production error pressure
- API latency and failure rate
- auth activity and failures
- Realtime session stability if play flows are live
- billing/webhook health if billing scope changed

Use the queries and thresholds in `docs/ops/production-signals-dashboard.md`.

If any threshold is breached, jump to the matching alert response in `docs/ops/anomaly-detection-playbook.md`.

### 4. Incident threshold

Escalate into formal incident handling when any of these are true:

- production outage or user-blocking auth/billing failure
- sustained 5xx spike
- failed migration or data-integrity risk
- Realtime instability affecting active sessions
- reward/economy anomaly with material blast radius

Use severity and communications flow from `docs/ops/incident_response.md`.

### 5. Stabilization options

Prefer the smallest safe rollback or containment step:

- promote the last known-good deployment
- pause or disable the risky feature flag
- stop and defer a migration follow-up
- correct env/config mismatch and redeploy

If the incident includes a database change, use `docs/ops/prod-migration-workflow.md` for guarded rollback guidance.

## First 24 hours cadence

| Time window | Owner | Required checks | Next doc |
|-------------|-------|-----------------|----------|
| 0-15 min | Release commander | Deploy smoke checks, health endpoint, critical route sanity | `docs/ops/first-deploy-runbook.md` |
| 15-60 min | Signal reviewer | Error rate, latency, auth, Realtime, billing if touched | `docs/ops/production-signals-dashboard.md` |
| 2-4 h | Signal reviewer + feature owner | Re-check thresholds and anomalies after real traffic | `docs/ops/anomaly-detection-playbook.md` |
| End of day | Release commander | Confirm no unresolved alerts or hidden rollback need | `docs/ops/incident_response.md` if needed |

## First week cadence

During the first week after launch or a high-risk release:

- run the daily five-minute review from `docs/ops/production-signals-dashboard.md`
- run the weekly thirty-minute review from `docs/ops/production-signals-dashboard.md`
- keep incident and anomaly notes linked to the actual remediation doc used
- update any stale thresholds or missing procedures in the source runbooks, not only here

## Escalation map

| Situation | Primary response | Escalate to |
|-----------|------------------|-------------|
| Deploy smoke failure | Roll back or fix config | Incident commander + platform owner |
| Health/readiness failure | Incident flow | Platform/DB operator |
| Alert A/B/C threshold breach | Anomaly playbook | Feature owner + incident commander if sustained |
| Migration failure | Migration rollback flow | Platform/DB operator |
| Unknown ownership | Incident flow first | External on-call roster |

## Evidence to capture

Capture these facts during launch-day operations:

- deployment URL or production deploy identifier
- time of promotion
- whether a migration ran
- first successful health check time
- any alert/anomaly triggered and which playbook was used
- whether rollback was needed

Store detailed incident timelines in `docs/ops/incidents.md` or the external incident system referenced by the team.

## Exit criteria

The day-1 operations window is complete when:

- production smoke checks passed
- no unresolved SEV1-SEV2 incident is open
- first-day signal review was completed
- follow-up anomalies have an owner
- any external ops/contact gaps discovered during the run were documented outside the repo and reflected back into the relevant runbook when appropriate

## Validation checklist

- References point to existing ops runbooks in `docs/ops/`.
- Escalation paths do not invent repo-invisible contact details.
- Launch-day cadence matches `docs/ops/first-deploy-runbook.md` and `docs/ops/production-signals-dashboard.md`.
- Incident handoff matches `docs/ops/incident_response.md`.