# Gamification Economy Governance

**Project:** Lekbanken  
**Created:** January 8, 2026  
**Status:** 🔒 Economy-Critical System  
**Version:** v2 (Frozen)

---

## System Classification

### ⚠️ ECONOMY-CRITICAL CODE

This subsystem is classified as **economy-critical**. This designation means:

| Rule | Description |
|------|-------------|
| **No quick fixes** | All changes require proper design review |
| **Test-first** | Every change must have tests before merge |
| **Idempotency-first** | All operations must be safe to retry |
| **Review required** | No solo merges to economy code |
| **Audit trail** | All transactions logged with idempotency keys |

### Code Paths Covered

```
lib/services/gamification-*.server.ts
app/api/gamification/**
app/api/admin/gamification/**
supabase/migrations/*gamification*.sql
```

---

## Softcap Default Values

### Current Configuration (v2 Initial)

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `daily_coin_threshold` | 100 | ~10 sessions/day before diminishing returns |
| `daily_xp_threshold` | 500 | Aligned with coin ratio (5:1 XP:coin typical) |
| `coin_diminishing_factor` | 0.8 | Aggressive curve to discourage grinding |
| `coin_floor_pct` | 0.10 | Always earn at least 10% - never feel "punished" |
| `max_multiplier_cap` | 2.0 | Prevents runaway inflation from stacking |

### ⏳ Review Schedule

These values are **initial defaults** and are expected to be adjusted after:

- **30 days:** First review based on actual usage data
- **60 days:** Formal rebalancing if needed
- **Quarterly:** Ongoing health checks

### Data to Monitor

Before adjusting, collect and analyze:

1. **Average coins minted per active user per day**
2. **Median vs P95 earners** (identify outliers)
3. **Softcap hit rate** (% of users hitting threshold)
4. **Burn rate** (coins spent / coins earned)

### Decision Log

| Date | Parameter | Old | New | Reason |
|------|-----------|-----|-----|--------|
| 2026-01-08 | All | N/A | Initial | v2 launch defaults |

---

## Level Multiplier Design Note

### Current Formula

```
multiplier = 1.0 + (level - 4) × 0.1
```

| Level | Multiplier |
|-------|------------|
| 1-4 | 1.0x |
| 5 | 1.1x |
| 6 | 1.2x |
| 7 | 1.3x |
| 10 | 1.6x |
| 14+ | 2.0x (capped) |

### Known Behavior

At high levels, the level bonus is frequently **absorbed by the 2.0x multiplier cap** when combined with other bonuses (streak, weekend, campaigns).

This is **intentional**:

- Levels 1-7: Level bonus has real economic impact
- Levels 8+: Level bonus becomes **psychological/prestige** rather than economic
- This prevents high-level users from inflating the economy

### Future Consideration

If level bonus feels "useless" at high levels, consider:

- Level-exclusive sinks (items only high-level users can buy)
- Level-gated achievements
- Cosmetic rewards per level bracket

**Do NOT** increase the multiplier cap to "fix" this.

---

## Achievement & Economy Coupling

### Current State

Achievements currently grant:
- ✅ Coins (one-time)
- ✅ XP (one-time)
- ✅ Badge display

### Future Possibilities (Not Yet Implemented)

| Feature | Description | Status |
|---------|-------------|--------|
| Sink unlocks | Achievement unlocks purchase option | Planned |
| Economically neutral achievements | Badge only, no coins | Ready |
| Achievement-gated multipliers | Unlock permanent bonus | Deferred |
| Achievement decay | Time-limited badges | Not planned |

### Design Principle

Achievements should primarily be:
1. **Recognition** (psychological reward)
2. **Progression markers** (sense of journey)
3. **Secondary: economic** (coins are bonus, not primary)

---

## Economy Guardrails

### Key Performance Indicators (KPIs)

Monitor these daily:

| KPI | Formula | Alert Threshold |
|-----|---------|-----------------|
| **Daily Mint Rate** | SUM(coins_earned) for day | Trend: +50% week-over-week |
| **Daily Burn Rate** | SUM(amount_spent) for day | N/A (burn is good) |
| **Mint/Burn Ratio** | mint / burn | > 10:1 for 7+ days |
| **Active Earner Count** | DISTINCT users with coins today | Baseline TBD |
| **Softcap Hit Rate** | Users hitting threshold / active | > 30% = threshold too low |

### Alert Conditions

```
IF mint_burn_ratio > 10 FOR 7 consecutive days:
  → Flag for review
  → Consider: tightening softcap, adding sinks, campaign pause

IF daily_mint > 150% of 7-day average:
  → Investigate for abuse or bug
  → Check for event duplication

IF softcap_hit_rate > 50%:
  → Threshold may be too low
  → Or: users are highly engaged (good problem)
```

### Query for KPIs

```sql
-- Daily economy summary (add to admin dashboard)
SELECT
  date_trunc('day', created_at) AS day,
  SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END) AS minted,
  SUM(CASE WHEN type = 'spend' THEN amount ELSE 0 END) AS burned,
  COUNT(DISTINCT user_id) AS active_users,
  ROUND(
    SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END)::numeric /
    NULLIF(SUM(CASE WHEN type = 'spend' THEN amount ELSE 0 END), 0),
    2
  ) AS mint_burn_ratio
FROM coin_transactions
WHERE created_at > now() - interval '30 days'
GROUP BY 1
ORDER BY 1 DESC;
```

---

## Economy Mode (Future Implementation)

### Concept

A global or per-tenant setting to quickly adjust economy parameters without deploy:

```typescript
type EconomyMode = 'normal' | 'tight' | 'generous'
```

### Mode Effects

| Mode | Softcap Threshold | Floor % | Campaign Cap |
|------|-------------------|---------|--------------|
| `tight` | 50% of normal | 5% | 1.25x max |
| `normal` | 100% | 10% | 2.0x max |
| `generous` | 200% of normal | 20% | 2.5x max |

### Use Cases

- **Tight:** Economy overheating, too much mint
- **Normal:** Steady state
- **Generous:** Launch period, special event, recovery from tight

### Implementation Status

⏳ **Not yet implemented** - Add to `gamification_softcap_config` when needed:

```sql
ALTER TABLE gamification_softcap_config
  ADD COLUMN economy_mode TEXT DEFAULT 'normal'
  CHECK (economy_mode IN ('normal', 'tight', 'generous'));
```

---

## Event Contract Freeze

### v2 Event Contracts: FROZEN 🔒

As of 2026-01-08, the following event contracts are **frozen**:

| Event Type | Source | Contract Version |
|------------|--------|------------------|
| `session_started` | play | v2 |
| `session_completed` | play | v2 |
| `run_completed` | play | v2 |
| `first_session` | play | v2 |
| `perfect_session` | play | v2 |
| `large_group_hosted` | play | v2 |
| `plan_created` | planner | v2 |
| `plan_published` | planner | v2 |
| `first_plan` | planner | v2 |
| `daily_login` | engagement | v2 |
| `streak_*_days` | engagement | v2 |
| `game_created` | content | v2 |
| `game_published` | content | v2 |
| `invite_accepted` | social | v2 |
| `tutorial_completed` | learning | v2 |

### Freeze Rules

1. **NEVER change semantics** of existing event types
2. **NEVER rename** existing event types
3. **ADD new event types** with new names (e.g., `session_completed_v3`)
4. **Deprecate** by disabling rule, not deleting event type

### Why This Matters

- **Testability:** Tests can rely on event semantics
- **Replay:** Historical events can be replayed for analysis
- **AI Analysis:** Consistent data for ML/analytics
- **Audit:** Clear trail of what happened when

---

## Operational Procedures

### Before Any Economy Change

1. ☐ Document the change reason
2. ☐ Estimate impact on mint/burn ratio
3. ☐ Write tests for new behavior
4. ☐ Review with another team member
5. ☐ Deploy to staging and verify
6. ☐ Monitor for 24h post-deploy

### Emergency Procedures

#### Economy Runaway (Too Much Mint)

1. Set `economy_mode = 'tight'` (when implemented)
2. OR: Reduce `daily_coin_threshold` to 50
3. OR: Disable specific automation rules
4. Investigate root cause
5. Post-incident review

#### Burn System Failure

1. Disable affected sink (`is_available = false`)
2. Process refunds for failed transactions
3. Fix and re-enable
4. Communicate with affected users

#### Duplicate Reward Bug

1. Identify affected transactions (missing idempotency)
2. Calculate over-payment
3. Decision: Claw back or absorb loss
4. Fix idempotency gap
5. Post-incident review

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.0 | 2026-01-08 | Initial v2 launch with softcap, cooldowns, burn foundation |
| v2.1 | TBD | Economy mode, enhanced guardrails |

---

## Appendix: Decision Authority

| Decision Type | Authority |
|---------------|-----------|
| Softcap threshold changes | Product + Engineering |
| New event types | Engineering (with product review) |
| Sink pricing | Product |
| Emergency economy actions | Engineering lead |
| Rule activation/deactivation | Admin (via UI) |

---

*This document is the source of truth for gamification economy governance.*
