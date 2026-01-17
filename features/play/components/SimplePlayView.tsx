'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlayHeader } from './shared/PlayHeader';
import { PlayTimer } from './shared/PlayTimer';
import { InstructionsCard } from './shared/InstructionsCard';
import { MaterialsChecklist } from './shared/MaterialsChecklist';
import type { Run } from '@/features/play/types';

// ============================================================================
// TYPES
// ============================================================================

export interface SimplePlayViewProps {
  run: Run;
  onComplete?: () => void;
  onStepChange?: (stepIndex: number) => void;
  onBack?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * SimplePlayView - Basic play mode view
 *
 * For traditional games with steps and materials.
 * No digital interaction, just straightforward instructions.
 */
export function SimplePlayView({
  run,
  onComplete,
  onStepChange,
  onBack,
}: SimplePlayViewProps) {
  const router = useRouter();
  const t = useTranslations('play.simplePlayView');
  const [currentStepIndex, setCurrentStepIndex] = useState(run.currentStepIndex);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [checkedMaterials, setCheckedMaterials] = useState<string[]>([]);
  const [timerState, setTimerState] = useState({
    elapsedSeconds: 0,
    isRunning: false,
  });

  const steps = run.steps;
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const allStepsCompleted = completedStepIds.length === steps.length;

  // Collect all materials from steps
  const allMaterials = steps.flatMap((step, _idx) =>
    (step.materials ?? []).map((name, mIdx) => ({
      id: `${step.id}-material-${mIdx}`,
      name,
    }))
  );
  const uniqueMaterials = allMaterials.filter(
    (m, i, arr) => arr.findIndex((x) => x.name === m.name) === i
  );

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }, [onBack, router]);

  const handleStepComplete = useCallback((stepId: string) => {
    setCompletedStepIds((prev) => {
      if (prev.includes(stepId)) {
        return prev.filter((id) => id !== stepId);
      }
      return [...prev, stepId];
    });
  }, []);

  const handleStepClick = useCallback((index: number) => {
    setCurrentStepIndex(index);
    onStepChange?.(index);
  }, [onStepChange]);

  const handleMaterialToggle = useCallback((id: string, checked: boolean) => {
    setCheckedMaterials((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  }, []);

  const handleTimerStateChange = useCallback((isRunning: boolean, seconds: number) => {
    setTimerState({ isRunning, elapsedSeconds: seconds });
  }, []);

  const handleNextStep = useCallback(() => {
    if (!currentStep) return;

    // Mark current step as complete
    if (!completedStepIds.includes(currentStep.id)) {
      setCompletedStepIds((prev) => [...prev, currentStep.id]);
    }

    // Move to next step or finish
    if (isLastStep) {
      onComplete?.();
    } else {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      onStepChange?.(nextIndex);
    }
  }, [currentStep, completedStepIds, isLastStep, currentStepIndex, onStepChange, onComplete]);

  const handleFinish = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <PlayHeader
        title={run.name}
        playMode="basic"
        onBack={handleBack}
        timer={timerState}
      />

      {/* Main content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-32">
        {/* Current step highlight */}
        {currentStep && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                  {currentStepIndex + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-foreground">
                    {currentStep.title}
                  </h2>
                  {currentStep.description && (
                    <p className="mt-1 text-muted-foreground">
                      {currentStep.description}
                    </p>
                  )}
                  {currentStep.durationMinutes > 0 && (
                    <div className="mt-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-sm text-muted-foreground">
                        ⏱️ {t('suggestedDuration', { minutes: currentStep.durationMinutes })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timer (optional, for timed activities) */}
        {run.totalDurationMinutes > 0 && (
          <Card>
            <CardContent className="py-4">
              <PlayTimer
                initialSeconds={run.totalDurationMinutes * 60}
                countdown
                onStateChange={handleTimerStateChange}
                size="md"
              />
            </CardContent>
          </Card>
        )}

        {/* Materials checklist */}
        {uniqueMaterials.length > 0 && (
          <MaterialsChecklist
            materials={uniqueMaterials}
            checkedIds={checkedMaterials}
            onToggle={handleMaterialToggle}
          />
        )}

        {/* All steps */}
        <InstructionsCard
          steps={steps}
          currentStepIndex={currentStepIndex}
          completedStepIds={completedStepIds}
          onStepComplete={handleStepComplete}
          onStepClick={handleStepClick}
          showStepNumbers
        />
      </div>

      {/* Bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-background/95 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          {/* Progress indicator */}
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {t('stepOf', { current: currentStepIndex + 1, total: steps.length })}
              </span>
              {completedStepIds.length > 0 && (
                <span className="text-primary">
                  {t('stepsCompleted', { count: completedStepIds.length })}
                </span>
              )}
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Action buttons */}
          {allStepsCompleted || isLastStep ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleFinish}
              className="gap-2"
            >
              <CheckCircleIcon className="h-5 w-5" />
              {t('finish')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleNextStep}
              className="gap-2"
            >
              {t('next')}
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
