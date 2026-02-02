/**
 * Wizard Tripwire Tests
 *
 * Tests for the wizard module that act as tripwires for regressions.
 *
 * CRITICAL INVARIANTS:
 * 1. Wizard actions return BuilderAction[] - never modify state directly
 * 2. stepId and phaseId in actions must be raw UUIDs, never node ids (step-xxx, phase-xxx)
 * 3. Templates dispatch valid actions
 * 4. Suggestions return valid enum values
 * 5. UI helpers normalize node IDs (forgiving layer)
 * 6. switchToSimpleMode preserves phases (only nulls phase_id)
 */

import { describe, test, expect } from 'vitest';

import type { BuilderAction, PhaseData, StepData } from '@/types/game-builder-state';

import {
  switchToAdvancedMode,
  switchToSimpleMode,
  createStep,
  attachArtifactToStep,
  assignStepToPhase,
} from '@/lib/builder/wizard/actions';

import {
  normalizeToRawId,
  isNodeId,
  safeAttachArtifactToStep,
  safeAssignStepToPhase,
} from '@/lib/builder/wizard/ui-helpers';

import {
  applyTemplate,
  TEMPLATE_METADATA,
  getAvailableTemplates,
} from '@/lib/builder/wizard/templates';

import {
  getSuggestedActionsForCondition,
  getSuggestedConditionsForAction,
  getBeginnerConditions,
  getBeginnerActions,
  getAllConditionTypes,
  getAllActionTypes,
} from '@/lib/builder/wizard/suggestions';

import { TRIGGER_CONDITION_TYPES, TRIGGER_ACTION_TYPES } from '@/lib/domain/enums';

// Type guard for actions with payload (excludes UNDO, REDO, etc.)
type ActionWithPayload = Extract<BuilderAction, { payload: unknown }>;
function hasPayload(a: BuilderAction): a is ActionWithPayload {
  return 'payload' in a;
}

describe('Wizard Tripwires', () => {
  // ===========================================================================
  // TEST 1: Actions return BuilderAction arrays (never modify state)
  // ===========================================================================
  describe('TEST 1: Actions return BuilderAction[]', () => {
    test('switchToAdvancedMode returns array of actions (with empty phases)', () => {
      const actions = switchToAdvancedMode([], []);
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      // Should have ADD_PHASE actions
      const phaseActions = actions.filter((a) => a.type === 'ADD_PHASE');
      expect(phaseActions.length).toBeGreaterThanOrEqual(3); // intro, main, outro
    });

    test('switchToAdvancedMode with existing phases returns empty', () => {
      const existingPhases: Partial<PhaseData>[] = [{ id: 'phase-1', name: 'Existing' }];
      const actions = switchToAdvancedMode(existingPhases as PhaseData[], []);
      expect(actions.length).toBe(0);
    });

    test('switchToSimpleMode returns array of UPDATE_STEP actions', () => {
      const steps: Partial<StepData>[] = [
        { id: 'uuid-1', phase_id: 'phase-1' },
        { id: 'uuid-2', phase_id: 'phase-2' },
      ];
      const actions = switchToSimpleMode(steps as StepData[]);
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBe(steps.length);
      // Should have UPDATE_STEP actions
      actions.forEach((action) => {
        expect(action.type).toBe('UPDATE_STEP');
      });
    });

    test('switchToSimpleMode skips steps without phase_id', () => {
      const steps: Partial<StepData>[] = [
        { id: 'uuid-1', phase_id: null },
        { id: 'uuid-2', phase_id: 'phase-2' },
      ];
      const actions = switchToSimpleMode(steps as StepData[]);
      expect(actions.length).toBe(1); // Only uuid-2 has phase_id
    });

    test('createStep returns single ADD_STEP action', () => {
      const action = createStep('Test Step');
      expect(action.type).toBe('ADD_STEP');
      if (hasPayload(action) && action.type === 'ADD_STEP') {
        expect((action.payload as StepData).title).toBe('Test Step');
      }
    });
  });

  // ===========================================================================
  // TEST 2: Node ID validation (CRITICAL - never write step-xxx to data)
  // ===========================================================================
  describe('TEST 2: Node ID validation', () => {
    test('attachArtifactToStep throws on step-xxx node id', () => {
      expect(() => {
        attachArtifactToStep('artifact-uuid', 'step-some-uuid');
      }).toThrow(/stepId must be raw UUID/);
    });

    test('attachArtifactToStep accepts raw UUID', () => {
      const action = attachArtifactToStep('artifact-uuid', 'abc123-def456');
      expect(action.type).toBe('UPDATE_ARTIFACT');
    });

    test('attachArtifactToStep accepts null', () => {
      const action = attachArtifactToStep('artifact-uuid', null);
      expect(action.type).toBe('UPDATE_ARTIFACT');
    });

    test('assignStepToPhase throws on phase-xxx node id', () => {
      expect(() => {
        assignStepToPhase('step-uuid', 'phase-some-uuid');
      }).toThrow(/phaseId must be raw UUID/);
    });

    test('assignStepToPhase accepts raw UUID', () => {
      const action = assignStepToPhase('step-uuid', 'abc123-def456');
      expect(action.type).toBe('UPDATE_STEP');
    });

    test('assignStepToPhase accepts null', () => {
      const action = assignStepToPhase('step-uuid', null);
      expect(action.type).toBe('UPDATE_STEP');
    });
  });

  // ===========================================================================
  // TEST 3: Templates produce valid actions
  // ===========================================================================
  describe('TEST 3: Templates produce valid actions', () => {
    test('all templates are in metadata registry', () => {
      const templates = getAvailableTemplates();
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach((t) => {
        expect(TEMPLATE_METADATA[t.id]).toBeDefined();
      });
    });

    test('blank template returns minimal actions', () => {
      const actions = applyTemplate('blank');
      // Blank template should only set core if overrides provided
      expect(actions.length).toBe(0);
    });

    test('blank template with overrides returns SET_CORE', () => {
      const actions = applyTemplate('blank', { name: 'My Game' });
      expect(actions.length).toBe(1);
      expect(actions[0].type).toBe('SET_CORE');
    });

    test('basic-activity template returns steps but no phases', () => {
      const actions = applyTemplate('basic-activity');
      const stepActions = actions.filter((a) => a.type === 'ADD_STEP');
      const phaseActions = actions.filter((a) => a.type === 'ADD_PHASE');

      expect(stepActions.length).toBeGreaterThan(0);
      expect(phaseActions.length).toBe(0);

      // Steps should have phase_id: null
      stepActions.forEach((a) => {
        expect(a.payload.phase_id).toBeNull();
      });
    });

    test('facilitated-phases template returns phases and steps', () => {
      const actions = applyTemplate('facilitated-phases');
      const stepActions = actions.filter((a) => a.type === 'ADD_STEP');
      const phaseActions = actions.filter((a) => a.type === 'ADD_PHASE');

      expect(phaseActions.length).toBeGreaterThanOrEqual(3);
      expect(stepActions.length).toBeGreaterThan(0);

      // Steps should have valid phase_id (raw UUID)
      stepActions.forEach((a) => {
        if (a.payload.phase_id) {
          expect(a.payload.phase_id).not.toMatch(/^phase-/);
        }
      });
    });

    test('escape-room-lite template includes artifacts', () => {
      const actions = applyTemplate('escape-room-lite');
      const artifactActions = actions.filter((a) => a.type === 'ADD_ARTIFACT');

      expect(artifactActions.length).toBeGreaterThan(0);
    });

    test('escape-room-lite artifact.metadata.step_id is raw UUID (not node id)', () => {
      const actions = applyTemplate('escape-room-lite');
      const artifactActions = actions.filter((a) => a.type === 'ADD_ARTIFACT');

      artifactActions.forEach((a) => {
        if (hasPayload(a)) {
          const metadata = a.payload.metadata as Record<string, unknown> | undefined;
          const stepId = metadata?.step_id;
          if (typeof stepId === 'string') {
            expect(stepId).not.toMatch(/^step-/);
            // Should look like a UUID
            expect(stepId.length).toBeGreaterThan(10);
          }
        }
      });
    });

    test('all templates produce steps with valid display_mode', () => {
      const validDisplayModes = ['instant', 'dramatic', 'timed'];
      const templates = ['basic-activity', 'facilitated-phases', 'escape-room-lite'] as const;

      for (const templateId of templates) {
        const actions = applyTemplate(templateId);
        const stepActions = actions.filter((a) => a.type === 'ADD_STEP');

        stepActions.forEach((a) => {
          if (hasPayload(a)) {
            expect(validDisplayModes).toContain((a.payload as StepData).display_mode);
          }
        });
      }
    });
  });

  // ===========================================================================
  // TEST 4: Suggestions use valid enum values
  // ===========================================================================
  describe('TEST 4: Suggestions use valid enum values', () => {
    test('getAllConditionTypes returns actual enum values', () => {
      const conditions = getAllConditionTypes();
      expect(conditions).toEqual(TRIGGER_CONDITION_TYPES);
    });

    test('getAllActionTypes returns actual enum values', () => {
      const actions = getAllActionTypes();
      expect(actions).toEqual(TRIGGER_ACTION_TYPES);
    });

    test('getSuggestedActionsForCondition returns valid actions', () => {
      const suggestions = getSuggestedActionsForCondition('step_started');
      suggestions.forEach((action) => {
        expect(TRIGGER_ACTION_TYPES).toContain(action);
      });
    });

    test('getSuggestedConditionsForAction returns valid conditions', () => {
      const suggestions = getSuggestedConditionsForAction('reveal_artifact');
      suggestions.forEach((condition) => {
        expect(TRIGGER_CONDITION_TYPES).toContain(condition);
      });
    });

    test('getBeginnerConditions returns subset of all conditions', () => {
      const beginner = getBeginnerConditions();
      beginner.forEach((condition) => {
        expect(TRIGGER_CONDITION_TYPES).toContain(condition);
      });
    });

    test('getBeginnerActions returns subset of all actions', () => {
      const beginner = getBeginnerActions();
      beginner.forEach((action) => {
        expect(TRIGGER_ACTION_TYPES).toContain(action);
      });
    });
  });

  // ===========================================================================
  // TEST 5: Template phases have valid phase_type
  // ===========================================================================
  describe('TEST 5: Template phase_type validity', () => {
    test('facilitated-phases uses valid phase_type values', () => {
      const actions = applyTemplate('facilitated-phases');
      const phaseActions = actions.filter((a) => a.type === 'ADD_PHASE');

      // Valid PhaseType from DB constraint: intro, round, finale, break
      const validPhaseTypes = ['intro', 'round', 'finale', 'break'];
      phaseActions.forEach((a) => {
        if (hasPayload(a)) {
          expect(validPhaseTypes).toContain((a.payload as PhaseData).phase_type);
        }
      });
    });

    test('escape-room-lite uses valid phase_type values', () => {
      const actions = applyTemplate('escape-room-lite');
      const phaseActions = actions.filter((a) => a.type === 'ADD_PHASE');

      // Valid PhaseType from DB constraint: intro, round, finale, break
      const validPhaseTypes = ['intro', 'round', 'finale', 'break'];
      phaseActions.forEach((a) => {
        if (hasPayload(a)) {
          expect(validPhaseTypes).toContain((a.payload as PhaseData).phase_type);
        }
      });
    });
  });

  // ===========================================================================
  // TEST 6: UI Helpers normalize node IDs
  // ===========================================================================
  describe('TEST 6: UI helpers normalize node IDs', () => {
    test('normalizeToRawId strips step- prefix', () => {
      expect(normalizeToRawId('step-abc123')).toBe('abc123');
    });

    test('normalizeToRawId strips phase- prefix', () => {
      expect(normalizeToRawId('phase-xyz')).toBe('xyz');
    });

    test('normalizeToRawId passes through raw UUIDs', () => {
      expect(normalizeToRawId('abc123-def456')).toBe('abc123-def456');
    });

    test('normalizeToRawId handles null', () => {
      expect(normalizeToRawId(null)).toBeNull();
    });

    test('isNodeId detects node id format', () => {
      expect(isNodeId('step-abc')).toBe(true);
      expect(isNodeId('phase-xyz')).toBe(true);
      expect(isNodeId('abc123')).toBe(false);
    });

    test('safeAttachArtifactToStep normalizes node ids', () => {
      const action = safeAttachArtifactToStep('artifact-abc', 'step-xyz');
      expect(action).not.toBeNull();
      expect(action!.type).toBe('UPDATE_ARTIFACT');
      // The action should have normalized IDs (no step- prefix in data)
    });

    test('safeAssignStepToPhase normalizes node ids', () => {
      const action = safeAssignStepToPhase('step-abc', 'phase-xyz');
      expect(action).not.toBeNull();
      expect(action!.type).toBe('UPDATE_STEP');
    });

    test('safeAttachArtifactToStep returns null for empty artifactId', () => {
      const action = safeAttachArtifactToStep('', 'step-xyz');
      expect(action).toBeNull();
    });
  });

  // ===========================================================================
  // TEST 7: switchToSimpleMode preserves phases (only nulls phase_id)
  // ===========================================================================
  describe('TEST 7: switchToSimpleMode preserves phases', () => {
    test('switchToSimpleMode only produces UPDATE_STEP actions (never DELETE_PHASE)', () => {
      const steps: Partial<StepData>[] = [
        { id: 'step-1', phase_id: 'phase-1' },
        { id: 'step-2', phase_id: 'phase-2' },
      ];

      const actions = switchToSimpleMode(steps as StepData[]);

      // Should ONLY have UPDATE_STEP, never DELETE_PHASE
      actions.forEach((action) => {
        expect(action.type).toBe('UPDATE_STEP');
        expect(action.type).not.toBe('DELETE_PHASE');
      });
    });

    test('switchToSimpleMode sets phase_id to null', () => {
      const steps: Partial<StepData>[] = [{ id: 'step-1', phase_id: 'phase-1' }];

      const actions = switchToSimpleMode(steps as StepData[]);

      const action = actions[0];
      if (hasPayload(action) && action.type === 'UPDATE_STEP') {
        expect(action.payload.data.phase_id).toBeNull();
      } else {
        throw new Error('Expected UPDATE_STEP action with payload');
      }
    });
  });

  // ===========================================================================
  // TEST 8: Bidirectional suggestions consistency
  // ===========================================================================
  describe('TEST 8: Bidirectional suggestions consistency', () => {
    test('all conditions in CONDITION_TO_ACTIONS have valid conditions', () => {
      // Every condition used as key must be in TRIGGER_CONDITION_TYPES
      const conditions = getAllConditionTypes();
      const actions = getAllActionTypes();

      // Test that suggestions return valid values
      for (const condition of conditions) {
        const suggested = getSuggestedActionsForCondition(condition);
        suggested.forEach((action) => {
          expect(actions).toContain(action);
        });
      }
    });

    test('all actions in ACTION_TO_CONDITIONS have valid actions', () => {
      const conditions = getAllConditionTypes();
      const actions = getAllActionTypes();

      // Test that reverse suggestions return valid values
      for (const action of actions) {
        const suggested = getSuggestedConditionsForAction(action);
        suggested.forEach((condition) => {
          expect(conditions).toContain(condition);
        });
      }
    });
  });
});
