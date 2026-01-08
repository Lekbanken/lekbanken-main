# GAMIFICATION V2 MIGRATION — IMPLEMENTATION SUMMARY

**Date:** 2026-01-08  
**Migration File:** `20260108200000_gamification_v2_core_extensions.sql`

---

## MIGRATION OVERVIEW

| Feature | Table(s) | RLS | Indexes |
|---------|----------|-----|---------|
| Achievement Scope | `achievements` (altered) | ✅ Updated | `idx_achievements_scope_tenant` |
| Leaderboard Opt-out | `user_gamification_preferences` | ✅ | 3 indexes |
| Cooldown Tracking | `gamification_cooldowns` | ✅ | 4 indexes |
| Softcap Config | `gamification_softcap_config` | ✅ | 2 indexes |
| Daily Earnings | `gamification_daily_earnings` | ✅ | 2 indexes |
| Burn Foundation | `gamification_burn_sinks`, `gamification_burn_log` | ✅ | 5 indexes |
| Rules Extension | `gamification_automation_rules` (altered) | existing | 1 new index |

---

## 1. ACHIEVEMENT SCOPE (Global vs Tenant)

### Schema Changes

```sql
-- New columns on achievements
scope text NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'tenant'))
scope_tenant_id uuid REFERENCES tenants(id)

-- Constraint
achievements_scope_tenant_check:
  (scope = 'global' AND scope_tenant_id IS NULL) OR
  (scope = 'tenant' AND scope_tenant_id IS NOT NULL)
```

### RLS Policies

| Policy | Operation | Logic |
|--------|-----------|-------|
| `achievements_select_v2` | SELECT | Global OR user's tenants OR system_admin |
| `achievements_admin_manage` | ALL | system_admin OR tenant owner/admin (for tenant-scoped) |

### Usage

```typescript
// Create global achievement
await supabase.from('achievements').insert({
  name: 'First Session',
  scope: 'global',
  scope_tenant_id: null,
  // ...
})

// Create tenant-scoped achievement
await supabase.from('achievements').insert({
  name: 'Team Milestone',
  scope: 'tenant',
  scope_tenant_id: tenantId,
  // ...
})
```

---

## 2. LEADERBOARD OPT-OUT

### New Table: `user_gamification_preferences`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| user_id | uuid | — | FK to users |
| tenant_id | uuid | null | FK to tenants (null = global) |
| leaderboard_visible | boolean | true | If false, excluded from rankings |
| leaderboard_opted_out_at | timestamptz | null | When user opted out |
| notifications_enabled | boolean | true | Future: notification preferences |

### User-Callable Function

```sql
-- Toggle leaderboard visibility
SELECT public.set_leaderboard_visibility(
  p_tenant_id := 'tenant-uuid',
  p_visible := false
);
```

### Leaderboard View

The `v_gamification_leaderboard` view automatically filters out opted-out users:

```sql
SELECT * FROM v_gamification_leaderboard
WHERE tenant_id = 'tenant-uuid'
ORDER BY rank_by_earned
LIMIT 10;
```

---

## 3. COOLDOWN TRACKING

### New Table: `gamification_cooldowns`

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | User |
| tenant_id | uuid | Tenant |
| event_type | text | e.g., 'play:perfect_session' |
| cooldown_type | text | 'daily' \| 'weekly' \| 'once' \| 'once_per_streak' |
| trigger_count | int | How many times triggered |
| last_triggered_at | timestamptz | Most recent trigger |
| streak_id | int | For once_per_streak tracking |

### Cooldown Types

| Type | Behavior |
|------|----------|
| `none` | No limit |
| `daily` | Resets at midnight UTC |
| `weekly` | Resets Monday midnight UTC |
| `once` | One-time ever |
| `once_per_streak` | Once per streak period (uses streak_id) |

### Service Functions

```sql
-- Check if user is eligible for reward
SELECT * FROM check_cooldown_eligible_v1(
  p_user_id := 'user-uuid',
  p_tenant_id := 'tenant-uuid',
  p_event_type := 'play:perfect_session',
  p_cooldown_type := 'daily',
  p_streak_id := NULL
);
-- Returns: eligible (bool), last_triggered_at, trigger_count

-- Record a trigger (after reward applied)
SELECT record_cooldown_trigger_v1(
  p_user_id := 'user-uuid',
  p_tenant_id := 'tenant-uuid',
  p_event_type := 'play:perfect_session',
  p_cooldown_type := 'daily',
  p_streak_id := NULL
);
```

---

## 4. SOFTCAP CONFIGURATION

### New Table: `gamification_softcap_config`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| tenant_id | uuid | null | null = global default |
| daily_coin_threshold | int | 100 | Coins/day before diminishing |
| daily_xp_threshold | int | 500 | XP/day before diminishing |
| coin_diminishing_factor | numeric | 0.500 | Reduction per threshold exceeded |
| xp_diminishing_factor | numeric | 0.500 | Reduction per threshold exceeded |
| coin_floor_pct | numeric | 0.100 | Minimum 10% of base reward |
| xp_floor_pct | numeric | 0.100 | Minimum 10% of base reward |
| max_multiplier_cap | numeric | 2.00 | Absolute multiplier ceiling |

### Softcap Algorithm

```
For daily_coin_threshold = 100, diminishing_factor = 0.5, floor = 0.1:

User earned 0-99 coins today → 100% rewards
User earned 100-199 coins → 50% rewards (0.5^1)
User earned 200-299 coins → 25% rewards (0.5^2)
User earned 300-399 coins → 12.5% rewards (0.5^3)
User earned 400+ coins → 10% rewards (floor)
```

### Profiles Under Default Config

| Profile | Daily Activity | Coins/Day | XP/Day |
|---------|---------------|-----------|--------|
| Casual | 2-3 sessions | ~30 DC | ~150 XP |
| Active | 5-10 sessions | ~80 DC | ~400 XP |
| Power | 20+ sessions | ~120-140 DC (softcapped) | ~600-700 XP |

### Service Functions

```sql
-- Get effective softcap config (tenant override or global)
SELECT * FROM get_softcap_config_v1('tenant-uuid');

-- Calculate softcap-adjusted reward
SELECT * FROM calculate_softcap_reward_v1(
  p_user_id := 'user-uuid',
  p_tenant_id := 'tenant-uuid',
  p_base_coins := 10,
  p_base_xp := 50,
  p_multiplier := 1.5
);
-- Returns: adjusted_coins, adjusted_xp, effective_multiplier, softcap_applied, coins_reduced, xp_reduced

-- Record earnings (for softcap tracking)
SELECT record_daily_earning_v1(
  p_user_id := 'user-uuid',
  p_tenant_id := 'tenant-uuid',
  p_coins := 10,
  p_xp := 50,
  p_coins_raw := 15,  -- Pre-softcap
  p_xp_raw := 75,
  p_coins_reduced := 5,
  p_xp_reduced := 25
);
```

---

## 5. BURN FOUNDATION

### New Tables

#### `gamification_burn_sinks`

Registry of things users can spend coins on:

| Column | Type | Description |
|--------|------|-------------|
| sink_type | text | 'shop_item' \| 'boost' \| 'cosmetic' \| 'donation' \| 'custom' |
| name | text | Display name |
| cost_coins | int | Price in DiceCoin |
| is_available | bool | Currently purchasable |
| total_stock | int | null = unlimited |
| remaining_stock | int | Current inventory |
| per_user_limit | int | Max per user |

#### `gamification_burn_log`

Audit trail of all coin burns:

| Column | Type | Description |
|--------|------|-------------|
| sink_id | uuid | What was purchased |
| coin_transaction_id | uuid | Link to ledger |
| amount_spent | int | Coins burned |
| result_status | text | 'completed' \| 'refunded' \| 'failed' |

### Atomic Burn Function

```sql
SELECT * FROM burn_coins_v1(
  p_user_id := 'user-uuid',
  p_tenant_id := 'tenant-uuid',
  p_sink_id := 'sink-uuid',  -- optional
  p_amount := 50,
  p_idempotency_key := 'purchase:item:123',
  p_metadata := '{"itemName": "Gold Frame"}'::jsonb
);
-- Returns: success, burn_log_id, coin_transaction_id, new_balance, error_message
```

**Guarantees:**
- ✅ Prevents negative balance (uses existing `apply_coin_transaction_v1`)
- ✅ Idempotent (same idempotency_key = same result)
- ✅ Stock tracking
- ✅ Full audit trail

---

## 6. AUTOMATION RULES EXTENSION

### New Columns on `gamification_automation_rules`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| xp_amount | int | 0 | XP reward (in addition to coins) |
| cooldown_type | text | 'none' | Rate limiting |
| base_multiplier | numeric | 1.00 | Base multiplier before stacking |
| conditions | jsonb | '[]' | Additional conditions (future) |
| tenant_id | uuid | null | null = global rule |

---

## 7. ADMIN VIEWS

### `v_gamification_daily_economy`

Daily mint/burn aggregates per tenant:

```sql
SELECT * FROM v_gamification_daily_economy
WHERE tenant_id = 'tenant-uuid'
  AND day >= current_date - interval '30 days'
ORDER BY day DESC;
```

| Column | Description |
|--------|-------------|
| coins_minted | Total earned that day |
| coins_burned | Total spent that day |
| net_flow | minted - burned |
| mint_tx_count | Number of earn transactions |
| burn_tx_count | Number of spend transactions |

### `v_gamification_leaderboard`

Pre-filtered leaderboard (excludes opted-out users):

```sql
SELECT * FROM v_gamification_leaderboard
WHERE tenant_id = 'tenant-uuid'
ORDER BY rank_by_earned
LIMIT 50;
```

---

## RLS SUMMARY

| Table | User Access | Admin Access | Service Role |
|-------|-------------|--------------|--------------|
| achievements | SELECT (global + own tenants) | ALL (own tenants) | ALL |
| user_gamification_preferences | SELECT/UPDATE (own) | SELECT only | ALL |
| gamification_cooldowns | SELECT (own) | — | ALL |
| gamification_softcap_config | — | SELECT/ALL (own tenants) | ALL |
| gamification_daily_earnings | SELECT (own) | SELECT (own tenants) | ALL |
| gamification_burn_sinks | SELECT (available) | ALL (own tenants) | ALL |
| gamification_burn_log | SELECT (own) | SELECT (own tenants) | ALL |

---

## INDEX SUMMARY

| Table | Index | Purpose |
|-------|-------|---------|
| achievements | `idx_achievements_scope_tenant` | Fast tenant-scoped lookups |
| user_gamification_preferences | `idx_*_leaderboard` | Fast leaderboard filtering |
| gamification_cooldowns | `idx_*_streak` | Unique streak cooldowns |
| gamification_cooldowns | `idx_*_last_triggered` | Cleanup old cooldowns |
| gamification_softcap_config | `idx_*_global` | Ensure single global config |
| gamification_daily_earnings | `idx_*_user_date` | Fast daily lookups |
| gamification_burn_sinks | `idx_*_available` | Available items query |
| gamification_automation_rules | `idx_*_global` | Global rules lookup |

---

## FUNCTION SECURITY

All new functions are `SECURITY DEFINER` with `SET search_path = public` for safety.

| Function | Callable By |
|----------|-------------|
| `set_leaderboard_visibility` | authenticated |
| `get_softcap_config_v1` | authenticated, service_role |
| `check_cooldown_eligible_v1` | service_role only |
| `record_cooldown_trigger_v1` | service_role only |
| `calculate_softcap_reward_v1` | service_role only |
| `record_daily_earning_v1` | service_role only |
| `burn_coins_v1` | service_role only |

---

## NEXT STEPS

1. **TypeScript Service Layer**: Update `lib/services/gamification-rewards.server.ts` to use new functions
2. **Rule Engine**: Integrate cooldown checks and softcap calculations into reward flow
3. **Admin UI**: Add softcap config editor in `/admin/gamification/economy`
4. **Leaderboard API**: Create `GET /api/gamification/leaderboard` with opt-out filtering
5. **Shop Catalog**: When ready, populate `gamification_burn_sinks` and enable UI

---

## TESTING CHECKLIST

- [ ] Achievement scope filtering works (global vs tenant)
- [ ] Leaderboard toggle persists and filters correctly
- [ ] Cooldown eligibility checks work for all types
- [ ] Softcap reduces rewards progressively
- [ ] Multiplier cap enforced at 2.0x
- [ ] Burn function prevents negative balance
- [ ] Burn function is idempotent
- [ ] Daily earnings accumulate correctly
- [ ] Admin views return correct data
- [ ] RLS prevents cross-tenant access
