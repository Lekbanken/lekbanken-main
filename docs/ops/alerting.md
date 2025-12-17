# Alerting

Status: active  
Owner: Ops/Platform  
Last validated: 2025-12-17

## Related code (source of truth)

- Health endpoint: `app/api/health/route.ts`
- Accounts API (session/profile/whoami): `app/api/accounts/*`
- Participants join/rejoin: `app/api/participants/sessions/join/route.ts`, `app/api/participants/sessions/rejoin/route.ts`
- Stripe webhook handler: `app/api/billing/webhooks/stripe/route.ts`

## Signals & Thresholds (draft)
- Accounts/auth-related API errors: 5xx from `/api/accounts/*` > 2% over 5m.
- API 5xx (overall): > 1% over 5m or any sudden spike > 3x baseline.
- DB latency: P95 > 250ms for critical queries (auth, participants join/rejoin, billing webhooks).
- Supabase errors: auth.mfa failures spike, RLS policy errors.
- Stripe webhooks (`/api/billing/webhooks/stripe`): failure rate > 0 over 5m or 3 consecutive failures.
- Background jobs/cron: missed/failed runs (cleanup, syncs).
- Backup failures/misses (see `backup_dr.md`).

## Destinations
- Primary channel: **TBD** (e.g. Slack/Teams).
- On-call/escalation: **TBD** (e.g. PagerDuty).

## Ownership
- Auth/Accounts: platform team.
- Billing: platform + finance contact.
- Participants/Realtime: feature owner + platform.
- Backups/DB: platform.

## Runbooks
- Link alerts to playbooks: auth errors → check Supabase auth logs, feature flags; Stripe → retry webhook, check dashboard; DB latency → inspect slow queries, indexes, recent deploys.

## Implementation Notes
- Prefer provider-native alerts (Supabase monitoring, hosting analytics) where available; supplement with app-level metrics/logging.
- Tag alerts with tenant when possible to reduce noise.

## Open Items
- Define exact Slack channel and PagerDuty service IDs.
- Add rate-limit alerts per endpoint group if/when rate limiting is implemented.
- Hook alerts to runbooks (link to incident_response/backup_dr) in tooling.
