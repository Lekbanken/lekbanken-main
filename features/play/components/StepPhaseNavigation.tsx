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
  PlayIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';

// =============================================================================
// Types
// =============================================================================

export interface StepInfo {
  id: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  leaderScript?: string;
  media?: { type: string; url: string; altText?: string };
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
  /** Unified mode: dots for steps, lines for phases in one component */
  unified?: boolean;
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
  unified = false,
}: StepPhaseNavigationProps) {
  // Navigation handlers
  const goToFirstStep = useCallback(() => {
    onStepChange(0);
  }, [onStepChange]);
  
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
  
  const goToLastStep = useCallback(() => {
    onStepChange(totalSteps - 1);
  }, [totalSteps, onStepChange]);
  
  const goToFirstPhase = useCallback(() => {
    onPhaseChange(0);
  }, [onPhaseChange]);
  
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
  
  // Check if we're in "not started" state
  const stepNotStarted = currentStepIndex < 0;
  const phaseNotStarted = currentPhaseIndex < 0;
  
  // Current step/phase info
  const currentStep = stepNotStarted ? null : steps?.[currentStepIndex];
  const currentPhase = phaseNotStarted ? null : phases?.[currentPhaseIndex];

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3">
        {/* Steps */}
        <div className="flex items-center gap-2">
          {stepNotStarted ? (
            <Button
              variant="primary"
              size="sm"
              onClick={goToFirstStep}
              disabled={disabled}
              className="gap-1.5"
            >
              <PlayIcon className="h-4 w-4" />
              Starta
            </Button>
          ) : (
            <>
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
            </>
          )}
        </div>
        
        {/* Phases */}
        {showPhases && totalPhases > 0 && (
          <div className="flex items-center gap-2">
            {phaseNotStarted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={goToFirstPhase}
                disabled={disabled}
                className="gap-1.5"
              >
                <PlayIcon className="h-4 w-4" />
                Starta fas
              </Button>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Unified mode: combined step dots + phase lines in one card
  if (unified) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        {/* Header row with step info */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Navigation
            </h3>
            {!stepNotStarted && currentStep && (
              <p className="text-sm font-medium text-foreground mt-1">
                Steg {currentStepIndex + 1}: {currentStep.title}
                {currentStep.durationMinutes && (
                  <span className="text-muted-foreground ml-2">({currentStep.durationMinutes} min)</span>
                )}
              </p>
            )}
          </div>
          {stepNotStarted ? (
            <Button
              variant="primary"
              size="sm"
              onClick={goToFirstStep}
              disabled={disabled}
              className="gap-1.5"
            >
              <PlayIcon className="h-4 w-4" />
              Starta spelet
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevStep}
                disabled={disabled || currentStepIndex === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground min-w-[4rem] text-center">
                {currentStepIndex + 1} / {totalSteps}
              </span>
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
          )}
        </div>

        {/* Step content: description + leader script */}
        {!stepNotStarted && currentStep && (currentStep.description || currentStep.leaderScript || currentStep.media?.url) && (
          <div className="space-y-3 rounded-xl bg-muted/50 p-3">
            {currentStep.description && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Beskrivning
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{currentStep.description}</p>
              </div>
            )}

            {currentStep.media?.url && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Media
                </p>
                <div className="overflow-hidden rounded-lg border bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentStep.media.url}
                    alt={currentStep.media.altText ?? currentStep.title}
                    className="h-auto w-full"
                  />
                </div>
              </div>
            )}

            {currentStep.leaderScript && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  💬 Ledarskript
                </p>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-sm text-foreground italic whitespace-pre-wrap">&ldquo;{currentStep.leaderScript}&rdquo;</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step dots row */}
        {!stepNotStarted && (
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                onClick={() => onStepChange(i)}
                disabled={disabled}
                className={`h-3 w-3 rounded-full transition-all hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  i === currentStepIndex
                    ? 'bg-primary scale-125 ring-2 ring-primary ring-offset-2'
                    : i < currentStepIndex
                      ? 'bg-primary/50'
                      : 'bg-muted hover:bg-muted-foreground/50'
                }`}
                title={steps?.[i]?.title ?? `Steg ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Phase section - lines/segments */}
        {showPhases && totalPhases > 0 && !stepNotStarted && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Fas
              </span>
              {phaseNotStarted ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToFirstPhase}
                  disabled={disabled}
                  className="gap-1 h-7 text-xs"
                >
                  <PlayIcon className="h-3 w-3" />
                  Starta fas
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPrevPhase}
                    disabled={disabled || currentPhaseIndex === 0}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronLeftIcon className="h-3 w-3" />
                  </Button>
                  <span className="text-xs font-medium text-muted-foreground">
                    {currentPhaseIndex + 1} / {totalPhases}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNextPhase}
                    disabled={disabled || currentPhaseIndex === totalPhases - 1}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronRightIcon className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Phase progress bar with segments */}
            {!phaseNotStarted && (
              <>
                <div className="flex gap-1 h-2">
                  {Array.from({ length: totalPhases }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => onPhaseChange(i)}
                      disabled={disabled}
                      className={`flex-1 rounded-sm transition-all hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-1 ${
                        i === currentPhaseIndex
                          ? 'bg-secondary'
                          : i < currentPhaseIndex
                            ? 'bg-secondary/40'
                            : 'bg-muted'
                      }`}
                      title={phases?.[i]?.name ?? `Fas ${i + 1}`}
                    />
                  ))}
                </div>
                {/* Current phase name */}
                {currentPhase && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {currentPhase.name}
                    {currentPhase.description && ` – ${currentPhase.description}`}
                  </p>
                )}
              </>
            )}
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
            {stepNotStarted ? 'Ej startat' : `${currentStepIndex + 1} av ${totalSteps}`}
          </span>
        </div>
        
        {/* Not started state */}
        {stepNotStarted ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-muted-foreground">
                Stegen har inte startats ännu. Klicka på knappen nedan för att starta första steget.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={goToFirstStep}
              disabled={disabled}
              className="w-full gap-2"
            >
              <PlayIcon className="h-5 w-5" />
              Starta första steget
            </Button>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
      
      {/* Phases Navigation */}
      {showPhases && totalPhases > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Fas
            </h3>
            <span className="text-sm font-medium text-muted-foreground">
              {phaseNotStarted ? 'Ej startat' : `${currentPhaseIndex + 1} av ${totalPhases}`}
            </span>
          </div>
          
          {/* Not started state */}
          {phaseNotStarted ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-4 text-center">
                <p className="text-muted-foreground">
                  Faserna har inte startats ännu. Klicka på knappen nedan för att starta första fasen.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={goToFirstPhase}
                disabled={disabled}
                className="w-full gap-2"
              >
                <PlayIcon className="h-5 w-5" />
                Starta första fasen
              </Button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
