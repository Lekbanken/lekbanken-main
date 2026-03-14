# Production Signals Dashboard

> **Created:** 2026-03-14
> **Status:** ACTIVE
> **Owner:** Platform / Ops
> **Review cadence:** Daily (5 min) + Weekly (30 min)
> **Related:** [launch-telemetry-pack.md](../../launch-readiness/launch-telemetry-pack.md) · [anomaly-detection-playbook.md](anomaly-detection-playbook.md)

---

## Dashboard Overview

Five signal panels, each queryable from existing data sources. No external tooling required for v1 — all queries run against Supabase (SQL Editor or service role client).

```
┌─────────────────────────────────────────────────────────┐
│                LEKBANKEN LAUNCH DASHBOARD                │
├──────────────┬──────────────┬───────────────────────────┤
│  S1: Session │  S2: Join    │  S3: Realtime & Presence  │
│  Creation    │  Funnel      │                           │
├──────────────┴──────────────┼───────────────────────────┤
│  S4: Gamification Economy   │  S5: Error Pressure       │
│                             │                           │
└─────────────────────────────┴───────────────────────────┘
```

---

## S1 — Session Creation Health

### Metric definitions

| Metric | Definition | Aggregation |
|--------|-----------|-------------|
| `sessions_created_1h` | Sessions created in last hour | `COUNT(*)` |
| `sessions_created_24h` | Sessions created in last 24h | `COUNT(*)` |
| `sessions_by_status` | Current session status distribution | `COUNT(*) GROUP BY status` |
| `session_error_rate_1h` | Session-related errors in last hour | `COUNT(*)` from `error_tracking` |

### SQL queries

**Sessions created (hourly trend):**
```sql
SELECT
  date_trunc('hour', created_at) AS hour,
  COUNT(*) AS sessions_created
FROM participant_sessions
WHERE created_at >= now() - interval '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

**Session status distribution:**
```sql
SELECT
  status,
  COUNT(*) AS count
FROM participant_sessions
WHERE created_at >= now() - interval '7 days'
GROUP BY status
ORDER BY count DESC;
```

**Session-related errors:**
```sql
SELECT
  error_key,
  SUM(occurrence_count) AS total_occurrences,
  MAX(severity) AS max_severity,
  MAX(created_at) AS last_seen
FROM error_tracking
WHERE error_key ILIKE '%session%'
  AND created_at >= now() - interval '24 hours'
GROUP BY error_key
ORDER BY total_occurrences DESC;
```

### Thresholds

| Condition | Level | Action |
|-----------|-------|--------|
| 0 sessions created in 2h (business hours) | ⚠️ Warning | Check deploy, verify `/api/readiness` |
| Session create error rate > 5% over 15 min | 🔴 Critical | → Incident playbook |

### Ownership

Platform team. Escalation: product lead if sustained zero-creation.

---

## S2 — Participant Join Health

### Metric definitions

| Metric | Definition | Aggregation |
|--------|-----------|-------------|
| `joins_success_1h` | Successful joins in last hour | `COUNT(*)` from `participant_activity_log` WHERE `event_type = 'join'` |
| `joins_success_24h` | Successful joins in last 24h | `COUNT(*)` |
| `join_rate_by_hour` | Hourly join trend | `COUNT(*) GROUP BY hour` |
| `participant_count_by_session` | Avg participants per session | `AVG(participant_count)` from `participant_sessions` |

### SQL queries

**Join success trend (hourly):**
```sql
SELECT
  date_trunc('hour', created_at) AS hour,
  COUNT(*) AS successful_joins
FROM participant_activity_log
WHERE event_type = 'join'
  AND created_at >= now() - interval '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

**Join volume vs active sessions:**
```sql
SELECT
  date_trunc('hour', pal.created_at) AS hour,
  COUNT(DISTINCT pal.session_id) AS sessions_with_joins,
  COUNT(*) AS total_joins,
  ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT pal.session_id), 0), 1) AS avg_joins_per_session
FROM participant_activity_log pal
WHERE pal.event_type = 'join'
  AND pal.created_at >= now() - interval '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

**Top 10 sessions by participants (last 24h):**
```sql
SELECT
  ps.id,
  ps.display_name,
  ps.status,
  ps.participant_count,
  ps.created_at,
  ps.started_at,
  ps.ended_at
FROM participant_sessions ps
WHERE ps.created_at >= now() - interval '24 hours'
ORDER BY ps.participant_count DESC
LIMIT 10;
```
> Catches: bot joins, classroom-scale sessions, abuse patterns, unexpected stress scenarios.

**Join errors (from error tracking):**
```sql
SELECT
  error_key,
  SUM(occurrence_count) AS total_occurrences,
  severity,
  MAX(created_at) AS last_seen
FROM error_tracking
WHERE error_key ILIKE '%join%' OR error_key ILIKE '%participant%'
  AND created_at >= now() - interval '24 hours'
GROUP BY error_key, severity
ORDER BY total_occurrences DESC;
```

> **Note:** The join route returns distinct HTTP status codes per failure reason (404 invalid code, 403 locked/full, 410 ended, 500 internal). Detailed failure-reason breakdown requires structured logging of HTTP responses — not yet instrumented. v1 uses `error_tracking` for 500-level failures and `participant_activity_log` for successes.

### Thresholds

| Condition | Level | Action |
|-----------|-------|--------|
| Join failure rate > 10% over 15 min | 🔴 Alert A | → [Anomaly playbook — Alert A](anomaly-detection-playbook.md#alert-a--join-funnel-degradation) |
| 0 joins for 1h during active sessions | ⚠️ Warning | Check session codes, participant flow |
| Spike in 403/410 responses | ⚠️ Warning | Check session lifecycle, settings |

### Ownership

Feature owner (Play/Sessions). Escalation: platform team if RLS-related.

---

## S3 — Realtime & Presence Health

### Metric definitions

| Metric | Definition | Aggregation |
|--------|-----------|-------------|
| `active_sessions` | Sessions with status = active | `COUNT(*)` |
| `active_participants` | Participants with recent heartbeat | `COUNT(*) WHERE last_seen_at >= now() - interval '30 seconds'` |
| `heartbeat_freshness` | Time since last heartbeat per active session | `MAX(now() - last_seen_at)` |
| `reconnect_indicator` | Multiple joins by same participant | `COUNT(*) GROUP BY participant_id HAVING COUNT > 1` |
| `broadcast_rate` | Broadcast seq delta per session | `broadcast_seq` change over time |

### SQL queries

**Active session overview:**
```sql
SELECT
  ps.id AS session_id,
  ps.display_name,
  ps.status,
  ps.participant_count,
  ps.broadcast_seq,
  ps.started_at,
  (SELECT COUNT(*) FROM participants p
   WHERE p.session_id = ps.id
     AND p.last_seen_at >= now() - interval '30 seconds') AS live_participants,
  (SELECT MAX(p.last_seen_at) FROM participants p
   WHERE p.session_id = ps.id) AS last_heartbeat
FROM participant_sessions ps
WHERE ps.status IN ('active', 'lobby', 'paused')
ORDER BY ps.started_at DESC;
```

**Heartbeat freshness (stale detection):**
```sql
SELECT
  ps.id AS session_id,
  ps.display_name,
  ps.participant_count,
  MAX(p.last_seen_at) AS last_heartbeat,
  EXTRACT(EPOCH FROM (now() - MAX(p.last_seen_at))) AS seconds_since_heartbeat
FROM participant_sessions ps
JOIN participants p ON p.session_id = ps.id
WHERE ps.status = 'active'
  AND ps.participant_count > 0
GROUP BY ps.id, ps.display_name, ps.participant_count
HAVING EXTRACT(EPOCH FROM (now() - MAX(p.last_seen_at))) > 60
ORDER BY seconds_since_heartbeat DESC;
```

**Reconnect detection (last 1h):**
```sql
SELECT
  participant_id,
  session_id,
  COUNT(*) AS join_count,
  MIN(created_at) AS first_join,
  MAX(created_at) AS last_join
FROM participant_activity_log
WHERE event_type = 'join'
  AND created_at >= now() - interval '1 hour'
GROUP BY participant_id, session_id
HAVING COUNT(*) > 1
ORDER BY join_count DESC;
```

### Thresholds

| Condition | Level | Action |
|-----------|-------|--------|
| Heartbeat gap > 60s on active session with participants | 🔴 Alert C | → [Anomaly playbook — Alert C](anomaly-detection-playbook.md#alert-c--realtime-instability) |
| Reconnect rate > 3× baseline | 🔴 Alert C | Check Supabase Realtime status |
| `broadcast_seq` not incrementing on active session | ⚠️ Warning | Check broadcast function |

### Ownership

Feature owner (Play/Realtime). Escalation: Supabase support if provider-side issue.

---

## S4 — Gamification Economy Integrity

### Metric definitions

| Metric | Definition | Aggregation |
|--------|-----------|-------------|
| `coins_granted_1h` | Total coins earned in last hour | `SUM(amount) WHERE type = 'earn'` |
| `xp_granted_today` | Total XP earned today | `SUM(xp_earned) WHERE earning_date = CURRENT_DATE` |
| `achievements_unlocked_1h` | Achievements in last hour | `COUNT(*)` |
| `top_earners_24h` | Top 10 users by daily coins | `ORDER BY coins_earned DESC LIMIT 10` |
| `softcap_activations` | Users hitting diminishing returns | `COUNT(*) WHERE coins_reduced > 0` |
| `economy_tx_count_today` | Total coin transactions today | `COUNT(*)` |

### SQL queries

**Economy health snapshot:**
```sql
SELECT
  (SELECT COUNT(*) FROM coin_transactions
   WHERE type = 'earn' AND created_at >= now() - interval '1 hour') AS coins_earned_txs_1h,
  (SELECT SUM(amount) FROM coin_transactions
   WHERE type = 'earn' AND created_at >= now() - interval '1 hour') AS coins_amount_1h,
  (SELECT COUNT(*) FROM coin_transactions
   WHERE type = 'spend' AND created_at >= now() - interval '1 hour') AS coins_spent_txs_1h,
  (SELECT COUNT(*) FROM user_achievements
   WHERE created_at >= now() - interval '1 hour') AS achievements_1h;
```

**Top earners (anomaly detection):**
```sql
SELECT
  user_id,
  coins_earned,
  xp_earned,
  coins_earned_raw,
  coins_reduced,
  event_count
FROM gamification_daily_earnings
WHERE earning_date = CURRENT_DATE
ORDER BY coins_earned DESC
LIMIT 10;
```

**Tenant-level daily summary:**
```sql
SELECT
  tenant_id,
  day,
  earned,
  spent,
  tx_count,
  events_count,
  awards_total,
  campaign_bonus_total,
  automation_total
FROM gamification_daily_summaries
WHERE day >= CURRENT_DATE - interval '7 days'
ORDER BY day DESC, earned DESC;
```

**Softcap activation rate:**
```sql
SELECT
  earning_date,
  COUNT(*) AS users_earned,
  COUNT(*) FILTER (WHERE coins_reduced > 0) AS users_softcapped,
  ROUND(100.0 * COUNT(*) FILTER (WHERE coins_reduced > 0) / NULLIF(COUNT(*), 0), 1) AS softcap_pct
FROM gamification_daily_earnings
WHERE earning_date >= CURRENT_DATE - interval '7 days'
GROUP BY earning_date
ORDER BY earning_date DESC;
```

**Hourly economy trend:**
```sql
SELECT
  date_trunc('hour', created_at) AS hour,
  COUNT(*) AS transactions,
  SUM(amount) FILTER (WHERE type = 'earn') AS earned,
  SUM(amount) FILTER (WHERE type = 'spend') AS spent
FROM coin_transactions
WHERE created_at >= now() - interval '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Thresholds

| Condition | Level | Action |
|-----------|-------|--------|
| Coins/XP hourly rate > 3× rolling 24h avg | 🔴 Alert B | → [Anomaly playbook — Alert B](anomaly-detection-playbook.md#alert-b--reward-anomaly) |
| Single user daily coins > 5× median | 🔴 Alert B | Check automation rules, campaign config |
| Achievement unlock rate > 3× baseline | ⚠️ Warning | Check achievement definitions |

### Ownership

Feature owner (Gamification). Escalation: product lead for economy-impacting decisions.

---

## S5 — Error Pressure & Rate Limiting

### Metric definitions

| Metric | Definition | Aggregation |
|--------|-----------|-------------|
| `errors_1h` | Error occurrences in last hour | Already in `/api/system/metrics` |
| `errors_24h` | Error occurrences in last 24h | Already in `/api/system/metrics` |
| `errors_7d` | Error occurrences in last 7d | Already in `/api/system/metrics` |
| `api_latency_p95` | 95th percentile API response time | Already in `/api/system/metrics` |
| `readiness_status` | System readiness check | `/api/readiness` response |
| `active_users_now` | Users active in last 5 min | Already in `/api/system/metrics` |

### SQL queries

**Error pressure trend:**
```sql
SELECT
  date_trunc('hour', created_at) AS hour,
  severity,
  COUNT(*) AS error_count,
  SUM(occurrence_count) AS total_occurrences
FROM error_tracking
WHERE created_at >= now() - interval '24 hours'
GROUP BY hour, severity
ORDER BY hour DESC, total_occurrences DESC;
```

**Top errors (last 24h):**
```sql
SELECT
  error_key,
  severity,
  SUM(occurrence_count) AS total_occurrences,
  MAX(created_at) AS last_seen,
  MIN(created_at) AS first_seen
FROM error_tracking
WHERE created_at >= now() - interval '24 hours'
GROUP BY error_key, severity
ORDER BY total_occurrences DESC
LIMIT 20;
```

**Rate limiting tiers** (reference — in-memory, not queryable via SQL):

| Tier | Limit | Window | Applied to |
|------|-------|--------|------------|
| `strict` | 5 req | 60s | Join endpoints |
| `auth` | 10 req | 15 min | Login, MFA |
| `api` | 100 req | 60s | General API |
| `participant` | 60 req | 60s | Gameplay endpoints |

> **Gap:** Rate limiter is in-memory per-instance. 429 counts are not persisted to DB. v1 monitoring relies on Vercel function logs for 429 visibility. Post-launch: consider logging 429 events to `error_tracking` or a dedicated counter.

### Pre-built API endpoint

All error and latency metrics are already available via:
```
GET /api/system/metrics
Authorization: system_admin
```

Response structure:
```json
{
  "timestamp": "2026-03-14T12:00:00Z",
  "errorRate": { "last1h": 0, "last24h": 2, "last7d": 5 },
  "apiLatency": { "p50": 0.12, "p95": 0.45, "p99": 0.89 },
  "activeUsers": { "now": 3, "last24h": 42 },
  "storage": { "totalFiles": 156, "totalSizeGB": null },
  "database": { "totalRecords": 8, "connectionPool": "healthy" }
}
```

### Thresholds

| Condition | Level | Action |
|-----------|-------|--------|
| 5xx > 3× baseline over 15 min | 🔴 Critical | Check Vercel deploy, recent changes |
| 429 > 1% of total requests | ⚠️ Warning | Review rate limit tiers |
| `/api/readiness` returns `degraded` | 🔴 Critical | → Incident playbook — check which subsystem failed |
| API p95 > 500ms sustained | ⚠️ Warning | Profile slow queries |

### Ownership

Platform team. Escalation: Vercel/Supabase support for infrastructure issues.

---

## Dashboard Review Cadence

### Daily Check (5 min — every morning)

```
1. GET /api/readiness     → all checks passing?
2. GET /api/system/metrics → error rates normal?
3. SQL: session count today vs yesterday
4. SQL: gamification daily summary — economy stable?
5. SQL: top sessions by participants — outliers?
6. Visual scan: anything unusual?
```

### Weekly Review (30 min — Mondays)

```
1. Run all 5 signal queries for the past week
2. Compare against baseline (Week 1 values)
3. Note trends: growth, anomalies, false positives
4. Update thresholds if traffic patterns have shifted
5. Record observations in launch-control.md changelog
6. Check if any gaps need instrumentation work
```

### Monthly (first 3 months)

```
1. Review alert trigger history (manual log)
2. Evaluate: are the 5 signals still the right 5?
3. Consider adding new signals based on real incident patterns
4. Assess: ready to add automated alerting?
```

---

## Known Gaps (v1)

| Gap | Impact | Mitigation | Post-launch priority |
|-----|--------|-----------|---------------------|
| No per-route 429 logging | Can't see which endpoints hit rate limits | Monitor via Vercel function logs | P2 |
| Join failure reasons not aggregated | Can't distinguish 404 vs 403 vs 410 failures | Success count from `participant_activity_log` covers main signal | P3 |
| Realtime metrics not in DB | Can't query channel count or WebSocket status via SQL | Use Supabase Dashboard → Realtime for manual checks | P2 |
| No automated alert delivery | Alerts are manual checks, not push notifications | Daily review discipline covers Week 1-3, automate in Week 4 | P1 |
