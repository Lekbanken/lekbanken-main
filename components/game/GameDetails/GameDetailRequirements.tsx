'use client';

import { MapPinIcon } from '@heroicons/react/24/outline';
import type { GameDetailRequirementsProps } from './types';

/**
 * GameDetailRequirements - Space and equipment requirements
 *
 * Displays requirements for running the game:
 * - Space requirements (indoor/outdoor, size)
 * - Equipment needs
 * - Environmental considerations
 */
export function GameDetailRequirements({
  game,
  labels = {},
  className = '',
}: GameDetailRequirementsProps) {
  const requirements = game.requirements;

  if (!requirements || requirements.length === 0) {
    return null;
  }

  const titleLabel = labels.title ?? 'Krav för spelet';

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card p-6 ${className}`}
    >
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <MapPinIcon className="h-5 w-5 text-primary" />
        {titleLabel}
      </h2>

      <ul className="space-y-2">
        {requirements.map((req, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span className="text-primary mt-0.5 shrink-0">•</span>
            <span>{req}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
