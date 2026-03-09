'use client';

import { AcademicCapIcon } from '@heroicons/react/24/outline';
import type { GameDetailOutcomesProps } from './types';

/**
 * GameDetailOutcomes - Display learning outcomes for the game
 *
 * Shows what participants will learn or achieve.
 * Outcomes are extracted from GameDetailData.outcomes array.
 */
export function GameDetailOutcomes({
  game,
  labels = {},
  className = '',
}: GameDetailOutcomesProps) {
  const outcomes = game.outcomes;

  // Don't render if no outcomes
  if (!outcomes || outcomes.length === 0) {
    return null;
  }

  const titleLabel = labels.title ?? '';

  return (
    <section
      className={`rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <AcademicCapIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
          {titleLabel}
        </h2>
      </div>

      <ul className="space-y-2">
        {outcomes.slice(0, 10).map((outcome, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300"
          >
            <span className="text-emerald-500 mt-0.5">✓</span>
            <span>{outcome}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
