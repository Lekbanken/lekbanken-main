# Incident Response

Status: proposed  
Owner: Ops/Platform  
Last Updated: 2025-12-11

## Severity Matrix
- **SEV1:** Prod outage, auth/billing down, data loss risk. Target: acknowledge < 5m, mitigate < 30m, resolve < 2h.
- **SEV2:** Major functionality degraded (payments delayed, tenant isolation risk). Target: ack < 15m, mitigate < 1h, resolve < 4h.
- **SEV3:** Minor degradation (single feature broken, workaround exists). Target: ack < 1h, resolve < 24h.
- **SEV4:** Cosmetic/low impact. Target: plan fix in next sprint.

## Roles
- **Incident Commander (IC):** Coordinates, keeps timeline, assigns tasks.
- **Comms Lead:** Handles stakeholder updates (Slack #status, email if SEV1/2).
- **Ops/Infra:** Handles rollback, feature flag changes, DB actions.
- **Scribe:** Logs timeline and actions in incident log.

## Process
1) **Declare:** Assign SEV, create incident entry in `docs/ops/incidents.md` (or ticket).
2) **Stabilize:** Rollback, disable flags, scale services, revoke risky tokens as needed.
3) **Communicate:** Update every 15-30m (SEV1/2) in #status channel; include impact, ETA, next steps.
4) **Mitigate & Fix:** Apply workaround or patch. If DB change, ensure backup is intact beforehand.
5) **Close:** Confirm resolution, user impact ended, errors normalizing.
6) **Postmortem:** Within 48h for SEV1/2, 5d for SEV3. Include timeline, root cause, blast radius, fixes, preventions.

## Communication Channels
- Primary: Slack #status (alerts + human updates). Replace with actual channel when known.
- Escalation: PagerDuty/phone for SEV1/2 (fill service/on-call rotation).
- External (if needed): Status page or email template (TBD).

## Runbooks to Keep Handy
- Rollback deploy (see `docs/ops/cicd_pipeline.md`).
- Disable feature via flag.
- DB restore from backup (`docs/ops/backup_dr.md`).
- Rotate secrets (Supabase keys, Stripe keys).

## Open Items
- Add actual contact roster / on-call rotation (names, phone).
- Add status page link and comms templates (Slack/email).
