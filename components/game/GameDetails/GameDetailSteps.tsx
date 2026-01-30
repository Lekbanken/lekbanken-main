'use client';

import { useState } from 'react';
import { ClockIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import type { GameDetailStepsProps } from './types';

/**
 * GameDetailSteps - Step-by-step instructions
 *
 * Displays game instructions as numbered steps with optional:
 * - Duration per step
 * - Collapsible mode
 * - "Show more" functionality for long lists
 */
export function GameDetailSteps({
  game,
  collapsible = false,
  defaultCollapsed = false,
  maxVisible = 10,
  labels = {},
  className = '',
}: GameDetailStepsProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showAll, setShowAll] = useState(false);

  const steps = game.steps;

  if (!steps || steps.length === 0) {
    return null;
  }

  // Labels with defaults
  const titleLabel = labels.title ?? 'Instruktioner';
  const hideLabel = labels.hide ?? 'Dölj';
  const showLessLabel = labels.showLess ?? 'Visa färre';
  const stepsLabel = labels.steps ?? 'steg';
  const optionalLabel = labels.optional ?? 'Valfritt';
  
  // Function to format minutes
  const formatMinutes = (minutes: number) => {
    if (labels.approxMinutes) {
      return labels.approxMinutes.replace('{minutes}', String(minutes));
    }
    return `ca ${minutes} min`;
  };

  // Determine which steps to show
  const visibleSteps = showAll ? steps : steps.slice(0, maxVisible);
  const hasMore = steps.length > maxVisible;

  // Collapsible wrapper
  if (collapsible && isCollapsed) {
    return (
      <section
        className={`rounded-2xl border border-border/60 bg-card p-6 ${className}`}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-lg font-semibold text-foreground">
            {titleLabel}
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{steps.length} {stepsLabel}</span>
            <ChevronDownIcon className="h-4 w-4" />
          </div>
        </button>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {titleLabel}
        </h2>
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{hideLabel}</span>
            <ChevronUpIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <ol className="space-y-3">
        {visibleSteps.map((step, idx) => (
          <li
            key={step.id || idx}
            className="rounded-lg border border-border/60 bg-muted/30 p-4"
          >
            <div className="flex items-start gap-3">
              {/* Step number */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                {idx + 1}
              </div>

              <div className="flex-1 min-w-0">
                {/* Step title */}
                {step.title && (
                  <p className="font-semibold text-foreground">
                    {step.title}
                  </p>
                )}

                {/* Step body */}
                {step.body && (
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                    {step.body}
                  </p>
                )}

                {/* Step duration */}
                {step.durationMinutes != null && step.durationMinutes > 0 && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {formatMinutes(step.durationMinutes)}
                  </p>
                )}

                {/* Optional badge */}
                {step.optional && (
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                    {optionalLabel}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {/* Show more/less */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 w-full py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {showAll
            ? showLessLabel
            : (labels.showAll ?? `Visa alla ${steps.length} ${stepsLabel}`)}
        </button>
      )}
    </section>
  );
}
