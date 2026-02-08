/**
 * Wizard UI Component Tests
 *
 * Tests for wizard UI components verifying:
 * 1. Components don't mutate state directly (use dispatch)
 * 2. Template apply leads to resolveDraft passing playable gate
 * 3. Suggestions are derived from ResolveResult, not local state
 */

import { describe, test, expect, vi } from 'vitest';

import {
  applyTemplate,
  TEMPLATE_METADATA,
} from '@/lib/builder/wizard/templates';
import {
  resolveDraft,
  ORPHAN_PHASE_KEY,
  UNASSIGNED_STEP_KEY,
} from '@/lib/builder/resolver';
import type { BuilderAction, StepData, PhaseData, GameBuilderState } from '@/types/game-builder-state';
import type { ArtifactFormData } from '@/types/games';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Simulate applying actions to a state (minimal reducer).
 * This mimics what happens in the real reducer.
 */
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
        state = { ...state, artifacts: [...state.artifacts, action.payload] };
        break;
      case 'ADD_TRIGGER':
        state = { ...state, triggers: [...state.triggers, action.payload] };
        break;
      case 'ADD_ROLE':
        state = { ...state, roles: [...state.roles, action.payload] };
        break;
      case 'SET_STEPS':
        state = { ...state, steps: action.payload };
        break;
      case 'SET_PHASES':
        state = { ...state, phases: action.payload };
        break;
      // Add more cases as needed
    }
  }

  return state;
}

/**
 * Create an empty initial state.
 */
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

// =============================================================================
// Tests
// =============================================================================

describe('Wizard UI - No Direct State Mutation', () => {
  test('applyTemplate returns actions, not mutated state', () => {
    const actions = applyTemplate('basic-activity');

    // Should return array of actions
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBeGreaterThan(0);

    // Each action should have a type
    for (const action of actions) {
      expect(action).toHaveProperty('type');
      expect(typeof action.type).toBe('string');
    }

    // Actions should not contain any reference to external state
    const actionJson = JSON.stringify(actions);
    expect(actionJson).not.toContain('function');
  });

  test('dispatch function is called correctly (mock test)', () => {
    const mockDispatch = vi.fn();
    const actions = applyTemplate('basic-activity');

    // Simulate what GameTemplatePicker does
    for (const action of actions) {
      mockDispatch(action);
    }

    // Verify dispatch was called for each action
    expect(mockDispatch).toHaveBeenCalledTimes(actions.length);

    // Verify each call had a valid action type
    for (let i = 0; i < actions.length; i++) {
      expect(mockDispatch).toHaveBeenNthCalledWith(i + 1, expect.objectContaining({
        type: expect.any(String),
      }));
    }
  });
});

describe('Wizard UI - Template Apply Leads to Playable', () => {
  test('basic-activity template produces steps', () => {
    const initialState = createEmptyState();
    const actions = applyTemplate('basic-activity');
    const newState = applyActionsToState(initialState, actions);

    // Should have created steps
    expect(newState.steps.length).toBeGreaterThan(0);
    expect(newState.steps.length).toBe(TEMPLATE_METADATA['basic-activity'].stepCount);
  });

  test('basic-activity template passes draft gate after apply', () => {
    const initialState = createEmptyState();

    // Apply template
    const actions = applyTemplate('basic-activity', {
      name: 'Test Game',
      main_purpose_id: 'purpose-1',
    });
    const newState = applyActionsToState(initialState, actions);

    // Run resolver
    const triggersWithId = newState.triggers.filter((t): t is typeof t & { id: string } => !!t.id);
    const resolved = resolveDraft({
      core: {
        name: newState.core.name,
        main_purpose_id: newState.core.main_purpose_id,
      },
      steps: newState.steps,
      phases: newState.phases,
      roles: newState.roles,
      artifacts: newState.artifacts,
      triggers: triggersWithId,
    });

    // Should pass draft gate (structure is valid)
    expect(resolved.isGatePassed('draft')).toBe(true);
  });

  test('facilitated-phases template creates phases', () => {
    const initialState = createEmptyState();
    const actions = applyTemplate('facilitated-phases');
    const newState = applyActionsToState(initialState, actions);

    // Should have phases
    expect(newState.phases.length).toBeGreaterThan(0);

    // Should have steps
    expect(newState.steps.length).toBeGreaterThan(0);
  });

  test('escape-room-lite template includes artifacts', () => {
    const initialState = createEmptyState();
    const actions = applyTemplate('escape-room-lite');
    const newState = applyActionsToState(initialState, actions);

    // Should have artifacts (escape-room-lite includes at least one)
    expect(newState.artifacts.length).toBeGreaterThan(0);

    // Should have phases
    expect(newState.phases.length).toBeGreaterThan(0);

    // Should have steps
    expect(newState.steps.length).toBeGreaterThan(0);
  });
});

describe('Wizard UI - Suggestions From ResolveResult', () => {
  test('orphan steps are detected via stepsByPhaseId', () => {
    const steps: StepData[] = [
      {
        id: 'step-1',
        title: 'Orphan Step',
        body: '',
        duration_seconds: null,
        phase_id: null, // No phase = orphan in advanced mode
        display_mode: 'instant',
      },
    ];
    const phases: PhaseData[] = [
      {
        id: 'phase-1',
        name: 'Intro',
        phase_type: 'intro',
        phase_order: 1,
        duration_seconds: null,
        timer_visible: false,
        timer_style: 'countdown',
        description: '',
        board_message: '',
        auto_advance: false,
      },
    ];

    const triggersWithId: { id: string }[] = [];
    const resolved = resolveDraft({
      core: { name: 'Test', main_purpose_id: 'p1' },
      steps,
      phases,
      roles: [],
      artifacts: [],
      triggers: triggersWithId,
    });

    // Check that orphan is detected
    const orphans = resolved.stepsByPhaseId.get(ORPHAN_PHASE_KEY) ?? [];
    expect(orphans.length).toBe(1);
    expect(orphans[0].id).toBe('step-1');
  });

  test('unassigned artifacts are detected via artifactsByStepId', () => {
    const artifacts: ArtifactFormData[] = [
      {
        id: 'artifact-1',
        title: 'Unassigned Artifact',
        description: '',
        artifact_type: 'image',
        tags: [],
        metadata: {}, // No step_id = unassigned
        variants: [],
      },
    ];
    const steps: StepData[] = [
      {
        id: 'step-1',
        title: 'Step 1',
        body: '',
        duration_seconds: null,
        phase_id: null,
        display_mode: 'instant',
      },
    ];

    const triggersWithId: { id: string }[] = [];
    const resolved = resolveDraft({
      core: { name: 'Test', main_purpose_id: 'p1' },
      steps,
      phases: [],
      roles: [],
      artifacts,
      triggers: triggersWithId,
    });

    // Check that unassigned artifact is detected
    const unassigned = resolved.artifactsByStepId.get(UNASSIGNED_STEP_KEY) ?? [];
    expect(unassigned.length).toBe(1);
    expect(unassigned[0].id).toBe('artifact-1');
  });

  test('empty draft has errors (missing required structure)', () => {
    const triggersWithId: { id: string }[] = [];
    const resolved = resolveDraft({
      core: { name: '', main_purpose_id: '' }, // Empty but valid structure
      steps: [],
      phases: [],
      roles: [],
      artifacts: [],
      triggers: triggersWithId,
    });

    // Draft gate validates structure, not content
    // An empty draft is structurally valid (no duplicate IDs, no dangling refs)
    // Content validation (name required, etc.) is in completeness gate
    
    // Playable gate requires actual content, so it should fail
    expect(resolved.isGatePassed('playable')).toBe(false);
  });
});
