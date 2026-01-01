# Gamification — Monitoring & Alerts (v1)

Last updated: 2026-01-01
Audience: Ops / Engineering

## Purpose
Define what to monitor for the gamification economy (DiceCoin), admin awards workflow, and event ingestion so abuse/bugs are caught quickly.

## Core signals

### DiceCoin economy
- Mint rate: coins earned per day (by tenant + global)
- Burn rate: coins spent per day (by tenant + global)
- Net flow: mint - burn (trend + anomalies)
- Balance distribution: p50/p90/p99 wallet balances per tenant

**Alerts (recommended)**
- Mint spike: > N standard deviations above 7d baseline for a tenant
- Burn spike: same
- Net flow runaway: sustained positive net flow for X days
- Concentration: top 1% accounts hold > Y% of total coins (potential exploit)

### Idempotency health
- Unique violation rate (`23505`) on event ingestion (should be mostly low; spikes indicate retries or abuse)
- Coin transaction idempotency collisions (should be impossible with unique index; monitor query-based checks)

**Alerts**
- Event ingestion `23505` spike per IP / per actor
- Duplicate idempotency keys in `coin_transactions` (should be 0)

### Admin awards & approvals
- Pending approvals backlog size
- Time-to-approve (p50/p90)
- Awards volume per admin actor
- Award amount distribution (p50/p90/p99)

**Alerts**
- Backlog > threshold for > X minutes
- Same actor issuing > X awards/hour
- Large award attempts that repeatedly fail

### Event ingestion
- Requests/minute to `/api/gamification/events`
- 4xx rate (invalid payload/forbidden)
- 5xx rate (DB/RPC failures)

**Alerts**
- 5xx > threshold for > 5 minutes
- 403 spikes (possible probing)

## Practical implementation notes
- Current app rate limiting is in-memory (per instance). For production-grade enforcement, consider a shared store.
- Use existing admin analytics functions as a base; extend with:
  - mismatch counts (wallet vs ledger)
  - award backlog metrics

## Suggested dashboards
- Tenant admin dashboard:
  - economy health (mint/burn), top sources, approval backlog
- System admin dashboard:
  - cross-tenant anomaly view, idempotency spikes, top actors

## Useful SQL checks

### Duplicate idempotency keys (should be empty)
```sql
select tenant_id, user_id, idempotency_key, count(*)
from public.coin_transactions
where idempotency_key is not null
group by tenant_id, user_id, idempotency_key
having count(*) > 1;
```

### Large awards in last 24h (adapt table names to awards schema)
```sql
-- Use the actual awards/audit table names in your schema.
-- This is a template query.
select *
from public.tenant_audit_logs
where created_at > now() - interval '24 hours'
  and action in ('gamification.award_coins', 'gamification.award_request')
order by created_at desc;
```
