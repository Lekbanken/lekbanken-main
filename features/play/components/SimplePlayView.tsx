'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StepViewer } from './StepViewer';
import type { Run } from '../types';

export type SimplePlayViewProps = {
  run: Run;
  onBack?: () => void;
  onComplete?: () => void;
};

export function SimplePlayView({ run, onBack, onComplete }: SimplePlayViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(() => run.currentStepIndex ?? 0);

  const steps = run.steps;
  const safeIndex = Math.max(0, Math.min(currentStepIndex, Math.max(0, steps.length - 1)));

  const step = steps[safeIndex];

  const stepForViewer = useMemo(() => {
    if (!step) return null;
    return {
      id: step.id,
      title: step.title,
      description: step.description,
      durationMinutes: step.durationMinutes,
      materials: step.materials,
      safety: step.safety,
      tag: step.tag,
      note: step.note,
    };
  }, [step]);

  if (!stepForViewer) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No steps available.</p>
        {onBack ? (
          <div className="mt-4">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  const isFirst = safeIndex === 0;
  const isLast = safeIndex >= steps.length - 1;

  return (
    <div className="space-y-4">
      <StepViewer step={stepForViewer} index={safeIndex} total={steps.length} />

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={onBack} disabled={!onBack}>
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentStepIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
          >
            Previous
          </Button>
          {isLast ? (
            <Button variant="primary" onClick={onComplete} disabled={!onComplete}>
              Complete
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => setCurrentStepIndex((i) => Math.min(steps.length - 1, i + 1))}
              disabled={isLast}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
