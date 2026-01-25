'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  type WizardStep,
  WIZARD_STEPS,
  isValidStep,
  getStepIndex,
  getNextStep,
  getPrevStep,
} from '../types';

export interface UsePlanWizardOptions {
  planId: string;
  /** Initial step if URL doesn't have one */
  initialStep?: WizardStep;
}

export interface UsePlanWizardResult {
  /** Current step from URL */
  currentStep: WizardStep;
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Navigate to a specific step */
  goToStep: (step: WizardStep) => void;
  /** Navigate to next step */
  goToNextStep: () => void;
  /** Navigate to previous step */
  goToPrevStep: () => void;
  /** Check if can go next */
  canGoNext: boolean;
  /** Check if can go prev */
  canGoPrev: boolean;
  /** Check if on first step */
  isFirstStep: boolean;
  /** Check if on last step */
  isLastStep: boolean;
  /** All steps */
  steps: WizardStep[];
}

/**
 * Hook for managing wizard navigation state.
 * URL is the source of truth for the current step.
 */
export function usePlanWizard({ planId, initialStep = 'grund' }: UsePlanWizardOptions): UsePlanWizardResult {
  const router = useRouter();
  const searchParams = useSearchParams();

  const stepParam = searchParams.get('step');
  const currentStep: WizardStep = isValidStep(stepParam) ? stepParam : initialStep;
  const currentStepIndex = getStepIndex(currentStep);

  const goToStep = useCallback(
    (step: WizardStep) => {
      router.push(`/app/planner/plan/${planId}?step=${step}`);
    },
    [router, planId]
  );

  const goToNextStep = useCallback(() => {
    const next = getNextStep(currentStep);
    if (next) {
      goToStep(next);
    }
  }, [currentStep, goToStep]);

  const goToPrevStep = useCallback(() => {
    const prev = getPrevStep(currentStep);
    if (prev) {
      goToStep(prev);
    }
  }, [currentStep, goToStep]);

  const canGoNext = useMemo(() => getNextStep(currentStep) !== null, [currentStep]);
  const canGoPrev = useMemo(() => getPrevStep(currentStep) !== null, [currentStep]);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  return {
    currentStep,
    currentStepIndex,
    totalSteps: WIZARD_STEPS.length,
    goToStep,
    goToNextStep,
    goToPrevStep,
    canGoNext,
    canGoPrev,
    isFirstStep,
    isLastStep,
    steps: WIZARD_STEPS,
  };
}
