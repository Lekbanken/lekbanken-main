/**
 * Planner Wizard Types
 *
 * Type definitions for the 2-step plan wizard (v2.0).
 * Refactored from 5 steps to 2: Build Plan → Save & Run.
 */

export type WizardStep = 'build' | 'save-and-run';

/** Legacy step names for URL backwards compatibility */
type LegacyWizardStep = 'grund' | 'bygg' | 'anteckningar' | 'granska' | 'kor';

export const WIZARD_STEPS: WizardStep[] = ['build', 'save-and-run'];

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  build: 'Bygg plan',
  'save-and-run': 'Spara & Utför',
};

export const WIZARD_STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  build: 'Lägg till och ordna block, anteckningar',
  'save-and-run': 'Förhandsgranska, spara och starta',
};

/**
 * Map legacy step names (from old URLs) to new steps.
 * Old steps 1–2 (grund, bygg) → 'build', steps 3–5 (anteckningar, granska, kor) → 'save-and-run'
 */
const LEGACY_STEP_MAP: Record<LegacyWizardStep, WizardStep> = {
  grund: 'build',
  bygg: 'build',
  anteckningar: 'build',
  granska: 'save-and-run',
  kor: 'save-and-run',
};

export function getStepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step);
}

export function getStepFromIndex(index: number): WizardStep {
  return WIZARD_STEPS[index] ?? 'build';
}

export function isValidStep(step: string | null | undefined): step is WizardStep {
  if (!step) return false;
  // Accept both new and legacy step names
  return WIZARD_STEPS.includes(step as WizardStep) || step in LEGACY_STEP_MAP;
}

/** Resolve a step param (new or legacy) to a current WizardStep */
export function resolveStep(step: string | null | undefined): WizardStep {
  if (!step) return 'build';
  if (WIZARD_STEPS.includes(step as WizardStep)) return step as WizardStep;
  if (step in LEGACY_STEP_MAP) return LEGACY_STEP_MAP[step as LegacyWizardStep];
  return 'build';
}

export function getNextStep(current: WizardStep): WizardStep | null {
  const idx = getStepIndex(current);
  return idx < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[idx + 1] : null;
}

export function getPrevStep(current: WizardStep): WizardStep | null {
  const idx = getStepIndex(current);
  return idx > 0 ? WIZARD_STEPS[idx - 1] : null;
}
