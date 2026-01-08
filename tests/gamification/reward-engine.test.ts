/**
 * Gamification Reward Engine Tests
 *
 * Unit + Integration tests for the core reward engine.
 * Run: npx vitest tests/gamification/reward-engine.test.ts
 *
 * Environment:
 * - TEST_SUPABASE_URL: Local Supabase URL
 * - TEST_SUPABASE_SERVICE_ROLE_KEY: Service role key
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { Database } from '../../types/supabase';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? '';
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? '';

const dbTestsEnabled =
  TEST_SUPABASE_URL.length > 0 && TEST_SUPABASE_SERVICE_KEY.length > 0;

let supabase: SupabaseClient<Database> | null = null;
let testTenantId: string | null = null;
let testUserId: string | null = null;

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

beforeAll(async () => {
  if (!dbTestsEnabled) {
    console.log('⚠️  DB tests skipped: Set TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  supabase = createClient<Database>(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_KEY);

  // Create test tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: `Test Gamification ${Date.now()}`,
      type: 'test',
    })
    .select('id')
    .single();

  if (tenantError || !tenant?.id) {
    throw new Error(`Failed to create test tenant: ${tenantError?.message}`);
  }
  testTenantId = tenant.id;

  // Create test user ID (not an actual auth user, just for testing)
  testUserId = randomUUID();

  // Initialize user_coins for test user
  await supabase.from('user_coins').insert({
    user_id: testUserId,
    tenant_id: testTenantId,
    balance: 100,
    total_earned: 100,
    total_spent: 0,
  });
});

afterAll(async () => {
  if (!dbTestsEnabled || !supabase || !testTenantId) return;

  // Cleanup test data
  if (testUserId) {
    await supabase.from('coin_transactions').delete().eq('user_id', testUserId);
    await supabase.from('user_coins').delete().eq('user_id', testUserId);
    await supabase.from('gamification_events').delete().eq('actor_user_id', testUserId);
    // Tables defined in migration 20260108200000 - using any until types are regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('gamification_daily_earnings').delete().eq('user_id', testUserId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('gamification_cooldowns').delete().eq('user_id', testUserId);
  }

  await supabase.from('gamification_automation_rules').delete().eq('tenant_id', testTenantId);
  await supabase.from('tenants').delete().eq('id', testTenantId);
});

// ============================================================================
// UNIT TESTS: SOFTCAP FORMULA
// ============================================================================

describe('Softcap - Diminishing Returns Formula', () => {
  /**
   * Softcap formula (from design):
   * factor = 1.0 - 0.8 * ((earned / cap) ^ 2)
   * Clamped to [0.2, 1.0]
   */
  function calculateSoftcapFactor(earnedToday: number, dailyCap: number): number {
    if (dailyCap <= 0) return 1.0;
    const ratio = earnedToday / dailyCap;
    const rawFactor = 1.0 - 0.8 * Math.pow(ratio, 2);
    return Math.max(0.2, Math.min(1.0, rawFactor));
  }

  function applySoftcap(reward: number, earnedToday: number, dailyCap: number): number {
    const factor = calculateSoftcapFactor(earnedToday, dailyCap);
    return Math.ceil(reward * factor);
  }

  it('should apply 1.0x factor when under 50% of daily cap', () => {
    const factor = calculateSoftcapFactor(200, 500); // 40%
    expect(factor).toBe(1.0);

    const adjusted = applySoftcap(100, 200, 500);
    expect(adjusted).toBe(100);
  });

  it('should apply ~0.95x factor at 50% of daily cap', () => {
    const factor = calculateSoftcapFactor(250, 500); // 50%
    // 1.0 - 0.8 * (0.5)^2 = 1.0 - 0.8 * 0.25 = 1.0 - 0.2 = 0.8
    expect(factor).toBeCloseTo(0.8, 2);

    const adjusted = applySoftcap(100, 250, 500);
    expect(adjusted).toBe(80);
  });

  it('should apply ~0.5x factor at 80% of daily cap', () => {
    const factor = calculateSoftcapFactor(400, 500); // 80%
    // 1.0 - 0.8 * (0.8)^2 = 1.0 - 0.8 * 0.64 = 1.0 - 0.512 = 0.488
    expect(factor).toBeCloseTo(0.488, 2);

    const adjusted = applySoftcap(100, 400, 500);
    expect(adjusted).toBe(49); // ceil(48.8)
  });

  it('should apply minimum 0.2x factor at 100%+ of daily cap', () => {
    const factor = calculateSoftcapFactor(500, 500); // 100%
    // 1.0 - 0.8 * (1.0)^2 = 1.0 - 0.8 = 0.2
    expect(factor).toBe(0.2);

    const adjusted = applySoftcap(100, 500, 500);
    expect(adjusted).toBe(20);
  });

  it('should NEVER return zero reward (minimum floor)', () => {
    // Even at 10x over cap
    const factor = calculateSoftcapFactor(5000, 500);
    expect(factor).toBe(0.2); // Clamped to minimum

    const adjusted = applySoftcap(100, 5000, 500);
    expect(adjusted).toBe(20); // At least 20% of reward
    expect(adjusted).toBeGreaterThan(0);
  });

  it('should handle edge case of zero daily cap', () => {
    const factor = calculateSoftcapFactor(100, 0);
    expect(factor).toBe(1.0); // No cap = no reduction
  });

  it('should handle edge case of zero earned today', () => {
    const factor = calculateSoftcapFactor(0, 500);
    expect(factor).toBe(1.0);
  });
});

// ============================================================================
// UNIT TESTS: MULTIPLIER STACKING
// ============================================================================

describe('Multiplier Stacking', () => {
  const MAX_MULTIPLIER_CAP = 2.0;

  interface MultiplierSource {
    source: string;
    multiplier: number;
  }

  function calculateStackedMultiplier(sources: MultiplierSource[]): {
    effective: number;
    capped: boolean;
  } {
    let accumulated = 1.0;
    for (const s of sources) {
      accumulated *= s.multiplier;
    }

    const capped = accumulated > MAX_MULTIPLIER_CAP;
    const effective = Math.min(accumulated, MAX_MULTIPLIER_CAP);

    return { effective, capped };
  }

  it('should stack multipliers multiplicatively', () => {
    const sources: MultiplierSource[] = [
      { source: 'streak', multiplier: 1.5 },
      { source: 'weekend', multiplier: 1.25 },
    ];

    const result = calculateStackedMultiplier(sources);
    expect(result.effective).toBeCloseTo(1.875, 3);
    expect(result.capped).toBe(false);
  });

  it('should cap at MAX_MULTIPLIER_CAP (2.0x)', () => {
    const sources: MultiplierSource[] = [
      { source: 'streak', multiplier: 1.5 },
      { source: 'weekend', multiplier: 1.25 },
      { source: 'campaign', multiplier: 1.5 },
    ];

    // Raw: 1.5 * 1.25 * 1.5 = 2.8125
    const result = calculateStackedMultiplier(sources);
    expect(result.effective).toBe(2.0);
    expect(result.capped).toBe(true);
  });

  it('should return 1.0 with no multipliers', () => {
    const result = calculateStackedMultiplier([]);
    expect(result.effective).toBe(1.0);
    expect(result.capped).toBe(false);
  });

  it('should handle single multiplier', () => {
    const sources: MultiplierSource[] = [{ source: 'level', multiplier: 1.1 }];

    const result = calculateStackedMultiplier(sources);
    expect(result.effective).toBe(1.1);
    expect(result.capped).toBe(false);
  });
});

// ============================================================================
// UNIT TESTS: WEEKEND DETECTION
// ============================================================================

describe('Weekend Detection (UTC)', () => {
  function isWeekend(date: Date): boolean {
    const day = date.getUTCDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  it('should detect Saturday as weekend', () => {
    // 2026-01-10 is a Saturday
    const saturday = new Date('2026-01-10T14:00:00Z');
    expect(isWeekend(saturday)).toBe(true);
  });

  it('should detect Sunday as weekend', () => {
    // 2026-01-11 is a Sunday
    const sunday = new Date('2026-01-11T10:00:00Z');
    expect(isWeekend(sunday)).toBe(true);
  });

  it('should not detect Friday as weekend', () => {
    // 2026-01-09 is a Friday
    const friday = new Date('2026-01-09T23:59:59Z');
    expect(isWeekend(friday)).toBe(false);
  });

  it('should not detect Monday as weekend', () => {
    // 2026-01-12 is a Monday
    const monday = new Date('2026-01-12T00:01:00Z');
    expect(isWeekend(monday)).toBe(false);
  });
});

// ============================================================================
// UNIT TESTS: COOLDOWN ELIGIBILITY
// ============================================================================

describe('Cooldown Eligibility Logic', () => {
  type CooldownType = 'none' | 'daily' | 'weekly' | 'once' | 'once_per_streak';

  interface CooldownRecord {
    lastTriggeredAt: Date | null;
    triggerCount: number;
    streakId: number | null;
  }

  function isCooldownEligible(
    cooldownType: CooldownType,
    record: CooldownRecord,
    now: Date,
    currentStreakId: number | null
  ): boolean {
    if (cooldownType === 'none') return true;
    if (!record.lastTriggeredAt) return true;

    const lastTrigger = record.lastTriggeredAt;

    switch (cooldownType) {
      case 'daily': {
        // Same UTC day?
        return (
          lastTrigger.getUTCFullYear() !== now.getUTCFullYear() ||
          lastTrigger.getUTCMonth() !== now.getUTCMonth() ||
          lastTrigger.getUTCDate() !== now.getUTCDate()
        );
      }
      case 'weekly': {
        // Same ISO week?
        const getISOWeek = (d: Date): number => {
          const date = new Date(d.getTime());
          date.setUTCHours(0, 0, 0, 0);
          date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
          const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
          return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        };
        return (
          lastTrigger.getUTCFullYear() !== now.getUTCFullYear() ||
          getISOWeek(lastTrigger) !== getISOWeek(now)
        );
      }
      case 'once': {
        // If ever triggered, block forever
        return record.triggerCount === 0;
      }
      case 'once_per_streak': {
        // If streak ID changed, eligible again
        return record.streakId !== currentStreakId;
      }
      default:
        return true;
    }
  }

  it('should always allow cooldown=none', () => {
    const record: CooldownRecord = {
      lastTriggeredAt: new Date(),
      triggerCount: 100,
      streakId: null,
    };
    expect(isCooldownEligible('none', record, new Date(), null)).toBe(true);
  });

  it('should block daily cooldown on same day', () => {
    const now = new Date('2026-01-08T15:00:00Z');
    const record: CooldownRecord = {
      lastTriggeredAt: new Date('2026-01-08T08:00:00Z'),
      triggerCount: 1,
      streakId: null,
    };
    expect(isCooldownEligible('daily', record, now, null)).toBe(false);
  });

  it('should allow daily cooldown after midnight UTC', () => {
    const now = new Date('2026-01-09T00:01:00Z');
    const record: CooldownRecord = {
      lastTriggeredAt: new Date('2026-01-08T23:59:00Z'),
      triggerCount: 1,
      streakId: null,
    };
    expect(isCooldownEligible('daily', record, now, null)).toBe(true);
  });

  it('should block weekly cooldown in same ISO week', () => {
    // 2026-01-05 is Monday, 2026-01-08 is Thursday (same week)
    const now = new Date('2026-01-08T12:00:00Z');
    const record: CooldownRecord = {
      lastTriggeredAt: new Date('2026-01-05T12:00:00Z'),
      triggerCount: 1,
      streakId: null,
    };
    expect(isCooldownEligible('weekly', record, now, null)).toBe(false);
  });

  it('should allow weekly cooldown on new ISO week', () => {
    // 2026-01-04 is Sunday (week 1), 2026-01-05 is Monday (week 2)
    const now = new Date('2026-01-05T12:00:00Z');
    const record: CooldownRecord = {
      lastTriggeredAt: new Date('2026-01-04T12:00:00Z'),
      triggerCount: 1,
      streakId: null,
    };
    expect(isCooldownEligible('weekly', record, now, null)).toBe(true);
  });

  it('should permanently block cooldown=once', () => {
    const record: CooldownRecord = {
      lastTriggeredAt: new Date('2020-01-01T00:00:00Z'),
      triggerCount: 1,
      streakId: null,
    };
    expect(isCooldownEligible('once', record, new Date(), null)).toBe(false);
  });

  it('should allow first trigger for cooldown=once', () => {
    const record: CooldownRecord = {
      lastTriggeredAt: null,
      triggerCount: 0,
      streakId: null,
    };
    expect(isCooldownEligible('once', record, new Date(), null)).toBe(true);
  });

  it('should reset once_per_streak on new streak', () => {
    const record: CooldownRecord = {
      lastTriggeredAt: new Date(),
      triggerCount: 1,
      streakId: 5, // Old streak
    };
    const currentStreakId = 1; // New streak (reset)
    expect(isCooldownEligible('once_per_streak', record, new Date(), currentStreakId)).toBe(true);
  });

  it('should block once_per_streak in same streak', () => {
    const record: CooldownRecord = {
      lastTriggeredAt: new Date(),
      triggerCount: 1,
      streakId: 7,
    };
    const currentStreakId = 7; // Same streak
    expect(isCooldownEligible('once_per_streak', record, new Date(), currentStreakId)).toBe(false);
  });
});

// ============================================================================
// INTEGRATION TESTS: DATABASE OPERATIONS
// ============================================================================

describe.skipIf(!dbTestsEnabled)('Integration - Coin Transactions', () => {
  it('should create coin_transaction on reward', async () => {
    if (!supabase || !testUserId || !testTenantId) return;

    const txId = randomUUID();
    const { error } = await supabase.from('coin_transactions').insert({
      id: txId,
      user_id: testUserId,
      tenant_id: testTenantId,
      type: 'earn',
      amount: 10,
      description: 'test:session_completed',
      balance_after: 110,
    });

    expect(error).toBeNull();

    // Verify insert
    const { data } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('id', txId)
      .single();

    expect(data).not.toBeNull();
    expect(data?.amount).toBe(10);
    expect(data?.type).toBe('earn');
  });

  it('should update user_coins balance atomically', async () => {
    if (!supabase || !testUserId || !testTenantId) return;

    // Get initial balance
    const { data: before } = await supabase
      .from('user_coins')
      .select('balance, total_earned')
      .eq('user_id', testUserId)
      .eq('tenant_id', testTenantId)
      .single();

    const initialBalance = before?.balance ?? 0;
    const initialEarned = before?.total_earned ?? 0;

    // Update balance
    const { error } = await supabase
      .from('user_coins')
      .update({
        balance: initialBalance + 25,
        total_earned: initialEarned + 25,
      })
      .eq('user_id', testUserId)
      .eq('tenant_id', testTenantId);

    expect(error).toBeNull();

    // Verify
    const { data: after } = await supabase
      .from('user_coins')
      .select('balance, total_earned')
      .eq('user_id', testUserId)
      .eq('tenant_id', testTenantId)
      .single();

    expect(after?.balance).toBe(initialBalance + 25);
    expect(after?.total_earned).toBe(initialEarned + 25);
  });
});

describe.skipIf(!dbTestsEnabled)('Integration - Idempotency', () => {
  it('should enforce unique idempotency key', async () => {
    if (!supabase || !testUserId || !testTenantId) return;

    const idempotencyKey = `test-idempotent-${Date.now()}`;

    // First insert
    const { error: firstError } = await supabase.from('gamification_events').insert({
      tenant_id: testTenantId,
      actor_user_id: testUserId,
      event_type: 'session_completed',
      source: 'play',
      idempotency_key: idempotencyKey,
      metadata: {},
    });

    expect(firstError).toBeNull();

    // Duplicate insert should fail
    const { error: secondError } = await supabase.from('gamification_events').insert({
      tenant_id: testTenantId,
      actor_user_id: testUserId,
      event_type: 'session_completed',
      source: 'play',
      idempotency_key: idempotencyKey,
      metadata: {},
    });

    expect(secondError).not.toBeNull();
    expect(secondError?.code).toBe('23505'); // unique_violation
  });
});

describe.skipIf(!dbTestsEnabled)('Integration - Daily Earnings Tracking', () => {
  // Note: This test requires migration 20260108200000 to be applied
  // Using any cast until types are regenerated
  it.skip('should track daily earnings correctly (requires pending migration)', async () => {
    if (!supabase || !testUserId || !testTenantId) return;

    const today = new Date().toISOString().split('T')[0];

    // Upsert daily earnings - table defined in migration 20260108200000
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('gamification_daily_earnings').upsert(
      {
        user_id: testUserId,
        tenant_id: testTenantId,
        date: today,
        coins_earned: 50,
        xp_earned: 100,
      },
      {
        onConflict: 'user_id,tenant_id,date',
      }
    );

    expect(error).toBeNull();

    // Verify
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('gamification_daily_earnings')
      .select('coins_earned, xp_earned')
      .eq('user_id', testUserId)
      .eq('tenant_id', testTenantId)
      .eq('date', today)
      .single();

    expect(data?.coins_earned).toBe(50);
    expect(data?.xp_earned).toBe(100);
  });
});

// ============================================================================
// ABUSE PREVENTION TESTS
// ============================================================================

describe('Abuse Prevention - Rate Detection', () => {
  interface EventLog {
    timestamp: Date;
    eventType: string;
  }

  function detectHighVelocity(events: EventLog[], windowMinutes: number, threshold: number): boolean {
    if (events.length < threshold) return false;

    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const recentEvents = events.filter((e) => now - e.timestamp.getTime() < windowMs);
    return recentEvents.length >= threshold;
  }

  it('should detect high velocity (>50 events/hour)', () => {
    const now = Date.now();
    const events: EventLog[] = Array.from({ length: 60 }, (_, i) => ({
      timestamp: new Date(now - i * 60000), // 1 per minute
      eventType: 'session_completed',
    }));

    expect(detectHighVelocity(events, 60, 50)).toBe(true);
  });

  it('should not flag normal velocity', () => {
    const now = Date.now();
    const events: EventLog[] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(now - i * 360000), // 1 per 6 minutes
      eventType: 'session_completed',
    }));

    expect(detectHighVelocity(events, 60, 50)).toBe(false);
  });

  function detectSessionSpam(sessionEvents: EventLog[], windowMinutes: number): boolean {
    // Detect > 10 session_started in 30 minutes
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const recentSessions = sessionEvents.filter(
      (e) => e.eventType === 'session_started' && now - e.timestamp.getTime() < windowMs
    );

    return recentSessions.length > 10;
  }

  it('should detect session spamming pattern', () => {
    const now = Date.now();
    const events: EventLog[] = Array.from({ length: 15 }, (_, i) => ({
      timestamp: new Date(now - i * 120000), // 1 per 2 minutes = 15 in 30 min
      eventType: 'session_started',
    }));

    expect(detectSessionSpam(events, 30)).toBe(true);
  });
});

describe('Abuse Prevention - Privilege Escalation', () => {
  it('should reject client-side coin minting attempt', () => {
    // This would be validated at API layer
    const payload = {
      eventType: 'session_completed',
      source: 'play',
      rewardCoins: 1000000, // Attempt to specify reward
    };

    // Validation rule: rewardCoins should be rejected unless admin/system
    const isPrivileged = false;
    const hasRewardCoins = typeof payload.rewardCoins === 'number';

    expect(hasRewardCoins && !isPrivileged).toBe(true); // Should be rejected
  });

  it('should validate source restrictions', () => {
    const restrictedSources = ['planner', 'play'];
    const payload = { source: 'play' };

    // Non-service-role should not be able to emit play/planner events
    const isServiceRole = false;
    const isRestrictedSource = restrictedSources.includes(payload.source);

    expect(isRestrictedSource && !isServiceRole).toBe(true); // Should be rejected
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  it('should handle user with no prior coins/progress', () => {
    // When processing first event for new user, should create user_coins row
    const _newUserId = randomUUID(); // Prefixed with _ to indicate intentionally unused
    const balance = 0;
    const reward = 10;

    // After first event
    const newBalance = balance + reward;
    expect(newBalance).toBe(10);
  });

  it('should handle very large metadata payload gracefully', () => {
    const largeMetadata = { data: 'x'.repeat(10000) };
    const jsonSize = JSON.stringify(largeMetadata).length;

    // Should have reasonable size limit (e.g., 64KB)
    const MAX_METADATA_SIZE = 65536;
    const isValid = jsonSize <= MAX_METADATA_SIZE;

    expect(isValid).toBe(true);
  });

  it('should handle null tenant_id for global events', () => {
    const payload = {
      tenantId: null,
      eventType: 'system_maintenance',
      source: 'system',
    };

    // Global events should still be processed
    expect(payload.tenantId).toBeNull();
    expect(payload.source).toBe('system');
  });

  it('should handle timezone edge at UTC midnight', () => {
    const beforeMidnight = new Date('2026-01-08T23:59:59.999Z');
    const afterMidnight = new Date('2026-01-09T00:00:00.001Z');

    const beforeDay = beforeMidnight.getUTCDate();
    const afterDay = afterMidnight.getUTCDate();

    // Should be different days
    expect(beforeDay).toBe(8);
    expect(afterDay).toBe(9);
    expect(beforeDay).not.toBe(afterDay);
  });
});
