/**
 * Unit tests for legacy trigger format normalization
 * 
 * Tests that triggers using the legacy format:
 *   { condition_type, condition_config, actions[].artifactOrder }
 * 
 * Are normalized to canonical format:
 *   { condition: { type, artifactOrder }, actions[].artifactOrder }
 * 
 * Note: The canonical format uses camelCase for order aliases to match
 * ParsedTriggerCondition and ParsedTriggerAction types.
 */

import { describe, it, expect } from 'vitest';
import { 
  normalizeLegacyTrigger, 
  normalizeGameTriggers,
  parseGamesFromJsonPayload 
} from '@/features/admin/games/utils/json-game-import';

describe('normalizeLegacyTrigger', () => {
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
    expect(normalized!.condition).toEqual({
      type: 'keypad_correct',
      artifactOrder: 2,
    });
  });

  it('should preserve camelCase action fields', () => {
    const legacyTrigger = {
      name: 'Test Trigger',
      condition_type: 'step_started',
      condition_config: { stepOrder: 1 },
      actions: [
        { type: 'reveal_artifact', artifactOrder: 3 },
        { type: 'advance_step' },
        { type: 'advance_phase' },
      ],
      execute_once: false,
    };

    const normalized = normalizeLegacyTrigger(legacyTrigger);

    expect(normalized).not.toBeNull();
    expect(normalized!.condition).toHaveProperty('stepOrder', 1);
    expect(normalized!.actions[0]).toEqual({ type: 'reveal_artifact', artifactOrder: 3 });
    expect(normalized!.actions[1]).toEqual({ type: 'advance_step' });
    expect(normalized!.actions[2]).toEqual({ type: 'advance_phase' });
  });

  it('should pass through triggers that already have canonical format', () => {
    const canonicalTrigger = {
      name: 'Canonical Trigger',
      condition: { type: 'keypad_correct', artifactOrder: 2 },
      actions: [{ type: 'reveal_artifact', artifactOrder: 3 }],
      execute_once: true,
    };

    const normalized = normalizeLegacyTrigger(canonicalTrigger);

    expect(normalized).not.toBeNull();
    expect(normalized!.condition).toEqual({
      type: 'keypad_correct',
      artifactOrder: 2,
    });
  });

  it('should return null for triggers missing both condition and condition_type', () => {
    const invalidTrigger = {
      name: 'Invalid Trigger',
      actions: [{ type: 'reveal_artifact' }],
    };

    const normalized = normalizeLegacyTrigger(invalidTrigger);

    expect(normalized).toBeNull();
  });

  it('should handle empty condition_config', () => {
    const trigger = {
      name: 'Simple Trigger',
      condition_type: 'game_started',
      actions: [{ type: 'send_message', message: 'Hello' }],
    };

    const normalized = normalizeLegacyTrigger(trigger);

    expect(normalized).not.toBeNull();
    expect(normalized!.condition).toEqual({ type: 'game_started' });
  });

  it('should set default values for optional fields', () => {
    const minimalTrigger = {
      condition_type: 'manual',
      actions: [],
    };

    const normalized = normalizeLegacyTrigger(minimalTrigger);

    expect(normalized).not.toBeNull();
    expect(normalized!.name).toBe('Unnamed trigger');
    expect(normalized!.enabled).toBe(true);
    expect(normalized!.execute_once).toBe(false);
    expect(normalized!.delay_seconds).toBe(0);
    expect(normalized!.sort_order).toBe(0);
  });
});

describe('normalizeGameTriggers', () => {
  it('should normalize all valid triggers and track failed ones', () => {
    const rawTriggers = [
      { condition_type: 'keypad_correct', actions: [] },  // Valid
      { name: 'Missing condition', actions: [] },         // Invalid - no condition
      { condition: { type: 'manual' }, actions: [] },     // Valid (canonical)
    ];

    const result = normalizeGameTriggers(rawTriggers);

    expect(result.triggers).toHaveLength(2);
    expect(result.failedIndexes).toEqual([1]);
  });

  it('should return empty arrays for empty input', () => {
    const result = normalizeGameTriggers([]);

    expect(result.triggers).toHaveLength(0);
    expect(result.failedIndexes).toHaveLength(0);
  });
});

describe('parseGamesFromJsonPayload - trigger normalization', () => {
  it('should normalize legacy triggers during JSON parsing', () => {
    const payload = JSON.stringify([{
      game_key: 'test-game',
      name: 'Test Game',
      steps: [{ step_order: 1, title: 'Step 1', body: 'Body' }],
      triggers: [{
        name: 'Legacy Trigger',
        condition_type: 'keypad_correct',
        condition_config: { artifactOrder: 1 },
        actions: [{ type: 'reveal_artifact', artifactOrder: 2 }],
        execute_once: true,
      }],
    }]);

    const games = parseGamesFromJsonPayload(payload);

    expect(games).toHaveLength(1);
    expect(games[0].triggers).toHaveLength(1);
    
    const trigger = games[0].triggers![0];
    expect(trigger.condition).toEqual({
      type: 'keypad_correct',
      artifactOrder: 1,
    });
    expect(trigger.actions[0]).toEqual({
      type: 'reveal_artifact',
      artifactOrder: 2,
    });
  });

  it('should filter out triggers that cannot be normalized', () => {
    const payload = JSON.stringify([{
      game_key: 'test-game',
      name: 'Test Game',
      steps: [{ step_order: 1, title: 'Step 1', body: 'Body' }],
      triggers: [
        { condition_type: 'valid', actions: [] },  // Valid
        { name: 'invalid', actions: [] },           // Invalid - no condition
      ],
    }]);

    const games = parseGamesFromJsonPayload(payload);

    expect(games[0].triggers).toHaveLength(1);
    expect(games[0].triggers![0].condition.type).toBe('valid');
  });

  it('should handle games with no triggers', () => {
    const payload = JSON.stringify([{
      game_key: 'test-game',
      name: 'Test Game',
      steps: [{ step_order: 1, title: 'Step 1', body: 'Body' }],
    }]);

    const games = parseGamesFromJsonPayload(payload);

    expect(games[0].triggers).toBeUndefined();
  });
});
