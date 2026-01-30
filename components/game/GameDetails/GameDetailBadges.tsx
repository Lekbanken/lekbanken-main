'use client';

import {
  BoltIcon,
  ClockIcon,
  UsersIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {
  formatEnergyLevel,
  formatPlayers,
  formatAge,
  formatDuration,
} from '@/lib/game-display';
import type { GameDetailBadgesProps } from './types';

/**
 * GameDetailBadges - Display game metadata as visual badges
 *
 * Shows badges for:
 * - Energy level (with color coding)
 * - Purpose
 * - Product
 * - Age range
 * - Player count
 * - Duration
 */
export function GameDetailBadges({
  game,
  compact = false,
  className = '',
}: GameDetailBadgesProps) {
  const energy = formatEnergyLevel(game.energyLevel);
  const players = formatPlayers(game.minPlayers, game.maxPlayers);
  const age = formatAge(game.ageMin, game.ageMax);
  const duration = formatDuration(game.durationMin, game.durationMax);

  // Badge base styles
  const badgeBase = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Energy Level */}
      {energy && (
        <span
          className={`${badgeBase} ${energy.bgColor} ${energy.color}`}
        >
          {!compact && <BoltIcon className="h-4 w-4" />}
          {compact ? energy.labelShort : energy.label}
        </span>
      )}

      {/* Purpose */}
      {game.purpose && (
        <span
          className={`${badgeBase} bg-primary/10 text-primary`}
        >
          {game.purpose}
        </span>
      )}

      {/* Product */}
      {game.product && (
        <span
          className={`${badgeBase} bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200`}
        >
          {game.product}
        </span>
      )}

      {/* Age Range */}
      {age && (
        <span
          className={`${badgeBase} bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400`}
        >
          {!compact && <UserIcon className="h-4 w-4" />}
          {age}
        </span>
      )}

      {/* Player Count */}
      {players && (
        <span
          className={`${badgeBase} bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400`}
        >
          {!compact && <UsersIcon className="h-4 w-4" />}
          {players}
        </span>
      )}

      {/* Duration */}
      {duration && (
        <span
          className={`${badgeBase} bg-primary/10 text-primary`}
        >
          {!compact && <ClockIcon className="h-4 w-4" />}
          {duration}
        </span>
      )}
    </div>
  );
}
