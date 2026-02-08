/**
 * Unit tests for preflight validation (fail-fast before game creation)
 * 
 * These tests verify that:
 * 1. Invalid triggers block import (no game created)
 * 2. Duplicate orders are detected
 * 3. Pre-computed IDs are generated
 */

import { describe, it, expect } from 'vitest';
import { runPreflightValidation } from '@/lib/import/preflight-validation';
import type { ParsedGame } from '@/types/csv-import';

// Helper to create mock game with minimal required fields
// Uses 'as ParsedGame' because we're testing validation of potentially invalid data
const createMockGame = (overrides: Record<string, unknown> = {}): ParsedGame => ({
  game_key: 'test-game',
  name: 'Test Game',
  short_description: 'Test',
  description: null,
  play_mode: 'facilitated',
  status: 'draft',
  locale: 'sv-SE',
  steps: [
    { step_order: 1, title: 'Step 1', body: 'Body 1', duration_seconds: null },
  ],
  ...overrides,
} as ParsedGame);

const mockUUID = () => {
  let counter = 0;
  return () => `uuid-${++counter}`;
};

describe('runPreflightValidation', () => {
  describe('trigger normalization', () => {
    it('should block import when trigger has no condition', () => {
      const game = createMockGame({
        triggers: [
          { name: 'Invalid', actions: [] },  // Missing condition!
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(false);
      expect(result.blockingErrors.length).toBeGreaterThan(0);
      expect(result.blockingErrors[0].message).toContain('condition');
    });

    it('should normalize legacy trigger format', () => {
      const game = createMockGame({
        triggers: [
          {
            name: 'Legacy Trigger',
            condition_type: 'keypad_correct',
            condition_config: { artifactOrder: 1 },
            actions: [{ type: 'reveal_artifact', artifactOrder: 2 }],
          },
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(true);
      expect(result.blockingErrors).toHaveLength(0);
      expect(result.normalizedGame.triggers).toHaveLength(1);
      expect(result.normalizedGame.triggers![0].condition.type).toBe('keypad_correct');
    });

    it('should pass canonical trigger format unchanged', () => {
      const game = createMockGame({
        triggers: [
          {
            name: 'Canonical Trigger',
            condition: { type: 'manual' },
            actions: [{ type: 'advance_step' }],
            execute_once: true,
          },
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(true);
      expect(result.normalizedGame.triggers![0].condition.type).toBe('manual');
    });
  });

  describe('order collision detection', () => {
    it('should detect duplicate step_order', () => {
      const game = createMockGame({
        steps: [
          { step_order: 1, title: 'Step 1', body: 'Body 1', duration_seconds: null },
          { step_order: 1, title: 'Step 2', body: 'Body 2', duration_seconds: null },  // Duplicate!
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(false);
      expect(result.blockingErrors.some(e => e.message.includes('Duplicate step_order'))).toBe(true);
    });

    it('should detect duplicate phase_order', () => {
      const game = createMockGame({
        phases: [
          { phase_order: 1, name: 'Phase 1' },
          { phase_order: 1, name: 'Phase 2' },  // Duplicate!
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(false);
      expect(result.blockingErrors.some(e => e.message.includes('Duplicate phase_order'))).toBe(true);
    });

    it('should detect duplicate artifact_order', () => {
      const game = createMockGame({
        artifacts: [
          { artifact_order: 1, title: 'Art 1', artifact_type: 'text' },
          { artifact_order: 1, title: 'Art 2', artifact_type: 'text' },  // Duplicate!
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(false);
      expect(result.blockingErrors.some(e => e.message.includes('Duplicate artifact_order'))).toBe(true);
    });

    it('should detect duplicate role_order', () => {
      const game = createMockGame({
        roles: [
          { role_order: 1, name: 'Role 1' },
          { role_order: 1, name: 'Role 2' },  // Duplicate!
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(false);
      expect(result.blockingErrors.some(e => e.message.includes('Duplicate role_order'))).toBe(true);
    });
  });

  describe('precomputed data', () => {
    it('should generate UUIDs for all entities', () => {
      const game = createMockGame({
        steps: [{ step_order: 1, title: 'Step 1', body: 'Body', duration_seconds: null }],
        phases: [{ phase_order: 1, name: 'Phase 1' }],
        artifacts: [{ artifact_order: 1, title: 'Art 1', artifact_type: 'text' }],
        roles: [{ role_order: 1, name: 'Role 1' }],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(true);
      expect(result.precomputed.stepIdByOrder.size).toBe(1);
      expect(result.precomputed.phaseIdByOrder.size).toBe(1);
      expect(result.precomputed.artifactIdByOrder.size).toBe(1);
      expect(result.precomputed.roleIdByOrder.size).toBe(1);
    });

    it('should build role name lookup map', () => {
      const game = createMockGame({
        roles: [
          { role_order: 1, name: 'Leader' },
          { role_order: 2, name: 'Observer' },
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.precomputed.roleIdByName.has('leader')).toBe(true);
      expect(result.precomputed.roleIdByName.has('observer')).toBe(true);
    });
  });

  describe('fail-fast contract', () => {
    it('should block import if ANY trigger is invalid (not just filter)', () => {
      const game = createMockGame({
        triggers: [
          {
            name: 'Valid Trigger',
            condition: { type: 'manual' },
            actions: [],
            execute_once: false,
          },
          {
            name: 'Invalid Trigger',  // No condition!
            actions: [],
          },
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      // FAIL-FAST: even one invalid trigger blocks the entire import
      expect(result.ok).toBe(false);
      expect(result.blockingErrors.length).toBeGreaterThan(0);
    });
  });
});
