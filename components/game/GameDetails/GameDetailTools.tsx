'use client';

import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import type { GameDetailToolsProps } from './types';

/**
 * GameDetailTools - Facilitator tools available
 *
 * Displays the tools available to the facilitator during the game:
 * - Timer controls
 * - Voting tools
 * - Random selectors
 * - Custom game-specific tools
 */
export function GameDetailTools({
  game,
  labels = {},
  className = '',
}: GameDetailToolsProps) {
  const tools = game.facilitatorTools;

  if (!tools || tools.length === 0) {
    return null;
  }

  const titleLabel = labels.title ?? 'Facilitatorverktyg';
  const descriptionLabel = labels.description ?? 
    'Verktyg som finns tillgängliga under spelets gång:';

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card p-6 ${className}`}
    >
      <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
        <WrenchScrewdriverIcon className="h-5 w-5 text-primary" />
        {titleLabel}
      </h2>

      <p className="text-sm text-muted-foreground mb-4">
        {descriptionLabel}
      </p>

      <div className="flex flex-wrap gap-2">
        {tools.map((tool, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
          >
            <WrenchScrewdriverIcon className="h-3.5 w-3.5" />
            {tool}
          </span>
        ))}
      </div>
    </section>
  );
}
