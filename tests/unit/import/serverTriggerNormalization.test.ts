/**
 * Unit tests for server-side trigger normalization (fail-fast)
 * 
 * These tests verify that:
 * 1. Legacy trigger format is normalized server-side
 * 2. Invalid triggers cause blocking errors (no game created)
 * 3. Canonical format passes through unchanged
 */

import { describe, it, expect } from 'vitest';
import { 
  normalizeLegacyTrigger, 
  normalizeAndValidateGameTriggers,
  validateTrigger,
  hasBlockingTriggerErrors,
} from '@/lib/import/trigger-normalization';

describe('normalizeLegacyTrigger (server-side)', () => {
  it('should normalize legacy condition_type to condition.type', () => {
    const legacyTrigger = {
      name: 'Test Trigger',
      condition_type: 'keypad_correct',
      condition_config: { artifactOrder: 2 },
      actions: [{ type: 'reveal_artifact', artifactOrder: 3 }],
      execute_once: true,
    };

    const normalized = normalizeLegacyTrigger(legacyTrigger);

    expect(normalized).not.toBeNull();
    expect(normalized!.condition.type).toBe('keypad_correct');
    expect((normalized!.condition as Record<string, unknown>).artifactOrder).toBe(2);
  });

  it('should pass through canonical format unchanged', () => {
    const canonicalTrigger = {
      name: 'Canonical Trigger',
      condition: { type: 'step_started', stepOrder: 1 },
      actions: [{ type: 'advance_step' }],
      execute_once: true,
    };

    const normalized = normalizeLegacyTrigger(canonicalTrigger);

    expect(normalized).not.toBeNull();
    expect(normalized!.condition.type).toBe('step_started');
  });

  it('should return null for triggers missing both condition formats', () => {
    const invalidTrigger = {
      name: 'Invalid Trigger',
      actions: [{ type: 'reveal_artifact' }],
    };

    const normalized = normalizeLegacyTrigger(invalidTrigger);

    expect(normalized).toBeNull();
  });
});

describe('validateTrigger (server-side)', () => {
  it('should return errors for trigger without condition.type', () => {
    // Using 'as any' because we're intentionally testing invalid data
    const trigger = {
      name: 'Bad Trigger',
      condition: { stepOrder: 1 },  // Missing type!
      actions: [],
      execute_once: false,
    } as unknown as Parameters<typeof validateTrigger>[0];

    const errors = validateTrigger(trigger, 0);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('condition.type');
  });

  it('should return errors for action without type', () => {
    // Using 'as any' because we're intentionally testing invalid data
    const trigger = {
      name: 'Bad Action Trigger',
      condition: { type: 'manual' },
      actions: [{ artifactOrder: 1 }],  // Missing type!
      execute_once: false,
    } as unknown as Parameters<typeof validateTrigger>[0];

    const errors = validateTrigger(trigger, 0);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field.includes('actions'))).toBe(true);
  });

  it('should return no errors for valid trigger', () => {
    const trigger = {
      name: 'Good Trigger',
      condition: { type: 'manual' },
      actions: [{ type: 'advance_step' }],
      execute_once: false,
    } as unknown as Parameters<typeof validateTrigger>[0];

    const errors = validateTrigger(trigger, 0);

    expect(errors).toHaveLength(0);
  });
});

describe('normalizeAndValidateGameTriggers (server-side)', () => {
  it('should return blocking errors for un-normalizable triggers', () => {
    const rawTriggers = [
      { name: 'Invalid', actions: [] },  // No condition!
    ];

    const result = normalizeAndValidateGameTriggers(rawTriggers, 'test-game');

    expect(result.triggers).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(hasBlockingTriggerErrors(result)).toBe(true);
  });

  it('should normalize legacy triggers and pass validation', () => {
    const rawTriggers = [
      {
        name: 'Legacy Trigger',
        condition_type: 'keypad_correct',
        condition_config: { artifactOrder: 1 },
        actions: [{ type: 'reveal_artifact', artifactOrder: 2 }],
      },
    ];

    const result = normalizeAndValidateGameTriggers(rawTriggers, 'test-game');

    expect(result.triggers).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    expect(hasBlockingTriggerErrors(result)).toBe(false);
    expect(result.triggers[0].condition.type).toBe('keypad_correct');
  });

  it('should fail fast: all triggers must be valid for success', () => {
    const rawTriggers = [
      { condition_type: 'valid', actions: [] },  // Valid
      { name: 'invalid', actions: [] },           // Invalid - no condition
    ];

    const result = normalizeAndValidateGameTriggers(rawTriggers, 'test-game');

    // Only 1 valid trigger, 1 failed
    expect(result.triggers).toHaveLength(1);
    expect(result.failedIndexes).toEqual([1]);
    expect(hasBlockingTriggerErrors(result)).toBe(true);  // ANY error = blocking
  });
});

describe('Server-side entry point independence', () => {
  it('should work without UI parser (direct server call)', () => {
    // This simulates a script/curl calling the API directly
    // The server must normalize triggers even if UI parser wasn't used
    
    const rawPayloadTriggers = [
      {
        name: 'Direct API Trigger',
        condition_type: 'phase_started',  // Legacy format
        condition_config: { phaseOrder: 2 },
        actions: [{ type: 'send_message', message: 'Phase 2 started!' }],
        execute_once: false,
      },
    ];

    const result = normalizeAndValidateGameTriggers(rawPayloadTriggers, 'direct-api-test');

    expect(result.triggers.length).toBeGreaterThan(0);
    expect(result.triggers[0].condition.type).toBe('phase_started');
  });
});
