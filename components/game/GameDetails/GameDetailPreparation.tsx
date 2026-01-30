'use client';

import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import type { GameDetailPreparationProps } from './types';

/**
 * GameDetailPreparation - Display preparation notes for the game
 *
 * Shows what needs to be prepared before starting the game.
 * Preparation notes are extracted from GameDetailData.preparation array.
 */
export function GameDetailPreparation({
  game,
  labels = {},
  className = '',
}: GameDetailPreparationProps) {
  const preparation = game.preparation;

  // Don't render if no preparation notes
  if (!preparation || preparation.length === 0) {
    return null;
  }

  const titleLabel = labels.title ?? 'Förberedelser';

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <ClipboardDocumentListIcon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          {titleLabel}
        </h2>
      </div>

      <ul className="space-y-2">
        {preparation.map((note, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span className="flex-shrink-0 w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs">
              ✓
            </span>
            <span>{note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
