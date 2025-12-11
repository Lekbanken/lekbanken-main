# Alerting

Status: proposed  
Owner: Ops/Platform  
Last Updated: 2025-12-11

## Signals & Thresholds (draft)
- Auth errors: 5xx from `/auth/*` > 2% over 5m.
- API 5xx (overall): > 1% over 5m or any sudden spike > 3x baseline.
- DB latency: P95 > 250ms for critical queries (auth, participants join/rejoin, billing webhooks).
- Supabase errors: auth.mfa failures spike, RLS policy errors, rate limit blocks.
- Stripe webhooks: failure rate > 0 over 5m or 3 consecutive failures.
- Background jobs/cron: missed/failed runs (cleanup, syncs).
- Backup failures/misses (see `backup_dr.md`).

## Destinations
- Slack channel (e.g., #alerts) for all.
- PagerDuty/on-call for SEV1/2-class signals (auth, API 5xx, Stripe webhooks).

## Ownership
- Auth/Accounts: platform team.
- Billing: platform + finance contact.
- Participants/Realtime: feature owner + platform.
- Backups/DB: platform.

## Runbooks
- Link alerts to playbooks: auth errors → check Supabase auth logs, feature flags; Stripe → retry webhook, check dashboard; DB latency → inspect slow queries, indexes, recent deploys.

## Implementation Notes
- Prefer provider-native alerts (Supabase monitoring, Vercel analytics) where available; supplement with app-level metrics/logging.
- Tag alerts with tenant when possible to reduce noise.

## Open Items
- Define exact Slack channel and PagerDuty service IDs.
- Add rate-limit alerts per endpoint group once baseline is known.
