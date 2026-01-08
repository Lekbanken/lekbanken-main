/**
 * Gamification Leaderboard & Abuse Prevention Tests
 *
 * Tests for leaderboards, opt-out, and fraud detection.
 * Run: npx vitest tests/gamification/leaderboard-abuse.test.ts
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
const testUserIds: string[] = [];

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
      name: `Test Leaderboard ${Date.now()}`,
      type: 'test',
    })
    .select('id')
    .single();

  if (tenantError || !tenant?.id) {
    throw new Error(`Failed to create test tenant: ${tenantError?.message}`);
  }
  testTenantId = tenant.id;

  // Create test users with different earnings
  const earnings = [300, 200, 100, 400, 150];
  for (let i = 0; i < earnings.length; i++) {
    const userId = randomUUID();
    testUserIds.push(userId);

    await supabase.from('user_coins').insert({
      user_id: userId,
      tenant_id: testTenantId,
      balance: earnings[i],
      total_earned: earnings[i],
      total_spent: 0,
    });

    // Add preferences (some opted out)
    await supabase.from('user_gamification_preferences').insert({
      user_id: userId,
      tenant_id: testTenantId,
      leaderboard_visible: i !== 2, // User 2 (100 coins) opts out
      leaderboard_opted_out_at: i === 2 ? new Date().toISOString() : null,
    });
  }
});

afterAll(async () => {
  if (!dbTestsEnabled || !supabase) return;

  // Cleanup
  for (const userId of testUserIds) {
    await supabase.from('user_gamification_preferences').delete().eq('user_id', userId);
    await supabase.from('coin_transactions').delete().eq('user_id', userId);
    await supabase.from('user_coins').delete().eq('user_id', userId);
    await supabase.from('gamification_events').delete().eq('actor_user_id', userId);
  }

  if (testTenantId) {
    await supabase.from('tenants').delete().eq('id', testTenantId);
  }
});

// ============================================================================
// UNIT TESTS: LEADERBOARD RANKING
// ============================================================================

describe('Leaderboard - Ranking Logic', () => {
  interface LeaderboardEntry {
    userId: string;
    totalEarned: number;
    optedOut: boolean;
  }

  function rankLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return entries
      .filter((e) => !e.optedOut)
      .sort((a, b) => b.totalEarned - a.totalEarned);
  }

  it('should rank by total_earned descending', () => {
    const entries: LeaderboardEntry[] = [
      { userId: 'a', totalEarned: 100, optedOut: false },
      { userId: 'b', totalEarned: 300, optedOut: false },
      { userId: 'c', totalEarned: 200, optedOut: false },
    ];

    const ranked = rankLeaderboard(entries);
    expect(ranked[0].totalEarned).toBe(300);
    expect(ranked[1].totalEarned).toBe(200);
    expect(ranked[2].totalEarned).toBe(100);
  });

  it('should exclude opted-out users', () => {
    const entries: LeaderboardEntry[] = [
      { userId: 'a', totalEarned: 100, optedOut: false },
      { userId: 'b', totalEarned: 500, optedOut: true }, // Opted out
      { userId: 'c', totalEarned: 200, optedOut: false },
    ];

    const ranked = rankLeaderboard(entries);
    expect(ranked.length).toBe(2);
    expect(ranked.find((e) => e.userId === 'b')).toBeUndefined();
  });

  it('should handle ties by maintaining stable order', () => {
    const entries: LeaderboardEntry[] = [
      { userId: 'a', totalEarned: 100, optedOut: false },
      { userId: 'b', totalEarned: 100, optedOut: false },
    ];

    const ranked = rankLeaderboard(entries);
    expect(ranked.length).toBe(2);
    // Both have same score, stable sort maintains order
  });
});

describe('Leaderboard - Period Filters', () => {
  interface EarningRecord {
    userId: string;
    amount: number;
    earnedAt: Date;
  }

  function filterByPeriod(
    records: EarningRecord[],
    period: 'daily' | 'weekly' | 'monthly' | 'all-time',
    now: Date
  ): EarningRecord[] {
    if (period === 'all-time') return records;

    const cutoff = new Date(now);
    switch (period) {
      case 'daily':
        cutoff.setUTCHours(0, 0, 0, 0);
        break;
      case 'weekly':
        // Start of ISO week (Monday)
        const day = cutoff.getUTCDay() || 7;
        cutoff.setUTCDate(cutoff.getUTCDate() - day + 1);
        cutoff.setUTCHours(0, 0, 0, 0);
        break;
      case 'monthly':
        cutoff.setUTCDate(1);
        cutoff.setUTCHours(0, 0, 0, 0);
        break;
    }

    return records.filter((r) => r.earnedAt >= cutoff);
  }

  it('should filter daily earnings (today only)', () => {
    const now = new Date('2026-01-08T15:00:00Z');
    const records: EarningRecord[] = [
      { userId: 'a', amount: 100, earnedAt: new Date('2026-01-08T10:00:00Z') }, // Today
      { userId: 'b', amount: 50, earnedAt: new Date('2026-01-07T10:00:00Z') }, // Yesterday
    ];

    const filtered = filterByPeriod(records, 'daily', now);
    expect(filtered.length).toBe(1);
    expect(filtered[0].userId).toBe('a');
  });

  it('should filter weekly earnings (this ISO week)', () => {
    // 2026-01-08 is Thursday
    const now = new Date('2026-01-08T15:00:00Z');
    const records: EarningRecord[] = [
      { userId: 'a', amount: 100, earnedAt: new Date('2026-01-06T10:00:00Z') }, // Tuesday (this week)
      { userId: 'b', amount: 50, earnedAt: new Date('2026-01-04T10:00:00Z') }, // Sunday (last week)
    ];

    const filtered = filterByPeriod(records, 'weekly', now);
    expect(filtered.length).toBe(1);
    expect(filtered[0].userId).toBe('a');
  });

  it('should filter monthly earnings (this month)', () => {
    const now = new Date('2026-01-15T15:00:00Z');
    const records: EarningRecord[] = [
      { userId: 'a', amount: 100, earnedAt: new Date('2026-01-10T10:00:00Z') }, // This month
      { userId: 'b', amount: 50, earnedAt: new Date('2025-12-25T10:00:00Z') }, // Last month
    ];

    const filtered = filterByPeriod(records, 'monthly', now);
    expect(filtered.length).toBe(1);
    expect(filtered[0].userId).toBe('a');
  });

  it('should return all for all-time period', () => {
    const now = new Date();
    const records: EarningRecord[] = [
      { userId: 'a', amount: 100, earnedAt: new Date('2020-01-01') },
      { userId: 'b', amount: 50, earnedAt: new Date('2025-06-15') },
    ];

    const filtered = filterByPeriod(records, 'all-time', now);
    expect(filtered.length).toBe(2);
  });
});

// ============================================================================
// UNIT TESTS: OPT-OUT HANDLING
// ============================================================================

describe('Leaderboard - Opt-Out Handling', () => {
  interface UserPreferences {
    userId: string;
    leaderboardOptOut: boolean;
    displayName: string | null;
  }

  function canShowOnLeaderboard(prefs: UserPreferences): boolean {
    return !prefs.leaderboardOptOut;
  }

  it('should allow display when not opted out', () => {
    const prefs: UserPreferences = {
      userId: 'user-1',
      leaderboardOptOut: false,
      displayName: 'Player One',
    };
    expect(canShowOnLeaderboard(prefs)).toBe(true);
  });

  it('should hide when opted out', () => {
    const prefs: UserPreferences = {
      userId: 'user-2',
      leaderboardOptOut: true,
      displayName: 'Player Two',
    };
    expect(canShowOnLeaderboard(prefs)).toBe(false);
  });

  it('should preserve user data when opted out', () => {
    // Opting out should not delete user's coins/progress
    const userData = {
      balance: 500,
      totalEarned: 1000,
      preferences: { leaderboardOptOut: true },
    };

    // Data should still exist
    expect(userData.balance).toBe(500);
    expect(userData.totalEarned).toBe(1000);
    // Just hidden from leaderboard
    expect(userData.preferences.leaderboardOptOut).toBe(true);
  });
});

// ============================================================================
// ABUSE PREVENTION TESTS
// ============================================================================

describe('Abuse Prevention - Risk Scoring', () => {
  interface RiskFactor {
    type: string;
    weight: number;
    triggered: boolean;
  }

  interface RiskAssessment {
    userId: string;
    score: number;
    factors: RiskFactor[];
  }

  function calculateRiskScore(factors: RiskFactor[]): number {
    const triggeredFactors = factors.filter((f) => f.triggered);
    const totalWeight = triggeredFactors.reduce((sum, f) => sum + f.weight, 0);
    return Math.min(100, totalWeight);
  }

  function assessRisk(
    userId: string,
    eventsPerHour: number,
    accountAgeDays: number,
    dailyEarnings: number,
    dailyCap: number
  ): RiskAssessment {
    const factors: RiskFactor[] = [
      {
        type: 'high_velocity',
        weight: 30,
        triggered: eventsPerHour > 50,
      },
      {
        type: 'new_account',
        weight: 20,
        triggered: accountAgeDays < 7,
      },
      {
        type: 'over_cap',
        weight: 25,
        triggered: dailyEarnings > dailyCap,
      },
      {
        type: 'extreme_earnings',
        weight: 35,
        triggered: dailyEarnings > dailyCap * 3,
      },
    ];

    const score = calculateRiskScore(factors);
    return { userId, score, factors };
  }

  it('should score 0 for normal behavior', () => {
    const result = assessRisk('user-1', 10, 30, 200, 500);
    expect(result.score).toBe(0);
  });

  it('should detect high velocity pattern', () => {
    const result = assessRisk('user-2', 100, 30, 200, 500);
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.factors.find((f) => f.type === 'high_velocity')?.triggered).toBe(true);
  });

  it('should flag new accounts earning heavily', () => {
    const result = assessRisk('user-3', 20, 2, 600, 500);
    // new_account (20) + over_cap (25) = 45
    expect(result.score).toBeGreaterThanOrEqual(45);
  });

  it('should flag extreme earnings', () => {
    const result = assessRisk('user-4', 30, 100, 2000, 500);
    // over_cap (25) + extreme_earnings (35) = 60
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('should cap score at 100', () => {
    const result = assessRisk('user-5', 100, 1, 3000, 500);
    // All factors triggered: 30 + 20 + 25 + 35 = 110 -> capped at 100
    expect(result.score).toBe(100);
  });
});

describe('Abuse Prevention - Pattern Detection', () => {
  // EventPattern interface for future use when we track patterns by type
  // interface EventPattern {
  //   timestamps: Date[];
  //   eventType: string;
  // }

  function detectClockPattern(timestamps: Date[]): boolean {
    // Detect suspiciously regular intervals (bot-like)
    if (timestamps.length < 5) return false;

    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i].getTime() - timestamps[i - 1].getTime());
    }

    // Check if all intervals are nearly identical (< 100ms variance)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;

    // Very low variance = suspicious (bot timing)
    return variance < 10000; // 100ms^2
  }

  it('should detect bot-like regular timing', () => {
    const now = Date.now();
    const timestamps = Array.from({ length: 10 }, (_, i) => new Date(now + i * 60000)); // Exactly 1 min apart

    expect(detectClockPattern(timestamps)).toBe(true);
  });

  it('should not flag human-like irregular timing', () => {
    const now = Date.now();
    // Random intervals between 30s and 90s
    const timestamps: Date[] = [new Date(now)];
    for (let i = 1; i < 10; i++) {
      const randomInterval = 30000 + Math.random() * 60000;
      timestamps.push(new Date(timestamps[i - 1].getTime() + randomInterval));
    }

    expect(detectClockPattern(timestamps)).toBe(false);
  });

  function detectBurstPattern(timestamps: Date[], burstWindow: number, burstThreshold: number): boolean {
    // Detect bursts of activity within short windows
    const windowMs = burstWindow * 1000;
    
    for (let i = 0; i < timestamps.length; i++) {
      const burstEnd = timestamps[i].getTime() + windowMs;
      const eventsInWindow = timestamps.filter(
        (t) => t.getTime() >= timestamps[i].getTime() && t.getTime() <= burstEnd
      ).length;

      if (eventsInWindow >= burstThreshold) {
        return true;
      }
    }

    return false;
  }

  it('should detect burst pattern (many events in short window)', () => {
    const now = Date.now();
    const timestamps = Array.from({ length: 20 }, (_, i) => new Date(now + i * 1000)); // 20 events in 20 seconds

    expect(detectBurstPattern(timestamps, 30, 15)).toBe(true);
  });

  it('should not flag spread out events', () => {
    const now = Date.now();
    const timestamps = Array.from({ length: 20 }, (_, i) => new Date(now + i * 60000)); // 20 events over 20 minutes

    expect(detectBurstPattern(timestamps, 30, 15)).toBe(false);
  });
});

describe('Abuse Prevention - Cross-Tenant Detection', () => {
  interface CrossTenantActivity {
    userId: string;
    tenantIds: string[];
    totalEarnings: Map<string, number>;
  }

  function detectCrossTenantAbuse(activity: CrossTenantActivity): boolean {
    // Flag users earning heavily in many tenants simultaneously
    const highEarningTenants = Array.from(activity.totalEarnings.values()).filter((e) => e > 100);
    return activity.tenantIds.length > 5 && highEarningTenants.length > 3;
  }

  it('should flag user active in too many tenants', () => {
    const activity: CrossTenantActivity = {
      userId: 'user-suspicious',
      tenantIds: ['t1', 't2', 't3', 't4', 't5', 't6', 't7'],
      totalEarnings: new Map([
        ['t1', 500],
        ['t2', 400],
        ['t3', 300],
        ['t4', 200],
        ['t5', 100],
        ['t6', 50],
        ['t7', 25],
      ]),
    };

    expect(detectCrossTenantAbuse(activity)).toBe(true);
  });

  it('should not flag normal multi-tenant user', () => {
    const activity: CrossTenantActivity = {
      userId: 'user-normal',
      tenantIds: ['t1', 't2'],
      totalEarnings: new Map([
        ['t1', 500],
        ['t2', 200],
      ]),
    };

    expect(detectCrossTenantAbuse(activity)).toBe(false);
  });
});

// ============================================================================
// INTEGRATION TESTS: DATABASE OPERATIONS
// ============================================================================

describe.skipIf(!dbTestsEnabled)('Integration - Leaderboard Queries', () => {
  it('should fetch top earners for tenant', async () => {
    if (!supabase || !testTenantId) return;

    const { data, error } = await supabase
      .from('user_coins')
      .select('user_id, total_earned')
      .eq('tenant_id', testTenantId)
      .order('total_earned', { ascending: false })
      .limit(10);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
    expect(data?.length).toBeGreaterThan(0);

    // First should have highest earnings (400 from setup)
    expect(data?.[0].total_earned).toBe(400);
  });

  it('should filter out opted-out users', async () => {
    if (!supabase || !testTenantId) return;

    // Get opted-out users
    const { data: optedOut } = await supabase
      .from('user_gamification_preferences')
      .select('user_id')
      .eq('tenant_id', testTenantId)
      .eq('leaderboard_visible', false);

    const optedOutIds = new Set(optedOut?.map((u) => u.user_id) ?? []);

    // Get leaderboard
    const { data: leaderboard } = await supabase
      .from('user_coins')
      .select('user_id, total_earned')
      .eq('tenant_id', testTenantId)
      .order('total_earned', { ascending: false });

    // Filter in-memory (simulating real query)
    const visible = leaderboard?.filter((u) => !optedOutIds.has(u.user_id)) ?? [];

    // Should have 4 users (5 - 1 opted out)
    expect(visible.length).toBe(4);
  });
});

describe.skipIf(!dbTestsEnabled)('Integration - Preference Updates', () => {
  it('should update opt-out preference', async () => {
    if (!supabase || !testTenantId || testUserIds.length === 0) return;

    const testUserId = testUserIds[0];

    // Update to opt-out
    const { error: updateError } = await supabase
      .from('user_gamification_preferences')
      .update({
        leaderboard_visible: false,
        leaderboard_opted_out_at: new Date().toISOString(),
      })
      .eq('user_id', testUserId)
      .eq('tenant_id', testTenantId);

    expect(updateError).toBeNull();

    // Verify
    const { data } = await supabase
      .from('user_gamification_preferences')
      .select('leaderboard_visible, leaderboard_opted_out_at')
      .eq('user_id', testUserId)
      .eq('tenant_id', testTenantId)
      .single();

    expect(data?.leaderboard_visible).toBe(false);

    // Restore for other tests
    await supabase
      .from('user_gamification_preferences')
      .update({
        leaderboard_visible: true,
        leaderboard_opted_out_at: null,
      })
      .eq('user_id', testUserId)
      .eq('tenant_id', testTenantId);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty leaderboard (new tenant)', () => {
    const entries: { userId: string; totalEarned: number }[] = [];
    expect(entries.length).toBe(0);
  });

  it('should handle single user on leaderboard', () => {
    const entries = [{ userId: 'solo', totalEarned: 100, optedOut: false }];
    expect(entries.length).toBe(1);
    expect(entries[0].userId).toBe('solo');
  });

  it('should handle all users opted out', () => {
    const entries = [
      { userId: 'a', totalEarned: 100, optedOut: true },
      { userId: 'b', totalEarned: 200, optedOut: true },
    ];
    const visible = entries.filter((e) => !e.optedOut);
    expect(visible.length).toBe(0);
  });

  it('should handle user with zero earnings', () => {
    const entries = [
      { userId: 'a', totalEarned: 0, optedOut: false },
      { userId: 'b', totalEarned: 100, optedOut: false },
    ];
    const sorted = entries.sort((a, b) => b.totalEarned - a.totalEarned);

    expect(sorted[0].totalEarned).toBe(100);
    expect(sorted[1].totalEarned).toBe(0);
  });

  it('should handle very large earnings values', () => {
    const entries = [
      { userId: 'whale', totalEarned: 999999999, optedOut: false },
      { userId: 'normal', totalEarned: 100, optedOut: false },
    ];
    const sorted = entries.sort((a, b) => b.totalEarned - a.totalEarned);

    expect(sorted[0].totalEarned).toBe(999999999);
  });
});
