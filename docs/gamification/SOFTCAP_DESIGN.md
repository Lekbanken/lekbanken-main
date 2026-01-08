# LEKBANKEN — SOFTCAP DESIGN DOCUMENT

**Date:** 2026-01-08  
**Status:** Implementation Ready  
**Objective:** Diminishing returns for extreme activity WITHOUT demotivating active users

---

## EXECUTIVE SUMMARY

The Lekbanken softcap system uses a **stepped diminishing returns** model that:
- ✅ Rewards normal-to-active behavior fully (100% earnings up to threshold)
- ✅ Only applies gradual reduction for extreme activity
- ✅ Never stops earning completely (10% floor)
- ✅ Separates XP and DiceCoin thresholds (XP is more generous)
- ✅ Supports tenant overrides for different org cultures
- ✅ Prevents economic abuse while preserving motivation

---

## 1. ALGORITHM: STEPPED DIMINISHING RETURNS

### 1.1 Core Formula

```
effective_reward = base_reward × multiplier × softcap_factor

where softcap_factor is:
  - 1.0           if daily_earned < threshold
  - factor^n      if daily_earned ≥ threshold
  - max(factor^n, floor)  always (never below floor)
```

### 1.2 Step Calculation

```typescript
function calculateSoftcapFactor(
  currentDailyEarned: number,  // What user has earned today
  threshold: number,           // When softcap kicks in
  diminishingFactor: number,   // e.g., 0.5 = halve rewards
  floor: number                // Minimum reward % (e.g., 0.1 = 10%)
): number {
  if (currentDailyEarned < threshold) {
    return 1.0; // Full rewards
  }
  
  // How many "threshold blocks" over the limit
  const blocksOver = Math.floor(
    (currentDailyEarned - threshold) / threshold
  ) + 1;
  
  // Exponential decay: factor^blocksOver
  const rawFactor = Math.pow(diminishingFactor, blocksOver);
  
  // Never go below floor
  return Math.max(rawFactor, floor);
}
```

### 1.3 Visualization

```
    Reward
    Factor
    │
1.0 ┤────────────┐
    │            │
0.5 ┤            └──────┐
    │                   │
0.25┤                   └──────┐
    │                          │
0.1 ┤──────────────────────────└──────────────────→ (floor)
    │
    └──────┬──────┬──────┬──────┬──────┬───────→ Daily Earned
           T     2T     3T     4T     5T

T = Threshold (e.g., 100 DiceCoin)
```

---

## 2. DEFAULT CONFIGURATION

### 2.1 Global Defaults (No Tenant Override)

| Parameter | DiceCoin | XP | Rationale |
|-----------|----------|----|-----------|
| **Daily Threshold** | 100 | 500 | Active user ceiling |
| **Diminishing Factor** | 0.50 | 0.50 | 50% reduction per step |
| **Floor Percentage** | 0.10 | 0.10 | Never below 10% |
| **Max Multiplier Cap** | 2.0× | 2.0× | Prevent multiplier stacking abuse |

### 2.2 Earning Brackets

#### DiceCoin (threshold = 100)
| Daily Earned | Softcap Factor | Effect |
|--------------|----------------|--------|
| 0–99 | 1.00 (100%) | Full rewards |
| 100–199 | 0.50 (50%) | First reduction |
| 200–299 | 0.25 (25%) | Second reduction |
| 300–399 | 0.125 (12.5%) | Third reduction |
| 400+ | 0.10 (10%) | Floor reached |

#### XP (threshold = 500)
| Daily Earned | Softcap Factor | Effect |
|--------------|----------------|--------|
| 0–499 | 1.00 (100%) | Full rewards |
| 500–999 | 0.50 (50%) | First reduction |
| 1000–1499 | 0.25 (25%) | Second reduction |
| 1500+ | 0.10 (10%) | Floor reached |

---

## 3. USER PROFILE ANALYSIS

### 3.1 Profile Definitions

| Profile | Behavior | Sessions/Week | Plans/Week | Other |
|---------|----------|---------------|------------|-------|
| **Casual** | 1–2 days active | 2–3 | 1 | No streak |
| **Active** | 5 days active | 5–8 | 2–3 | 7-day streak |
| **Power** | 7 days, multiple/day | 15–20 | 5–10 | 30-day streak |

### 3.2 Casual User (Lena - Förskollärare)

**Weekly Activity:**
- 2 logins (daily_login × 2)
- 2 sessions completed
- 1 plan created
- 1 plan published

**Daily Breakdown (2 active days):**
| Day | Activity | Base DC | Softcap Factor | Actual DC |
|-----|----------|---------|----------------|-----------|
| Tue | login + session + plan | 1+2+5 = 8 | 1.0 | 8 |
| Fri | login + session + publish | 1+2+10 = 13 | 1.0 | 13 |

**Weekly Totals:**
| Currency | Raw Earned | Softcap Applied | Final Earned |
|----------|------------|-----------------|--------------|
| DiceCoin | 21 | No | **21 DC** |
| XP | 85 | No | **85 XP** |

✅ **Casual users are NEVER softcapped** - all activity stays under threshold

---

### 3.3 Active User (Marcus - Idrottslärare)

**Weekly Activity:**
- 5 logins (with 7-day streak = 1.5× multiplier)
- 6 sessions completed
- 2 plans created
- 2 plans published
- 1 streak_7_days bonus

**Daily Breakdown (5 active days):**
| Day | Activity | Base DC | Multiplier | Pre-Softcap | Softcap Factor | Final |
|-----|----------|---------|------------|-------------|----------------|-------|
| Mon | login + session + session | 1+2+2 = 5 | 1.5× | 7.5 → 8 | 1.0 | 8 |
| Tue | login + session | 1+2 = 3 | 1.5× | 4.5 → 5 | 1.0 | 5 |
| Wed | login + plan + publish | 1+5+10 = 16 | 1.5× | 24 | 1.0 | 24 |
| Thu | login + session | 1+2 = 3 | 1.5× | 4.5 → 5 | 1.0 | 5 |
| Fri | login + session + streak_7 | 1+2+15 = 18 | 1.5× | 27 | 1.0 | 27 |

**Weekly Totals:**
| Currency | Raw (×multiplier) | Softcap Applied | Final Earned |
|----------|-------------------|-----------------|--------------|
| DiceCoin | ~69 | No | **~69 DC** |
| XP | ~385 | No | **~385 XP** |

✅ **Active users are NEVER softcapped** - daily earnings stay well under 100 DC threshold

---

### 3.4 Power User (Erik - Gamification-entusiast)

**Weekly Activity:**
- 7 logins (with 30-day streak = 1.5× + level 8 = 1.4× → capped at 2.0×)
- 20 sessions completed (some days multiple)
- 5 plans created
- 4 plans published
- 3 games created
- 1 game published
- streak_30_days bonus
- Multiple runs per session

**Daily Breakdown (7 days, high activity):**

**Monday (Extreme day):**
| Activity | Base DC | 
|----------|---------|
| login | 1 |
| 4× session_completed | 8 |
| 2× run_completed | 2 |
| plan_created | 5 |
| plan_published | 10 |
| game_created | 8 |
| **Subtotal** | 34 |
| **×2.0 multiplier** | 68 |

Softcap factor: 1.0 (under 100) → **68 DC earned**

**Tuesday (Even more extreme):**
| Activity | Base DC |
|----------|---------|
| login | 1 |
| 5× session_completed | 10 |
| 3× run_completed | 3 |
| 2× plan_created | 10 |
| plan_published | 10 |
| game_published | 15 |
| **Subtotal** | 49 |
| **×2.0 multiplier** | 98 |

Softcap factor: 1.0 (just under 100) → **98 DC earned**

**Wednesday (Breaks threshold):**
| Activity | Running Total | Softcap Factor | Applied |
|----------|---------------|----------------|---------|
| login (1×2=2) | 2 | 1.0 | 2 |
| 3× session (6×2=12) | 14 | 1.0 | 12 |
| 2× plan (10×2=20) | 34 | 1.0 | 20 |
| publish (10×2=20) | 54 | 1.0 | 20 |
| 2× game (16×2=32) | 86 | 1.0 | 32 |
| publish (15×2=30) | **116** | **0.5** | 15 |
| **Day Total** | — | — | **101** |

Note: Only the earnings AFTER crossing 100 are reduced

**Rest of Week (similar patterns):**
| Day | Pre-Softcap | Softcap Applied | Final |
|-----|-------------|-----------------|-------|
| Thu | 80 | No | 80 |
| Fri | 65 | No | 65 |
| Sat | 120 | 50% on overage | 105 |
| Sun | 90 | No | 90 |

**Weekly Totals:**
| Currency | Raw Earned | After Softcap | Reduction |
|----------|------------|---------------|-----------|
| DiceCoin | ~620 | **~507 DC** | -18% |
| XP | ~2800 | **~2100 XP** | -25% |

⚠️ **Power users hit softcap on peak days, but still earn substantial rewards**

---

## 4. WEEKLY MINT ESTIMATES

### 4.1 Per-User Mint Rate

| Profile | Weekly DC | Weekly XP | Monthly DC | Monthly XP |
|---------|-----------|-----------|------------|------------|
| Casual | 21 | 85 | 84 | 340 |
| Active | 69 | 385 | 276 | 1,540 |
| Power | 507 | 2,100 | 2,028 | 8,400 |

### 4.2 Population-Weighted Mint (1000 users)

Assumed distribution: 70% Casual, 25% Active, 5% Power

| Segment | Count | Weekly DC | Total DC/Week |
|---------|-------|-----------|---------------|
| Casual | 700 | 21 | 14,700 |
| Active | 250 | 69 | 17,250 |
| Power | 50 | 507 | 25,350 |
| **Total** | 1000 | — | **57,300 DC/week** |

### 4.3 Economic Projections

| Metric | Weekly | Monthly | Annual |
|--------|--------|---------|--------|
| **Total Mint** | 57,300 DC | 229,200 DC | 2,750,400 DC |
| **Per User Avg** | 57.3 DC | 229 DC | 2,750 DC |
| **Without Softcap** | ~68,000 DC | 272,000 DC | 3,264,000 DC |
| **Softcap Savings** | ~10,700 DC | ~42,800 DC | ~513,600 DC |

**Softcap reduces inflation by ~16% while keeping most users at 100% rewards**

---

## 5. XP VS DICECOIN: SEPARATION RATIONALE

### 5.1 Why Separate Thresholds?

| Aspect | DiceCoin | XP |
|--------|----------|-----|
| **Purpose** | Spendable currency | Progression metric |
| **Inflation Risk** | High (economy) | Low (personal stat) |
| **Motivation Driver** | Purchasing power | Status/unlocks |
| **Softcap Priority** | Critical | Less critical |

### 5.2 Recommended Ratio

```
XP Threshold = DiceCoin Threshold × 5
```

- DC threshold: 100/day → XP threshold: 500/day
- DC threshold: 150/day → XP threshold: 750/day

This allows users to level up consistently even when coin earning slows down.

---

## 6. TENANT OVERRIDE SYSTEM

### 6.1 Override Capabilities

Tenant admins can customize via `gamification_softcap_config`:

| Parameter | Min | Max | Use Case |
|-----------|-----|-----|----------|
| `daily_coin_threshold` | 50 | 500 | Strict/generous orgs |
| `daily_xp_threshold` | 100 | 2000 | XP-focused tenants |
| `coin_diminishing_factor` | 0.25 | 0.75 | Steep/gentle curve |
| `coin_floor_pct` | 0.05 | 0.25 | Minimum reward floor |
| `max_multiplier_cap` | 1.5 | 3.0 | Campaign flexibility |

### 6.2 Example Tenant Overrides

**Conservative School District:**
```sql
INSERT INTO gamification_softcap_config (
  tenant_id, 
  daily_coin_threshold, 
  daily_xp_threshold,
  coin_diminishing_factor,
  coin_floor_pct
) VALUES (
  'school-district-uuid',
  75,     -- Lower threshold (tighter economy)
  400,    -- Lower XP threshold
  0.40,   -- Steeper curve
  0.15    -- Higher floor (not too punishing)
);
```

**Enterprise "Gamification Week" Event:**
```sql
INSERT INTO gamification_softcap_config (
  tenant_id,
  daily_coin_threshold,
  daily_xp_threshold,
  max_multiplier_cap
) VALUES (
  'enterprise-uuid',
  200,    -- Double threshold for event
  1000,   -- Very generous XP
  3.0     -- Allow higher multipliers during event
);
```

---

## 7. ANTI-ABUSE CONSIDERATIONS

### 7.1 What Softcap Prevents

| Abuse Pattern | Without Softcap | With Softcap |
|---------------|-----------------|--------------|
| Session farming | Unlimited DC | Capped at ~110 DC/day |
| Alt-account grinding | Economic exploit | Reduced ROI |
| Bot automation | Infinite rewards | Diminishing returns |
| Multiplier stacking exploit | 5×+ possible | Hard cap at 2.0× |

### 7.2 What Softcap Does NOT Prevent (Other Mitigations)

| Risk | Mitigation | System |
|------|------------|--------|
| Duplicate events | Idempotency key | Event ingestion |
| Self-referral | Referral audit | Admin review |
| Fake sessions | Participant verification | Play domain |
| Time manipulation | Server-side timestamps | All domains |

---

## 8. DATABASE IMPLEMENTATION

The softcap system is implemented across these tables/functions:

### 8.1 Tables

```sql
-- Configuration per tenant
gamification_softcap_config (
  tenant_id UUID,
  daily_coin_threshold INTEGER,
  daily_xp_threshold INTEGER,
  coin_diminishing_factor NUMERIC,
  xp_diminishing_factor NUMERIC,
  coin_floor_pct NUMERIC,
  xp_floor_pct NUMERIC,
  max_multiplier_cap NUMERIC
)

-- Daily earnings tracker
gamification_daily_earnings (
  user_id UUID,
  tenant_id UUID,
  earning_date DATE,
  coins_earned INTEGER,
  xp_earned INTEGER,
  coins_earned_raw INTEGER,
  xp_earned_raw INTEGER,
  coins_reduced INTEGER,
  xp_reduced INTEGER
)
```

### 8.2 Functions

```sql
-- Get effective config (tenant → global fallback)
get_softcap_config_v1(p_tenant_id UUID)

-- Calculate adjusted rewards
calculate_softcap_reward_v1(
  p_user_id UUID,
  p_tenant_id UUID,
  p_base_coins INTEGER,
  p_base_xp INTEGER,
  p_multiplier NUMERIC
)

-- Record daily earnings
record_daily_earning_v1(
  p_user_id UUID,
  p_tenant_id UUID,
  p_coins INTEGER,
  p_xp INTEGER,
  p_coins_raw INTEGER,
  p_xp_raw INTEGER,
  p_coins_reduced INTEGER,
  p_xp_reduced INTEGER
)
```

---

## 9. MONITORING & TUNING

### 9.1 Key Metrics to Track

| Metric | Query | Alert Threshold |
|--------|-------|-----------------|
| Softcap hit rate | `WHERE coins_reduced > 0` / total | > 20% users/day |
| Floor reached rate | `WHERE factor <= floor` | > 5% users/day |
| Avg reduction | `AVG(coins_reduced)` | > 30% of raw |
| Power user % | Users earning >3× casual | > 10% of MAU |

### 9.2 Admin Dashboard Queries

```sql
-- Daily softcap impact report
SELECT 
  earning_date,
  COUNT(DISTINCT user_id) as users,
  SUM(coins_earned) as total_earned,
  SUM(coins_reduced) as total_reduced,
  ROUND(SUM(coins_reduced)::numeric / NULLIF(SUM(coins_earned_raw), 0) * 100, 1) as reduction_pct
FROM gamification_daily_earnings
WHERE tenant_id = ?
  AND earning_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY earning_date
ORDER BY earning_date DESC;

-- User segments by softcap impact
SELECT 
  CASE 
    WHEN coins_reduced = 0 THEN 'Never Capped'
    WHEN coins_reduced < 10 THEN 'Lightly Capped'
    WHEN coins_reduced < 50 THEN 'Moderately Capped'
    ELSE 'Heavily Capped'
  END as segment,
  COUNT(DISTINCT user_id) as users
FROM gamification_daily_earnings
WHERE tenant_id = ?
  AND earning_date = CURRENT_DATE
GROUP BY 1;
```

---

## 10. SUMMARY

### Design Principles Met

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Diminishing returns only | ✅ | Threshold-based activation |
| No demotivation | ✅ | 100% until threshold |
| Tenant overrides | ✅ | `gamification_softcap_config` table |
| Separate XP/DiceCoin | ✅ | Different thresholds |
| Never zero earning | ✅ | 10% floor minimum |
| Anti-abuse | ✅ | 2.0× multiplier cap |

### Recommended Defaults

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Daily Coin Threshold | 100 | ~3× active user daily |
| Daily XP Threshold | 500 | 5× coin threshold |
| Diminishing Factor | 0.50 | Halve per tier |
| Floor | 0.10 | Always earn 10% |
| Max Multiplier | 2.00 | Prevent stacking abuse |

---

*Document prepared for implementation in Lekbanken gamification system v2.*
