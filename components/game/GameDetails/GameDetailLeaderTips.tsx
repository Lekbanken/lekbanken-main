'use client';

import { LightBulbIcon } from '@heroicons/react/24/outline';
import type { GameDetailLeaderTipsProps } from './types';

/**
 * GameDetailLeaderTips - Display leader tips for the game
 *
 * Shows practical tips for the facilitator/leader running the game.
 * Leader tips are extracted from GameDetailData.leaderTips array.
 */
export function GameDetailLeaderTips({
  game,
  labels = {},
  className = '',
}: GameDetailLeaderTipsProps) {
  const leaderTips = game.leaderTips;

  // Don't render if no leader tips
  if (!leaderTips || leaderTips.length === 0) {
    return null;
  }

  const titleLabel = labels.title ?? '';

  return (
    <section
      className={`rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <LightBulbIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
          {titleLabel}
        </h2>
      </div>

      <ul className="space-y-2">
        {leaderTips.map((tip, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300"
          >
            <span className="text-blue-500 mt-0.5">💡</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
