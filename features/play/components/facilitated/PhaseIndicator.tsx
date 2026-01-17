'use client';

import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface Phase {
  id: string;
  title: string;
  durationMinutes: number | null;
}

export interface PhaseIndicatorProps {
  phases: Phase[];
  currentPhaseIndex: number;
  onPhaseClick?: (index: number) => void;
  showLabels?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PhaseIndicator({
  phases,
  currentPhaseIndex,
  onPhaseClick,
  showLabels = true,
  className,
}: PhaseIndicatorProps) {
  if (phases.length === 0) {
    return null;
  }

  const currentPhase = phases[currentPhaseIndex];

  return (
    <div className={cn('space-y-3', className)}>
      {/* Current phase title */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Fas {currentPhaseIndex + 1} av {phases.length}
        </p>
        <h2 className="text-xl font-semibold text-foreground">
          {currentPhase?.title ?? 'Okänd fas'}
        </h2>
      </div>

      {/* Phase dots/progress */}
      <div className="flex items-center justify-center gap-2">
        {phases.map((phase, index) => {
          const isCompleted = index < currentPhaseIndex;
          const isCurrent = index === currentPhaseIndex;
          const isFuture = index > currentPhaseIndex;

          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => onPhaseClick?.(index)}
              disabled={!onPhaseClick || isFuture}
              className={cn(
                'group relative flex items-center',
                !onPhaseClick && 'cursor-default'
              )}
            >
              {/* Connector line (before dot, except first) */}
              {index > 0 && (
                <div
                  className={cn(
                    'h-0.5 w-6 -mr-px',
                    isCompleted || isCurrent ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}

              {/* Dot */}
              <div
                className={cn(
                  'relative flex h-3 w-3 items-center justify-center rounded-full transition-all',
                  isCompleted && 'bg-primary',
                  isCurrent && 'bg-primary ring-4 ring-primary/20',
                  isFuture && 'bg-muted'
                )}
              >
                {/* Active pulse */}
                {isCurrent && (
                  <span className="absolute h-full w-full animate-ping rounded-full bg-primary opacity-50" />
                )}
              </div>

              {/* Tooltip on hover */}
              {showLabels && (
                <div
                  className={cn(
                    'absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs shadow-md',
                    'opacity-0 transition-opacity group-hover:opacity-100',
                    'pointer-events-none'
                  )}
                >
                  {phase.title}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
