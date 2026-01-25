/**
 * Planner Wizard Types
 *
 * Type definitions for the 5-step plan wizard.
 */

export type WizardStep = 'grund' | 'bygg' | 'anteckningar' | 'granska' | 'kor';

export const WIZARD_STEPS: WizardStep[] = [
  'grund',
  'bygg',
  'anteckningar',
  'granska',
  'kor',
];

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  grund: 'Grund',
  bygg: 'Bygg plan',
  anteckningar: 'Anteckningar',
  granska: 'Granska & Publicera',
  kor: 'Kör',
};

export const WIZARD_STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  grund: 'Titel, beskrivning och synlighet',
  bygg: 'Lägg till och ordna block',
  anteckningar: 'Privata och delade anteckningar',
  granska: 'Förhandsgranska och publicera',
  kor: 'Starta och genomför planen',
};

export function getStepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step);
}

export function getStepFromIndex(index: number): WizardStep {
  return WIZARD_STEPS[index] ?? 'grund';
}

export function isValidStep(step: string | null | undefined): step is WizardStep {
  return WIZARD_STEPS.includes(step as WizardStep);
}

export function getNextStep(current: WizardStep): WizardStep | null {
  const idx = getStepIndex(current);
  return idx < WIZARD_STEPS.length - 1 ? WIZARD_STEPS[idx + 1] : null;
}

export function getPrevStep(current: WizardStep): WizardStep | null {
  const idx = getStepIndex(current);
  return idx > 0 ? WIZARD_STEPS[idx - 1] : null;
}
