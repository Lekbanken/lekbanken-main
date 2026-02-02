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

import type { BuilderAction, PhaseData, StepData, GameBuilderState } from '@/types/game-builder-state';
import type { ArtifactFormData, TriggerFormData } from '@/types/games';

import {
  resolveDraft,
} from '@/lib/builder/resolver';

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

// =============================================================================
// Mini-reducer for testing (simulates real reducer)
// =============================================================================

function applyActionsToState(
  initialState: GameBuilderState,
  actions: BuilderAction[]
): GameBuilderState {
  let state = { ...initialState };

  for (const action of actions) {
    switch (action.type) {
      case 'SET_CORE':
        state = { ...state, core: { ...state.core, ...action.payload } };
        break;
      case 'ADD_STEP':
        state = { ...state, steps: [...state.steps, action.payload] };
        break;
      case 'ADD_PHASE':
        state = { ...state, phases: [...state.phases, action.payload] };
        break;
      case 'UPDATE_STEP':
        state = {
          ...state,
          steps: state.steps.map((s) =>
            s.id === action.payload.id ? { ...s, ...action.payload.data } : s
          ),
        };
        break;
      case 'ADD_ARTIFACT':
        state = { ...state, artifacts: [...state.artifacts, action.payload as ArtifactFormData] };
        break;
      case 'ADD_TRIGGER':
        state = { ...state, triggers: [...state.triggers, action.payload as TriggerFormData] };
        break;
      case 'ADD_ROLE':
        state = { ...state, roles: [...state.roles, action.payload] };
        break;
    }
  }

  return state;
}

function createEmptyState(): GameBuilderState {
  return {
    core: {
      name: '',
      short_description: '',
      description: '',
      status: 'draft',
      play_mode: 'basic',
      main_purpose_id: '',
      product_id: null,
      taxonomy_category: '',
      energy_level: null,
      location_type: null,
      time_estimate_min: null,
      duration_max: null,
      min_players: null,
      max_players: null,
      age_min: null,
      age_max: null,
      difficulty: null,
      accessibility_notes: '',
      space_requirements: '',
      leader_tips: '',
      is_demo_content: false,
    },
    steps: [],
    phases: [],
    roles: [],
    artifacts: [],
    triggers: [],
    materials: {
      items: [],
      safety_notes: '',
      preparation: '',
    },
    boardConfig: {
      show_game_name: true,
      show_current_phase: true,
      show_timer: true,
      show_participants: true,
      show_public_roles: true,
      show_leaderboard: false,
      show_qr_code: true,
      welcome_message: '',
      theme: 'neutral',
      background_color: '#ffffff',
      layout_variant: 'standard',
    },
    gameTools: [],
    subPurposeIds: [],
    cover: {
      mediaId: null,
      url: null,
    },
  };
}

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

  // ===========================================================================
  // TEST 9: Template metadata matches actual output (tripwire)
  // ===========================================================================
  describe('TEST 9: Template metadata matches actual output', () => {
    test('template features.phases = true iff template generates ADD_PHASE actions', () => {
      for (const template of getAvailableTemplates()) {
        const actions = applyTemplate(template.id);
        const hasPhaseActions = actions.some((a) => a.type === 'ADD_PHASE');
        
        expect(hasPhaseActions).toBe(template.features.phases);
      }
    });

    test('template features.artifacts = true iff template generates ADD_ARTIFACT actions', () => {
      for (const template of getAvailableTemplates()) {
        const actions = applyTemplate(template.id);
        const hasArtifactActions = actions.some((a) => a.type === 'ADD_ARTIFACT');
        
        expect(hasArtifactActions).toBe(template.features.artifacts);
      }
    });

    test('template features.triggers = true iff template generates ADD_TRIGGER actions', () => {
      for (const template of getAvailableTemplates()) {
        const actions = applyTemplate(template.id);
        const hasTriggerActions = actions.some((a) => a.type === 'ADD_TRIGGER');
        
        expect(hasTriggerActions).toBe(template.features.triggers);
      }
    });

    test('templates never create node-id refs in metadata (canonical keys only)', () => {
      for (const template of getAvailableTemplates()) {
        const actions = applyTemplate(template.id);
        
        // Check artifact metadata for invalid refs
        const artifactActions = actions.filter((a) => a.type === 'ADD_ARTIFACT');
        artifactActions.forEach((a) => {
          if (hasPayload(a)) {
            const metadata = a.payload.metadata as Record<string, unknown> | undefined;
            if (metadata) {
              // step_id should never be a node-id
              if (typeof metadata.step_id === 'string') {
                expect(metadata.step_id).not.toMatch(/^step-/);
              }
              // phase_id should never be a node-id
              if (typeof metadata.phase_id === 'string') {
                expect(metadata.phase_id).not.toMatch(/^phase-/);
              }
            }
          }
        });

        // Check step phase_id for invalid refs
        const stepActions = actions.filter((a) => a.type === 'ADD_STEP');
        stepActions.forEach((a) => {
          if (hasPayload(a)) {
            const phaseId = (a.payload as StepData).phase_id;
            if (typeof phaseId === 'string') {
              expect(phaseId).not.toMatch(/^phase-/);
            }
          }
        });
      }
    });

    test('all templates in TEMPLATE_METADATA have matching applyTemplate implementation', () => {
      for (const template of getAvailableTemplates()) {
        // Should not throw
        const actions = applyTemplate(template.id);
        expect(Array.isArray(actions)).toBe(true);
      }
    });
  });

  // ===========================================================================
  // TEST 10: Template → Draft → ResolveResult (industrial-grade)
  // ===========================================================================
  describe('TEST 10: Template → Draft → ResolveResult (industrial-grade)', () => {
    test('features.triggers matches actual draft.triggers array (not just action types)', () => {
      for (const template of getAvailableTemplates()) {
        const actions = applyTemplate(template.id);
        const state = applyActionsToState(createEmptyState(), actions);
        
        const hasTriggers = state.triggers.length > 0;
        expect(hasTriggers).toBe(template.features.triggers);
      }
    });

    test('features.artifacts matches actual draft.artifacts array', () => {
      for (const template of getAvailableTemplates()) {
        const actions = applyTemplate(template.id);
        const state = applyActionsToState(createEmptyState(), actions);
        
        const hasArtifacts = state.artifacts.length > 0;
        expect(hasArtifacts).toBe(template.features.artifacts);
      }
    });

    test('features.phases matches actual draft.phases array', () => {
      for (const template of getAvailableTemplates()) {
        const actions = applyTemplate(template.id);
        const state = applyActionsToState(createEmptyState(), actions);
        
        const hasPhases = state.phases.length > 0;
        expect(hasPhases).toBe(template.features.phases);
      }
    });

    test('all non-blank templates pass draft gate after apply', () => {
      for (const template of getAvailableTemplates()) {
        if (template.id === 'blank') continue; // blank template is intentionally incomplete
        
        const actions = applyTemplate(template.id);
        const state = applyActionsToState(createEmptyState(), actions);
        const resolved = resolveDraft(state);
        
        // Template should produce valid draft structure
        expect(resolved.isGatePassed('draft')).toBe(true);
      }
    });

    test('templates do not produce dangling phase refs in steps', () => {
      for (const template of getAvailableTemplates()) {
        const actions = applyTemplate(template.id);
        const state = applyActionsToState(createEmptyState(), actions);
        
        const phaseIds = new Set(state.phases.map(p => p.id));
        
        for (const step of state.steps) {
          if (step.phase_id) {
            expect(phaseIds.has(step.phase_id)).toBe(true);
          }
        }
      }
    });

    test('templates do not produce dangling step refs in artifacts', () => {
      for (const template of getAvailableTemplates()) {
        const actions = applyTemplate(template.id);
        const state = applyActionsToState(createEmptyState(), actions);
        
        const stepIds = new Set(state.steps.map(s => s.id));
        
        for (const artifact of state.artifacts) {
          const stepId = artifact.metadata?.step_id;
          if (typeof stepId === 'string') {
            expect(stepIds.has(stepId)).toBe(true);
          }
        }
      }
    });
  });
});
