/**
 * Wizard Actions
 *
 * Pure functions that generate standard reducer actions.
 * Wizard NEVER has its own state for game data - it only dispatches actions.
 *
 * CRITICAL: All functions return BuilderAction[] (can be empty).
 * Caller is responsible for dispatching each action.
 *
 * @see docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md
 */

import type { BuilderAction, StepData, PhaseData } from '@/types/game-builder-state';
import type { ArtifactFormData } from '@/types/games';

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Generate a new UUID.
 * Uses crypto.randomUUID() which is available in all modern browsers and Node.
 */
function generateId(): string {
  return crypto.randomUUID();
}

// =============================================================================
// MODE SWITCHING
// =============================================================================

/**
 * Switch from simple to advanced mode.
 * Creates default phases if none exist.
 *
 * @returns Actions to dispatch
 */
export function switchToAdvancedMode(
  currentPhases: PhaseData[],
  currentSteps: StepData[]
): BuilderAction[] {
  const actions: BuilderAction[] = [];

  // If no phases, create default structure
  if (currentPhases.length === 0) {
    const introPhase: PhaseData = {
      id: generateId(),
      name: 'Intro',
      phase_type: 'intro',
      phase_order: 1,
      duration_seconds: null,
      timer_visible: false,
      timer_style: 'countdown',
      description: '',
      board_message: '',
      auto_advance: false,
    };

    const mainPhase: PhaseData = {
      id: generateId(),
      name: 'Huvuddel',
      phase_type: 'round',  // Valid PhaseType from DB constraint
      phase_order: 2,
      duration_seconds: null,
      timer_visible: true,
      timer_style: 'countdown',
      description: '',
      board_message: '',
      auto_advance: false,
    };

    const outroPhase: PhaseData = {
      id: generateId(),
      name: 'Avslut',
      phase_type: 'finale',  // Valid PhaseType from DB constraint
      phase_order: 3,
      duration_seconds: null,
      timer_visible: false,
      timer_style: 'countdown',
      description: '',
      board_message: '',
      auto_advance: false,
    };

    actions.push({ type: 'ADD_PHASE', payload: introPhase });
    actions.push({ type: 'ADD_PHASE', payload: mainPhase });
    actions.push({ type: 'ADD_PHASE', payload: outroPhase });

    // Assign existing steps to main phase
    for (const step of currentSteps) {
      if (!step.phase_id) {
        actions.push({
          type: 'UPDATE_STEP',
          payload: { id: step.id, data: { phase_id: mainPhase.id } },
        });
      }
    }
  }

  return actions;
}

/**
 * Switch from advanced to simple mode.
 * Removes phase assignments from steps (phase_id = null).
 * Does NOT delete phases (in case user switches back).
 *
 * @returns Actions to dispatch
 */
export function switchToSimpleMode(currentSteps: StepData[]): BuilderAction[] {
  const actions: BuilderAction[] = [];

  // Remove phase_id from all steps
  for (const step of currentSteps) {
    if (step.phase_id) {
      actions.push({
        type: 'UPDATE_STEP',
        payload: { id: step.id, data: { phase_id: null } },
      });
    }
  }

  return actions;
}

// =============================================================================
// STEP CREATION
// =============================================================================

/**
 * Create a new step with proper defaults.
 *
 * @param title - Step title
 * @param phaseId - Phase to assign to (null for simple mode)
 * @param order - Step order (optional, defaults to end)
 */
export function createStep(
  title: string,
  phaseId: string | null = null,
  options: Partial<Omit<StepData, 'id' | 'title' | 'phase_id'>> = {}
): BuilderAction {
  const step: StepData = {
    id: generateId(),
    title,
    body: '',
    duration_seconds: null,
    phase_id: phaseId,
    display_mode: 'instant',
    ...options,
  };

  return { type: 'ADD_STEP', payload: step };
}

/**
 * Create multiple steps at once (for templates).
 */
export function createSteps(
  steps: Array<{ title: string; phaseId?: string | null; body?: string }>
): BuilderAction[] {
  return steps.map((s) =>
    createStep(s.title, s.phaseId ?? null, { body: s.body ?? '' })
  );
}

// =============================================================================
// ARTIFACT ATTACHMENT
// =============================================================================

/**
 * Attach an artifact to a step.
 * Uses metadata.step_id (CANONICAL PATH - never use artifact.stepId).
 *
 * CRITICAL: stepId must be a raw UUID, not a node id (step-xxx).
 *
 * @param artifactId - Artifact to update
 * @param stepId - Step UUID to attach to (or null to detach)
 */
export function attachArtifactToStep(
  artifactId: string,
  stepId: string | null
): BuilderAction {
  // Validate: stepId must NOT be a node id format
  if (stepId && stepId.startsWith('step-')) {
    throw new Error(
      `attachArtifactToStep: stepId must be raw UUID, got node id "${stepId}"`
    );
  }

  return {
    type: 'UPDATE_ARTIFACT',
    payload: {
      id: artifactId,
      data: {
        metadata: stepId ? { step_id: stepId } : {},
      },
    },
  };
}

/**
 * Create an artifact already attached to a step.
 */
export function createArtifactForStep(
  stepId: string,
  artifact: Omit<ArtifactFormData, 'id' | 'metadata'>
): BuilderAction {
  // Validate: stepId must NOT be a node id format
  if (stepId.startsWith('step-')) {
    throw new Error(
      `createArtifactForStep: stepId must be raw UUID, got node id "${stepId}"`
    );
  }

  const fullArtifact: ArtifactFormData = {
    ...artifact,
    id: generateId(),
    metadata: { step_id: stepId },
  } as ArtifactFormData;

  return { type: 'ADD_ARTIFACT', payload: fullArtifact };
}

// =============================================================================
// STEP ↔ PHASE ASSIGNMENT
// =============================================================================

/**
 * Assign a step to a phase.
 *
 * @param stepId - Step UUID
 * @param phaseId - Phase UUID (or null to make orphan)
 */
export function assignStepToPhase(
  stepId: string,
  phaseId: string | null
): BuilderAction {
  // Validate: phaseId must NOT be a node id format
  if (phaseId && phaseId.startsWith('phase-') && phaseId !== 'phase-orphan') {
    throw new Error(
      `assignStepToPhase: phaseId must be raw UUID, got node id "${phaseId}"`
    );
  }

  // phase-orphan is our special key - convert to null
  const actualPhaseId = phaseId === 'phase-orphan' ? null : phaseId;

  return {
    type: 'UPDATE_STEP',
    payload: { id: stepId, data: { phase_id: actualPhaseId } },
  };
}
