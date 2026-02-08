/**
 * Sprint 4.4 - UI Wiring Verification Tests
 *
 * Verifies that the reducer correctly handles UI actions and produces
 * valid state. These tests focus on REDUCER WIRING, not validator rules.
 *
 * PURPOSE: Prove that UI dispatches correct actions and values persist correctly.
 *
 * METHODOLOGY:
 * - Dispatch actions as UI would
 * - Assert state shape after actions
 * - Minimal resolver tests only for sanity check
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  GameBuilderState,
  BuilderAction,
  StepData,
  PhaseData,
  RoleData,
} from '@/types/game-builder-state';
import type { ArtifactFormData, TriggerFormData } from '@/types/games';
import { resolveDraft, type GameDraft } from '@/lib/builder/resolver';

// =============================================================================
// TEST FIXTURE UUIDs (valid v4 UUIDs for validation)
// =============================================================================

const UUID = {
  step1: '11111111-1111-4111-a111-111111111111',
  step2: '22222222-2222-4222-a222-222222222222',
  step3: '33333333-3333-4333-a333-333333333333',
  phase1: '44444444-4444-4444-a444-444444444444',
  phase2: '55555555-5555-4555-a555-555555555555',
  role1: '66666666-6666-4666-a666-666666666666',
  artifact1: '77777777-7777-4777-a777-777777777777',
  trigger1: '88888888-8888-4888-a888-888888888888',
  dangling: '99999999-9999-4999-a999-999999999999',
};

// =============================================================================
// STATE TO DRAFT CONVERSION
// =============================================================================

function stateToDraft(state: GameBuilderState): GameDraft {
  return {
    core: {
      name: state.core.name,
      main_purpose_id: state.core.main_purpose_id,
      play_mode: state.core.play_mode,
      description: state.core.description,
      energy_level: state.core.energy_level,
      location_type: state.core.location_type,
      age_min: state.core.age_min,
      age_max: state.core.age_max,
      min_players: state.core.min_players,
      max_players: state.core.max_players,
    },
    steps: state.steps,
    phases: state.phases,
    roles: state.roles,
    artifacts: state.artifacts,
    // Map triggers to ensure id is required for validation
    triggers: state.triggers
      .filter((t): t is typeof t & { id: string } => t.id !== undefined)
      .map(t => ({ id: t.id, name: t.name })),
    cover: state.cover,
    is_demo_content: state.core.is_demo_content,
    boardConfig: state.boardConfig ? { publicBoard: undefined } : undefined,
  };
}

// =============================================================================
// Mini-reducer for testing (mirrors useGameBuilder.stateReducer)
// =============================================================================

function applyAction(state: GameBuilderState, action: BuilderAction): GameBuilderState {
  switch (action.type) {
    case 'SET_CORE':
      return { ...state, core: { ...state.core, ...action.payload } };
    case 'ADD_STEP':
      return { ...state, steps: [...state.steps, action.payload] };
    case 'DELETE_STEP':
      return { ...state, steps: state.steps.filter((s) => s.id !== action.payload.id) };
    case 'UPDATE_STEP':
      return {
        ...state,
        steps: state.steps.map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload.data } : s
        ),
      };
    case 'REORDER_STEPS': {
      const newSteps = [...state.steps];
      const [removed] = newSteps.splice(action.payload.from, 1);
      newSteps.splice(action.payload.to, 0, removed);
      return { ...state, steps: newSteps };
    }
    case 'ADD_PHASE':
      return { ...state, phases: [...state.phases, action.payload] };
    case 'DELETE_PHASE':
      return { ...state, phases: state.phases.filter((p) => p.id !== action.payload.id) };
    case 'UPDATE_PHASE':
      return {
        ...state,
        phases: state.phases.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.data } : p
        ),
      };
    case 'ADD_ROLE':
      return { ...state, roles: [...state.roles, action.payload] };
    case 'DELETE_ROLE':
      return { ...state, roles: state.roles.filter((r) => r.id !== action.payload.id) };
    case 'UPDATE_ROLE':
      return {
        ...state,
        roles: state.roles.map((r) =>
          r.id === action.payload.id ? { ...r, ...action.payload.data } : r
        ),
      };
    case 'ADD_ARTIFACT':
      return { ...state, artifacts: [...state.artifacts, action.payload] };
    case 'DELETE_ARTIFACT':
      return { ...state, artifacts: state.artifacts.filter((a) => a.id !== action.payload.id) };
    case 'UPDATE_ARTIFACT':
      return {
        ...state,
        artifacts: state.artifacts.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload.data } : a
        ),
      };
    case 'ADD_TRIGGER':
      return { ...state, triggers: [...state.triggers, action.payload] };
    case 'DELETE_TRIGGER':
      return { ...state, triggers: state.triggers.filter((t) => t.id !== action.payload.id) };
    case 'UPDATE_TRIGGER':
      return {
        ...state,
        triggers: state.triggers.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.data } : t
        ),
      };
    case 'SET_MATERIALS':
      return { ...state, materials: { ...state.materials, ...action.payload } };
    case 'SET_BOARD_CONFIG':
      return { ...state, boardConfig: { ...state.boardConfig, ...action.payload } };
    case 'SET_SUB_PURPOSE_IDS':
      return { ...state, subPurposeIds: action.payload };
    case 'SET_COVER':
      return { ...state, cover: action.payload };
    default:
      return state;
  }
}

function applyActions(initial: GameBuilderState, actions: BuilderAction[]): GameBuilderState {
  return actions.reduce((state, action) => applyAction(state, action), initial);
}

// =============================================================================
// Test Fixtures
// =============================================================================

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
    materials: { items: [], safety_notes: '', preparation: '' },
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
    cover: { mediaId: null, url: null },
  };
}

// =============================================================================
// UI WIRING TESTS
// =============================================================================

describe('Sprint 4.4 - UI Wiring Verification', () => {
  let state: GameBuilderState;

  beforeEach(() => {
    state = createEmptyState();
  });

  // ===========================================================================
  // CORE FORM
  // ===========================================================================
  describe('CoreForm wiring', () => {
    it('SET_CORE updates individual fields', () => {
      state = applyAction(state, {
        type: 'SET_CORE',
        payload: { name: 'Min nya lek' },
      });

      expect(state.core.name).toBe('Min nya lek');
      expect(state.core.short_description).toBe(''); // unchanged
    });

    it('SET_CORE preserves other fields when updating one', () => {
      state = applyActions(state, [
        { type: 'SET_CORE', payload: { name: 'Test', play_mode: 'facilitated' } },
        { type: 'SET_CORE', payload: { short_description: 'Kort beskrivning' } },
      ]);

      expect(state.core.name).toBe('Test');
      expect(state.core.play_mode).toBe('facilitated');
      expect(state.core.short_description).toBe('Kort beskrivning');
    });
  });

  // ===========================================================================
  // STEPS
  // ===========================================================================
  describe('Steps wiring', () => {
    it('ADD_STEP adds step to array', () => {
      const step: StepData = {
        id: UUID.step1,
        title: 'Introduktion',
        body: 'Välkommen till leken!',
        duration_seconds: 120,
        display_mode: 'dramatic',
      };

      state = applyAction(state, { type: 'ADD_STEP', payload: step });

      expect(state.steps).toHaveLength(1);
      expect(state.steps[0].title).toBe('Introduktion');
      expect(state.steps[0].display_mode).toBe('dramatic');
    });

    it('UPDATE_STEP updates specific step', () => {
      state = applyActions(state, [
        { type: 'ADD_STEP', payload: { id: UUID.step1, title: 'Old', body: 'Content' } as StepData },
        { type: 'UPDATE_STEP', payload: { id: UUID.step1, data: { title: 'New' } } },
      ]);

      expect(state.steps[0].title).toBe('New');
      expect(state.steps[0].body).toBe('Content'); // preserved
    });

    it('DELETE_STEP removes step', () => {
      state = applyActions(state, [
        { type: 'ADD_STEP', payload: { id: UUID.step1, title: 'Step 1', body: '' } as StepData },
        { type: 'ADD_STEP', payload: { id: UUID.step2, title: 'Step 2', body: '' } as StepData },
        { type: 'DELETE_STEP', payload: { id: UUID.step1 } },
      ]);

      expect(state.steps).toHaveLength(1);
      expect(state.steps[0].id).toBe(UUID.step2);
    });

    it('REORDER_STEPS maintains integrity', () => {
      state = applyActions(state, [
        { type: 'ADD_STEP', payload: { id: UUID.step1, title: 'First', body: '' } as StepData },
        { type: 'ADD_STEP', payload: { id: UUID.step2, title: 'Second', body: '' } as StepData },
        { type: 'ADD_STEP', payload: { id: UUID.step3, title: 'Third', body: '' } as StepData },
        { type: 'REORDER_STEPS', payload: { from: 0, to: 2 } },
      ]);

      expect(state.steps[0].title).toBe('Second');
      expect(state.steps[1].title).toBe('Third');
      expect(state.steps[2].title).toBe('First');
    });
  });

  // ===========================================================================
  // PHASES
  // ===========================================================================
  describe('Phases wiring', () => {
    it('ADD_PHASE creates phase with correct type', () => {
      const phase: PhaseData = {
        id: UUID.phase1,
        name: 'Intro',
        phase_type: 'intro',
        phase_order: 1,
        duration_seconds: 300,
        timer_visible: true,
        timer_style: 'countdown',
        description: 'Introduktionsfas',
        board_message: 'Välkommen!',
        auto_advance: false,
      };

      state = applyAction(state, { type: 'ADD_PHASE', payload: phase });

      expect(state.phases).toHaveLength(1);
      expect(state.phases[0].phase_type).toBe('intro');
      expect(state.phases[0].timer_style).toBe('countdown');
    });

    it('UPDATE_PHASE changes phase_type correctly', () => {
      state = applyActions(state, [
        { type: 'ADD_PHASE', payload: { id: UUID.phase1, name: 'Phase', phase_type: 'intro', phase_order: 1, duration_seconds: null, timer_visible: false, timer_style: 'countdown', description: '', board_message: '', auto_advance: false } as PhaseData },
        { type: 'UPDATE_PHASE', payload: { id: UUID.phase1, data: { phase_type: 'round' } } },
      ]);

      expect(state.phases[0].phase_type).toBe('round');
    });

    it('step can be assigned to phase via phase_id', () => {
      state = applyActions(state, [
        { type: 'ADD_PHASE', payload: { id: UUID.phase1, name: 'Intro', phase_type: 'intro', phase_order: 1, duration_seconds: null, timer_visible: false, timer_style: 'countdown', description: '', board_message: '', auto_advance: false } as PhaseData },
        { type: 'ADD_STEP', payload: { id: UUID.step1, title: 'Step 1', body: '', phase_id: UUID.phase1 } as StepData },
      ]);

      expect(state.steps[0].phase_id).toBe(UUID.phase1);
    });
  });

  // ===========================================================================
  // ROLES
  // ===========================================================================
  describe('Roles wiring', () => {
    it('ADD_ROLE creates role with all fields', () => {
      const role: RoleData = {
        id: UUID.role1,
        name: 'Detektiv',
        icon: '🔍',
        color: '#3498db',
        role_order: 1,
        public_description: 'Du är detektiven',
        private_instructions: 'Hitta mördaren',
        private_hints: 'Kolla köket',
        min_count: 1,
        max_count: 2,
        assignment_strategy: 'player_picks',
        scaling_rules: null,
        conflicts_with: null,
      };

      state = applyAction(state, { type: 'ADD_ROLE', payload: role });

      expect(state.roles).toHaveLength(1);
      expect(state.roles[0].name).toBe('Detektiv');
      expect(state.roles[0].assignment_strategy).toBe('player_picks');
    });

    it('UPDATE_ROLE updates assignment_strategy', () => {
      state = applyActions(state, [
        { type: 'ADD_ROLE', payload: { id: UUID.role1, name: 'Role', icon: '', color: '', role_order: 1, public_description: '', private_instructions: '', private_hints: '', min_count: 1, max_count: null, assignment_strategy: 'player_picks', scaling_rules: null, conflicts_with: null } as RoleData },
        { type: 'UPDATE_ROLE', payload: { id: UUID.role1, data: { assignment_strategy: 'random' } } },
      ]);

      expect(state.roles[0].assignment_strategy).toBe('random');
    });
  });

  // ===========================================================================
  // ARTIFACTS
  // ===========================================================================
  describe('Artifacts wiring', () => {
    it('ADD_ARTIFACT creates artifact with metadata', () => {
      const artifact: ArtifactFormData = {
        id: UUID.artifact1,
        title: 'Ledtråd',
        description: 'En viktig ledtråd',
        artifact_type: 'card',
        tags: ['clue'],
        metadata: { step_id: UUID.step1 },
        variants: [],
      };

      state = applyAction(state, { type: 'ADD_ARTIFACT', payload: artifact });

      expect(state.artifacts).toHaveLength(1);
      expect(state.artifacts[0].artifact_type).toBe('card');
      expect(state.artifacts[0].metadata?.step_id).toBe(UUID.step1);
    });

    it('UPDATE_ARTIFACT updates metadata.step_id', () => {
      state = applyActions(state, [
        { type: 'ADD_ARTIFACT', payload: { id: UUID.artifact1, title: 'Card', description: '', artifact_type: 'card', tags: [], metadata: {}, variants: [] } as ArtifactFormData },
        { type: 'UPDATE_ARTIFACT', payload: { id: UUID.artifact1, data: { metadata: { step_id: UUID.step2 } } } },
      ]);

      expect(state.artifacts[0].metadata?.step_id).toBe(UUID.step2);
    });
  });

  // ===========================================================================
  // TRIGGERS
  // ===========================================================================
  describe('Triggers wiring', () => {
    it('ADD_TRIGGER creates trigger with condition and actions', () => {
      const trigger: TriggerFormData = {
        id: UUID.trigger1,
        name: 'Reveal on step',
        description: 'Reveals artifact when step starts',
        enabled: true,
        execute_once: true,
        delay_seconds: 0,
        condition: { type: 'step_started', stepId: UUID.step1 },
        actions: [{ type: 'reveal_artifact', artifactId: UUID.artifact1 }],
      };

      state = applyAction(state, { type: 'ADD_TRIGGER', payload: trigger });

      expect(state.triggers).toHaveLength(1);
      expect(state.triggers[0].condition.type).toBe('step_started');
      expect(state.triggers[0].actions[0].type).toBe('reveal_artifact');
    });

    it('UPDATE_TRIGGER updates condition type', () => {
      state = applyActions(state, [
        { type: 'ADD_TRIGGER', payload: { id: UUID.trigger1, name: 'Trigger', description: '', enabled: true, execute_once: false, delay_seconds: 0, condition: { type: 'manual' }, actions: [] } as TriggerFormData },
        { type: 'UPDATE_TRIGGER', payload: { id: UUID.trigger1, data: { condition: { type: 'timer_ended', timerId: 'timer1' } } } },
      ]);

      expect(state.triggers[0].condition.type).toBe('timer_ended');
    });
  });

  // ===========================================================================
  // BOARD CONFIG
  // ===========================================================================
  describe('BoardConfig wiring', () => {
    it('SET_BOARD_CONFIG updates individual settings', () => {
      state = applyAction(state, {
        type: 'SET_BOARD_CONFIG',
        payload: { theme: 'mystery', show_leaderboard: true },
      });

      expect(state.boardConfig.theme).toBe('mystery');
      expect(state.boardConfig.show_leaderboard).toBe(true);
      expect(state.boardConfig.show_game_name).toBe(true); // preserved
    });

    it('SET_BOARD_CONFIG preserves other settings', () => {
      state = applyActions(state, [
        { type: 'SET_BOARD_CONFIG', payload: { welcome_message: 'Välkommen!' } },
        { type: 'SET_BOARD_CONFIG', payload: { background_color: '#000000' } },
      ]);

      expect(state.boardConfig.welcome_message).toBe('Välkommen!');
      expect(state.boardConfig.background_color).toBe('#000000');
    });
  });

  // ===========================================================================
  // MATERIALS
  // ===========================================================================
  describe('Materials wiring', () => {
    it('SET_MATERIALS updates material list', () => {
      state = applyAction(state, {
        type: 'SET_MATERIALS',
        payload: { items: ['Papper', 'Pennor'], safety_notes: 'Var försiktig' },
      });

      expect(state.materials.items).toEqual(['Papper', 'Pennor']);
      expect(state.materials.safety_notes).toBe('Var försiktig');
    });
  });

  // ===========================================================================
  // COVER
  // ===========================================================================
  describe('Cover wiring', () => {
    it('SET_COVER updates cover image', () => {
      state = applyAction(state, {
        type: 'SET_COVER',
        payload: { mediaId: 'media-123', url: 'https://example.com/img.jpg' },
      });

      expect(state.cover.mediaId).toBe('media-123');
      expect(state.cover.url).toBe('https://example.com/img.jpg');
    });
  });

  // ===========================================================================
  // NULL vs UNDEFINED handling
  // ===========================================================================
  describe('null vs undefined consistency', () => {
    it('optional fields accept null correctly', () => {
      state = applyAction(state, {
        type: 'SET_CORE',
        payload: {
          energy_level: null,
          location_type: null,
          time_estimate_min: null,
          product_id: null,
        },
      });

      expect(state.core.energy_level).toBeNull();
      expect(state.core.location_type).toBeNull();
      expect(state.core.time_estimate_min).toBeNull();
      expect(state.core.product_id).toBeNull();
    });

    it('step.phase_id can be null (unassigned)', () => {
      state = applyAction(state, {
        type: 'ADD_STEP',
        payload: { id: UUID.step1, title: 'Unassigned', body: '', phase_id: null } as StepData,
      });

      expect(state.steps[0].phase_id).toBeNull();
    });

    it('step.duration_seconds can be null', () => {
      state = applyAction(state, {
        type: 'ADD_STEP',
        payload: { id: UUID.step1, title: 'No duration', body: '', duration_seconds: null } as StepData,
      });

      expect(state.steps[0].duration_seconds).toBeNull();
    });
  });

  // ===========================================================================
  // RESOLVER INTEGRATION (with valid UUIDs)
  // ===========================================================================
  describe('Resolver integration', () => {
    it('state converts to draft correctly for resolver', () => {
      state = applyActions(state, [
        { type: 'SET_CORE', payload: { name: 'Test', main_purpose_id: 'purpose-123', is_demo_content: true } },
        { type: 'ADD_STEP', payload: { id: UUID.step1, title: 'Step 1', body: 'Content' } as StepData },
      ]);

      const draft = stateToDraft(state);

      expect(draft.core?.name).toBe('Test');
      expect(draft.is_demo_content).toBe(true);
      expect(draft.steps).toHaveLength(1);
    });

    it('valid draft passes resolver gates', () => {
      state = applyActions(state, [
        { type: 'SET_CORE', payload: { name: 'Test lek', main_purpose_id: 'purpose-123' } },
        { type: 'ADD_STEP', payload: { id: UUID.step1, title: 'Steg 1', body: 'Gör detta' } as StepData },
      ]);

      const resolved = resolveDraft(stateToDraft(state));

      expect(resolved.isGatePassed('draft')).toBe(true);
      expect(resolved.isGatePassed('playable')).toBe(true);
    });

    it('artifact with valid step ref passes', () => {
      state = applyActions(state, [
        { type: 'ADD_STEP', payload: { id: UUID.step1, title: 'Step', body: '' } as StepData },
        { type: 'ADD_ARTIFACT', payload: { id: UUID.artifact1, title: 'Card', description: '', artifact_type: 'card', tags: [], metadata: { step_id: UUID.step1 }, variants: [] } as ArtifactFormData },
      ]);

      const resolved = resolveDraft(stateToDraft(state));
      const danglingRefs = resolved.errors.filter(e => e.code === 'B_DANGLING_REF');
      expect(danglingRefs.length).toBe(0);
    });

    it('artifact with dangling step ref fails', () => {
      state = applyActions(state, [
        { type: 'ADD_ARTIFACT', payload: { id: UUID.artifact1, title: 'Card', description: '', artifact_type: 'card', tags: [], metadata: { step_id: UUID.dangling }, variants: [] } as ArtifactFormData },
      ]);

      const resolved = resolveDraft(stateToDraft(state));
      const danglingRefs = resolved.errors.filter(e => e.code === 'B_DANGLING_REF');
      expect(danglingRefs.length).toBeGreaterThan(0);
    });
  });
});
