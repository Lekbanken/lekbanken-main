/**
 * Contract Tests for Trigger Reference Rewriting
 * 
 * Tests that lock in behavior for the trigger ref rewrite system.
 * Based on the policy: All refs must be resolvable - no dangling refs allowed.
 */

import { describe, it, expect } from 'vitest';
import {
  rewriteTriggerRefs,
  rewriteAllTriggerRefs,
  type TriggerIdMap,
  type TriggerPayload,
} from '@/lib/import/triggerRefRewrite';

describe('triggerRefRewrite contract tests', () => {
  // =========================================================================
  // Test 1: Missing artifact ref → error
  // =========================================================================
  describe('missing artifact ref', () => {
    it('should return error when artifactOrder is not in map', () => {
      const trigger: TriggerPayload = {
        name: 'Test Trigger',
        condition: { type: 'manual' },
        actions: [
          { type: 'reveal_artifact', artifactOrder: 99 }, // Not in map
        ],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map([[1, 'uuid-artifact-1']]), // Only has order 1
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].column).toBe('triggers[0].actions[0].artifactOrder');
      expect(result.errors[0].message).toContain('Missing artifact mapping for order 99');
      expect(result.errors[0].severity).toBe('error');
    });

    it('should return error when artifactId (string) is not in map', () => {
      const trigger: TriggerPayload = {
        name: 'Test Trigger',
        condition: { type: 'manual' },
        actions: [
          { type: 'reveal_artifact', artifactId: 'temp-missing' }, // Not in map
        ],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map(),
        artifactIdBySourceId: new Map([['temp-a', 'uuid-artifact-a']]),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].column).toBe('triggers[0].actions[0].artifactId');
      expect(result.errors[0].message).toContain('Missing artifact mapping for source ID "temp-missing"');
    });
  });

  // =========================================================================
  // Test 2: Mapped artifact ref → rewritten
  // =========================================================================
  describe('mapped artifact ref', () => {
    it('should rewrite artifactOrder to artifactId with resolved UUID', () => {
      const trigger: TriggerPayload = {
        name: 'Test Trigger',
        condition: { type: 'manual' },
        actions: [
          { type: 'reveal_artifact', artifactOrder: 2 },
        ],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map([[2, 'uuid-artifact-2']]),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.trigger.actions[0]).toEqual({
        type: 'reveal_artifact',
        artifactId: 'uuid-artifact-2',
      });
      // artifactOrder should be removed
      expect(result.trigger.actions[0]).not.toHaveProperty('artifactOrder');
    });

    it('should rewrite source ID to resolved UUID', () => {
      const trigger: TriggerPayload = {
        name: 'Test Trigger',
        condition: { type: 'manual' },
        actions: [
          { type: 'hide_artifact', artifactId: 'temp-xyz' },
        ],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map(),
        artifactIdBySourceId: new Map([['temp-xyz', 'uuid-artifact-xyz']]),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.trigger.actions[0]).toEqual({
        type: 'hide_artifact',
        artifactId: 'uuid-artifact-xyz',
      });
    });
  });

  // =========================================================================
  // Test 3: Condition ref (stepId) → rewritten
  // =========================================================================
  describe('condition ref rewrite', () => {
    it('should rewrite stepOrder in step_started condition', () => {
      const trigger: TriggerPayload = {
        name: 'Test Trigger',
        condition: { type: 'step_started', stepOrder: 3 },
        actions: [],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map([[3, 'uuid-step-3']]),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map(),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.trigger.condition).toEqual({
        type: 'step_started',
        stepId: 'uuid-step-3',
      });
    });

    it('should rewrite phaseOrder in phase_completed condition', () => {
      const trigger: TriggerPayload = {
        name: 'Test Trigger',
        condition: { type: 'phase_completed', phaseOrder: 1 },
        actions: [],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map([[1, 'uuid-phase-1']]),
        artifactIdByOrder: new Map(),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.trigger.condition).toEqual({
        type: 'phase_completed',
        phaseId: 'uuid-phase-1',
      });
    });

    it('should return error for missing step mapping', () => {
      const trigger: TriggerPayload = {
        name: 'Test Trigger',
        condition: { type: 'step_started', stepOrder: 99 },
        actions: [],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(), // Empty
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map(),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].column).toBe('triggers[0].condition.stepOrder');
      expect(result.errors[0].message).toContain('Missing step mapping for order 99');
    });
  });

  // =========================================================================
  // Test 4: Mixed refs (condition + actions) → all rewritten
  // =========================================================================
  describe('mixed refs rewrite', () => {
    it('should rewrite both condition and action refs', () => {
      const trigger: TriggerPayload = {
        name: 'Mixed Trigger',
        condition: { type: 'phase_started', phaseOrder: 2 },
        actions: [
          { type: 'reveal_artifact', artifactOrder: 5 },
          { type: 'hide_artifact', artifactOrder: 6 },
        ],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map([[2, 'uuid-phase-2']]),
        artifactIdByOrder: new Map([
          [5, 'uuid-artifact-5'],
          [6, 'uuid-artifact-6'],
        ]),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.trigger.condition).toEqual({
        type: 'phase_started',
        phaseId: 'uuid-phase-2',
      });
      expect(result.trigger.actions).toEqual([
        { type: 'reveal_artifact', artifactId: 'uuid-artifact-5' },
        { type: 'hide_artifact', artifactId: 'uuid-artifact-6' },
      ]);
    });

    it('should collect errors from both condition and actions', () => {
      const trigger: TriggerPayload = {
        name: 'Broken Trigger',
        condition: { type: 'step_started', stepOrder: 99 }, // Missing
        actions: [
          { type: 'reveal_artifact', artifactOrder: 88 }, // Missing
        ],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map(),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(2);
      expect(result.errors.map(e => e.column)).toContain('triggers[0].condition.stepOrder');
      expect(result.errors.map(e => e.column)).toContain('triggers[0].actions[0].artifactOrder');
    });
  });

  // =========================================================================
  // Test 5: Unknown action/condition type → error (POLICY)
  // =========================================================================
  describe('unknown types (POLICY)', () => {
    it('should return error for unknown condition type', () => {
      const trigger: TriggerPayload = {
        name: 'Bad Condition',
        condition: { type: 'made_up_condition', foo: 'bar' },
        actions: [],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map(),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].column).toBe('triggers[0].condition.type');
      expect(result.errors[0].message).toContain('Unknown condition type: "made_up_condition"');
      expect(result.errors[0].message).toContain('POLICY');
    });

    it('should return error for unknown action type', () => {
      const trigger: TriggerPayload = {
        name: 'Bad Action',
        condition: { type: 'manual' },
        actions: [
          { type: 'made_up_action', artifactId: 'something' },
        ],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map(),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].column).toBe('triggers[0].actions[0].type');
      expect(result.errors[0].message).toContain('Unknown action type: "made_up_action"');
      expect(result.errors[0].message).toContain('POLICY');
    });

    it('should return error for missing condition type', () => {
      const trigger: TriggerPayload = {
        name: 'No Type',
        condition: { someField: 'value' }, // No type field
        actions: [],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map(),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].column).toBe('triggers[0].condition.type');
      expect(result.errors[0].message).toContain('Condition missing type field');
    });
  });

  // =========================================================================
  // Test 6: Idempotent behavior (UUID passthrough)
  // =========================================================================
  describe('idempotent UUID handling', () => {
    it('should accept existing UUID without mapping (passthrough)', () => {
      const existingUuid = '12345678-1234-1234-1234-123456789abc';
      const trigger: TriggerPayload = {
        name: 'UUID Trigger',
        condition: { type: 'manual' },
        actions: [
          { type: 'reveal_artifact', artifactId: existingUuid },
        ],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map(),
        // No artifactIdBySourceId mapping for this UUID
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.trigger.actions[0]).toEqual({
        type: 'reveal_artifact',
        artifactId: existingUuid,
      });
    });

    it('should warn when UUID not in import batch', () => {
      const externalUuid = '12345678-1234-1234-1234-123456789abc';
      const trigger: TriggerPayload = {
        name: 'External UUID',
        condition: { type: 'manual' },
        actions: [
          { type: 'reveal_artifact', artifactId: externalUuid },
        ],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map(),
        importBatchUuids: new Set(['other-uuid-in-batch']), // External UUID not in batch
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].column).toBe('triggers[0].actions[0].artifactId');
      expect(result.warnings[0].message).toContain('not in import batch');
      // Still passes through
      expect(result.trigger.actions[0].artifactId).toBe(externalUuid);
    });

    it('should accept UUID that is in import batch without warning', () => {
      const batchUuid = '12345678-1234-1234-1234-123456789abc';
      const trigger: TriggerPayload = {
        name: 'Batch UUID',
        condition: { type: 'manual' },
        actions: [
          { type: 'reveal_artifact', artifactId: batchUuid },
        ],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map(),
        importBatchUuids: new Set([batchUuid]), // UUID is in batch
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  // =========================================================================
  // Test 7: rewriteAllTriggerRefs batch processing
  // =========================================================================
  describe('rewriteAllTriggerRefs batch processing', () => {
    it('should process multiple triggers and collect all errors', () => {
      const triggers: TriggerPayload[] = [
        {
          name: 'Trigger 1',
          condition: { type: 'step_started', stepOrder: 1 },
          actions: [{ type: 'reveal_artifact', artifactOrder: 1 }],
        },
        {
          name: 'Trigger 2',
          condition: { type: 'step_started', stepOrder: 99 }, // Missing
          actions: [{ type: 'reveal_artifact', artifactOrder: 88 }], // Missing
        },
      ];

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map([[1, 'uuid-step-1']]),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map([[1, 'uuid-artifact-1']]),
      };

      const result = rewriteAllTriggerRefs(triggers, idMap, 'test-game');

      // First trigger should be rewritten successfully
      expect(result.triggers[0].condition).toEqual({
        type: 'step_started',
        stepId: 'uuid-step-1',
      });
      expect(result.triggers[0].actions[0].artifactId).toBe('uuid-artifact-1');

      // Second trigger should have errors
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain('[test-game]');
      expect(result.errors[0].column).toBe('triggers[1].condition.stepOrder');
      expect(result.errors[1].column).toBe('triggers[1].actions[0].artifactOrder');
    });
  });

  // =========================================================================
  // Test 8: Artifact-specific condition types
  // =========================================================================
  describe('artifact-specific condition types', () => {
    it('should rewrite keypadId in keypad_correct condition', () => {
      const trigger: TriggerPayload = {
        name: 'Keypad Trigger',
        condition: { type: 'keypad_correct', artifactOrder: 4 },
        actions: [],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map([[4, 'uuid-keypad-4']]),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.trigger.condition).toEqual({
        type: 'keypad_correct',
        keypadId: 'uuid-keypad-4',
      });
    });

    it('should rewrite riddleId in riddle_correct condition', () => {
      const trigger: TriggerPayload = {
        name: 'Riddle Trigger',
        condition: { type: 'riddle_correct', riddleId: 'temp-riddle' },
        actions: [],
      };

      const idMap: TriggerIdMap = {
        stepIdByOrder: new Map(),
        phaseIdByOrder: new Map(),
        artifactIdByOrder: new Map(),
        artifactIdBySourceId: new Map([['temp-riddle', 'uuid-riddle-1']]),
      };

      const result = rewriteTriggerRefs(trigger, idMap, 0);

      expect(result.errors).toHaveLength(0);
      expect(result.trigger.condition).toEqual({
        type: 'riddle_correct',
        riddleId: 'uuid-riddle-1',
      });
    });
  });
});
