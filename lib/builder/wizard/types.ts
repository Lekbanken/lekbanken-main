/**
 * Wizard Types
 *
 * Types for the game builder wizard mode.
 * Wizard dispatches standard reducer actions - NO shadow state.
 *
 * @see docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md
 */

// =============================================================================
// WIZARD MODE
// =============================================================================

/**
 * Wizard complexity mode.
 * - simple: No phases, steps get phase_id = null
 * - advanced: Phases enabled, wizard creates default phases
 */
export type WizardMode = 'simple' | 'advanced';

/**
 * Wizard step (UI flow, not game step).
 */
export type WizardStep =
  | 'mode-select'     // Choose simple/advanced
  | 'basic-info'      // Name, purpose, description
  | 'structure'       // Steps (and phases in advanced mode)
  | 'content'         // Step content, artifacts
  | 'settings'        // Board config, tools
  | 'review';         // Final review before publish

/**
 * Wizard state (UI only - NOT persisted to draft).
 * This is purely for UI navigation, not game data.
 */
export interface WizardUIState {
  /** Current wizard step */
  currentStep: WizardStep;
  /** Selected mode */
  mode: WizardMode;
  /** Whether phases UI is visible (can be toggled in advanced) */
  showPhases: boolean;
  /** Collapsed sections for UX */
  collapsedSections: Set<string>;
}

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

/**
 * Template identifier.
 */
export type TemplateId =
  | 'blank'                    // Empty game
  | 'basic-activity'           // 3-5 steps, no phases
  | 'facilitated-phases'       // Intro → rounds → debrief
  | 'escape-room-lite';        // Phases + artifacts (no triggers)

/**
 * Template metadata.
 */
export interface TemplateMetadata {
  id: TemplateId;
  name: string;
  description: string;
  mode: WizardMode;
  /** Approximate step count */
  stepCount: number;
  /** Features included */
  features: {
    phases: boolean;
    roles: boolean;
    artifacts: boolean;
    triggers: boolean;
  };
}

// =============================================================================
// WIZARD DEFAULTS
// =============================================================================

export const DEFAULT_WIZARD_UI_STATE: WizardUIState = {
  currentStep: 'mode-select',
  mode: 'simple',
  showPhases: false,
  collapsedSections: new Set(),
};

export const WIZARD_STEP_ORDER: readonly WizardStep[] = [
  'mode-select',
  'basic-info',
  'structure',
  'content',
  'settings',
  'review',
] as const;

/**
 * Get next wizard step.
 */
export function getNextWizardStep(current: WizardStep): WizardStep | null {
  const idx = WIZARD_STEP_ORDER.indexOf(current);
  if (idx === -1 || idx === WIZARD_STEP_ORDER.length - 1) return null;
  return WIZARD_STEP_ORDER[idx + 1];
}

/**
 * Get previous wizard step.
 */
export function getPreviousWizardStep(current: WizardStep): WizardStep | null {
  const idx = WIZARD_STEP_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return WIZARD_STEP_ORDER[idx - 1];
}
