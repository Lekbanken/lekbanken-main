'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameDetailQuickFactsProps } from './types';

/**
 * Quick facts section displaying key game metadata in a grid layout.
 * Shows participants, time, age range, and energy level.
 */
export function GameDetailQuickFacts({
  game,
  labels = {},
  energyLabels = {},
  className,
}: GameDetailQuickFactsProps) {
  const {
    title = 'Snabbfakta',
    participants = 'Deltagare',
    time = 'Tid',
    age = 'Ålder',
    energy = 'Energinivå',
    playersRange = '{min}–{max} spelare',
    ageRange = '{min}–{max} år',
    approxMinutes = 'ca {min} min',
  } = labels;

  const {
    low = 'Låg',
    medium = 'Medium',
    high = 'Hög',
  } = energyLabels;

  // Format participants range
  const formatParticipants = () => {
    const min = game.minPlayers ?? 2;
    const max = game.maxPlayers ?? 20;
    return playersRange.replace('{min}', String(min)).replace('{max}', String(max));
  };

  // Format time range
  const formatTime = () => {
    const min = game.durationMin ?? 10;
    return approxMinutes.replace('{min}', String(min));
  };

  // Format age range
  const formatAge = () => {
    const min = game.ageMin ?? 0;
    const max = game.ageMax ?? 99;
    return ageRange.replace('{min}', String(min)).replace('{max}', String(max));
  };

  // Get energy level display
  const getEnergyLevel = () => {
    const level = game.energyLevel ?? 'medium';
    switch (level) {
      case 'low':
        return low;
      case 'high':
        return high;
      default:
        return medium;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{participants}</span>
          <span className="text-xl font-bold">{formatParticipants()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{time}</span>
          <span className="text-xl font-bold">{formatTime()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{age}</span>
          <span className="text-xl font-bold">{formatAge()}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{energy}</span>
          <span className="text-xl font-bold capitalize">{getEnergyLevel()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
