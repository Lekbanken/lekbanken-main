# Gamification Event Integrity Audit

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-14
- Last updated: 2026-03-21
- Last validated: 2026-03-14

> Closed audit for gamification event idempotency and reward-integrity behavior. Treat this as a bounded audit snapshot behind later launch-readiness references and not as an active operating guide.

> **Date:** 2025-01-25
> **Scope:** Event amplification, duplicate reward protection, idempotency enforcement
> **Verdict:** 🟢 **DB-layer idempotency is strong and launch-sufficient.** No confirmed double-reward bugs in audited paths. Minor hygiene issues identified.

---

## 1. Executive Summary

The gamification system was audited for event amplification vulnerabilities — the risk that a single user action produces duplicate rewards (coins, XP, achievements). **All reward-granting RPCs enforce DB-level idempotency** via advisory locks, unique constraint lookups, and deterministic key derivation.

Three initially-suspected critical bugs were investigated and **confirmed safe** at the database layer. Four P2 hygiene issues and two P3 monitoring gaps were identified.

| Category | Count | Severity |
|----------|-------|----------|
| Confirmed double-reward bugs in audited paths | **0** | — |
| Performance/hygiene issues | **4** | P2 |
| Monitoring gaps | **2** | P3 |

---

## 2. Scope & Methodology

### Tables audited (~40)
Achievements (5), coins/currency (3), cosmetics (5), admin awards (4), events/campaigns (4), infrastructure (6), burn sinks (2), shop (3), powerups (3), seasonal, virtual currencies, user progression/streaks, leaderboards.

### RPCs audited (14)
| RPC | Idempotency | Mechanism |
|-----|-------------|-----------|
| `apply_coin_transaction_v1` | ✅ STRONG | `pg_advisory_xact_lock` + lookup in `coin_transactions` |
| `apply_xp_transaction_v1` | ✅ GOOD | JSONB array (`xp_grants ? key`) membership check |
| `admin_award_coins_v1` | ✅ STRONG | Advisory lock + chains to `apply_coin_transaction_v1` |
| `admin_award_achievement_v1` | ✅ STRONG | Advisory lock + UNIQUE(user_id, achievement_id) + ON CONFLICT |
| `tenant_award_achievement_v1` | ✅ STRONG | Same pattern + tenant membership validation |
| `apply_automation_rule_reward_v1` | ⚠️ INDIRECT | No own lock; relies on downstream `apply_coin_transaction_v1` |
| `apply_campaign_bonus_v1` | ✅ STRONG | Advisory lock on campaign:tenant + budget tracking |
| `purchase_shop_item_v1` | ✅ STRONG | Advisory lock + lookup in `user_purchases` |
| `consume_powerup_v1` | ✅ STRONG | Advisory lock + lookup in `user_powerup_consumptions` |
| `burn_coins_v1` | ✅ STRONG | Advisory lock with `:burn:` prefix |
| `calculate_softcap_reward_v1` | ✅ READ-ONLY | STABLE function, no side effects |
| `check_cooldown_eligible_v1` | ✅ READ-ONLY | No side effects |
| `record_cooldown_trigger_v1` | ✅ UPSERT | ON CONFLICT clause |
| `record_daily_earning_v1` | ✅ UPSERT | ON CONFLICT clause |
| `learning_grant_course_rewards_v1` | ✅ SAFE | Deterministic key `learning:course:{courseId}:{userId}` |

### App-layer callers verified (17 call sites)
All callers of `logGamificationEventV1` use **deterministic idempotency keys**:

| Caller | Key pattern |
|--------|-------------|
| `session-command.ts` (session end) | `participant_session:{sessionId}:ended` |
| `play/runs/progress` (run complete) | `run:{runId}:completed` |
| `play/runs/sessions/end` (session end) | `participant_session:{psId}:ended` |
| `plans/route.ts` (plan created) | `plan:{planId}:created` |
| `plans/visibility` | `plan:{planId}:visibility:{visibility}:{tenantId}` |
| `plans/publish` | `plan:{planId}:published:{versionId}` |
| `gamification/events` API | Caller-provided, validated `z.string().min(8)` |
| `admin/gamification/awards` | Caller-provided, validated `z.string().min(8)` |

### DB constraints verified
- `gamification_events`: UNIQUE `idx_gamification_events_idempotency_v2` on `(tenant_id, source, idempotency_key)`
- `coin_transactions`: UNIQUE `idx_coin_transactions_idempotency` on `(user_id, tenant_id, idempotency_key)` WHERE NOT NULL
- `user_achievements`: UNIQUE on `(user_id, achievement_id)` AND `(user_id, tenant_id, achievement_id)`

---

## 3. Event Cascade Pipeline

The gamification event pipeline is a 5-step cascade:

```
logGamificationEventV1(input)
  │
  ├─ 1. INSERT into gamification_events (idempotency via UNIQUE index)
  │     ├─ success → eventId from INSERT
  │     └─ 23505 duplicate → fetch existing event → use SAME eventId
  │
  ├─ 2. applyGamificationRewardsForEventV1(eventId, ...)
  │     └─ apply_coin_transaction_v1(key: evt:{eventId}:coins)
  │
  ├─ 3. applyGamificationAchievementsForEventV1(eventId, ...)
  │     └─ tenant_award_achievement_v1(key derived from event)
  │
  ├─ 4. applyCampaignBonusesForEventV1(eventId, ...)
  │     └─ FOR EACH active campaign: apply_campaign_bonus_v1(key: evt:{eventId}:campaign:{campaignId}:coins)
  │
  └─ 5. applyAutomationRulesForEventV1(eventId, ...)
        └─ FOR EACH active rule: apply_automation_rule_reward_v1(key: evt:{eventId}:rule:{ruleId}:coins)
```

**Critical design property:** On 23505 (duplicate event), the cascade **re-executes entirely** using the **same eventId**. Because all downstream RPC keys are derived from `eventId`, the re-execution is idempotent — no double-rewards.

V2 pipeline (`gamification-events-v2.server.ts`) follows the same pattern.

---

## 4. Investigated Bugs — Confirmed SAFE

### Bug #1: Event Cascade Double-Application
**Hypothesis:** If two concurrent requests with the same idempotency key both pass the INSERT, the cascade runs twice.
**Finding:** On 23505, the code fetches the *existing* event's ID and reruns the cascade. All downstream RPCs use `evt:{existingEventId}:coins` keys — deterministic and identical to the first run. Advisory locks in each RPC prevent concurrent execution. **No double-reward.**

### Bug #2: Session Completion Amplification
**Hypothesis:** `session_completed` events could be emitted from both `session-command.ts` and `sessions/end/route.ts`, creating duplicate rewards.
**Finding:** Both use deterministic key `participant_session:{sessionId}:ended` with same `source: 'play'`. The UNIQUE index on `(tenant_id, source, idempotency_key)` deduplicates at INSERT. Even if cascade re-executes, deterministic downstream keys prevent double-reward. **Safe.**

### Bug #3: Learning Course Rewards Race
**Hypothesis:** `learning_grant_course_rewards_v1` has a check-then-act race on `rewards_granted_at`.
**Finding:** Race exists but is harmless. Coins use `learning:course:{courseId}:{userId}` key → `apply_coin_transaction_v1` deduplicates. XP uses same key → `apply_xp_transaction_v1` checks JSONB membership. Achievement uses UNIQUE constraint with ON CONFLICT DO NOTHING. Worst case: the function runs twice but produces no duplicate rewards. **Safe.**

### Bug #4: API Events Coin Logic (Both Paths)
**Hypothesis:** In `/api/gamification/events`, coins are applied on both the success and 23505 paths, potentially doubling.
**Finding:** Both paths derive the same key `evt:{eventId}:coins`. On duplicate path, the *existing* event's ID is used. Since the key is identical, `apply_coin_transaction_v1` returns the existing transaction. **Safe.**

---

## 5. Findings — P2 (Performance / Hygiene)

### F-01: Wasteful Cascade Re-execution on 23505
**Location:** `lib/services/gamification-events.server.ts`, `gamification-events-v2.server.ts`
**Impact:** Performance. On duplicate event INSERT, the full 4-step cascade (rewards + achievements + campaigns + automation) re-executes. Each step makes a DB round-trip that returns "already processed." On a busy system with retries, this multiplies DB load.
**Recommendation:** Early-return on 23505 if the existing event is already fully processed, or add a `processed_at` column to `gamification_events` to skip cascade on re-entry.

### F-02: XP Grants JSONB Unbounded Growth
**Location:** `user_progress.xp_grants` column (baseline.sql L4259)
**Impact:** Storage / query performance. Every XP transaction appends its idempotency key to a JSONB array. The `? key` operator scans this array linearly. After months of activity, this array grows without bound (potentially thousands of entries per user).
**Recommendation:** Periodic pruning (cron job to trim old keys, e.g., older than 30 days), or migrate to a separate `xp_transactions` table with a UNIQUE index (matching the `coin_transactions` pattern).

### F-03: `apply_automation_rule_reward_v1` Lacks Own Advisory Lock
**Location:** baseline.sql L8273–8380
**Impact:** Defense-in-depth inconsistency. This RPC chains directly to `apply_coin_transaction_v1` without its own `pg_advisory_xact_lock`. If the downstream function's signature changes, the protection could be lost.
**Recommendation:** Add `pg_advisory_xact_lock(hashtext(p_idempotency_key))` at the top of `apply_automation_rule_reward_v1` for consistency with all other write-path RPCs.

### F-04: Achievement Admin Fallback to `crypto.randomUUID()`
**Location:** `app/actions/achievements-admin.ts` L437
**Impact:** Phantom audit records. If `idempotencyKey` is not provided, the action generates `crypto.randomUUID()`. On retry, a different key is generated → the advisory lock lookup misses → a new `admin_achievement_awards` row is created. Actual achievements are protected by UNIQUE on `user_achievements(user_id, achievement_id)`, so no duplicate unlock — but the audit table accumulates ghost entries.
**Recommendation:** Make `idempotencyKey` mandatory in `awardAchievementSchema`, matching the pattern set by `admin_award_coins_v1` which requires `z.string().min(8)`.

---

## 6. Findings — P3 (Monitoring / Documentation)

### F-05: No Cascade Re-execution Monitoring
**Impact:** Without metrics on how often the 23505 path triggers, we can't quantify the performance cost of F-01.
**Recommendation:** Add a counter metric or structured log when the 23505 branch fires. Alert if frequency exceeds threshold (e.g., >5% of events are duplicates).

### F-06: Visibility Change Creates Distinct Events Per State
**Location:** `plans/visibility/route.ts`
**Impact:** Informational. Key `plan:{planId}:visibility:{visibility}:{tenantId}` means toggling visibility back and forth creates unique events/rewards. This is correct behavior (each state change IS a distinct action) but worth documenting to avoid confusion during log analysis.

---

## 7. Anti-Inflation Systems (Verified Working)

| System | Mechanism | Status |
|--------|-----------|--------|
| **Softcap** | `calculate_softcap_reward_v1` — diminishing returns as daily total increases | ✅ Active |
| **Cooldown** | `check_cooldown_eligible_v1` + `record_cooldown_trigger_v1` — per-event-type rate limiting | ✅ Active |
| **Daily earning cap** | `record_daily_earning_v1` — UPSERT daily totals | ✅ Active |
| **Campaign budgets** | `apply_campaign_bonus_v1` — decrements `remaining_budget`, rejects when 0 | ✅ Active |
| **Coin multiplier expiry** | Multipliers have `expires_at` — cannot create permanent coin inflation | ✅ Active |

---

## 8. Conclusion

Lekbanken's gamification system has **strong, launch-sufficient idempotency** at the database layer. The consistent use of `pg_advisory_xact_lock` + deterministic idempotency key derivation + UNIQUE constraints creates a three-layer defense against duplicate rewards.

The four P2 findings are hygiene improvements — none represent correctness risks at current scale. F-02 (XP JSONB growth) is the most important to address before sustained high-volume usage.

### Limitations

This audit covered the RPCs, tables, constraints, and app-layer call sites that existed at audit time. Future new reward callers, cron flows, or event types **must preserve deterministic idempotency key derivation** — any caller using `randomUUID()` or omitting keys bypasses the safety model.

**Launch verdict: ✅ Safe to launch.**
