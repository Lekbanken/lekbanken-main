# Gamification Event Integrity — Architecture Reference

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-14
- Last updated: 2026-03-21
- Last validated: 2026-03-14

> Active architecture reference for gamification event integrity and idempotency behavior. Use this as the stable design overview together with the paired audit snapshot and current launch-readiness state.

> **Status:** Verified 2025-01-25
> **Scope:** Event pipeline, idempotency model, anti-inflation systems

---

## 1. Event Pipeline Architecture

### 1.1 Event Flow (V1)

```
┌─────────────────────────────────────────────────────────────┐
│  App-Layer Callers                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐│
│  │ session-cmd  │ │ play/runs/*  │ │ plans/route, publish ││
│  │ (session end)│ │ (run done)   │ │ (create, publish)    ││
│  └──────┬───────┘ └──────┬───────┘ └──────────┬───────────┘│
│         │                │                     │            │
│         ▼                ▼                     ▼            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ logGamificationEventV1(input)                        │   │
│  │   input.idempotencyKey = deterministic (e.g.         │   │
│  │     "run:{runId}:completed",                         │   │
│  │     "plan:{planId}:created")                         │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: INSERT gamification_events                         │
│  UNIQUE idx (tenant_id, source, idempotency_key)            │
│                                                             │
│  ┌─ Success ────────────────────────────────── eventId ──┐  │
│  │                                                       │  │
│  └─ 23505 Duplicate ─── SELECT existing ─── eventId ──┘  │  │
│                                                             │
│  (Both paths proceed with SAME eventId)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: applyGamificationRewardsForEventV1                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Lookup REWARD_RULES_V1 for matching event_type      │    │
│  │ Key: "evt:{eventId}:coins"                          │    │
│  │ → apply_coin_transaction_v1(key, amount)            │    │
│  │                                                     │    │
│  │ If active multiplier:                               │    │
│  │ Key: "evt:{eventId}:coins:bonus"                    │    │
│  │ → apply_coin_transaction_v1(key, bonus_amount)      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: applyGamificationAchievementsForEventV1            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Evaluate achievement criteria against event          │    │
│  │ → tenant_award_achievement_v1(...)                   │    │
│  │   Protected by UNIQUE(user_id, achievement_id)       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: applyCampaignBonusesForEventV1                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ FOR EACH active campaign:                            │    │
│  │   Key: "evt:{eventId}:campaign:{campaignId}:coins"   │    │
│  │   → apply_campaign_bonus_v1(key, ...)                │    │
│  │     Advisory lock + budget tracking                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: applyAutomationRulesForEventV1                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ FOR EACH active automation rule:                     │    │
│  │   Key: "evt:{eventId}:rule:{ruleId}:coins"           │    │
│  │   → apply_automation_rule_reward_v1(key, ...)        │    │
│  │     Chains to apply_coin_transaction_v1              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 V2 Pipeline

`gamification-events-v2.server.ts` follows the same structure. It wraps the V1 cascade functions and adds the same 23505 handling with deterministic key derivation.

---

## 2. Idempotency Model

### 2.1 Three-Layer Defense

```
Layer 1: App-Layer Key Derivation
  └─ Deterministic keys from entity IDs (e.g., "run:{runId}:completed")
  └─ Same input → same key → same event

Layer 2: DB UNIQUE Constraints
  └─ gamification_events: (tenant_id, source, idempotency_key)
  └─ coin_transactions: (user_id, tenant_id, idempotency_key) WHERE NOT NULL
  └─ user_achievements: (user_id, achievement_id)

Layer 3: RPC Advisory Locks
  └─ pg_advisory_xact_lock(hashtext(key)) — serializes concurrent requests
  └─ Lookup in target table — returns existing result if found
```

### 2.2 Key Derivation Patterns

| Context | Idempotency Key | Derived From |
|---------|----------------|--------------|
| Event INSERT | Caller-provided (e.g., `run:{id}:completed`) | Entity ID |
| Coin reward (base) | `evt:{eventId}:coins` | Event ID |
| Coin reward (bonus) | `evt:{eventId}:coins:bonus` | Event ID |
| Campaign bonus | `evt:{eventId}:campaign:{campaignId}:coins` | Event ID + Campaign ID |
| Automation rule | `evt:{eventId}:rule:{ruleId}:coins` | Event ID + Rule ID |
| Admin coin award | `{batchKey}:user:{userId}` | Batch key + User ID |
| Learning course | `learning:course:{courseId}:{userId}` | Course ID + User ID |
| Shop purchase | Lookup in `user_purchases` | Purchase record |
| Powerup consumption | Lookup in `user_powerup_consumptions` | Consumption record |
| Burn operation | Lookup in `gamification_burn_log` | Burn log record |

### 2.3 Advisory Lock Pattern (Standard)

```sql
-- Used by: apply_coin_transaction_v1, admin_award_coins_v1,
--          admin_award_achievement_v1, tenant_award_achievement_v1,
--          apply_campaign_bonus_v1, purchase_shop_item_v1,
--          consume_powerup_v1, burn_coins_v1

PERFORM pg_advisory_xact_lock(hashtext(p_idempotency_key));

-- Lookup existing
SELECT ... INTO v_existing
FROM target_table
WHERE idempotency_key = p_idempotency_key;

IF v_existing IS NOT NULL THEN
  RETURN json_build_object('status', 'duplicate', ...);
END IF;

-- Proceed with write
INSERT INTO target_table (...) VALUES (...);
```

### 2.4 XP Idempotency (JSONB Pattern)

```sql
-- Used by: apply_xp_transaction_v1
-- Different from standard: stores keys in JSONB array on user_progress row

IF EXISTS (
  SELECT 1 FROM user_progress
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id
    AND xp_grants ? p_idempotency_key  -- JSONB containment check
) THEN
  RETURN json_build_object('status', 'duplicate');
END IF;

UPDATE user_progress SET
  xp_grants = coalesce(xp_grants, '[]'::jsonb) || to_jsonb(p_idempotency_key),
  current_xp = current_xp + v_actual_xp,
  ...;
```

---

## 3. Anti-Inflation Systems

### 3.1 Softcap

`calculate_softcap_reward_v1(p_user_id, p_tenant_id, p_base_amount)` returns a reduced amount as daily earnings increase. STABLE function — no side effects.

### 3.2 Cooldown

Two RPCs work together:
- `check_cooldown_eligible_v1(p_user_id, p_event_type, p_cooldown_seconds)` — returns boolean
- `record_cooldown_trigger_v1(p_user_id, p_event_type)` — UPSERT with ON CONFLICT

Prevents rapid-fire event farming for the same event type.

### 3.3 Daily Earning Cap

`record_daily_earning_v1(p_user_id, p_tenant_id, p_amount)` — UPSERT daily total. Functions check this total against configurable limits.

### 3.4 Campaign Budget Guard

`apply_campaign_bonus_v1` decrements `remaining_budget` atomically. When budget reaches 0, bonus coins are no longer awarded for that campaign.

### 3.5 Multiplier Expiry

Coin multipliers have an `expires_at` timestamp. `get_active_coin_multiplier_v1` only returns multipliers where `expires_at > now()`. No permanent inflation risk.

---

## 4. Reward Rules (V1)

Hardcoded in `lib/services/gamification-rewards.server.ts`:

```typescript
const REWARD_RULES_V1 = [
  { eventType: 'run_completed', coins: 1 },
  { eventType: 'session_completed', coins: 2 },
  { eventType: 'plan_created', coins: 5 },
  { eventType: 'plan_published', coins: 10 },
];
```

Additional coins may come from:
- Active multipliers (via `get_active_coin_multiplier_v1`)
- Campaign bonuses (Step 4 in cascade)
- Automation rule rewards (Step 5 in cascade)

---

## 5. Key Files

| File | Purpose |
|------|---------|
| `lib/services/gamification-events.server.ts` | V1 event cascade pipeline |
| `lib/services/gamification-events-v2.server.ts` | V2 event cascade pipeline |
| `lib/services/gamification-rewards.server.ts` | Coin reward rules + application |
| `lib/services/gamification-achievements.server.ts` | Achievement evaluation + unlocking |
| `app/api/gamification/events/route.ts` | Public event ingestion API |
| `app/api/admin/gamification/awards/route.ts` | Admin coin award endpoint |
| `app/actions/achievements-admin.ts` | Admin achievement award server action |
| `supabase/migrations/00000000000000_baseline.sql` | All RPC definitions |
