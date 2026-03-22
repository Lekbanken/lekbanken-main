# Launch Telemetry Pack

## Metadata

- Owner: Platform / Ops
- Status: active
- Date: 2026-03-14
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active monitoring reference for the early post-launch window. Reconcile any alerting or telemetry changes here with `launch-control.md` and current ops docs.

> **Date:** 2026-03-14
> **Last updated:** 2026-03-21
> **Last validated:** 2026-03-21
> **Status:** active
> **Owner:** Platform / Ops
> **Scope:** First 30 days after launch
> **Related:** [production-signals-dashboard.md](../docs/ops/production-signals-dashboard.md) · [anomaly-detection-playbook.md](../docs/ops/anomaly-detection-playbook.md)
> **Note:** Active monitoring reference for the early post-launch window. Reconcile any alerting or telemetry changes here with `launch-control.md` and current ops docs.

---

## Executive Summary

Minimal, sharp observability package for the first 30 days of production.

**5 signals** covering every critical system boundary:

| # | Signal | What it protects |
|---|--------|-----------------|
| S1 | Session creation health | Core product function |
| S2 | Participant join health | Primary user funnel |
| S3 | Realtime & presence health | Live session experience |
| S4 | Gamification economy integrity | Reward system trust |
| S5 | Error pressure & rate limiting | Overall system stability |

**3 alerts** that catch the most likely first-30-day incidents:

| # | Alert | Catches |
|---|-------|---------|
| A | Join funnel degradation | RLS regressions, flow breakage, code lookup failures |
| B | Reward anomaly | Economy amplification, config mistakes, campaign bugs |
| C | Realtime instability | Presence problems, reconnect storms, "app laggar" |

**Design principle:** Only metrics that can be derived from existing tables and endpoints. No new instrumentation code required for v1 — all signals are SQL queries over existing data.

---

## Signal 1 — Session Creation Health

**What it measures:** Whether the core product flow actually works.

### Metrics

| Metric | Source | Query basis |
|--------|--------|-------------|
| Sessions created / hour | `participant_sessions` | `COUNT(*) WHERE created_at >= now() - interval '1 hour'` |
| Sessions by status | `participant_sessions` | `COUNT(*) GROUP BY status` for last 24h |
| Create failure rate | `error_tracking` | Errors with `error_key LIKE '%session%create%'` |

### Data sources (verified in codebase)

- **`participant_sessions`** table — columns: `id`, `status` (draft→lobby→active→paused→ended→archived), `created_at`, `started_at`, `ended_at`, `participant_count`
- **`error_tracking`** table — columns: `error_key`, `severity`, `occurrence_count`, `created_at`
- **`/api/system/metrics`** — already returns error counts (1h/24h/7d windows)

### Why this matters

If session creation fails, the product is effectively down for the core use case. This is the earliest signal of infrastructure problems, deployment regressions, or RLS policy breaks.

### Threshold

| Condition | Severity |
|-----------|----------|
| 0 sessions created in 2h during business hours | SEV-2 |
| Session create errors > 5% of attempts over 15 min | SEV-2 |

---

## Signal 2 — Participant Join Health

**What it measures:** Whether participants can successfully join sessions — the most important user-facing funnel.

### Metrics

| Metric | Source | Query basis |
|--------|--------|-------------|
| Successful joins / hour | `participant_activity_log` | `COUNT(*) WHERE event_type = 'join' AND created_at >= now() - interval '1 hour'` |
| Join attempts / hour | `participant_activity_log` + `error_tracking` | Joins + failed attempts |
| Join success rate | Computed | `successful / attempts × 100` |
| Failure breakdown | Join route HTTP responses | By status code: 404 (invalid code), 403 (locked/full/draft), 410 (ended/expired), 500 (internal) |

### Data sources (verified in codebase)

- **`participant_activity_log`** — columns: `session_id`, `participant_id`, `event_type` (`join`/`leave`/…), `event_data` (JSONB: `display_name`, `ip_address`), `created_at`
- **`participants`** table — columns: `status`, `joined_at`, `last_seen_at`, `ip_address`, `user_agent`
- **Join route** (`app/api/participants/sessions/join/route.ts`) — returns distinct HTTP codes per failure reason:
  - `404` — session not found (invalid code)
  - `403` — session draft/locked/full/wrong status
  - `410` — session ended/expired
  - `500` — internal create failure
- **Rate limiting** — `strict` tier (5 req/60s) on join endpoint

### Why this matters

Join failures are what participants experience. A broken join funnel means real users are stuck. This signal catches: RLS regressions, session code problems, flow breakage, and preview/prod drift.

### Threshold

| Condition | Severity |
|-----------|----------|
| Join failure rate > 10% over 15 min | Alert A triggers |
| Spike in specific error code (e.g., 403 burst) | Investigate immediately |
| 0 successful joins for 1h during active sessions | SEV-2 |

---

## Signal 3 — Realtime & Presence Health

**What it measures:** Whether live sessions feel responsive — covers the "appen laggar" class of incidents where the system is technically up but users experience degradation.

### Metrics

| Metric | Source | Query basis |
|--------|--------|-------------|
| Active sessions (status = active) | `participant_sessions` | `COUNT(*) WHERE status = 'active'` |
| Heartbeat writes / min | `participants.last_seen_at` | Update frequency on active sessions |
| Reconnect indicator | `participant_activity_log` | Multiple `join` events for same `participant_id` in short window |
| Broadcast events / session | `participant_sessions.broadcast_seq` | Delta of `broadcast_seq` per session per minute |

### Data sources (verified in codebase)

- **`participant_sessions`** — `status`, `broadcast_seq` (bigint, increments per broadcast)
- **`participants`** — `last_seen_at` (updated by heartbeat, 10s active / 30s idle)
- **`participant_activity_log`** — reconnect detection via duplicate joins
- **Realtime channels** — tenant-scoped (`realtime:tenant:{tenantId}`), session-scoped for play events
- **`broadcastPlayEvent()`** — server-side broadcast function (emits `participants_changed`, game state events)

### Why this matters

Lekbanken is a live-session product. Realtime degradation is invisible in API error rates — the server responds 200 but events don't arrive. Users experience this as "the app is laggy" or "nothing happens when I press buttons."

### Threshold

| Condition | Severity |
|-----------|----------|
| Heartbeat gap > 60s on active sessions with participants | Alert C triggers |
| Reconnect rate > 3× baseline | Alert C triggers |
| `broadcast_seq` stops incrementing on active session | Investigate |

---

## Signal 4 — Gamification Economy Integrity

**What it measures:** Whether the reward system is behaving normally — catches amplification, config mistakes, and economy drift before they become socially visible.

### Metrics

| Metric | Source | Query basis |
|--------|--------|-------------|
| Coins granted / hour | `coin_transactions` | `SUM(amount) WHERE type = 'earn' AND created_at >= now() - interval '1 hour'` |
| XP granted / hour | `gamification_daily_earnings` | `SUM(xp_earned) WHERE earning_date = CURRENT_DATE` |
| Achievements unlocked / hour | `user_achievements` | `COUNT(*) WHERE created_at >= now() - interval '1 hour'` |
| Top 10 users by reward delta (24h) | `gamification_daily_earnings` | `ORDER BY coins_earned DESC LIMIT 10` for today |
| Softcap reductions | `gamification_daily_earnings` | `SUM(coins_reduced)` — shows how often the diminishing returns system activates |

### Data sources (verified in codebase)

- **`coin_transactions`** — immutable audit trail: `user_id`, `type` (earn/spend), `amount`, `reason_code`, `idempotency_key`, `source`, `metadata`
- **`gamification_daily_earnings`** — per-user daily rollup: `coins_earned`, `xp_earned`, `coins_earned_raw`, `xp_earned_raw`, `coins_reduced`, `xp_reduced`, `event_count`
- **`gamification_daily_summaries`** — per-tenant daily: `earned`, `spent`, `tx_count`, `events_count`, `awards_total`, `campaign_bonus_total`, `automation_total`
- **`gamification_events`** — event trail with `event_type`, `source`, `idempotency_key`
- **`user_achievements`** — `user_id`, `achievement_id`, `unlocked_at`, `source`

### Why this matters

The gamification integrity audit confirmed 3-layer idempotency protection at DB level. But config mistakes, bad campaign rules, or automation rule errors could still cause economy inflation. Early detection prevents social damage (users noticing unfair rewards).

### Threshold

| Condition | Severity |
|-----------|----------|
| Coins/XP spike > 3× baseline hourly rate | Alert B triggers |
| Single user receives > 5× median daily rewards | Alert B triggers |
| Achievement unlock rate > 3× baseline | Investigate |

---

## Signal 5 — Error Pressure & Rate Limiting

**What it measures:** Overall system stress — the broadest health indicator.

### Metrics

| Metric | Source | Query basis |
|--------|--------|-------------|
| 5xx count (1h / 24h / 7d) | `error_tracking` | Already available via `/api/system/metrics` |
| 429 rate limit hits | Rate limiter | In-memory counter per tier (strict/auth/api/participant) |
| Auth failures | `error_tracking` | Errors with auth-related keys |
| Readiness status | `/api/readiness` | `status: 'ready' \| 'degraded'` — checks DB, Stripe, Auth, Encryption, Rate limiter |
| API latency percentiles | `page_views` | Already available via `/api/system/metrics` (p50/p95/p99) |

### Data sources (verified in codebase)

- **`/api/system/metrics`** — returns error rates (1h/24h/7d), API latency (p50/p95/p99), active users (5min/24h)
- **`/api/readiness`** — checks 6 systems in parallel, returns per-check status
- **`/api/health`** — binary up/down + environment identity
- **`error_tracking`** table — `error_key`, `severity`, `occurrence_count`, `stack_trace`, `created_at`
- **Rate limiter** (`lib/utils/rate-limiter.ts`) — in-memory Map, tiers: strict (5/60s), auth (10/15min), api (100/60s), participant (60/60s)

### Why this matters

This is the "canary in the coal mine" signal. Rising error pressure precedes user-visible failures. 429 spikes indicate either legitimate load growth or brute-force patterns. Readiness degradation catches dependency failures (Stripe down, DB issues) before they cascade.

### Threshold

| Condition | Severity |
|-----------|----------|
| 5xx > 3× baseline over 15 min | SEV-2 |
| 429 rate > 1% of total requests | Investigate rate limit tiers |
| `/api/readiness` returns `degraded` in production | SEV-1 |
| API p95 latency > 500ms sustained | SEV-3 |

---

## Alert A — Join Funnel Degradation

> **Trigger:** Participant join success rate falls below threshold

### Definition

```
IF (join failures / join attempts) > 10% over 15 min window
OR  0 successful joins for 60 min during hours with active sessions
THEN trigger Alert A
```

### Why this is first

Join is the most common user-facing action. A degraded join funnel means real participants can't play. This catches RLS regressions, deploy mistakes, and session code generation issues faster than any other signal.

### Response

→ See [anomaly-detection-playbook.md — Alert A](../docs/ops/anomaly-detection-playbook.md#alert-a--join-funnel-degradation)

---

## Alert B — Reward Anomaly

> **Trigger:** Sudden spike in economy activity or individual outlier

### Definition

```
IF coins_granted_last_hour > 3× rolling_24h_avg_hourly
OR  xp_granted_last_hour > 3× rolling_24h_avg_hourly
OR  single_user_daily_coins > 5× median_user_daily_coins
THEN trigger Alert B
```

### Why this is second

Economy anomalies compound. A config mistake that doubles rewards goes unnoticed for hours if there's no alert, and by then hundreds of users have inflated balances. Early detection = easy fix (adjust config, reverse specific transactions). Late detection = social damage.

### Response

→ See [anomaly-detection-playbook.md — Alert B](../docs/ops/anomaly-detection-playbook.md#alert-b--reward-anomaly)

---

## Alert C — Realtime Instability

> **Trigger:** Reconnect spike or heartbeat gap during active sessions

### Definition

```
IF reconnect_events > 3× baseline over 10 min
OR  active_session_with_participants has no heartbeat_write for 60s
OR  broadcast_seq stalled for 30s on active session with broadcasts expected
THEN trigger Alert C
```

### Why this is third

This is the "app laggar" alert. Users experience realtime issues as general bugginess even though the API is healthy. Without this alert, the team would only hear about it through user complaints — too late to understand the root cause.

### Response

→ See [anomaly-detection-playbook.md — Alert C](../docs/ops/anomaly-detection-playbook.md#alert-c--realtime-instability)

---

## First-30-Days Operating Model

### Week 1: Baseline establishment

- [ ] Run each signal query manually once per day
- [ ] Record baseline values in a simple spreadsheet or table
- [ ] Identify normal patterns: peak hours (Wednesday evening), quiet periods (weekends)
- [ ] Confirm all data sources return valid data in production

### Week 2-3: Pattern recognition

- [ ] Compare daily values against Week 1 baseline
- [ ] Note growth trends (sessions/day, participants/session)
- [ ] Identify false-positive patterns in alert conditions
- [ ] Tune thresholds based on real traffic (not estimates)

### Week 4: Alert activation

- [ ] Set up automated alert checks (cron job, Supabase webhook, or external monitor)
- [ ] Define notification channel (Slack, email, PagerDuty)
- [ ] Run one fire drill: simulate each alert condition, verify notification arrives
- [ ] Document any threshold adjustments in this file

### Daily Review (5 min)

```
1. Check /api/readiness — all systems ready?
2. Check /api/system/metrics — error rate normal?
3. Glance at session count — growth on track?
4. Check gamification daily summaries — economy stable?
```

### Weekly Review (30 min)

```
1. Review all 5 signals against baseline
2. Note any anomalies that didn't trigger alerts
3. Check if thresholds need tuning
4. Update baseline values if traffic pattern has shifted
5. Log observations in launch-control.md changelog
```

---

## Implementation Status

| Item | Status | Notes |
|------|--------|-------|
| S1 — Session creation health | ✅ Data available | `participant_sessions` + `error_tracking` |
| S2 — Participant join health | ✅ Data available | `participant_activity_log` + join route codes |
| S3 — Realtime & presence health | ✅ Data available | `participants.last_seen_at` + `broadcast_seq` |
| S4 — Gamification economy | ✅ Data available | `coin_transactions` + `gamification_daily_*` |
| S5 — Error pressure | ✅ Data available | `/api/system/metrics` + `error_tracking` |
| Alert A — Join degradation | 🟡 Query defined | Automated check not yet wired |
| Alert B — Reward anomaly | 🟡 Query defined | Automated check not yet wired |
| Alert C — Realtime instability | 🟡 Query defined | Automated check not yet wired |
| Notification channel | ⬜ Not configured | Slack/PagerDuty TBD |
| Baseline recording | ⬜ Not started | Starts at launch |

> **v1 approach:** All 5 signals are queryable from day 1 using existing tables and endpoints. No new code needed. Alerts are initially manual checks (daily review) — automated notification wiring is Week 4 work.
