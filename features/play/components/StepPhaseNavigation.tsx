/**
 * StepPhaseNavigation Component
 * 
 * Navigation controls for facilitators to move between steps and phases.
 * Supports independent step/phase navigation as per design.
 */

'use client';

import { useCallback } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';

// =============================================================================
// Types
// =============================================================================

export interface StepInfo {
  id: string;
  title: string;
  durationMinutes?: number;
}

export interface PhaseInfo {
  id: string;
  name: string;
  description?: string;
}

export interface StepPhaseNavigationProps {
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Step info for display */
  steps?: StepInfo[];
  /** Current phase index (0-based) */
  currentPhaseIndex: number;
  /** Total number of phases */
  totalPhases: number;
  /** Phase info for display */
  phases?: PhaseInfo[];
  /** Called when step changes */
  onStepChange: (index: number) => void;
  /** Called when phase changes */
  onPhaseChange: (index: number) => void;
  /** Whether controls are disabled */
  disabled?: boolean;
  /** Show phases section */
  showPhases?: boolean;
  /** Compact mode (horizontal layout) */
  compact?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function StepPhaseNavigation({
  currentStepIndex,
  totalSteps,
  steps,
  currentPhaseIndex,
  totalPhases,
  phases,
  onStepChange,
  onPhaseChange,
  disabled = false,
  showPhases = true,
  compact = false,
}: StepPhaseNavigationProps) {
  // Navigation handlers
  const goToPrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      onStepChange(currentStepIndex - 1);
    }
  }, [currentStepIndex, onStepChange]);
  
  const goToNextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      onStepChange(currentStepIndex + 1);
    }
  }, [currentStepIndex, totalSteps, onStepChange]);
  
  const goToFirstStep = useCallback(() => {
    onStepChange(0);
  }, [onStepChange]);
  
  const goToLastStep = useCallback(() => {
    onStepChange(totalSteps - 1);
  }, [totalSteps, onStepChange]);
  
  const goToPrevPhase = useCallback(() => {
    if (currentPhaseIndex > 0) {
      onPhaseChange(currentPhaseIndex - 1);
    }
  }, [currentPhaseIndex, onPhaseChange]);
  
  const goToNextPhase = useCallback(() => {
    if (currentPhaseIndex < totalPhases - 1) {
      onPhaseChange(currentPhaseIndex + 1);
    }
  }, [currentPhaseIndex, totalPhases, onPhaseChange]);
  
  // Current step/phase info
  const currentStep = steps?.[currentStepIndex];
  const currentPhase = phases?.[currentPhaseIndex];

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3">
        {/* Steps */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevStep}
            disabled={disabled || currentStepIndex === 0}
            className="h-8 w-8 p-0"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground">Steg</p>
            <p className="text-sm font-bold">{currentStepIndex + 1} / {totalSteps}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextStep}
            disabled={disabled || currentStepIndex === totalSteps - 1}
            className="h-8 w-8 p-0"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Phases */}
        {showPhases && totalPhases > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevPhase}
              disabled={disabled || currentPhaseIndex === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-xs font-medium text-muted-foreground">Fas</p>
              <p className="text-sm font-bold">{currentPhaseIndex + 1} / {totalPhases}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextPhase}
              disabled={disabled || currentPhaseIndex === totalPhases - 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Steps Navigation */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Steg
          </h3>
          <span className="text-sm font-medium text-muted-foreground">
            {currentStepIndex + 1} av {totalSteps}
          </span>
        </div>
        
        {/* Current step info */}
        {currentStep && (
          <div className="mb-4 rounded-xl bg-muted/50 p-3">
            <p className="font-medium text-foreground">{currentStep.title}</p>
            {currentStep.durationMinutes && (
              <p className="mt-1 text-sm text-muted-foreground">
                {currentStep.durationMinutes} min
              </p>
            )}
          </div>
        )}
        
        {/* Step controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToFirstStep}
            disabled={disabled || currentStepIndex === 0}
            title="Första steget"
            className="p-2"
          >
            <ChevronDoubleLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={goToPrevStep}
            disabled={disabled || currentStepIndex === 0}
            className="flex-1 gap-2"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Föregående
          </Button>
          <Button
            size="lg"
            onClick={goToNextStep}
            disabled={disabled || currentStepIndex === totalSteps - 1}
            className="flex-1 gap-2"
          >
            Nästa
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToLastStep}
            disabled={disabled || currentStepIndex === totalSteps - 1}
            title="Sista steget"
            className="p-2"
          >
            <ChevronDoubleRightIcon className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Step dots */}
        <div className="mt-4 flex flex-wrap justify-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <button
              key={i}
              onClick={() => onStepChange(i)}
              disabled={disabled}
              className={`h-2.5 w-2.5 rounded-full transition-all hover:scale-125 ${
                i === currentStepIndex 
                  ? 'bg-primary scale-125' 
                  : i < currentStepIndex 
                    ? 'bg-primary/40' 
                    : 'bg-muted hover:bg-muted-foreground/50'
              }`}
              title={`Gå till steg ${i + 1}`}
            />
          ))}
        </div>
      </div>
      
      {/* Phases Navigation */}
      {showPhases && totalPhases > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Fas
            </h3>
            <span className="text-sm font-medium text-muted-foreground">
              {currentPhaseIndex + 1} av {totalPhases}
            </span>
          </div>
          
          {/* Current phase info */}
          {currentPhase && (
            <div className="mb-4 rounded-xl bg-muted/50 p-3">
              <p className="font-medium text-foreground">{currentPhase.name}</p>
              {currentPhase.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentPhase.description}
                </p>
              )}
            </div>
          )}
          
          {/* Phase controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={goToPrevPhase}
              disabled={disabled || currentPhaseIndex === 0}
              className="flex-1 gap-2"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Föregående
            </Button>
            <Button
              size="lg"
              onClick={goToNextPhase}
              disabled={disabled || currentPhaseIndex === totalPhases - 1}
              className="flex-1 gap-2"
            >
              Nästa
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Phase dots */}
          <div className="mt-4 flex flex-wrap justify-center gap-1">
            {Array.from({ length: totalPhases }).map((_, i) => (
              <button
                key={i}
                onClick={() => onPhaseChange(i)}
                disabled={disabled}
                className={`h-2.5 w-2.5 rounded-full transition-all hover:scale-125 ${
                  i === currentPhaseIndex 
                    ? 'bg-secondary scale-125' 
                    : i < currentPhaseIndex 
                      ? 'bg-secondary/40' 
                      : 'bg-muted hover:bg-muted-foreground/50'
                }`}
                title={`Gå till fas ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
