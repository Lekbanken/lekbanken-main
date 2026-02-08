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

  describe('step-phase linkage', () => {
    it('should resolve phase_order to phase_id', () => {
      const game = createMockGame({
        phases: [
          { phase_order: 1, name: 'Phase 1', phase_type: 'intro' },
          { phase_order: 2, name: 'Phase 2', phase_type: 'main' },
        ],
        steps: [
          { step_order: 1, title: 'Step 1', body: 'Body', duration_seconds: null, phase_order: 1 },
          { step_order: 2, title: 'Step 2', body: 'Body', duration_seconds: null, phase_order: 2 },
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(true);
      expect(result.precomputed.stepPhaseIdByOrder.size).toBe(2);
      
      // Verify phase_order was resolved to phase_id
      const step1PhaseId = result.precomputed.stepPhaseIdByOrder.get(1);
      const step2PhaseId = result.precomputed.stepPhaseIdByOrder.get(2);
      const phase1Id = result.precomputed.phaseIdByOrder.get(1);
      const phase2Id = result.precomputed.phaseIdByOrder.get(2);
      
      expect(step1PhaseId).toBe(phase1Id);
      expect(step2PhaseId).toBe(phase2Id);
      
      // Verify normalized game has phase_id (not phase_order)
      expect(result.normalizedGame.steps![0].phase_id).toBe(phase1Id);
      expect(result.normalizedGame.steps![1].phase_id).toBe(phase2Id);
    });

    it('should block if both phase_id and phase_order are present', () => {
      const game = createMockGame({
        phases: [{ phase_order: 1, name: 'Phase 1', phase_type: 'intro' }],
        steps: [
          { 
            step_order: 1, 
            title: 'Step 1', 
            body: 'Body', 
            duration_seconds: null,
            phase_id: '550e8400-e29b-41d4-a716-446655440000',
            phase_order: 1,  // BOTH present = error
          },
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(false);
      expect(result.blockingErrors.some(e => e.code === 'STEP_PHASE_REF_BOTH_PRESENT')).toBe(true);
    });

    it('should block if phase_order references non-existent phase', () => {
      const game = createMockGame({
        phases: [{ phase_order: 1, name: 'Phase 1', phase_type: 'intro' }],
        steps: [
          { step_order: 1, title: 'Step 1', body: 'Body', duration_seconds: null, phase_order: 99 },  // No phase 99!
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(false);
      expect(result.blockingErrors.some(e => e.code === 'STEP_PHASE_ORDER_NOT_FOUND')).toBe(true);
      expect(result.blockingErrors[0].message).toContain('99');
    });

    it('should block if phase_id is not a valid UUID', () => {
      const game = createMockGame({
        steps: [
          { step_order: 1, title: 'Step 1', body: 'Body', duration_seconds: null, phase_id: 'not-a-uuid' },
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(false);
      expect(result.blockingErrors.some(e => e.code === 'STEP_PHASE_ID_INVALID')).toBe(true);
    });

    it('should allow valid phase_id UUID', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const game = createMockGame({
        steps: [
          { step_order: 1, title: 'Step 1', body: 'Body', duration_seconds: null, phase_id: validUUID },
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(true);
      expect(result.precomputed.stepPhaseIdByOrder.get(1)).toBe(validUUID);
    });

    it('should allow steps without phase reference (null)', () => {
      const game = createMockGame({
        phases: [{ phase_order: 1, name: 'Phase 1', phase_type: 'intro' }],
        steps: [
          { step_order: 1, title: 'Step 1', body: 'Body', duration_seconds: null },  // No phase reference
          { step_order: 2, title: 'Step 2', body: 'Body', duration_seconds: null, phase_order: 1 },
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(true);
      expect(result.precomputed.stepPhaseIdByOrder.get(1)).toBeNull();
      expect(result.precomputed.stepPhaseIdByOrder.get(2)).toBe(result.precomputed.phaseIdByOrder.get(1));
    });

    it('should block if phase_order is not a positive integer', () => {
      const game = createMockGame({
        phases: [{ phase_order: 1, name: 'Phase 1', phase_type: 'intro' }],
        steps: [
          { step_order: 1, title: 'Step 1', body: 'Body', duration_seconds: null, phase_order: -1 },
        ],
      });

      const result = runPreflightValidation(game, mockUUID());

      expect(result.ok).toBe(false);
      expect(result.blockingErrors.some(e => e.code === 'STEP_PHASE_ORDER_INVALID')).toBe(true);
    });
  });
});
