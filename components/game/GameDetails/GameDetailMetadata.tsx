'use client';

import { InformationCircleIcon } from '@heroicons/react/24/outline';
import type { GameDetailMetadataProps } from './types';

/**
 * GameDetailMetadata - Compact metadata card for sidebar
 *
 * Shows game ID (slug), created date, and updated date.
 * Useful for debugging and content provenance.
 */
export function GameDetailMetadata({
  game,
  labels = {},
  className = '',
}: GameDetailMetadataProps) {
  const meta = game.meta;

  if (!meta) {
    return null;
  }

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-background p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <InformationCircleIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          {labels.title ?? ''}
        </h3>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>{labels.gameId ?? ''}</span>
          <span className="font-mono font-semibold text-foreground">
            {meta.gameKey}
          </span>
        </div>
        {meta.createdAt && (
          <div className="flex items-center justify-between">
            <span>{labels.created ?? ''}</span>
            <span className="font-semibold text-foreground">
              {meta.createdAt}
            </span>
          </div>
        )}
        {meta.updatedAt && (
          <div className="flex items-center justify-between">
            <span>{labels.updated ?? ''}</span>
            <span className="font-semibold text-foreground">
              {meta.updatedAt}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
