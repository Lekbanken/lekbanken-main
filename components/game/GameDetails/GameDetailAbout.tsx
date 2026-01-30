'use client';

import type { GameDetailAboutProps } from './types';

/**
 * GameDetailAbout - Description and highlights section
 *
 * Displays the game's description with optional truncation
 * and highlight points if available.
 */
export function GameDetailAbout({
  game,
  truncate = false,
  maxLength = 500,
  labels = {},
  className = '',
}: GameDetailAboutProps) {
  const description = game.description || game.shortDescription;

  if (!description && (!game.highlights || game.highlights.length === 0)) {
    return null;
  }

  // Truncate description if needed
  const displayDescription =
    truncate && description && description.length > maxLength
      ? `${description.slice(0, maxLength).trim()}...`
      : description;

  const titleLabel = labels.title ?? 'Om leken';
  const highlightsLabel = labels.highlights ?? 'Höjdpunkter';

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card p-6 ${className}`}
    >
      <h2 className="text-lg font-semibold text-foreground mb-3">
        {titleLabel}
      </h2>

      {displayDescription && (
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {displayDescription}
        </p>
      )}

      {/* Highlights */}
      {game.highlights && game.highlights.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-foreground mb-2">
            {highlightsLabel}
          </h3>
          <ul className="space-y-1">
            {game.highlights.map((highlight, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="text-primary mt-0.5">•</span>
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
