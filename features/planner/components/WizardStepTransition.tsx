'use client';

/**
 * WizardStepTransition Component
 * 
 * Animates wizard step transitions with direction-aware animations.
 * Uses useSyncExternalStore pattern to avoid setState in effects.
 */

import { useState, useEffect, type ReactNode } from 'react';
import styles from '../styles/animations.module.css';
import { cn } from '@/lib/utils';

interface WizardStepTransitionProps {
  children: ReactNode;
  /** Current step index (0-based) */
  stepIndex: number;
  /** Optional class for the wrapper */
  className?: string;
}

interface StepState {
  prevStep: number;
  currentStep: number;
  direction: 'forward' | 'backward' | null;
  animationKey: number;
}

function computeStepState(current: StepState, newStepIndex: number): StepState {
  if (newStepIndex === current.currentStep) {
    return current;
  }
  return {
    prevStep: current.currentStep,
    currentStep: newStepIndex,
    direction: newStepIndex > current.currentStep ? 'forward' : 'backward',
    animationKey: current.animationKey + 1,
  };
}

export function WizardStepTransition({
  children,
  stepIndex,
  className,
}: WizardStepTransitionProps) {
  const [state, setState] = useState<StepState>({
    prevStep: stepIndex,
    currentStep: stepIndex,
    direction: null,
    animationKey: 0,
  });

  // Use functional update to compute new state based on prop change
  // This is the recommended pattern - single setState call that derives all values
  if (stepIndex !== state.currentStep) {
    setState(prev => computeStepState(prev, stepIndex));
  }

  const animationClass = state.direction
    ? state.direction === 'forward'
      ? styles.stepForward
      : styles.stepBackward
    : '';

  return (
    <div
      className={cn(animationClass, className)}
      key={state.animationKey}
    >
      {children}
    </div>
  );
}

/**
 * useStepDirection Hook
 * 
 * Returns the direction of step navigation for custom animations.
 */
export function useStepDirection(currentStep: number): {
  direction: 'forward' | 'backward' | null;
  isAnimating: boolean;
} {
  const [state, setState] = useState<{
    prevStep: number;
    currentStep: number;
    direction: 'forward' | 'backward' | null;
    isAnimating: boolean;
  }>({
    prevStep: currentStep,
    currentStep: currentStep,
    direction: null,
    isAnimating: false,
  });

  // Synchronously update state during render when step changes
  if (currentStep !== state.currentStep) {
    setState({
      prevStep: state.currentStep,
      currentStep: currentStep,
      direction: currentStep > state.currentStep ? 'forward' : 'backward',
      isAnimating: true,
    });
  }

  // Only use effect for the timer to reset isAnimating
  useEffect(() => {
    if (state.isAnimating) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, isAnimating: false }));
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [state.isAnimating, state.currentStep]);

  return { direction: state.direction, isAnimating: state.isAnimating };
}
