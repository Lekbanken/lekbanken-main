# Anomaly Detection Playbook

## Metadata

- Owner: Platform / On-call
- Status: active
- Date: 2026-03-14
- Last updated: 2026-03-21
- Last validated: -

> Active launch anomaly-detection playbook for identifying, triaging, and responding to operational degradations from production signals.

**Related:** [launch-telemetry-pack.md](../../launch-readiness/launch-telemetry-pack.md) · [production-signals-dashboard.md](production-signals-dashboard.md) · [incident-playbook.md](../../launch-readiness/incident-playbook.md)

---

## How to use this playbook

When an alert fires (or you notice an anomaly during daily review):

1. **Identify** which alert matches the pattern
2. **Run** the first checks in order
3. **Escalate** if the likely cause isn't obvious within 15 minutes
4. **Mitigate** using the steps listed
5. **Log** the incident in `launch-control.md` changelog

---

## Alert A — Join Funnel Degradation

> **Trigger:** Participant join success rate < 90% over 15 min, or 0 joins during active sessions for 60 min.

### Likely Causes (ordered by probability)

| # | Cause | Probability | Blast radius |
|---|-------|-------------|-------------|
| 1 | Bad deploy broke join route | High | All participants |
| 2 | RLS policy regression | Medium | All participants |
| 3 | Session code generation collision | Low | Specific sessions |
| 4 | Database connection issue | Medium | All routes |
| 5 | Rate limiter too aggressive | Low | High-traffic sessions |

### First Checks (do these in order)

**1. Is the system healthy?**
```
GET /api/readiness
→ If status = 'degraded': which check failed? (db, stripe, auth, encryption, rateLimiter)
→ If DB check failed: this is a SEV-1 infrastructure issue — skip to Escalation
```

**2. Are sessions accepting joins?**
```sql
-- Check if any sessions are in joinable state
SELECT id, display_name, status, participant_count, created_at
FROM participant_sessions
WHERE status IN ('lobby', 'active', 'paused')
ORDER BY created_at DESC
LIMIT 10;
```
→ If no joinable sessions: not a bug — just no sessions open right now

**3. Are joins actually failing?**
```sql
-- Recent successful joins
SELECT COUNT(*) AS joins_last_hour
FROM participant_activity_log
WHERE event_type = 'join'
  AND created_at >= now() - interval '1 hour';

-- Recent join-related errors
SELECT error_key, SUM(occurrence_count) AS count, severity
FROM error_tracking
WHERE (error_key ILIKE '%join%' OR error_key ILIKE '%participant%')
  AND created_at >= now() - interval '1 hour'
GROUP BY error_key, severity
ORDER BY count DESC;
```

**4. Check most recent deploy**
```
Vercel Dashboard → Deployments
→ Was there a deploy in the last hour?
→ Does the error timeline correlate with deploy time?
```

**5. Check RLS policies on participants table**
```sql
-- Verify participants INSERT policy exists
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'participants';
```

### Escalation

| Timeframe | Action |
|-----------|--------|
| 0-15 min | On-call investigates using checks above |
| 15-30 min | If cause unclear: rollback to last known-good deploy (Vercel → Promote previous deployment) |
| 30+ min | Escalate to platform lead. If DB-related: contact Supabase support |

### Mitigation Steps

| Cause | Fix |
|-------|-----|
| Bad deploy | Rollback: Vercel Dashboard → previous deployment → Promote to Production |
| RLS regression | Identify broken policy, apply hotfix migration |
| Session code collision | Check `normalizeSessionCode()` logic, verify UNIQUE constraint on code column |
| DB connection issue | Check Supabase Dashboard → Database → Connection Pooler status |
| Rate limiter | Temporarily increase `strict` tier limit in `lib/utils/rate-limiter.ts` |

### Post-incident

- [ ] Log in `launch-control.md` changelog with timestamps
- [ ] If deploy-related: add to CI/CD lessons learned
- [ ] If RLS-related: add regression test
- [ ] Update baseline values if traffic pattern changed

---

## Alert B — Reward Anomaly

> **Trigger:** Coins/XP hourly rate > 3× rolling 24h avg, or single user daily coins > 5× median.

### Likely Causes (ordered by probability)

| # | Cause | Probability | Blast radius |
|---|-------|-------------|-------------|
| 1 | Automation rule misconfiguration | High | Specific tenant |
| 2 | Campaign reward amount too high | Medium | Specific campaign users |
| 3 | Missing cooldown on rule | Medium | Affected users (could be many) |
| 4 | Legitimate spike (event, many sessions) | Medium | Non-issue |
| 5 | Exploit of undiscovered idempotency gap | Very low | Specific user |

### First Checks (do these in order)

**1. Is it a real spike or just growth?**
```sql
-- Compare today vs 7-day average
SELECT
  CURRENT_DATE AS today,
  (SELECT SUM(earned) FROM gamification_daily_summaries
   WHERE day = CURRENT_DATE) AS today_earned,
  (SELECT ROUND(AVG(daily_earned))
   FROM (SELECT SUM(earned) AS daily_earned
         FROM gamification_daily_summaries
         WHERE day >= CURRENT_DATE - interval '7 days' AND day < CURRENT_DATE
         GROUP BY day) sub) AS avg_7d_daily;
```

**2. Is it concentrated on one user or spread out?**
```sql
-- Top earners today — look for outliers
SELECT
  user_id,
  coins_earned,
  xp_earned,
  coins_earned_raw,
  coins_reduced,
  event_count,
  ROUND(coins_earned::numeric / NULLIF(
    (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY coins_earned)
     FROM gamification_daily_earnings WHERE earning_date = CURRENT_DATE), 0
  ), 1) AS vs_median
FROM gamification_daily_earnings
WHERE earning_date = CURRENT_DATE
ORDER BY coins_earned DESC
LIMIT 10;
```
→ If one user has `vs_median > 10`: likely exploit or misconfigured rule targeting them
→ If evenly spread: likely campaign or automation issue

**3. What's the source of the rewards?**
```sql
-- Recent coin transactions by source and reason
SELECT
  source,
  reason_code,
  COUNT(*) AS tx_count,
  SUM(amount) AS total_coins
FROM coin_transactions
WHERE type = 'earn'
  AND created_at >= now() - interval '3 hours'
GROUP BY source, reason_code
ORDER BY total_coins DESC;
```
→ Identifies which automation rule, campaign, or manual grant is responsible

**4. Check automation rules for the affected source**
```sql
-- Active automation rules
SELECT
  id,
  event_type,
  reward_amount,
  cooldown_type,
  conditions,
  is_active
FROM gamification_automation_rules
WHERE is_active = true
ORDER BY reward_amount DESC;
```
→ Look for: high `reward_amount`, missing/wrong `cooldown_type`, overly broad `conditions`

**5. Check if softcap is activating**
```sql
SELECT
  COUNT(*) AS earnings_today,
  COUNT(*) FILTER (WHERE coins_reduced > 0) AS softcapped,
  SUM(coins_reduced) AS total_reduced,
  MAX(event_count) AS max_events_single_user
FROM gamification_daily_earnings
WHERE earning_date = CURRENT_DATE;
```
→ If softcap is activating heavily: the safety net is working, but the rule is too generous

### Escalation

| Timeframe | Action |
|-----------|--------|
| 0-15 min | On-call reviews queries above |
| 15-30 min | If automation rule identified: disable the rule (set `is_active = false`) |
| 30+ min | If unclear or widespread: escalate to product lead for economy decision |

### Mitigation Steps

| Cause | Fix |
|-------|-----|
| Automation rule misconfiguration | Disable rule: `UPDATE gamification_automation_rules SET is_active = false WHERE id = '<rule_id>'` |
| Campaign reward too high | Adjust campaign in admin UI, or update `reward_amount` directly |
| Missing cooldown | Add cooldown: `UPDATE gamification_automation_rules SET cooldown_type = 'daily' WHERE id = '<rule_id>'` |
| Legitimate spike | No action — log as false positive, adjust baseline |
| Exploit | Disable rule, investigate user's transaction history, consider coin reversal |

**Coin reversal (if needed):**
```sql
-- Reverse specific transactions (uses reversal_of FK)
INSERT INTO coin_transactions (user_id, tenant_id, type, amount, description, reason_code, source, reversal_of)
SELECT user_id, tenant_id, 'spend', amount, 'Reversal: anomaly correction', 'admin_reversal', 'admin',  id
FROM coin_transactions
WHERE id = '<transaction_id>';
-- Then update user's coin balance accordingly
```

### Post-incident

- [ ] Log in `launch-control.md` changelog
- [ ] If automation rule: add rule validation checks
- [ ] If campaign: review campaign creation workflow for guardrails
- [ ] Update economy baseline values

---

## Alert C — Realtime Instability

> **Trigger:** Reconnect rate > 3× baseline, or heartbeat gap > 60s on active session with participants.

### Likely Causes (ordered by probability)

| # | Cause | Probability | Blast radius |
|---|-------|-------------|-------------|
| 1 | Supabase Realtime service degradation | Medium | All live sessions |
| 2 | Client-side reconnect loop (bad deploy) | Medium | All clients on new version |
| 3 | Channel strategy issue (too many channels) | Low | Specific tenant/sessions |
| 4 | Network instability at venue | Medium | Specific session |
| 5 | Supabase plan limit hit (concurrent connections) | Low | All new connections |

### First Checks (do these in order)

**1. Is Supabase Realtime healthy?**
```
Supabase Dashboard → Realtime → Overview
→ Check: connected clients, messages/sec, error rate
→ Check: Supabase Status Page (status.supabase.com) for incidents
```

**2. How many sessions are affected?**
```sql
-- Sessions with stale heartbeats
SELECT
  ps.id,
  ps.display_name,
  ps.participant_count,
  ps.status,
  MAX(p.last_seen_at) AS last_heartbeat,
  EXTRACT(EPOCH FROM (now() - MAX(p.last_seen_at)))::int AS seconds_stale
FROM participant_sessions ps
JOIN participants p ON p.session_id = ps.id
WHERE ps.status = 'active'
  AND ps.participant_count > 0
GROUP BY ps.id, ps.display_name, ps.participant_count, ps.status
HAVING EXTRACT(EPOCH FROM (now() - MAX(p.last_seen_at))) > 60
ORDER BY seconds_stale DESC;
```
→ One session stale: likely venue network issue
→ Many sessions stale: likely Supabase or deploy issue

**3. Are clients reconnecting?**
```sql
-- Multiple join events for same participant (reconnect indicator)
SELECT
  participant_id,
  session_id,
  COUNT(*) AS join_count,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))::int AS reconnect_window_seconds
FROM participant_activity_log
WHERE event_type = 'join'
  AND created_at >= now() - interval '30 minutes'
GROUP BY participant_id, session_id
HAVING COUNT(*) > 1
ORDER BY join_count DESC;
```

**4. Is it a deploy issue?**
```
Vercel Dashboard → Deployments
→ Recent deploy? Does timing correlate with heartbeat drop?
→ Check: function logs for WebSocket errors, channel errors
```

**5. Check channel count (rough estimate)**
```sql
-- Estimate concurrent channels needed
SELECT
  COUNT(*) AS active_sessions,
  SUM(participant_count) AS total_participants,
  COUNT(*) * 3 AS estimated_channels -- ~3 channels per session
FROM participant_sessions
WHERE status IN ('active', 'lobby');
```
→ If estimated_channels > Supabase plan limit: upgrade needed

### Escalation

| Timeframe | Action |
|-----------|--------|
| 0-15 min | On-call checks Supabase status + queries above |
| 15-30 min | If Supabase-side: wait for provider resolution. If deploy-side: rollback |
| 30+ min | If persistent: Supabase support ticket. If isolated: contact venue/user |

### Mitigation Steps

| Cause | Fix |
|-------|-----|
| Supabase Realtime degradation | Wait for provider resolution. Inform affected hosts via email/UI banner |
| Client reconnect loop | Rollback deploy. Check `broadcastPlayEvent()` and channel subscription code |
| Too many channels | Reduce channel granularity (session-scoped, not row-scoped). Check for channel leaks |
| Venue network | No system action — inform host that venue WiFi may be overloaded. Suggest mobile data |
| Plan limit | Upgrade Supabase plan or implement connection pooling. Emergency: reduce heartbeat frequency |

**Emergency heartbeat adjustment** (if DB writes are overwhelming):
- Active heartbeat: 10s → 30s (reduce writes 3×)
- Lobby heartbeat: 30s → 60s
- This is a code change in the client-side heartbeat timer — requires deploy

### Post-incident

- [ ] Log in `launch-control.md` changelog
- [ ] If reconnect loop: add client-side circuit breaker (max reconnect attempts)
- [ ] If channel issue: audit channel creation/cleanup code
- [ ] If plan limit: document capacity ceiling and upgrade threshold
- [ ] Update reconnect baseline values

---

## General Response Framework

For anomalies that don't match a specific alert:

### Step 1: Triage (5 min)

```
1. GET /api/readiness — is the system healthy?
2. GET /api/system/metrics — error rates normal?
3. Check Vercel Dashboard — recent deploy?
4. Check Supabase Dashboard — DB/Realtime status?
```

### Step 2: Classify

| Signal pattern | Likely area |
|----------------|-------------|
| Errors spiking + sessions failing | Infrastructure (DB, deploy) |
| Joins failing, everything else fine | Join funnel (RLS, session logic) |
| Economy numbers unusual | Gamification (rules, campaigns) |
| Heartbeats stale, API healthy | Realtime (Supabase, channels) |
| 429s spiking | Rate limiting or load spike |

### Step 3: Severity

| Level | Criteria | Response |
|-------|----------|----------|
| SEV-1 | Service down, data loss | Immediate — rollback first, investigate second |
| SEV-2 | Major feature broken | < 1 hour — investigate, rollback if no fix in 30 min |
| SEV-3 | Degraded experience | < 4 hours — investigate during work hours |
| SEV-4 | Cosmetic, low impact | Next business day |

→ See [incident-playbook.md](../../launch-readiness/incident-playbook.md) for full incident procedures.

### Step 4: Log

Every anomaly — whether real incident or false positive — gets logged:

```markdown
| YYYY-MM-DD | Author | **ANOMALY — [type].** [description]. Root cause: [cause]. Resolution: [action]. Duration: [time]. |
```

Add to `launch-control.md` changelog.

---

## Prevention Controls

Three proactive controls to reduce incident probability during the first 30 days.

### PC-1 — Deploy Guard (prevents: join funnel breakage, session create failure)

**What:** Verify core flows still work after every deploy before promoting to production.

**Pre-deploy checklist:**
```
1. GET /api/health          → status: ok?
2. GET /api/readiness       → status: ready? (all 6 checks pass?)
3. Manual: create session   → session appears in lobby?
4. Manual: join with code   → participant joins, host sees count update?
5. Manual: start session    → status transitions to active?
```

**When to run:** After every deploy to production. Takes ~2 min.

**Why:** The #1 launch incident (join funnel breakage) is almost always caused by a bad deploy. This simple gate catches it before users do.

**Status:** Manual process. Automated smoke test is a post-launch P2 item.

### PC-2 — Realtime Watchdog (prevents: "appen laggar" incidents)

**What:** Detect stalled realtime broadcasts on active sessions.

**Detection query (run during daily check):**
```sql
SELECT
  ps.id,
  ps.display_name,
  ps.status,
  ps.broadcast_seq,
  ps.participant_count,
  EXTRACT(EPOCH FROM (now() - ps.updated_at))::int AS seconds_since_update
FROM participant_sessions ps
WHERE ps.status = 'active'
  AND ps.participant_count > 0
  AND ps.updated_at < now() - interval '5 minutes'
ORDER BY seconds_since_update DESC;
```

**If stalled sessions found:**
1. Check Supabase Dashboard → Realtime status
2. Check if `broadcastPlayEvent()` is being called (Vercel function logs)
3. If provider-side: wait for resolution, notify affected hosts
4. If code-side: rollback deploy

**Status:** Manual check. Automated cron watchdog is a post-launch P2 item.

### PC-3 — Economy Kill Switch (prevents: reward inflation)

**What:** Emergency procedure to freeze the gamification economy if Alert B fires and the root cause isn't immediately clear.

**Freeze steps (in order):**
```sql
-- 1. Disable all automation rules (stops new automatic rewards)
UPDATE gamification_automation_rules SET is_active = false;

-- 2. Verify freeze
SELECT COUNT(*) AS active_rules FROM gamification_automation_rules WHERE is_active = true;
-- Should return 0
```

**Unfreeze steps:**
```sql
-- Re-enable rules one at a time, monitoring coin_transactions between each
UPDATE gamification_automation_rules SET is_active = true WHERE id = '<rule_id>';

-- Monitor after each re-enable
SELECT COUNT(*), SUM(amount) FROM coin_transactions
WHERE type = 'earn' AND created_at >= now() - interval '5 minutes';
```

**When to use:** Only when Alert B fires AND the root cause is not obvious within 15 minutes. This is a circuit breaker, not a first response.

**Status:** SQL-based manual procedure. Feature flag integration is a post-launch P3 item.

---

## Incident Coverage Map

All 7 statistically common first-30-day incidents mapped to signals and prevention:

| # | Incident | Signal | Alert | Prevention |
|---|----------|--------|-------|------------|
| 1 | Join funnel breakage | S2 | A | PC-1 |
| 2 | Realtime instability | S3 | C | PC-2 |
| 3 | Silent error pressure | S5 | — | Daily review |
| 4 | Session creation failure | S1 | — | PC-1 |
| 5 | Economy drift | S4 | B | PC-3 |
| 6 | Unexpected usage pattern | S2 | — | Top-10 query |
| 7 | Rate limit / abuse | S5 | — | Rate limiter tiers |
