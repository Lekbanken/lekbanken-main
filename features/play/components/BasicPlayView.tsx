/**
 * BasicPlayView
 *
 * A simplified play mode layout for basic games (no phases, no roles).
 * Uses capability-driven rendering via SessionCapabilities.
 *
 * This is a LAYOUT component - it uses shared containers from the play feature,
 * no duplicated logic or data models.
 *
 * @see PLAY_MODE_UI_AUDIT.md section 12.2
 */

'use client';

import { useTranslations } from 'next-intl';
import { StepViewer } from './StepViewer';
import { ArtifactsPanel } from './ArtifactsPanel';
import { PuzzleProgressPanel } from './PuzzleProgressPanel';
import { PropConfirmationManager } from './PropConfirmationManager';
import { Toolbelt } from '@/features/tools/components/Toolbelt';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { PlaySessionData, StepInfo } from '../api/session-api';
import type { SessionCapabilities } from '@/hooks/useSessionCapabilities';

interface BasicPlayViewProps {
  /** Session data from API */
  playData: PlaySessionData;
  /** Capabilities computed by useSessionCapabilities */
  caps: SessionCapabilities;
  /** Current session ID */
  sessionId: string;
  /** Current step index */
  currentStepIndex: number;
  /** Callback when step changes */
  onStepChange: (index: number) => void;
  /** Callback when session is completed */
  onComplete: () => void;
  /** Optional callback to exit play mode */
  onBack?: () => void;
}

/**
 * Converts a StepInfo to the Step format expected by StepViewer.
 */
function stepInfoToStep(step: StepInfo) {
  return {
    id: step.id,
    title: step.title,
    description: step.description ?? step.content ?? '',
    durationMinutes: step.durationMinutes ?? step.duration ?? undefined,
    materials: step.materials,
    safety: step.safety,
    tag: step.tag,
    note: step.note,
  };
}

export function BasicPlayView({
  playData,
  caps,
  sessionId,
  currentStepIndex,
  onStepChange,
  onComplete,
  onBack,
}: BasicPlayViewProps) {
  const t = useTranslations('play.basicView');

  const steps = playData.steps;
  const step = steps[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex >= steps.length - 1;

  // Handle navigation
  const handlePrevious = () => {
    if (!isFirst) {
      onStepChange(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (!isLast) {
      onStepChange(currentStepIndex + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{playData.gameTitle}</h2>
          {/* Timer could go here in the future */}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('stepProgress', { current: currentStepIndex + 1, total: steps.length })}
        </p>
      </Card>

      {/* Current Step - using shared StepViewer */}
      {step && (
        <StepViewer
          step={stepInfoToStep(step)}
          index={currentStepIndex}
          total={steps.length}
        />
      )}

      {/* Capability-gated panels */}
      {caps.showArtifactsPanel && <ArtifactsPanel sessionId={sessionId} />}
      {caps.showPuzzlesPanel && <PuzzleProgressPanel sessionId={sessionId} />}
      {caps.showPropsManager && <PropConfirmationManager sessionId={sessionId} />}
      {caps.showToolbelt && <Toolbelt sessionId={sessionId} role="host" />}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            {t('exitPlay')}
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={handlePrevious} disabled={isFirst}>
            {t('previous')}
          </Button>
          {isLast ? (
            <Button onClick={onComplete}>{t('complete')}</Button>
          ) : (
            <Button onClick={handleNext}>{t('next')}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
