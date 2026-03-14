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

## Realtime Overload

Supabase Realtime can become overloaded if clients open too many channels.

**Symptoms:**
- WebSocket reconnect loops in browser console
- Realtime updates stop working (play sessions, live dashboards)
- Latency spikes on Supabase Dashboard → Realtime

**Signals:**
- Realtime reconnect rate > 10/min per client → channel strategy issue
- Active channel count > 100 → review channel-per-table vs channel-per-row
- WebSocket errors in Vercel function logs

**Prevention:**
- Use **one channel per table** or **one channel per tenant** — never one channel per row
- Pattern: `realtime:tenant:{tenantId}` for tenant-scoped updates
- Play sessions: max ~3 channels per session (host, participants, game state)
- Monitor: Supabase Dashboard → Realtime → connected clients vs channel count

**Threshold:** If peak concurrent sessions × 3 channels/session > Supabase plan limit → upgrade plan or reduce channel granularity.

---

## Open Items
- Define exact Slack channel and PagerDuty service IDs.
- Add rate-limit alerts per endpoint group if/when rate limiting is implemented.
- Hook alerts to runbooks (link to incident_response/backup_dr) in tooling.

## Related Documents

- [Launch Telemetry Pack](../../launch-readiness/launch-telemetry-pack.md) — 5 signals + 3 alerts for first 30 days
- [Production Signals Dashboard](production-signals-dashboard.md) — SQL queries, thresholds, review cadence
- [Anomaly Detection Playbook](anomaly-detection-playbook.md) — per-alert response procedures
