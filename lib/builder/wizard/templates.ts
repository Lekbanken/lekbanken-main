/**
 * Wizard Templates
 *
 * Pre-defined game structures that dispatch standard reducer actions.
 * Templates are "just draft JSON patches" - no shadow state.
 *
 * CRITICAL: Templates dispatch actions via the caller's dispatch function.
 * They never modify state directly.
 *
 * @see docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md
 */

import type { BuilderAction, StepData, PhaseData, CoreForm } from '@/types/game-builder-state';
import type { ArtifactFormData } from '@/types/games';
import type { TemplateId, TemplateMetadata } from './types';

// =============================================================================
// TEMPLATE REGISTRY
// =============================================================================

export const TEMPLATE_METADATA: Record<TemplateId, TemplateMetadata> = {
  blank: {
    id: 'blank',
    name: 'Tom lek',
    description: 'Börja från scratch med en tom lek',
    mode: 'simple',
    stepCount: 0,
    features: { phases: false, roles: false, artifacts: false, triggers: false },
  },
  'basic-activity': {
    id: 'basic-activity',
    name: 'Enkel aktivitet',
    description: '3-5 steg utan faser - perfekt för korta övningar',
    mode: 'simple',
    stepCount: 3,
    features: { phases: false, roles: false, artifacts: false, triggers: false },
  },
  'facilitated-phases': {
    id: 'facilitated-phases',
    name: 'Faciliterad med faser',
    description: 'Intro → Huvuddel → Reflektion - klassisk workshop-struktur',
    mode: 'advanced',
    stepCount: 5,
    features: { phases: true, roles: false, artifacts: false, triggers: false },
  },
  'escape-room-lite': {
    id: 'escape-room-lite',
    name: 'Escape Room Lite',
    description: 'Faser + artifacts - för interaktiva lekar',
    mode: 'advanced',
    stepCount: 6,
    features: { phases: true, roles: true, artifacts: true, triggers: false },
  },
};

// =============================================================================
// ID GENERATION
// =============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

// =============================================================================
// TEMPLATE GENERATORS
// =============================================================================

/**
 * Apply a template to the current draft.
 * Returns actions to dispatch - caller is responsible for dispatching.
 *
 * @param templateId - Which template to apply
 * @param overrides - Optional overrides for core fields
 * @returns Array of actions to dispatch
 */
export function applyTemplate(
  templateId: TemplateId,
  overrides: Partial<CoreForm> = {}
): BuilderAction[] {
  switch (templateId) {
    case 'blank':
      return applyBlankTemplate(overrides);
    case 'basic-activity':
      return applyBasicActivityTemplate(overrides);
    case 'facilitated-phases':
      return applyFacilitatedPhasesTemplate(overrides);
    case 'escape-room-lite':
      return applyEscapeRoomLiteTemplate(overrides);
    default:
      return [];
  }
}

// =============================================================================
// INDIVIDUAL TEMPLATES
// =============================================================================

function applyBlankTemplate(overrides: Partial<CoreForm>): BuilderAction[] {
  const actions: BuilderAction[] = [];

  // Just set core overrides if any
  if (Object.keys(overrides).length > 0) {
    actions.push({ type: 'SET_CORE', payload: overrides });
  }

  return actions;
}

function applyBasicActivityTemplate(overrides: Partial<CoreForm>): BuilderAction[] {
  const actions: BuilderAction[] = [];

  // Core settings
  actions.push({
    type: 'SET_CORE',
    payload: {
      name: 'Ny aktivitet',
      play_mode: 'basic',
      ...overrides,
    },
  });

  // 3 simple steps (no phase_id)
  const steps: StepData[] = [
    {
      id: generateId(),
      title: 'Introduktion',
      body: 'Beskriv vad deltagarna ska göra...',
      duration_seconds: 120,
      phase_id: null,
      display_mode: 'instant',
    },
    {
      id: generateId(),
      title: 'Aktivitet',
      body: 'Huvudaktiviteten...',
      duration_seconds: 300,
      phase_id: null,
      display_mode: 'instant',
    },
    {
      id: generateId(),
      title: 'Avslut',
      body: 'Sammanfatta och avsluta...',
      duration_seconds: 60,
      phase_id: null,
      display_mode: 'instant',
    },
  ];

  for (const step of steps) {
    actions.push({ type: 'ADD_STEP', payload: step });
  }

  return actions;
}

function applyFacilitatedPhasesTemplate(overrides: Partial<CoreForm>): BuilderAction[] {
  const actions: BuilderAction[] = [];

  // Core settings
  actions.push({
    type: 'SET_CORE',
    payload: {
      name: 'Ny workshop',
      play_mode: 'facilitated',
      ...overrides,
    },
  });

  // Create phases
  const introPhaseId = generateId();
  const mainPhaseId = generateId();
  const reflectionPhaseId = generateId();

  const phases: PhaseData[] = [
    {
      id: introPhaseId,
      name: 'Intro',
      phase_type: 'intro',
      phase_order: 1,
      duration_seconds: 300,
      timer_visible: false,
      timer_style: 'countdown',
      description: 'Välkomna och sätt scenen',
      board_message: 'Välkommen!',
      auto_advance: false,
    },
    {
      id: mainPhaseId,
      name: 'Huvuddel',
      phase_type: 'round',  // Valid PhaseType from DB constraint
      phase_order: 2,
      duration_seconds: 900,
      timer_visible: true,
      timer_style: 'countdown',
      description: 'Huvudaktiviteten',
      board_message: '',
      auto_advance: false,
    },
    {
      id: reflectionPhaseId,
      name: 'Reflektion',
      phase_type: 'finale',  // Valid PhaseType from DB constraint
      phase_order: 3,
      duration_seconds: 300,
      timer_visible: false,
      timer_style: 'countdown',
      description: 'Samla tankar och insikter',
      board_message: 'Vad tar ni med er?',
      auto_advance: false,
    },
  ];

  for (const phase of phases) {
    actions.push({ type: 'ADD_PHASE', payload: phase });
  }

  // Create steps assigned to phases
  const steps: StepData[] = [
    {
      id: generateId(),
      title: 'Välkomna',
      body: 'Hälsa deltagarna välkomna och presentera dagens upplägg.',
      duration_seconds: 120,
      phase_id: introPhaseId,
      display_mode: 'instant',
    },
    {
      id: generateId(),
      title: 'Isbrytare',
      body: 'En kort övning för att få igång energin.',
      duration_seconds: 180,
      phase_id: introPhaseId,
      display_mode: 'instant',
    },
    {
      id: generateId(),
      title: 'Övning 1',
      body: 'Första huvudövningen.',
      duration_seconds: 300,
      phase_id: mainPhaseId,
      display_mode: 'instant',
    },
    {
      id: generateId(),
      title: 'Diskussion',
      body: 'Diskutera i grupp.',
      duration_seconds: 300,
      phase_id: mainPhaseId,
      display_mode: 'instant',
    },
    {
      id: generateId(),
      title: 'Avslutande reflektion',
      body: 'Vad tar ni med er från denna session?',
      duration_seconds: 180,
      phase_id: reflectionPhaseId,
      display_mode: 'instant',
    },
  ];

  for (const step of steps) {
    actions.push({ type: 'ADD_STEP', payload: step });
  }

  return actions;
}

function applyEscapeRoomLiteTemplate(overrides: Partial<CoreForm>): BuilderAction[] {
  const actions: BuilderAction[] = [];

  // Core settings
  actions.push({
    type: 'SET_CORE',
    payload: {
      name: 'Escape Room',
      play_mode: 'facilitated',
      ...overrides,
    },
  });

  // Create phases
  const introPhaseId = generateId();
  const puzzlePhaseId = generateId();
  const outroPhaseId = generateId();

  const phases: PhaseData[] = [
    {
      id: introPhaseId,
      name: 'Intro',
      phase_type: 'intro',
      phase_order: 1,
      duration_seconds: 180,
      timer_visible: false,
      timer_style: 'countdown',
      description: 'Sätt scenen',
      board_message: 'Ni har 30 minuter...',
      auto_advance: false,
    },
    {
      id: puzzlePhaseId,
      name: 'Pussel',
      phase_type: 'round',  // Valid PhaseType from DB constraint
      phase_order: 2,
      duration_seconds: 1800,
      timer_visible: true,
      timer_style: 'countdown',
      description: 'Lös pusslen!',
      board_message: '',
      auto_advance: false,
    },
    {
      id: outroPhaseId,
      name: 'Avslut',
      phase_type: 'finale',  // Valid PhaseType from DB constraint
      phase_order: 3,
      duration_seconds: 120,
      timer_visible: false,
      timer_style: 'countdown',
      description: 'Avslöja lösningen',
      board_message: 'Bra jobbat!',
      auto_advance: false,
    },
  ];

  for (const phase of phases) {
    actions.push({ type: 'ADD_PHASE', payload: phase });
  }

  // Create steps
  const step1Id = generateId();
  const step2Id = generateId();

  const steps: StepData[] = [
    {
      id: generateId(),
      title: 'Scenario',
      body: 'Presentera scenariot och reglerna.',
      duration_seconds: 120,
      phase_id: introPhaseId,
      display_mode: 'dramatic',
    },
    {
      id: step1Id,
      title: 'Pussel 1',
      body: 'Första pusslet att lösa.',
      duration_seconds: 600,
      phase_id: puzzlePhaseId,
      display_mode: 'instant',
    },
    {
      id: step2Id,
      title: 'Pussel 2',
      body: 'Andra pusslet att lösa.',
      duration_seconds: 600,
      phase_id: puzzlePhaseId,
      display_mode: 'instant',
    },
    {
      id: generateId(),
      title: 'Final',
      body: 'Sista utmaningen.',
      duration_seconds: 600,
      phase_id: puzzlePhaseId,
      display_mode: 'instant',
    },
    {
      id: generateId(),
      title: 'Debrief',
      body: 'Gå igenom lösningen och samla reflektioner.',
      duration_seconds: 120,
      phase_id: outroPhaseId,
      display_mode: 'instant',
    },
  ];

  for (const step of steps) {
    actions.push({ type: 'ADD_STEP', payload: step });
  }

  // Create a simple artifact attached to step1
  // NOTE: We use metadata.step_id (CANONICAL) - never artifact.stepId
  actions.push({
    type: 'ADD_ARTIFACT',
    payload: {
      id: generateId(),
      title: 'Ledtråd 1',
      artifact_type: 'card',
      artifact_order: 1,
      is_required: true,
      content_data: { text: 'En hemlig ledtråd...' },
      metadata: { step_id: step1Id },
      variants: [],
    } as unknown as ArtifactFormData, // Partial artifact data - full type has more required fields
  });

  return actions;
}

// =============================================================================
// TEMPLATE HELPERS
// =============================================================================

/**
 * Get all available templates.
 */
export function getAvailableTemplates(): TemplateMetadata[] {
  return Object.values(TEMPLATE_METADATA);
}

/**
 * Get templates filtered by mode.
 */
export function getTemplatesForMode(mode: 'simple' | 'advanced'): TemplateMetadata[] {
  return Object.values(TEMPLATE_METADATA).filter((t) => t.mode === mode);
}
