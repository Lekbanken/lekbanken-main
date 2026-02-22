/**
 * DirectorStagePanel — Director's primary surface
 *
 * Mirrors the visual rhythm and typographic hierarchy of ParticipantStepStage
 * so the host sees a familiar layout. Uses shared motion tokens for step-change
 * stagger parity.
 *
 * Sections:
 *   1. Phase pill (chapter indicator — same style as participant)
 *   2. Step card (key-animated, with motion stagger)
 *     - Step header (number badge, "Step X of Y", tag, nav buttons)
 *     - Progress bar
 *   3. Participant Glass Pane — "what players see" read-only preview
 *     - Title, description (paragraph-chunked), prompt, media indicator
 *   4. Leader Notes — host-only script (amber panel) + boardText
 *   5. Step progress dots (matching participant)
 *
 * Rules:
 *   - Event feed is NEVER part of this surface (belongs in Events drawer)
 *   - Leader notes never leak into participant glass pane
 *   - Step controls live here (Prev/Next), not in action strip
 *   - All motion uses shared tokens for SSoT parity
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  PhotoIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';
import type { CockpitStep, CockpitPhase } from '@/types/session-cockpit';
import {
  MOTION_STAGE_STEP_CARD,
  MOTION_STAGE_TITLE,
  MOTION_STAGE_DESC,
  ProgressDots,
  LeaderScriptSections,
} from '@/features/play/components/shared';

// =============================================================================
// Props
// =============================================================================

export interface DirectorStagePanelProps {
  steps: CockpitStep[];
  currentStepIndex: number;
  phases: CockpitPhase[];
  currentPhaseIndex: number;

  onNextStep?: () => void;
  onPreviousStep?: () => void;
  disabled?: boolean;

  /** Swipe ref for mobile gestures */
  swipeRef?: React.RefObject<HTMLDivElement | null>;

  /** i18n accessor from parent */
  t: {
    (key: string, values?: Record<string, unknown>): string;
  };
}

// =============================================================================
// Sub-components
// =============================================================================

/** Phase pill — matches participant chapter pill */
function PhasePill({
  phase,
  phaseIndex,
  totalPhases,
  t,
}: {
  phase: CockpitPhase;
  phaseIndex: number;
  totalPhases: number;
  t: DirectorStagePanelProps['t'];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('stage.phaseOf', { current: phaseIndex + 1, total: totalPhases })}
      </span>
      <span className="text-sm font-semibold text-foreground truncate">
        {phase.name}
      </span>
    </div>
  );
}

/** Participant Glass Pane — read-only preview of what players see */
function ParticipantGlassPane({
  step,
  t,
}: {
  step: CockpitStep;
  t: DirectorStagePanelProps['t'];
}) {
  return (
    <Card className="p-4 border-border/50 bg-muted/10">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
        {t('stage.participantView')}
      </div>

      {/* Title — matches participant h2 weight */}
      <h3 className={cn('text-lg font-bold leading-tight tracking-[-0.01em] text-foreground', MOTION_STAGE_TITLE)}>
        {step.title}
      </h3>

      {/* Description — paragraph-chunked, matches participant spacing */}
      {step.description && (
        <div className={cn('mt-2 space-y-2', MOTION_STAGE_DESC)}>
          {step.description.split('\n\n').map((paragraph, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap"
            >
              {paragraph}
            </p>
          ))}
        </div>
      )}

      {/* Participant prompt */}
      {step.participantPrompt && (
        <p className="mt-2 text-sm text-foreground/80 italic whitespace-pre-wrap">
          {step.participantPrompt}
        </p>
      )}

      {/* Media indicator (compact — director doesn't need full image) */}
      {step.description?.includes('[media]') && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground/70">
          <PhotoIcon className="h-3.5 w-3.5" />
          <span>{t('stage.mediaAttached')}</span>
        </div>
      )}
    </Card>
  );
}

/** Board text display — host broadcast preview */
function BoardTextPanel({
  boardText,
  t,
}: {
  boardText: string;
  t: DirectorStagePanelProps['t'];
}) {
  return (
    <Card className="border-2 border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <ChatBubbleBottomCenterTextIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <div className="text-[10px] font-bold text-primary/80 uppercase tracking-wider mb-1">
            {t('stage.boardText')}
          </div>
          <p className="text-sm font-medium text-foreground">{boardText}</p>
        </div>
      </div>
    </Card>
  );
}

/** Leader script panel — host-only amber card with structured sections */
function LeaderScriptSection({
  script,
  t,
}: {
  script: string;
  t: DirectorStagePanelProps['t'];
}) {
  return (
    <Card className="p-5 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
      <div className="flex items-start gap-3">
        <DocumentTextIcon className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
            {t('stage.leaderScript')}
          </div>
          <LeaderScriptSections script={script} />
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DirectorStagePanel({
  steps,
  currentStepIndex,
  phases,
  currentPhaseIndex,
  onNextStep,
  onPreviousStep,
  disabled = false,
  swipeRef,
  t,
}: DirectorStagePanelProps) {
  const currentStep = steps[currentStepIndex];
  const currentPhase = phases[currentPhaseIndex];
  const totalSteps = steps.length;
  const totalPhases = phases.length;
  const isFirst = currentStepIndex <= 0;
  const isLast = currentStepIndex >= totalSteps - 1;

  if (totalSteps === 0) {
    return (
      <div className="text-base text-muted-foreground text-center py-8">
        {t('steps.noSteps')}
      </div>
    );
  }

  return (
    <div ref={swipeRef} className="space-y-4 max-w-xl mx-auto touch-pan-y">
      {/* Phase pill — chapter indicator (matches participant) */}
      {currentPhase && totalPhases > 1 && (
        <PhasePill
          phase={currentPhase}
          phaseIndex={currentPhaseIndex}
          totalPhases={totalPhases}
          t={t}
        />
      )}

      {/* Step card — key-animated for step-change stagger */}
      {currentStep && (
        <Card
          key={`director-step-${currentStep.id}`}
          className={MOTION_STAGE_STEP_CARD}
        >
          {/* Nav buttons + progress — compact, inside card */}
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPreviousStep}
                disabled={isFirst || disabled || !onPreviousStep}
                className="flex-1 h-10 text-xs"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                {t('steps.previous')}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onNextStep}
                disabled={isLast || disabled || !onNextStep}
                className="flex-1 h-10 text-xs"
              >
                {t('steps.next')}
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Participant Glass Pane — "what players see" */}
      {currentStep && (
        <ParticipantGlassPane step={currentStep} t={t} />
      )}

      {/* Board text — host broadcast (if set for this step) */}
      {currentStep?.boardText && (
        <BoardTextPanel boardText={currentStep.boardText} t={t} />
      )}

      {/* Leader script — host-only (never leaks to participant pane above) */}
      {currentStep?.leaderScript && (
        <LeaderScriptSection script={currentStep.leaderScript} t={t} />
      )}

      {/* Step progress dots — shared ProgressDots */}
      <ProgressDots totalSteps={totalSteps} currentStepIndex={currentStepIndex} />
    </div>
  );
}
