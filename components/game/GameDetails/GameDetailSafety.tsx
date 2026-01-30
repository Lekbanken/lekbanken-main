'use client';

import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import type { GameDetailSafetyProps } from './types';

/**
 * GameDetailSafety - Display safety notes for the game
 *
 * Shows important safety information that leaders should be aware of.
 * Safety notes are extracted from GameDetailData.safety array.
 */
export function GameDetailSafety({
  game,
  labels = {},
  className = '',
}: GameDetailSafetyProps) {
  const safety = game.safety;

  // Don't render if no safety notes
  if (!safety || safety.length === 0) {
    return null;
  }

  const titleLabel = labels.title ?? 'Säkerhet';

  return (
    <section
      className={`rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <ShieldExclamationIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
          {titleLabel}
        </h2>
      </div>

      <ul className="space-y-2">
        {safety.map((note, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300"
          >
            <span className="text-amber-500 mt-0.5">⚠</span>
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
