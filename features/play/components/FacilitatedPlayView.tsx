'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UsersIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayHeader } from './shared/PlayHeader';
import { PlayTimer } from './shared/PlayTimer';
import { MaterialsChecklist } from './shared/MaterialsChecklist';
import { PhaseIndicator, type Phase } from './facilitated/PhaseIndicator';
import { PhaseNavigation } from './facilitated/PhaseNavigation';
import { BoardToggle } from './facilitated/BoardToggle';
import type { Run, RunStep } from '@/features/play/types';

// ============================================================================
// TYPES
// ============================================================================

export interface FacilitatedPlayViewProps {
  run: Run;
  sessionCode?: string;
  participantCount?: number;
  onComplete?: () => void;
  onPhaseChange?: (phaseIndex: number) => void;
  onBack?: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert run steps to phases for facilitated mode.
 * Each step becomes a phase with its own instructions.
 */
function stepsToPhases(steps: RunStep[]): Phase[] {
  return steps.map((step) => ({
    id: step.id,
    title: step.title,
    durationMinutes: step.durationMinutes > 0 ? step.durationMinutes : null,
  }));
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * FacilitatedPlayView - Facilitated activity mode view
 *
 * For group activities with a leader, workshops, team building moments.
 * Shows phase-based navigation, timer, participant count, and board toggle.
 */
export function FacilitatedPlayView({
  run,
  sessionCode = 'DEMO',
  participantCount = 0,
  onComplete,
  onPhaseChange,
  onBack,
}: FacilitatedPlayViewProps) {
  const router = useRouter();
  const t = useTranslations('play.facilitatedPlayView');
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(run.currentStepIndex);
  const [checkedMaterials, setCheckedMaterials] = useState<string[]>([]);
  const [timerState, setTimerState] = useState({
    elapsedSeconds: 0,
    isRunning: false,
  });

  // Convert steps to phases
  const phases = useMemo(() => stepsToPhases(run.steps), [run.steps]);
  const currentPhase = phases[currentPhaseIndex];
  const currentStep = run.steps[currentPhaseIndex];

  // Collect materials for current phase
  const phaseMaterials = currentStep?.materials?.map((name, idx) => ({
    id: `material-${idx}`,
    name,
  })) ?? [];

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }, [onBack, router]);

  const handlePreviousPhase = useCallback(() => {
    if (currentPhaseIndex > 0) {
      const newIndex = currentPhaseIndex - 1;
      setCurrentPhaseIndex(newIndex);
      onPhaseChange?.(newIndex);
    }
  }, [currentPhaseIndex, onPhaseChange]);

  const handleNextPhase = useCallback(() => {
    if (currentPhaseIndex < phases.length - 1) {
      const newIndex = currentPhaseIndex + 1;
      setCurrentPhaseIndex(newIndex);
      onPhaseChange?.(newIndex);
    }
  }, [currentPhaseIndex, phases.length, onPhaseChange]);

  const handlePhaseClick = useCallback((index: number) => {
    setCurrentPhaseIndex(index);
    onPhaseChange?.(index);
  }, [onPhaseChange]);

  const handleMaterialToggle = useCallback((id: string, checked: boolean) => {
    setCheckedMaterials((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  }, []);

  const handleTimerStateChange = useCallback((isRunning: boolean, seconds: number) => {
    setTimerState({ isRunning, elapsedSeconds: seconds });
  }, []);

  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header with timer */}
      <PlayHeader
        title={run.name}
        playMode="facilitated"
        sessionCode={sessionCode}
        onBack={handleBack}
        timer={timerState}
        rightContent={
          <div className="flex items-center gap-2">
            {/* Participant count */}
            {participantCount > 0 && (
              <Badge variant="outline" className="gap-1.5">
                <UsersIcon className="h-3.5 w-3.5" />
                {participantCount}
              </Badge>
            )}
          </div>
        }
      />

      {/* Main content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-40">
        {/* Phase indicator */}
        <PhaseIndicator
          phases={phases}
          currentPhaseIndex={currentPhaseIndex}
          onPhaseClick={handlePhaseClick}
        />

        {/* Current instruction card */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="py-6">
            <div className="space-y-4">
              {/* Phase title */}
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {t('phase', { current: currentPhaseIndex + 1 })}
                </span>
              </div>

              {/* Main instruction */}
              <h2 className="text-center text-2xl font-bold text-foreground">
                {currentStep?.title ?? t('unknownPhase')}
              </h2>

              {currentStep?.description && (
                <p className="text-center text-lg text-muted-foreground">
                  {currentStep.description}
                </p>
              )}

              {/* Phase timer (if phase has duration) */}
              {currentPhase?.durationMinutes && currentPhase.durationMinutes > 0 && (
                <div className="flex justify-center pt-4">
                  <PlayTimer
                    key={currentPhase.id} // Reset timer when phase changes
                    initialSeconds={currentPhase.durationMinutes * 60}
                    countdown
                    onStateChange={handleTimerStateChange}
                    size="lg"
                  />
                </div>
              )}

              {/* Safety note */}
              {currentStep?.safety && (
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-700 dark:text-amber-400">
                  ⚠️ {currentStep.safety}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Materials for this phase */}
        {phaseMaterials.length > 0 && (
          <MaterialsChecklist
            materials={phaseMaterials}
            checkedIds={checkedMaterials}
            onToggle={handleMaterialToggle}
          />
        )}

        {/* Board toggle */}
        <div className="flex justify-center">
          <BoardToggle sessionCode={sessionCode} />
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-background/95 p-4 backdrop-blur-sm">
        <div className="mx-auto max-w-xl">
          <PhaseNavigation
            currentPhaseIndex={currentPhaseIndex}
            totalPhases={phases.length}
            onPrevious={handlePreviousPhase}
            onNext={handleNextPhase}
            onComplete={handleComplete}
          />
        </div>
      </div>
    </div>
  );
}
