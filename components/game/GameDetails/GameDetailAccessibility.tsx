'use client';

import { CheckCircleIcon } from '@heroicons/react/24/outline';
import type { GameDetailAccessibilityProps } from './types';

/**
 * GameDetailAccessibility - Accessibility notes and considerations
 *
 * Displays accessibility information for a game, including:
 * - Physical accessibility requirements
 * - Sensory considerations
 * - Adaptation suggestions
 */
export function GameDetailAccessibility({
  game,
  labels = {},
  className = '',
}: GameDetailAccessibilityProps) {
  const accessibility = game.accessibility;

  if (!accessibility || accessibility.length === 0) {
    return null;
  }

  const titleLabel = labels.title ?? 'Tillgänglighet';

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card p-6 ${className}`}
    >
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <CheckCircleIcon className="h-5 w-5 text-primary" />
        {titleLabel}
      </h2>

      <ul className="space-y-2">
        {accessibility.map((note, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span className="text-primary mt-0.5 shrink-0">•</span>
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
