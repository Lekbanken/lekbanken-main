# Gamification System - Complete Implementation Report

**Project:** Lekbanken  
**Date:** January 8, 2026  
**Status:** ✅ Core Implementation Complete

---

## Executive Summary

The Lekbanken Gamification System v2 is a comprehensive reward, progression, and engagement system designed to motivate educators using the platform. It includes:

- **Coin Economy** - Virtual currency earned through activities, spent in shop/sinks
- **XP & Leveling** - Experience points with progressive level system
- **Streaks** - Daily engagement tracking with milestone rewards
- **Leaderboards** - Competitive rankings with opt-out support
- **Achievements** - Badge-based recognition system (global & tenant-scoped)
- **Softcap System** - Diminishing returns to prevent exploitation
- **Burn/Sink System** - Coin spending mechanisms for economy balance

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ ScoreBoard  │  │ Leaderboard │  │ Admin Gamification Hub  │  │
│  │  Component  │  │   Views     │  │   (Dashboard, Rules)    │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Routes (Next.js)                        │
│  /api/gamification/*           /api/admin/gamification/*         │
│  - /leaderboard                - /dashboard                      │
│  - /leaderboard/preferences    - /leaderboard                    │
│  - /burn                       - /rules                          │
│  - /sinks                      - /sinks                          │
│                                - /refund                         │
└─────────────────────────────────────────────────────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Server Services (lib/services/)               │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │ gamification-reward-   │  │ gamification-leaderboard.      │ │
│  │ engine.server.ts       │  │ server.ts                      │ │
│  │ - Rule resolution      │  │ - Rankings & periods           │ │
│  │ - Cooldown checking    │  │ - Opt-out handling             │ │
│  │ - Multiplier stacking  │  │ - Abuse detection              │ │
│  │ - Softcap application  │  │                                │ │
│  └────────────────────────┘  └────────────────────────────────┘ │
│  ┌────────────────────────┐  ┌────────────────────────────────┐ │
│  │ gamification-burn.     │  │ gamification-admin-dashboard.  │ │
│  │ server.ts              │  │ server.ts                      │ │
│  │ - Burn transactions    │  │ - Economy stats                │ │
│  │ - Refunds              │  │ - Aggregations                 │ │
│  │ - Sink management      │  │ - Health metrics               │ │
│  └────────────────────────┘  └────────────────────────────────┘ │
│  ┌────────────────────────┐                                     │
│  │ gamification-events-   │                                     │
│  │ v2.server.ts           │                                     │
│  │ - Event emission       │                                     │
│  │ - Automation rules     │                                     │
│  └────────────────────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase (PostgreSQL)                        │
│  Tables:                           RPC Functions:                │
│  - user_coins                      - apply_coin_transaction_v1   │
│  - user_progress                   - burn_coins_v1               │
│  - user_streaks                    - check_cooldown_eligible_v1  │
│  - coin_transactions               - record_cooldown_trigger_v1  │
│  - gamification_events             - calculate_softcap_reward_v1 │
│  - gamification_automation_rules   - record_daily_earning_v1     │
│  - gamification_daily_earnings     - set_leaderboard_visibility  │
│  - gamification_cooldowns          - get_softcap_config_v1       │
│  - gamification_softcap_config                                   │
│  - gamification_burn_sinks         Views:                        │
│  - gamification_burn_log           - v_gamification_leaderboard  │
│  - user_gamification_preferences   - v_gamification_daily_economy│
│  - achievements                                                  │
│  - user_achievements                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Tables

#### `user_coins`
Tracks user coin balances per tenant.
```sql
- user_id: UUID (PK with tenant_id)
- tenant_id: UUID (nullable for global)
- balance: INTEGER (current spendable coins)
- total_earned: INTEGER (lifetime earnings)
- total_spent: INTEGER (lifetime spending)
- created_at, updated_at: TIMESTAMPTZ
```

#### `user_progress`
Tracks XP and level progression.
```sql
- user_id: UUID
- tenant_id: UUID
- level: INTEGER (current level, starts at 1)
- current_xp: INTEGER (total XP accumulated)
- next_level_xp: INTEGER (XP required for next level)
```

#### `user_streaks`
Tracks daily engagement streaks.
```sql
- user_id: UUID
- tenant_id: UUID
- current_streak_days: INTEGER
- best_streak_days: INTEGER
- last_activity_date: DATE
```

#### `gamification_events`
Event log for all gamification triggers.
```sql
- id: UUID
- tenant_id: UUID
- actor_user_id: UUID
- event_type: TEXT (e.g., 'session_completed', 'plan_published')
- source: TEXT (e.g., 'play', 'planner', 'engagement')
- idempotency_key: TEXT (UNIQUE - prevents duplicate processing)
- metadata: JSONB
- created_at: TIMESTAMPTZ
```

#### `gamification_automation_rules`
Configurable reward rules per event type.
```sql
- id: UUID
- tenant_id: UUID (nullable for global rules)
- event_type: TEXT
- reward_amount: INTEGER (coins)
- xp_amount: INTEGER
- cooldown_type: TEXT ('none', 'daily', 'weekly', 'once', 'once_per_streak')
- base_multiplier: NUMERIC
- conditions: JSONB
- is_active: BOOLEAN
```

### V2 Extension Tables (Migration: 20260108200000)

#### `user_gamification_preferences`
User settings including leaderboard opt-out.
```sql
- user_id: UUID
- tenant_id: UUID
- leaderboard_visible: BOOLEAN (default true)
- leaderboard_opted_out_at: TIMESTAMPTZ
- notifications_enabled: BOOLEAN
```

#### `gamification_cooldowns`
Tracks when users triggered cooldown-limited events.
```sql
- user_id: UUID
- tenant_id: UUID
- event_type: TEXT
- cooldown_type: TEXT
- trigger_count: INTEGER
- first_triggered_at: TIMESTAMPTZ
- last_triggered_at: TIMESTAMPTZ
- streak_id: INTEGER (for once_per_streak)
```

#### `gamification_softcap_config`
Per-tenant softcap settings.
```sql
- tenant_id: UUID (null = global default)
- daily_coin_threshold: INTEGER (default 100)
- daily_xp_threshold: INTEGER (default 500)
- coin_diminishing_factor: NUMERIC (default 0.5)
- xp_diminishing_factor: NUMERIC (default 0.5)
- coin_floor_pct: NUMERIC (default 0.1, minimum 10%)
- xp_floor_pct: NUMERIC (default 0.1)
- max_multiplier_cap: NUMERIC (default 2.0)
```

#### `gamification_daily_earnings`
Tracks daily totals for softcap calculation.
```sql
- user_id: UUID
- tenant_id: UUID
- earning_date: DATE
- coins_earned: INTEGER (after softcap)
- xp_earned: INTEGER
- coins_earned_raw: INTEGER (before softcap)
- xp_earned_raw: INTEGER
- coins_reduced: INTEGER (amount reduced by softcap)
- xp_reduced: INTEGER
- event_count: INTEGER
```

#### `gamification_burn_sinks`
Registry of coin-spending mechanisms.
```sql
- id: UUID
- tenant_id: UUID
- sink_type: TEXT ('shop_item', 'boost', 'cosmetic', 'donation', 'custom')
- name: TEXT
- description: TEXT
- cost_coins: INTEGER
- is_available: BOOLEAN
- available_from: TIMESTAMPTZ
- available_until: TIMESTAMPTZ
- total_stock: INTEGER (null = unlimited)
- remaining_stock: INTEGER
- per_user_limit: INTEGER
- metadata: JSONB
```

#### `gamification_burn_log`
Audit log of all coin burn transactions.
```sql
- id: UUID
- user_id: UUID
- tenant_id: UUID
- sink_id: UUID
- coin_transaction_id: UUID
- sink_type: TEXT
- amount_spent: INTEGER
- result_status: TEXT ('completed', 'refunded', 'failed')
- refund_transaction_id: UUID
- metadata: JSONB
```

---

## RPC Functions

### `apply_coin_transaction_v1`
Atomic, idempotent coin transaction with balance update.

**Parameters:**
- `p_user_id`, `p_tenant_id`, `p_type` ('earn'/'spend')
- `p_amount`, `p_reason_code`, `p_idempotency_key`
- `p_description`, `p_source`, `p_metadata`

**Returns:** `{ transaction_id, balance }`

### `burn_coins_v1`
Atomic coin burn with validation (balance, stock, limits).

**Parameters:**
- `p_user_id`, `p_tenant_id`, `p_sink_id`
- `p_amount`, `p_idempotency_key`, `p_metadata`

**Returns:** `{ success, burn_log_id, coin_transaction_id, new_balance, error_message }`

### `check_cooldown_eligible_v1`
Check if user can trigger a cooldown-limited event.

**Parameters:**
- `p_user_id`, `p_tenant_id`, `p_event_type`
- `p_cooldown_type`, `p_streak_id`

**Returns:** `{ eligible, last_triggered_at, trigger_count }`

### `calculate_softcap_reward_v1`
Calculate softcap-adjusted reward based on daily earnings.

**Formula:** `factor = 1.0 - 0.8 * (ratio²)`, clamped to [floor_pct, 1.0]

**Parameters:**
- `p_user_id`, `p_tenant_id`
- `p_base_coins`, `p_base_xp`, `p_multiplier`

**Returns:** `{ adjusted_coins, adjusted_xp, effective_multiplier, softcap_applied, coins_reduced, xp_reduced }`

### `record_daily_earning_v1`
Increment daily earnings tracker (called after each reward).

### `set_leaderboard_visibility`
User-callable function to toggle leaderboard opt-out.

---

## API Endpoints

### User-Facing APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gamification/leaderboard` | GET | Get leaderboard rankings |
| `/api/gamification/leaderboard/preferences` | GET/POST | Get/set leaderboard visibility |
| `/api/gamification/burn` | POST | Spend coins on a sink |
| `/api/gamification/sinks` | GET | List available sinks |

### Admin APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/gamification/dashboard` | GET | Economy stats & health |
| `/api/admin/gamification/leaderboard` | GET | Admin leaderboard with abuse flags |
| `/api/admin/gamification/rules` | GET/POST/PUT | Manage automation rules |
| `/api/admin/gamification/sinks` | GET/POST/PUT | Manage burn sinks |
| `/api/admin/gamification/refund` | POST | Process refunds |

---

## Server Services

### `gamification-reward-engine.server.ts`

The core reward evaluation engine. Handles:

1. **Rule Resolution** - Priority: tenant-specific → global DB → hardcoded defaults
2. **Cooldown Checking** - Enforces daily/weekly/once/once_per_streak limits
3. **Multiplier Stacking** - Combines streak, weekend, campaign, powerup, level bonuses
4. **Multiplier Cap** - Hard cap at 2.0x to prevent runaway inflation
5. **Softcap Application** - Diminishing returns based on daily earnings
6. **Idempotent Transactions** - Prevents duplicate rewards

**Key Function:** `evaluateAndApplyRewardV2(input)`

```typescript
interface EvaluateRewardInput {
  eventId: string
  eventCreatedAt: string
  tenantId: string | null
  actorUserId: string
  eventType: string
  source: GamificationSource
  metadata?: Record<string, unknown>
}

interface EvaluateRewardResult {
  applied: boolean
  skipped: boolean
  skipReason?: string
  coinTransactionId: string | null
  xpTransactionId: string | null
  balance: number | null
  xp: number | null
  ruleId: string | null
  baseCoins: number
  baseXp: number
  adjustedCoins: number
  adjustedXp: number
  effectiveMultiplier: number
  softcapApplied: boolean
  cooldownBlocked: boolean
  multiplierSources: MultiplierSource[]
}
```

### Hardcoded Default Rules

| Event Type | Source | Coins | XP | Cooldown |
|------------|--------|-------|-----|----------|
| `session_started` | play | 1 | 10 | none |
| `session_completed` | play | 2 | 25 | none |
| `run_completed` | play | 1 | 15 | none |
| `first_session` | play | 50 | 500 | once |
| `perfect_session` | play | 5 | 50 | daily |
| `large_group_hosted` | play | 10 | 100 | weekly |
| `plan_created` | planner | 5 | 20 | none |
| `plan_published` | planner | 10 | 50 | none |
| `first_plan` | planner | 25 | 200 | once |
| `daily_login` | engagement | 1 | 10 | daily |
| `streak_3_days` | engagement | 5 | 30 | once_per_streak |
| `streak_7_days` | engagement | 15 | 75 | once_per_streak |
| `streak_30_days` | engagement | 50 | 300 | once_per_streak |
| `game_created` | content | 8 | 40 | none |
| `game_published` | content | 15 | 100 | none |
| `invite_accepted` | social | 20 | 100 | none |
| `tutorial_completed` | learning | 15 | 100 | once |

### `gamification-leaderboard.server.ts`

Leaderboard queries and anti-abuse features.

**Key Functions:**
- `getLeaderboard(tenantId, type, period, limit)` - Main ranking query
- `getLeaderboardPreferences(tenantId)` - User opt-out status
- `setLeaderboardVisibility(tenantId, visible)` - Toggle visibility
- `checkLeaderboardAbuseRisk(tenantId, userId)` - Risk scoring
- `adminSetLeaderboardExclusion(tenantId, userId, excluded, reason)` - Manual exclusion

**Leaderboard Types:**
- `coins_earned` - Total lifetime coins
- `coins_balance` - Current balance
- `xp_total` - Total XP
- `level` - Current level
- `streak_current` - Current streak
- `streak_best` - Best streak ever

**Periods:** `all_time`, `monthly`, `weekly`, `daily`

### `gamification-burn.server.ts`

Coin spending (burn) system.

**Key Functions:**
- `burnCoins(input)` - Execute a burn transaction
- `refundBurn(input)` - Admin refund
- `getAvailableSinks(tenantId)` - List purchasable items
- `checkUserPurchaseLimit(userId, sinkId)` - Per-user limit check
- `adminCreateSink(input)` / `adminUpdateSink(input)` - Sink management

### `gamification-admin-dashboard.server.ts`

Admin analytics and monitoring.

**Key Functions:**
- `getEconomyOverview(tenantId)` - Summary stats
- `getDailyEconomyData(tenantId, days)` - Time series data
- `getTopEarners(tenantId, limit)` - Leaderboard snapshot
- `getHealthMetrics(tenantId)` - System health indicators

---

## Multiplier System

### Sources (Multiplicative Stacking)

| Source | Condition | Multiplier |
|--------|-----------|------------|
| **Streak** | 7+ day streak | 1.5x |
| **Weekend** | Saturday/Sunday (UTC) | 1.25x |
| **Campaign** | Active campaign for event | Variable |
| **Powerup** | Active coin multiplier boost | Variable |
| **Level** | Level 5+ | 1.0 + (level-4) × 0.1 |

### Cap

All multipliers stack multiplicatively but are **capped at 2.0x** to prevent inflation.

Example: Streak (1.5) × Weekend (1.25) × Level 7 (1.3) = 2.4375 → **capped to 2.0**

---

## Softcap System

### Purpose
Prevent "grinding" by reducing rewards for users who earn excessively in a single day.

### Formula
```
ratio = earned_today / daily_threshold
factor = 1.0 - 0.8 × ratio²
factor = clamp(factor, floor_pct, 1.0)
adjusted_reward = base_reward × multiplier × factor
```

### Default Configuration
- **Daily coin threshold:** 100 coins
- **Daily XP threshold:** 500 XP
- **Diminishing factor:** 0.8 (aggressive curve)
- **Floor percentage:** 10% (never less than 10% of base)
- **Max multiplier cap:** 2.0x

### Example Reduction Curve

| Daily Earnings | Ratio | Factor | 100 coins becomes |
|----------------|-------|--------|-------------------|
| 0 | 0% | 1.00 | 100 |
| 50 | 50% | 0.80 | 80 |
| 80 | 80% | 0.49 | 49 |
| 100 | 100% | 0.20 | 20 |
| 200+ | 200%+ | 0.10 | 10 (floor) |

---

## Leaderboard Privacy

### User Controls
- Users can opt-out of leaderboards at any time
- Opt-out is per-tenant (can be visible in one org, hidden in another)
- User's coins/XP/achievements are NOT affected by opt-out
- User can still see their own rank even when hidden from others

### Admin Controls
- Admins can manually exclude users (for abuse prevention)
- Exclusions are logged in gamification_events
- Risk scoring helps identify suspicious patterns

---

## Test Coverage

### Test Files
- `tests/gamification/reward-engine.test.ts` - 37 tests
- `tests/gamification/leaderboard-abuse.test.ts` - 29 tests
- `tests/gamification/burn-system.test.ts` - 34 tests

**Total: 100 tests (88 passed, 12 skipped for DB integration)**

### Test Categories

1. **Softcap Formula** - Diminishing returns math
2. **Multiplier Stacking** - Multiplicative + cap logic
3. **Weekend Detection** - UTC day-of-week
4. **Cooldown Eligibility** - Daily/weekly/once/streak rules
5. **Burn Validation** - Balance, stock, limits
6. **Idempotency** - Duplicate prevention
7. **Refund Logic** - Double-refund prevention
8. **Abuse Prevention** - Velocity, patterns, cross-tenant
9. **Edge Cases** - Zero values, null tenant, large numbers

---

## Design Documents

Located in `docs/gamification/`:

| Document | Purpose |
|----------|---------|
| `SOFTCAP_DESIGN.md` | Softcap algorithm specification |
| `LEADERBOARD_DESIGN.md` | Leaderboard feature design |
| `BURN_FOUNDATION_DESIGN.md` | Shop/sink system architecture |
| `ADMIN_DASHBOARD_DESIGN.md` | Admin UI wireframes |
| `GAMIFICATION_TEST_PLAN.md` | Test strategy |
| `GAMIFICATION_TRIGGER_REPORT.md` | Event → reward mappings |
| `GAMIFICATION_V2_MIGRATION_SUMMARY.md` | Migration changelog |

---

## Security Considerations

### Row Level Security (RLS)
- All gamification tables have RLS enabled
- Users can only see their own data
- Service role required for cross-user operations

### Idempotency
- All reward and burn operations use idempotency keys
- Duplicate requests return the original result
- Implemented via advisory locks in PostgreSQL

### Rate Limiting
- Cooldown system prevents event spam
- Abuse detection flags suspicious patterns
- Admin can manually exclude users

### Input Validation
- Amount validation (positive integers only)
- Tenant isolation enforced at query level
- JSON metadata size limits

---

## Future Roadmap

### Phase 1 (Current) ✅
- [x] Coin economy
- [x] XP & leveling
- [x] Streaks
- [x] Event automation
- [x] Cooldowns
- [x] Softcap
- [x] Leaderboards
- [x] Burn foundation

### Phase 2 (Planned)
- [ ] Shop UI (frontend)
- [ ] Powerup items (XP boost, coin multiplier)
- [ ] Avatar cosmetics
- [ ] Team leaderboards

### Phase 3 (Future)
- [ ] Seasonal campaigns
- [ ] Achievement builder (admin UI)
- [ ] Reward path visualization
- [ ] Gamification analytics dashboard

---

## File Inventory

### Server Services
```
lib/services/
├── gamification-reward-engine.server.ts    # Core reward logic
├── gamification-leaderboard.server.ts      # Rankings & privacy
├── gamification-burn.server.ts             # Spending system
├── gamification-admin-dashboard.server.ts  # Admin analytics
└── gamification-events-v2.server.ts        # Event emission
```

### API Routes
```
app/api/gamification/
├── leaderboard/
│   ├── route.ts              # GET rankings
│   └── preferences/route.ts  # GET/POST visibility
├── burn/route.ts             # POST spend coins
└── sinks/route.ts            # GET available items

app/api/admin/gamification/
├── dashboard/route.ts        # GET economy stats
├── leaderboard/route.ts      # GET admin rankings
├── rules/route.ts            # CRUD automation rules
├── sinks/route.ts            # CRUD burn sinks
└── refund/route.ts           # POST refunds
```

### Database Migrations
```
supabase/migrations/
└── 20260108200000_gamification_v2_core_extensions.sql
```

### Tests
```
tests/gamification/
├── reward-engine.test.ts
├── leaderboard-abuse.test.ts
└── burn-system.test.ts
```

### Documentation
```
docs/gamification/
├── ADMIN_DASHBOARD_DESIGN.md
├── BURN_FOUNDATION_DESIGN.md
├── GAMIFICATION_COMPLETE_REPORT.md  # This file
├── GAMIFICATION_TEST_PLAN.md
├── GAMIFICATION_TRIGGER_REPORT.md
├── GAMIFICATION_V2_MIGRATION_SUMMARY.md
├── LEADERBOARD_DESIGN.md
└── SOFTCAP_DESIGN.md
```

---

## Commits Summary

| Commit | Description |
|--------|-------------|
| `4c558af` | feat(gamification): Add Gamification v2 core extensions |
| `3db9918` | fix(tests): Correct softcap formula test expectation |
| `1d03e1c` | fix(gamification): Fix TypeScript null type errors |

---

## Conclusion

The Lekbanken Gamification System v2 provides a robust, scalable foundation for user engagement. Key architectural decisions:

1. **Idempotent by design** - All operations are safe to retry
2. **Tenant isolation** - Multi-tenancy supported throughout
3. **Admin configurability** - Rules, softcap, sinks all configurable
4. **Anti-abuse built-in** - Cooldowns, softcaps, risk scoring
5. **Privacy-first** - Leaderboard opt-out, RLS everywhere
6. **Extensible** - Burn sink system ready for shop items

The system is production-ready for the core features and well-positioned for future enhancements.
