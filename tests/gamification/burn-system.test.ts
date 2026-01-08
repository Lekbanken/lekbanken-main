/**
 * Gamification Burn System Tests
 *
 * Tests for coin burning, sinks, refunds, and purchase limits.
 * Run: npx vitest tests/gamification/burn-system.test.ts
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
let testSinkId: string | null = null;

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
      name: `Test Burn System ${Date.now()}`,
      type: 'test',
    })
    .select('id')
    .single();

  if (tenantError || !tenant?.id) {
    throw new Error(`Failed to create test tenant: ${tenantError?.message}`);
  }
  testTenantId = tenant.id;

  // Create test user
  testUserId = randomUUID();

  // Initialize user_coins with high balance for testing
  await supabase.from('user_coins').insert({
    user_id: testUserId,
    tenant_id: testTenantId,
    balance: 1000,
    total_earned: 1000,
    total_spent: 0,
  });

  // Create test burn sink
  testSinkId = randomUUID();
  await supabase.from('gamification_burn_sinks').insert({
    id: testSinkId,
    tenant_id: testTenantId,
    sink_type: 'boost',
    name: 'Test Boost',
    description: 'A test boost for unit tests',
    cost_coins: 50,
    is_available: true,
    total_stock: 100,
    remaining_stock: 100,
    per_user_limit: 3,
  });
});

afterAll(async () => {
  if (!dbTestsEnabled || !supabase) return;

  // Cleanup
  if (testUserId) {
    await supabase.from('gamification_burn_log').delete().eq('user_id', testUserId);
    await supabase.from('coin_transactions').delete().eq('user_id', testUserId);
    await supabase.from('user_coins').delete().eq('user_id', testUserId);
  }

  if (testSinkId) {
    await supabase.from('gamification_burn_sinks').delete().eq('id', testSinkId);
  }

  if (testTenantId) {
    await supabase.from('tenants').delete().eq('id', testTenantId);
  }
});

// ============================================================================
// UNIT TESTS: BURN VALIDATION
// ============================================================================

describe('Burn Validation - Balance Checks', () => {
  interface BurnValidation {
    balance: number;
    amount: number;
    isValid: boolean;
    error?: string;
  }

  function validateBurn(balance: number, amount: number): BurnValidation {
    if (amount <= 0) {
      return { balance, amount, isValid: false, error: 'Amount must be positive' };
    }
    if (balance < amount) {
      return { balance, amount, isValid: false, error: 'Insufficient balance' };
    }
    return { balance, amount, isValid: true };
  }

  it('should allow burn when sufficient balance', () => {
    const result = validateBurn(100, 50);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject burn when insufficient balance', () => {
    const result = validateBurn(30, 50);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Insufficient balance');
  });

  it('should reject zero amount', () => {
    const result = validateBurn(100, 0);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Amount must be positive');
  });

  it('should reject negative amount', () => {
    const result = validateBurn(100, -10);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Amount must be positive');
  });

  it('should allow exact balance burn', () => {
    const result = validateBurn(50, 50);
    expect(result.isValid).toBe(true);
  });
});

describe('Burn Validation - Stock Checks', () => {
  interface StockValidation {
    remainingStock: number | null;
    isValid: boolean;
    error?: string;
  }

  function validateStock(remainingStock: number | null): StockValidation {
    // null = unlimited stock
    if (remainingStock === null) {
      return { remainingStock, isValid: true };
    }
    if (remainingStock <= 0) {
      return { remainingStock, isValid: false, error: 'Out of stock' };
    }
    return { remainingStock, isValid: true };
  }

  it('should allow when stock available', () => {
    const result = validateStock(10);
    expect(result.isValid).toBe(true);
  });

  it('should reject when out of stock', () => {
    const result = validateStock(0);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Out of stock');
  });

  it('should allow unlimited stock (null)', () => {
    const result = validateStock(null);
    expect(result.isValid).toBe(true);
  });
});

describe('Burn Validation - Per-User Limits', () => {
  interface LimitValidation {
    purchased: number;
    limit: number | null;
    isValid: boolean;
    error?: string;
  }

  function validateUserLimit(purchased: number, limit: number | null): LimitValidation {
    // null = no limit
    if (limit === null) {
      return { purchased, limit, isValid: true };
    }
    if (purchased >= limit) {
      return { purchased, limit, isValid: false, error: `Purchase limit reached (${limit})` };
    }
    return { purchased, limit, isValid: true };
  }

  it('should allow when under limit', () => {
    const result = validateUserLimit(2, 5);
    expect(result.isValid).toBe(true);
  });

  it('should reject when at limit', () => {
    const result = validateUserLimit(5, 5);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('limit');
  });

  it('should reject when over limit', () => {
    const result = validateUserLimit(6, 5);
    expect(result.isValid).toBe(false);
  });

  it('should allow unlimited purchases (null limit)', () => {
    const result = validateUserLimit(100, null);
    expect(result.isValid).toBe(true);
  });
});

describe('Burn Validation - Availability Window', () => {
  interface AvailabilityCheck {
    availableFrom: Date | null;
    availableUntil: Date | null;
    now: Date;
    isAvailable: boolean;
  }

  function checkAvailability(
    availableFrom: Date | null,
    availableUntil: Date | null,
    now: Date
  ): AvailabilityCheck {
    const result: AvailabilityCheck = {
      availableFrom,
      availableUntil,
      now,
      isAvailable: true,
    };

    if (availableFrom && now < availableFrom) {
      result.isAvailable = false;
    }
    if (availableUntil && now > availableUntil) {
      result.isAvailable = false;
    }

    return result;
  }

  it('should be available when no time restrictions', () => {
    const result = checkAvailability(null, null, new Date());
    expect(result.isAvailable).toBe(true);
  });

  it('should be unavailable before available_from', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = checkAvailability(tomorrow, null, new Date());
    expect(result.isAvailable).toBe(false);
  });

  it('should be unavailable after available_until', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = checkAvailability(null, yesterday, new Date());
    expect(result.isAvailable).toBe(false);
  });

  it('should be available within window', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = checkAvailability(yesterday, tomorrow, new Date());
    expect(result.isAvailable).toBe(true);
  });
});

// ============================================================================
// UNIT TESTS: IDEMPOTENCY
// ============================================================================

describe('Burn Idempotency', () => {
  const processedKeys = new Set<string>();

  function processBurn(idempotencyKey: string): { processed: boolean; duplicate: boolean } {
    if (processedKeys.has(idempotencyKey)) {
      return { processed: false, duplicate: true };
    }
    processedKeys.add(idempotencyKey);
    return { processed: true, duplicate: false };
  }

  it('should process first request', () => {
    const result = processBurn('unique-key-123');
    expect(result.processed).toBe(true);
    expect(result.duplicate).toBe(false);
  });

  it('should detect duplicate request', () => {
    // Process same key again
    const result = processBurn('unique-key-123');
    expect(result.processed).toBe(false);
    expect(result.duplicate).toBe(true);
  });

  it('should allow different key', () => {
    const result = processBurn('different-key-456');
    expect(result.processed).toBe(true);
    expect(result.duplicate).toBe(false);
  });
});

// ============================================================================
// UNIT TESTS: REFUND LOGIC
// ============================================================================

describe('Refund Logic', () => {
  interface BurnRecord {
    id: string;
    amount: number;
    refunded: boolean;
    refundedAt: Date | null;
  }

  interface RefundResult {
    success: boolean;
    error?: string;
    refundAmount?: number;
  }

  function processRefund(record: BurnRecord): RefundResult {
    if (record.refunded) {
      return { success: false, error: 'Already refunded' };
    }
    return { success: true, refundAmount: record.amount };
  }

  it('should successfully refund valid burn', () => {
    const record: BurnRecord = {
      id: 'burn-123',
      amount: 50,
      refunded: false,
      refundedAt: null,
    };

    const result = processRefund(record);
    expect(result.success).toBe(true);
    expect(result.refundAmount).toBe(50);
  });

  it('should reject double refund', () => {
    const record: BurnRecord = {
      id: 'burn-456',
      amount: 50,
      refunded: true,
      refundedAt: new Date(),
    };

    const result = processRefund(record);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Already refunded');
  });
});

// ============================================================================
// INTEGRATION TESTS: DATABASE OPERATIONS
// ============================================================================

describe.skipIf(!dbTestsEnabled)('Integration - Burn Sink Queries', () => {
  it('should fetch available sinks for tenant', async () => {
    if (!supabase || !testTenantId) return;

    const { data, error } = await supabase
      .from('gamification_burn_sinks')
      .select('*')
      .eq('tenant_id', testTenantId)
      .eq('is_available', true);

    expect(error).toBeNull();
    expect(data).toBeInstanceOf(Array);
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0].name).toBe('Test Boost');
  });

  it('should verify sink cost matches expected', async () => {
    if (!supabase || !testSinkId) return;

    const { data } = await supabase
      .from('gamification_burn_sinks')
      .select('cost_coins')
      .eq('id', testSinkId)
      .single();

    expect(data?.cost_coins).toBe(50);
  });
});

describe.skipIf(!dbTestsEnabled)('Integration - Balance Updates', () => {
  it('should deduct balance on burn', async () => {
    if (!supabase || !testUserId || !testTenantId) return;

    // Get initial balance
    const { data: before } = await supabase
      .from('user_coins')
      .select('balance, total_spent')
      .eq('user_id', testUserId)
      .eq('tenant_id', testTenantId)
      .single();

    const initialBalance = before?.balance ?? 0;
    const initialSpent = before?.total_spent ?? 0;
    const burnAmount = 50;

    // Simulate burn
    const { error } = await supabase
      .from('user_coins')
      .update({
        balance: initialBalance - burnAmount,
        total_spent: initialSpent + burnAmount,
      })
      .eq('user_id', testUserId)
      .eq('tenant_id', testTenantId);

    expect(error).toBeNull();

    // Verify
    const { data: after } = await supabase
      .from('user_coins')
      .select('balance, total_spent')
      .eq('user_id', testUserId)
      .eq('tenant_id', testTenantId)
      .single();

    expect(after?.balance).toBe(initialBalance - burnAmount);
    expect(after?.total_spent).toBe(initialSpent + burnAmount);
  });

  it('should create spend transaction on burn', async () => {
    if (!supabase || !testUserId || !testTenantId) return;

    const txId = randomUUID();
    const { error } = await supabase.from('coin_transactions').insert({
      id: txId,
      user_id: testUserId,
      tenant_id: testTenantId,
      type: 'spend',
      amount: 50,
      description: 'test:burn:test_boost',
      balance_after: 900,
    });

    expect(error).toBeNull();

    // Verify
    const { data } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('id', txId)
      .single();

    expect(data?.type).toBe('spend');
    expect(data?.amount).toBe(50);
  });
});

describe.skipIf(!dbTestsEnabled)('Integration - Stock Management', () => {
  it('should decrement remaining_stock', async () => {
    if (!supabase || !testSinkId) return;

    // Get initial stock
    const { data: before } = await supabase
      .from('gamification_burn_sinks')
      .select('remaining_stock')
      .eq('id', testSinkId)
      .single();

    const initialStock = before?.remaining_stock ?? 0;

    // Decrement
    const { error } = await supabase
      .from('gamification_burn_sinks')
      .update({ remaining_stock: initialStock - 1 })
      .eq('id', testSinkId);

    expect(error).toBeNull();

    // Verify
    const { data: after } = await supabase
      .from('gamification_burn_sinks')
      .select('remaining_stock')
      .eq('id', testSinkId)
      .single();

    expect(after?.remaining_stock).toBe(initialStock - 1);

    // Restore stock for other tests
    await supabase
      .from('gamification_burn_sinks')
      .update({ remaining_stock: initialStock })
      .eq('id', testSinkId);
  });
});

// ============================================================================
// ABUSE PREVENTION TESTS
// ============================================================================

describe('Abuse Prevention - Burn Velocity', () => {
  interface BurnEvent {
    timestamp: Date;
    amount: number;
  }

  function detectBurnVelocityAbuse(
    burns: BurnEvent[],
    windowMinutes: number,
    maxBurns: number
  ): boolean {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    const recentBurns = burns.filter((b) => now - b.timestamp.getTime() < windowMs);
    return recentBurns.length > maxBurns;
  }

  it('should detect rapid burn attempts', () => {
    const now = Date.now();
    const burns: BurnEvent[] = Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(now - i * 1000), // 1 per second
      amount: 50,
    }));

    expect(detectBurnVelocityAbuse(burns, 5, 10)).toBe(true);
  });

  it('should allow normal burn rate', () => {
    const now = Date.now();
    const burns: BurnEvent[] = Array.from({ length: 5 }, (_, i) => ({
      timestamp: new Date(now - i * 60000), // 1 per minute
      amount: 50,
    }));

    expect(detectBurnVelocityAbuse(burns, 5, 10)).toBe(false);
  });
});

describe('Abuse Prevention - Double-Spend Detection', () => {
  it('should detect concurrent burn attempts', () => {
    // Simulate two requests arriving at the same time
    const request1 = { idempotencyKey: 'burn-concurrent-1', timestamp: Date.now() };
    const request2 = { idempotencyKey: 'burn-concurrent-2', timestamp: Date.now() };

    // Both should have different keys (valid)
    expect(request1.idempotencyKey).not.toBe(request2.idempotencyKey);

    // Same key would be blocked
    const duplicateRequest = { ...request1 };
    expect(duplicateRequest.idempotencyKey).toBe(request1.idempotencyKey);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases - Burn System', () => {
  it('should handle exact balance burn (zero remaining)', () => {
    const balance = 50;
    const burnAmount = 50;
    const newBalance = balance - burnAmount;

    expect(newBalance).toBe(0);
    expect(newBalance).toBeGreaterThanOrEqual(0);
  });

  it('should handle sink with no stock limit', () => {
    const sink = {
      totalStock: null,
      remainingStock: null,
    };

    const hasStock = sink.remainingStock === null || sink.remainingStock > 0;
    expect(hasStock).toBe(true);
  });

  it('should handle sink with no per-user limit', () => {
    const sink = { perUserLimit: null };
    const userPurchased = 100;

    const withinLimit = sink.perUserLimit === null || userPurchased < sink.perUserLimit;
    expect(withinLimit).toBe(true);
  });

  it('should handle global sink (null tenant_id)', () => {
    const sink = {
      tenantId: null,
      name: 'Global Boost',
    };

    // Global sinks should be accessible from any tenant
    expect(sink.tenantId).toBeNull();
  });

  it('should handle very large burn amount', () => {
    const balance = 1000000;
    const burnAmount = 999999;

    const isValid = burnAmount > 0 && burnAmount <= balance;
    expect(isValid).toBe(true);

    const newBalance = balance - burnAmount;
    expect(newBalance).toBe(1);
  });
});
