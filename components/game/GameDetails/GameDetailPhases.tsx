'use client';

import { ClockIcon, FlagIcon, ArrowPathIcon, SparklesIcon, PauseIcon } from '@heroicons/react/24/outline';
import type { GameDetailPhasesProps } from './types';

/**
 * GameDetailPhases - Display phases for facilitated games
 *
 * Shows the phase structure for facilitated play mode.
 * Each phase has a type, title, duration, and goal.
 */
export function GameDetailPhases({
  game,
  labels = {},
  className = '',
}: GameDetailPhasesProps) {
  const phases = game.phases;

  // Don't render if no phases
  if (!phases || phases.length === 0) {
    return null;
  }

  const titleLabel = labels.title ?? 'Faser';
  const goalLabel = labels.goal ?? 'Mål';
  const durationLabel = labels.duration ?? 'Tid';

  // Map phase type to icon and color
  const getPhaseStyle = (phaseType?: string) => {
    switch (phaseType) {
      case 'intro':
        return {
          icon: FlagIcon,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          border: 'border-blue-200 dark:border-blue-900/50',
        };
      case 'round':
        return {
          icon: ArrowPathIcon,
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-50 dark:bg-green-950/30',
          border: 'border-green-200 dark:border-green-900/50',
        };
      case 'finale':
        return {
          icon: SparklesIcon,
          color: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-950/30',
          border: 'border-purple-200 dark:border-purple-900/50',
        };
      case 'break':
        return {
          icon: PauseIcon,
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          border: 'border-amber-200 dark:border-amber-900/50',
        };
      default:
        return {
          icon: ClockIcon,
          color: 'text-muted-foreground',
          bg: 'bg-muted/30',
          border: 'border-border/60',
        };
    }
  };

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <ClockIcon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          {titleLabel}
        </h2>
      </div>

      <div className="space-y-3">
        {phases.map((phase, idx) => {
          const style = getPhaseStyle(phase.phaseType);
          const Icon = style.icon;

          return (
            <div
              key={phase.id ?? idx}
              className={`rounded-xl border ${style.border} ${style.bg} p-4`}
            >
              <div className="flex items-start gap-3">
                {/* Phase number and icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.color} bg-white dark:bg-black/20`}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Phase content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Fas {idx + 1}
                    </span>
                    {phase.phaseType && (
                      <span className={`text-xs font-medium ${style.color} capitalize`}>
                        {phase.phaseType}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-foreground mt-0.5">
                    {phase.title || phase.name}
                  </h3>

                  {/* Duration */}
                  {phase.duration && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">{durationLabel}:</span> {phase.duration}
                    </p>
                  )}

                  {/* Goal */}
                  {phase.goal && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">{goalLabel}:</span> {phase.goal}
                    </p>
                  )}

                  {/* Description */}
                  {phase.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {phase.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
