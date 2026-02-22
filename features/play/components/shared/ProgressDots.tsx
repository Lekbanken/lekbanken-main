/**
 * ProgressDots — Shared step progress indicator
 *
 * Micro-navigation dots showing current position in the step sequence.
 * Used identically by both Participant and Director stages.
 *
 * Visual rules:
 * - Current: 2.5px, scale-110, primary + ring
 * - Past: 2px, primary/50
 * - Future: 2px, muted-foreground/20
 * - Smooth 300ms transition for step changes
 */

'use client';

import { cn } from '@/lib/utils';

export interface ProgressDotsProps {
  totalSteps: number;
  currentStepIndex: number;
  className?: string;
}

export function ProgressDots({ totalSteps, currentStepIndex, className }: ProgressDotsProps) {
  if (totalSteps <= 1) return null;

  return (
    <div className={cn('flex justify-center pt-1 pb-1', className)}>
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'rounded-full transition-all duration-300',
              i === currentStepIndex
                ? 'h-2.5 w-2.5 scale-110 bg-primary ring-2 ring-primary/30'
                : i < currentStepIndex
                  ? 'h-2 w-2 bg-primary/50'
                  : 'h-2 w-2 bg-muted-foreground/20',
            )}
          />
        ))}
      </div>
    </div>
  );
}
