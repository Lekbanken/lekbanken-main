# LEKBANKEN — GAMIFICATION TEST PLAN

**Datum:** 2026-01-08  
**Syfte:** Test cases, sprint breakdown, and acceptance criteria for gamification system  
**Status:** Active Development

---

## EXECUTIVE SUMMARY

This document provides:
1. **Unit Tests** — Pure function testing for reward engine, softcap, multipliers
2. **Integration Tests** — API endpoint testing with database
3. **Abuse Prevention Tests** — Security, fraud detection, edge cases
4. **Sprint Breakdown** — Sprint 1 (MVP) vs Sprint 2 (Extended)
5. **Acceptance Criteria** — Per-feature DoD checklists

---

## PART 1: UNIT TESTS

### 1.1 Reward Engine Core (`gamification-reward-engine.server.ts`)

```typescript
// tests/gamification/reward-engine.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Reward Engine - Rule Resolution', () => {
  it('should prefer tenant-specific rule over global rule', async () => {
    // Given: tenant rule with 20 coins, global rule with 10 coins
    // When: resolveRule(tenantId, 'session_completed', 'play')
    // Then: returns tenant rule with 20 coins
  });

  it('should fall back to global rule when no tenant rule exists', async () => {
    // Given: no tenant rule, global rule with 10 coins
    // When: resolveRule(tenantId, 'session_completed', 'play')
    // Then: returns global rule with 10 coins
  });

  it('should fall back to hardcoded rules when DB has no matches', async () => {
    // Given: no DB rules for event_type
    // When: resolveRule(null, 'session_started', 'play')
    // Then: returns hardcoded GLOBAL_REWARD_RULES match
  });

  it('should return null for unknown event types', async () => {
    // Given: event_type 'unknown_event' with no rules
    // When: resolveRule(null, 'unknown_event', 'system')
    // Then: returns null
  });

  it('should ignore inactive rules', async () => {
    // Given: tenant rule with is_active=false
    // When: resolveRule(tenantId, eventType, source)
    // Then: skips inactive rule, returns next match
  });
});

describe('Reward Engine - Cooldown Checks', () => {
  it('should allow unlimited triggers for cooldown=none', async () => {
    // Given: user triggered event 100 times today
    // When: checkCooldown(userId, tenantId, eventType, 'none')
    // Then: eligible=true
  });

  it('should block second trigger for cooldown=daily within same UTC day', async () => {
    // Given: user triggered event at 08:00 UTC today
    // When: checkCooldown at 15:00 UTC same day, cooldownType='daily'
    // Then: eligible=false
  });

  it('should allow trigger after UTC midnight for cooldown=daily', async () => {
    // Given: user triggered event yesterday 23:59 UTC
    // When: checkCooldown at 00:01 UTC today, cooldownType='daily'
    // Then: eligible=true
  });

  it('should block second trigger for cooldown=weekly within same ISO week', async () => {
    // Given: user triggered on Monday
    // When: checkCooldown on Wednesday same week, cooldownType='weekly'
    // Then: eligible=false
  });

  it('should allow trigger on new ISO week for cooldown=weekly', async () => {
    // Given: user triggered last Sunday
    // When: checkCooldown this Monday, cooldownType='weekly'
    // Then: eligible=true
  });

  it('should block all future triggers for cooldown=once', async () => {
    // Given: user triggered 'first_session' once
    // When: checkCooldown for 'first_session', cooldownType='once'
    // Then: eligible=false forever
  });

  it('should reset once_per_streak when streak breaks', async () => {
    // Given: user earned streak_7_days during streak period A
    // Given: streak broke and restarted (period B)
    // When: checkCooldown for 'streak_7_days', cooldownType='once_per_streak'
    // Then: eligible=true (new streak period)
  });
});

describe('Reward Engine - Multiplier Stacking', () => {
  it('should stack multipliers multiplicatively', async () => {
    // Given: streak bonus 1.5x, weekend bonus 1.25x
    // Expected: 1.5 * 1.25 = 1.875x
    // When: calculateMultiplierStack(...)
    // Then: effectiveMultiplier = 1.875
  });

  it('should cap total multiplier at MAX_MULTIPLIER_CAP (2.0x)', async () => {
    // Given: streak 1.5x, weekend 1.25x, campaign 1.5x = 2.8125x raw
    // When: calculateMultiplierStack(...)
    // Then: effectiveMultiplier = 2.0, capped = true
  });

  it('should include level bonus for level 5+ users', async () => {
    // Given: user at level 6, streak 1.5x
    // Expected: 1.5 * 1.1 = 1.65x
    // When: calculateMultiplierStack(...)
    // Then: sources includes 'level' with 1.1x
  });

  it('should apply weekend bonus only on Saturday/Sunday UTC', async () => {
    // Given: eventAt = Saturday 14:00 UTC
    // When: calculateMultiplierStack(...)
    // Then: sources includes 'weekend' with 1.25x
  });

  it('should not apply weekend bonus on Friday', async () => {
    // Given: eventAt = Friday 23:59 UTC
    // When: calculateMultiplierStack(...)
    // Then: sources does NOT include 'weekend'
  });
});
```

### 1.2 Softcap System (`gamification-reward-engine.server.ts`)

```typescript
describe('Softcap - Diminishing Returns', () => {
  it('should apply 1.0x factor when under 50% of daily cap', async () => {
    // Given: daily cap 500, earned today 200
    // When: applySoftcap(100 coins, 200 earned, 500 cap)
    // Then: adjusted = 100 (no reduction)
  });

  it('should apply ~0.8x factor at 70% of daily cap', async () => {
    // Given: daily cap 500, earned today 350
    // When: applySoftcap(100 coins, 350 earned, 500 cap)
    // Then: adjusted ≈ 80 coins
  });

  it('should apply ~0.5x factor at 90% of daily cap', async () => {
    // Given: daily cap 500, earned today 450
    // When: applySoftcap(100 coins, 450 earned, 500 cap)
    // Then: adjusted ≈ 50 coins
  });

  it('should apply minimum ~0.2x factor above 100% of daily cap', async () => {
    // Given: daily cap 500, earned today 600
    // When: applySoftcap(100 coins, 600 earned, 500 cap)
    // Then: adjusted ≈ 20 coins (never zero)
  });

  it('should NEVER block earning completely (no hard stop)', async () => {
    // Given: daily cap 500, earned today 5000 (10x over)
    // When: applySoftcap(100 coins, 5000 earned, 500 cap)
    // Then: adjusted > 0 (at least minimum floor)
  });

  it('should use tenant-specific cap when configured', async () => {
    // Given: global cap 500, tenant cap 1000
    // Given: earned today 600
    // When: applySoftcap with tenant context
    // Then: uses 1000 cap, applies 1.0x (under 50%)
  });

  it('should accumulate daily earnings correctly across events', async () => {
    // Given: 3 events today: +100, +100, +100
    // When: getDailyEarned(userId, tenantId, today)
    // Then: returns 300
  });

  it('should reset daily earnings at UTC midnight', async () => {
    // Given: earned 400 yesterday
    // When: getDailyEarned(userId, tenantId, today)
    // Then: returns 0 (new day)
  });
});

describe('Softcap - XP Parallel System', () => {
  it('should apply separate softcap to XP earnings', async () => {
    // Given: XP daily cap 2000, earned today 1500
    // When: applySoftcapXp(500 xp, 1500 earned, 2000 cap)
    // Then: adjusted < 500 (diminishing returns applies)
  });

  it('should allow XP and Coins to have independent caps', async () => {
    // Given: coin cap 500 (at 100%), xp cap 2000 (at 50%)
    // When: applySoftcap for both
    // Then: coins reduced heavily, XP not reduced
  });
});
```

### 1.3 Burn System (`gamification-burn.server.ts`)

```typescript
describe('Burn System - Core Operations', () => {
  it('should successfully burn coins with valid balance', async () => {
    // Given: user balance 100, burn amount 50
    // When: burnCoins({ userId, tenantId, amount: 50, ... })
    // Then: success=true, newBalance=50
  });

  it('should reject burn when insufficient balance', async () => {
    // Given: user balance 30, burn amount 50
    // When: burnCoins({ userId, tenantId, amount: 50, ... })
    // Then: success=false, errorMessage='Insufficient balance'
  });

  it('should respect per-user purchase limits', async () => {
    // Given: sink limit 3, user purchased 3
    // When: burnCoins for same sink
    // Then: success=false, errorMessage includes 'limit'
  });

  it('should decrement remaining_stock on successful burn', async () => {
    // Given: sink remaining_stock=10
    // When: burnCoins for that sink
    // Then: remaining_stock becomes 9
  });

  it('should reject burn when sink out of stock', async () => {
    // Given: sink remaining_stock=0
    // When: burnCoins for that sink
    // Then: success=false, errorMessage='Out of stock'
  });

  it('should respect availability window (available_from/until)', async () => {
    // Given: sink available_from = tomorrow
    // When: burnCoins today
    // Then: success=false, sink not available
  });
});

describe('Burn System - Idempotency', () => {
  it('should be idempotent with same idempotency_key', async () => {
    // Given: successful burn with key 'abc123'
    // When: burnCoins with same key 'abc123'
    // Then: returns same result without double-deduction
  });

  it('should allow different key for same sink', async () => {
    // Given: successful burn with key 'abc123'
    // When: burnCoins with key 'xyz789' for same sink
    // Then: processes as new transaction
  });
});

describe('Burn System - Refunds', () => {
  it('should successfully refund a burn transaction', async () => {
    // Given: burn log entry with original amount 50
    // When: refundBurn(burnLogId, 'mistake')
    // Then: success=true, user balance restored
  });

  it('should reject double refund', async () => {
    // Given: already refunded burn
    // When: refundBurn(burnLogId) again
    // Then: success=false, already refunded
  });

  it('should create refund transaction in coin_transactions', async () => {
    // Given: valid burn to refund
    // When: refundBurn(burnLogId, reason)
    // Then: coin_transactions has type='refund' entry
  });
});
```

### 1.4 Leaderboard System (`gamification-leaderboard.server.ts`)

```typescript
describe('Leaderboard - Rankings', () => {
  it('should rank users by total_earned descending', async () => {
    // Given: users with earnings [100, 300, 200]
    // When: getLeaderboard(tenantId, { limit: 10 })
    // Then: order = [300, 200, 100]
  });

  it('should exclude opted-out users from leaderboard', async () => {
    // Given: user A (opted in), user B (opted out)
    // When: getLeaderboard(tenantId)
    // Then: only user A appears
  });

  it('should respect tenant isolation', async () => {
    // Given: user A in tenant X, user B in tenant Y
    // When: getLeaderboard(tenantX)
    // Then: only user A appears
  });

  it('should include global leaderboard when requested', async () => {
    // Given: users across multiple tenants
    // When: getLeaderboard(null, { scope: 'global' })
    // Then: returns cross-tenant rankings
  });

  it('should apply time filters (weekly, monthly)', async () => {
    // Given: earnings from last week and this week
    // When: getLeaderboard(tenantId, { period: 'weekly' })
    // Then: only counts this week's earnings
  });
});

describe('Leaderboard - Opt-out', () => {
  it('should allow user to opt out of leaderboard', async () => {
    // Given: user with leaderboard_opt_out=false
    // When: updateLeaderboardPreference(userId, tenantId, { optOut: true })
    // Then: user no longer appears in leaderboard
  });

  it('should preserve user data when opted out', async () => {
    // Given: user opts out
    // When: query user's coins/progress
    // Then: data still exists, just hidden from leaderboard
  });

  it('should allow user to opt back in', async () => {
    // Given: user with leaderboard_opt_out=true
    // When: updateLeaderboardPreference(userId, tenantId, { optOut: false })
    // Then: user appears in leaderboard again
  });
});
```

---

## PART 2: INTEGRATION TESTS

### 2.1 Event Ingestion API (`/api/gamification/events`)

```typescript
// tests/integration/gamification-events.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('POST /api/gamification/events - Integration', () => {
  let supabase: SupabaseClient;
  let testTenantId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup: create test tenant, user, auth session
  });

  afterAll(async () => {
    // Cleanup: remove test data
  });

  it('should accept valid event and return reward result', async () => {
    const response = await fetch('/api/gamification/events', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        tenantId: testTenantId,
        eventType: 'session_completed',
        source: 'play',
        idempotencyKey: `test-${Date.now()}`,
        metadata: { sessionId: 'abc123' },
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reward.applied).toBe(true);
    expect(data.reward.adjustedCoins).toBeGreaterThan(0);
  });

  it('should reject duplicate idempotency key', async () => {
    const key = `test-idempotent-${Date.now()}`;
    
    // First request
    await fetch('/api/gamification/events', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, idempotencyKey: key }),
    });

    // Duplicate request
    const response = await fetch('/api/gamification/events', {
      method: 'POST',
      body: JSON.stringify({ ...validPayload, idempotencyKey: key }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reward.skipped).toBe(true);
    expect(data.reward.skipReason).toContain('duplicate');
  });

  it('should reject invalid payload with 400', async () => {
    const response = await fetch('/api/gamification/events', {
      method: 'POST',
      body: JSON.stringify({
        // missing required fields
        eventType: '',
      }),
    });

    expect(response.status).toBe(400);
  });

  it('should reject unauthorized request with 401', async () => {
    const response = await fetch('/api/gamification/events', {
      method: 'POST',
      // No Authorization header
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(401);
  });

  it('should reject planner/play source from client with 403', async () => {
    const response = await fetch('/api/gamification/events', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}` },
      body: JSON.stringify({
        ...validPayload,
        source: 'play', // Should be server-only
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.details.source).toBeDefined();
  });
});
```

### 2.2 Coin Transaction Flow

```typescript
describe('Coin Transaction Flow - Integration', () => {
  it('should create coin_transaction entry on reward', async () => {
    // Given: trigger session_completed event
    // When: event processed
    // Then: coin_transactions has new row with type='earn'
  });

  it('should update user_coins balance atomically', async () => {
    // Given: user balance 100, reward 25
    // When: event processed
    // Then: user_coins.balance = 125, total_earned += 25
  });

  it('should record in gamification_daily_earnings', async () => {
    // Given: reward event today
    // When: event processed
    // Then: gamification_daily_earnings has row for today
  });

  it('should handle concurrent events without race conditions', async () => {
    // Given: 10 concurrent requests for same user
    // When: all processed in parallel
    // Then: final balance = initial + (reward * 10), no lost updates
  });
});
```

### 2.3 Admin Dashboard API

```typescript
describe('GET /api/admin/gamification/dashboard - Integration', () => {
  it('should return economy metrics for system admin', async () => {
    const response = await fetch('/api/admin/gamification/dashboard?tenantId=xxx');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.economy.mintRate24h).toBeDefined();
    expect(data.economy.burnRate24h).toBeDefined();
  });

  it('should return suspicious activities with risk scores', async () => {
    const response = await fetch('/api/admin/gamification/dashboard?section=suspicious');
    const data = await response.json();
    expect(data.suspicious).toBeInstanceOf(Array);
    if (data.suspicious.length > 0) {
      expect(data.suspicious[0].riskScore).toBeGreaterThanOrEqual(0);
      expect(data.suspicious[0].riskScore).toBeLessThanOrEqual(100);
    }
  });

  it('should reject non-admin users with 403', async () => {
    const response = await fetch('/api/admin/gamification/dashboard', {
      headers: { 'Authorization': `Bearer ${regularUserToken}` },
    });
    expect(response.status).toBe(403);
  });
});
```

---

## PART 3: ABUSE PREVENTION TESTS

### 3.1 Rate Limiting

```typescript
describe('Abuse Prevention - Rate Limiting', () => {
  it('should enforce 60 requests/minute per IP', async () => {
    // Given: 60 requests from same IP in 1 minute
    // When: 61st request
    // Then: returns 429 Too Many Requests
  });

  it('should track rate limit per user across IPs', async () => {
    // Given: same user token, different IPs
    // When: exceeds user rate limit
    // Then: returns 429 regardless of IP
  });

  it('should reset rate limit after window expires', async () => {
    // Given: hit rate limit at T
    // When: wait for window reset
    // Then: requests allowed again
  });
});
```

### 3.2 Event Flood Detection

```typescript
describe('Abuse Prevention - Event Flooding', () => {
  it('should flag high event velocity (>50 events/hour)', async () => {
    // Given: user submits 60 events in 1 hour
    // When: getSuspiciousActivities(tenantId)
    // Then: user flagged with risk_factor='high_velocity'
  });

  it('should detect session spamming pattern', async () => {
    // Given: user starts/ends 20 sessions in 30 minutes
    // When: analyzed by fraud detector
    // Then: flagged with 'session_spam' risk factor
  });

  it('should detect new account abuse pattern', async () => {
    // Given: account created today, earned 500 coins
    // When: analyzed by fraud detector
    // Then: flagged with 'new_account' + 'high_earnings' factors
  });
});
```

### 3.3 Idempotency Enforcement

```typescript
describe('Abuse Prevention - Idempotency', () => {
  it('should reject reused idempotency key across tenants', async () => {
    // Given: key used in tenant A
    // When: same key attempted in tenant B
    // Then: rejected (global idempotency)
  });

  it('should reject idempotency key too short (<8 chars)', async () => {
    const response = await fetch('/api/gamification/events', {
      body: JSON.stringify({
        ...validPayload,
        idempotencyKey: 'abc', // Too short
      }),
    });
    expect(response.status).toBe(400);
  });

  it('should log attempted idempotency violations', async () => {
    // Given: duplicate key submission
    // When: rejected
    // Then: gamification_events has log entry with duplicate flag
  });
});
```

### 3.4 Privilege Escalation Prevention

```typescript
describe('Abuse Prevention - Privilege Escalation', () => {
  it('should reject client-side coin minting attempt', async () => {
    const response = await fetch('/api/gamification/events', {
      headers: { 'Authorization': `Bearer ${regularUserToken}` },
      body: JSON.stringify({
        ...validPayload,
        rewardCoins: 1000000, // Attempt to mint
      }),
    });
    expect(response.status).toBe(403);
  });

  it('should reject cross-tenant event injection', async () => {
    // Given: user in tenant A
    // When: POST event with tenantId = B
    // Then: rejected with 403
  });

  it('should validate actor_user_id matches authenticated user', async () => {
    // Given: authenticated as user A
    // When: POST event with different actor_user_id
    // Then: ignored or rejected (uses auth user)
  });
});
```

### 3.5 Edge Cases

```typescript
describe('Edge Cases', () => {
  it('should handle null tenant_id for global events', async () => {
    // Given: event with tenantId: null
    // When: processed
    // Then: applies global rules only
  });

  it('should handle timezone edge at UTC midnight', async () => {
    // Given: event at 23:59:59 UTC, another at 00:00:01 UTC
    // When: both have cooldown='daily'
    // Then: first applies, second applies (new day)
  });

  it('should handle very large metadata payload', async () => {
    const largeMetadata = { data: 'x'.repeat(10000) };
    // When: POST with large metadata
    // Then: either accepts (if under limit) or rejects gracefully
  });

  it('should handle user with no prior coins/progress', async () => {
    // Given: brand new user, no rows in user_coins
    // When: first event processed
    // Then: creates user_coins row, balance = reward
  });

  it('should handle deleted/inactive user', async () => {
    // Given: user marked as deleted
    // When: event submitted
    // Then: rejected or logged without reward
  });
});
```

---

## PART 4: SPRINT BREAKDOWN

### Sprint 1: MVP Core (2 weeks)

**Goal:** Functional reward engine with 15 core triggers, softcap, basic admin visibility.

| Epic | Stories | Story Points |
|------|---------|--------------|
| **Event Ingestion** | | |
| | Refactor events API for v2 contract | 3 |
| | Add idempotency enforcement | 2 |
| | Add rate limiting middleware | 2 |
| **Reward Engine** | | |
| | Implement rule resolution (tenant > global > hardcoded) | 3 |
| | Implement cooldown checks (none, daily, weekly, once) | 3 |
| | Implement multiplier stacking with 2.0x cap | 3 |
| **Softcap** | | |
| | Implement diminishing returns formula | 3 |
| | Add daily earnings tracking table | 2 |
| | Create softcap configuration per tenant | 2 |
| **Core Triggers** | | |
| | Implement 15 MVP triggers (see list below) | 5 |
| | Server-side emission from play/planner domains | 5 |
| **Admin Dashboard** | | |
| | Economy metrics API (mint/burn rates) | 3 |
| | Top earners widget | 2 |
| | Suspicious activity basic detection | 3 |
| **Testing** | | |
| | Unit tests for reward engine | 3 |
| | Integration tests for event flow | 3 |
| **Total Sprint 1** | | **43 SP** |

#### Sprint 1 Triggers (15)

| # | Event Type | Source | Coins | XP | Cooldown |
|---|------------|--------|------:|---:|----------|
| 1 | session_started | play | 1 | 10 | none |
| 2 | session_completed | play | 2 | 25 | none |
| 3 | run_completed | play | 1 | 15 | none |
| 4 | first_session | play | 50 | 500 | once |
| 5 | plan_created | planner | 5 | 20 | none |
| 6 | plan_published | planner | 10 | 50 | none |
| 7 | first_plan | planner | 25 | 200 | once |
| 8 | daily_login | engagement | 1 | 10 | daily |
| 9 | streak_3_days | engagement | 5 | 30 | once_per_streak |
| 10 | streak_7_days | engagement | 15 | 75 | once_per_streak |
| 11 | milestone_10_sessions | play | 25 | 200 | once |
| 12 | game_created | content | 8 | 40 | none |
| 13 | game_published | content | 15 | 100 | none |
| 14 | tutorial_completed | learning | 15 | 100 | once |
| 15 | invite_accepted | social | 20 | 100 | none |

---

### Sprint 2: Extended Features (2 weeks)

**Goal:** Burn foundation, leaderboards, achievements integration, advanced multipliers.

| Epic | Stories | Story Points |
|------|---------|--------------|
| **Burn Foundation** | | |
| | Implement burn_coins_v1 RPC | 3 |
| | Create burn sinks management | 3 |
| | Add per-user purchase limits | 2 |
| | Implement refund flow | 2 |
| **Leaderboards** | | |
| | Tenant leaderboard with opt-out | 3 |
| | Global leaderboard aggregation | 2 |
| | Weekly/monthly period filters | 2 |
| | Leaderboard preferences API | 2 |
| **Achievements** | | |
| | Link triggers to achievement progress | 3 |
| | Implement tiered achievements | 3 |
| | Achievement unlock notifications | 2 |
| **Advanced Multipliers** | | |
| | Weekend bonus (Sat/Sun) | 2 |
| | Level bonus (5+) | 2 |
| | Campaign-based multipliers | 3 |
| **Extended Triggers** | | |
| | Add 20 more triggers (milestone, content, social) | 5 |
| | Tenant-configurable trigger rules | 3 |
| **Admin Enhancements** | | |
| | Rule toggle UI | 2 |
| | Fraud detection alerts | 3 |
| | Economy rebalancing tools | 3 |
| **Testing** | | |
| | Abuse prevention tests | 3 |
| | E2E leaderboard tests | 2 |
| | Burn/refund integration tests | 2 |
| **Total Sprint 2** | | **53 SP** |

#### Sprint 2 Triggers (20 additional)

| # | Event Type | Source | Coins | XP | Cooldown |
|---|------------|--------|------:|---:|----------|
| 16 | perfect_session | play | 5 | 50 | daily |
| 17 | large_group_hosted | play | 10 | 100 | weekly |
| 18 | milestone_50_sessions | play | 75 | 500 | once |
| 19 | milestone_100_sessions | play | 150 | 1000 | once |
| 20 | plan_updated | planner | 2 | 10 | daily |
| 21 | complex_plan | planner | 10 | 75 | none |
| 22 | milestone_5_plans | planner | 40 | 300 | once |
| 23 | streak_30_days | engagement | 50 | 300 | once_per_streak |
| 24 | streak_100_days | engagement | 200 | 1000 | once_per_streak |
| 25 | weekly_active | engagement | 10 | 50 | weekly |
| 26 | profile_completed | engagement | 20 | 100 | once |
| 27 | asset_uploaded | content | 1 | 5 | none |
| 28 | first_game | content | 30 | 250 | once |
| 29 | game_used_by_others | content | 10 | 50 | none |
| 30 | invite_sent | social | 5 | 25 | none |
| 31 | feedback_given | social | 3 | 15 | daily |
| 32 | collaboration_started | social | 10 | 50 | none |
| 33 | course_completed | learning | 30 | 200 | none |
| 34 | quiz_passed | learning | 10 | 50 | none |
| 35 | tenant:onboarding_complete | tenant | 25 | 150 | once |

---

## PART 5: ACCEPTANCE CRITERIA

### 5.1 Event Ingestion

```gherkin
Feature: Event Ingestion API

  Scenario: Valid event accepted
    Given a valid service-role token
    And a valid event payload with unique idempotency_key
    When POST /api/gamification/events
    Then response status is 200
    And response contains reward.applied = true
    And gamification_events table has new row

  Scenario: Duplicate idempotency key
    Given an event already processed with key "abc123"
    When POST with same idempotency_key "abc123"
    Then response status is 200
    And response contains reward.skipped = true
    And no new coin_transaction created

  Scenario: Invalid payload rejected
    Given a payload missing required fields
    When POST /api/gamification/events
    Then response status is 400
    And response contains validation errors

  Scenario: Unauthorized rejected
    Given no authentication token
    When POST /api/gamification/events
    Then response status is 401
```

### 5.2 Softcap System

```gherkin
Feature: Softcap Diminishing Returns

  Scenario: Full reward under threshold
    Given daily cap is 500
    And user has earned 200 today
    When event rewards 100 coins
    Then adjusted reward is 100 coins (no reduction)

  Scenario: Reduced reward over threshold
    Given daily cap is 500
    And user has earned 450 today (90%)
    When event rewards 100 coins
    Then adjusted reward is approximately 50 coins

  Scenario: Never zero reward
    Given daily cap is 500
    And user has earned 5000 today (1000%)
    When event rewards 100 coins
    Then adjusted reward is at least 20 coins (minimum floor)

  Scenario: Separate XP softcap
    Given coin cap is 500 (at 100%)
    And XP cap is 2000 (at 50%)
    When event rewards coins and XP
    Then coins are reduced, XP is not reduced
```

### 5.3 Multiplier System

```gherkin
Feature: Multiplier Stacking

  Scenario: Single multiplier applied
    Given user has 7-day streak (1.5x bonus)
    When event rewards 10 coins
    Then final reward is 15 coins

  Scenario: Multiple multipliers stack
    Given user has 7-day streak (1.5x)
    And it is Saturday (weekend 1.25x)
    When event rewards 10 coins
    Then effective multiplier is 1.875x
    And final reward is 18 coins (rounded)

  Scenario: Multiplier capped at 2.0x
    Given combined multipliers = 2.5x
    When event rewards 10 coins
    Then effective multiplier is capped at 2.0x
    And final reward is 20 coins
```

### 5.4 Cooldowns

```gherkin
Feature: Cooldown System

  Scenario: No cooldown allows unlimited
    Given trigger has cooldown = 'none'
    When user triggers 100 times
    Then all 100 rewards are applied

  Scenario: Daily cooldown blocks same day
    Given trigger has cooldown = 'daily'
    And user triggered at 08:00 UTC
    When user triggers again at 15:00 UTC same day
    Then reward is blocked (cooldown active)

  Scenario: Daily cooldown resets at UTC midnight
    Given trigger has cooldown = 'daily'
    And user triggered at 23:00 UTC yesterday
    When user triggers at 00:01 UTC today
    Then reward is applied (new day)

  Scenario: Once cooldown is permanent
    Given trigger has cooldown = 'once'
    And user triggered before
    When user triggers again (anytime)
    Then reward is blocked permanently

  Scenario: Once per streak resets on streak break
    Given trigger has cooldown = 'once_per_streak'
    And user earned during streak period A
    And streak broke and restarted (period B)
    When user triggers again
    Then reward is applied (new streak period)
```

### 5.5 Burn System

```gherkin
Feature: Coin Burn

  Scenario: Successful burn
    Given user has balance 100
    And sink costs 50
    When user burns on sink
    Then success is true
    And new balance is 50
    And burn_log entry created

  Scenario: Insufficient balance
    Given user has balance 30
    And sink costs 50
    When user attempts burn
    Then success is false
    And error is "Insufficient balance"

  Scenario: Out of stock
    Given sink has remaining_stock = 0
    When user attempts burn
    Then success is false
    And error is "Out of stock"

  Scenario: Per-user limit reached
    Given sink has per_user_limit = 3
    And user has purchased 3
    When user attempts 4th purchase
    Then success is false
    And error contains "limit"
```

### 5.6 Leaderboard

```gherkin
Feature: Leaderboard

  Scenario: Tenant leaderboard ranking
    Given users A (300), B (200), C (100) earned in tenant
    When GET leaderboard for tenant
    Then order is [A, B, C]

  Scenario: Opt-out exclusion
    Given user A opted out
    And user B opted in
    When GET leaderboard
    Then only user B appears

  Scenario: User can opt out
    Given user is on leaderboard
    When user sets leaderboard_opt_out = true
    Then user no longer appears on leaderboard
    And user's data is preserved
```

### 5.7 Admin Dashboard

```gherkin
Feature: Admin Dashboard

  Scenario: Economy metrics visible
    Given user is system admin
    When GET /api/admin/gamification/dashboard
    Then response includes mint_rate_24h
    And response includes burn_rate_24h
    And response includes supply stats

  Scenario: Suspicious activity detection
    Given user submitted 100 events in 1 hour
    When GET dashboard suspicious section
    Then user appears with risk_score > 50
    And risk_factors includes 'high_velocity'

  Scenario: Non-admin rejected
    Given user is regular member
    When GET /api/admin/gamification/dashboard
    Then response status is 403
```

---

## APPENDIX A: TEST ENVIRONMENT SETUP

```bash
# Required environment variables
TEST_SUPABASE_URL=http://localhost:54321
TEST_SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
TEST_SUPABASE_ANON_KEY=<anon-key>

# Run all gamification tests
npx vitest tests/gamification/

# Run specific test file
npx vitest tests/gamification/reward-engine.test.ts

# Run with coverage
npx vitest tests/gamification/ --coverage

# Run E2E tests
npx playwright test tests/e2e/gamification/
```

---

## APPENDIX B: TEST DATA FIXTURES

```typescript
// tests/fixtures/gamification.ts

export const testTenant = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Test Tenant',
  type: 'enterprise',
};

export const testUser = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  email: 'test@example.com',
};

export const testEvents = {
  sessionCompleted: {
    eventType: 'session_completed',
    source: 'play' as const,
    idempotencyKey: 'test-session-001',
    metadata: { sessionId: 'session-abc', participantCount: 10 },
  },
  dailyLogin: {
    eventType: 'daily_login',
    source: 'engagement' as const,
    idempotencyKey: 'test-login-001',
    metadata: {},
  },
};

export const testSinks = {
  basicBoost: {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    name: 'Basic Boost',
    sinkType: 'boost',
    costCoins: 50,
    perUserLimit: 5,
  },
};
```

---

*Document prepared for ChatGPT planning and development team reference.*
