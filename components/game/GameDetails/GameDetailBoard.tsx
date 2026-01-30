'use client';

import { ComputerDesktopIcon } from '@heroicons/react/24/outline';
import type { GameDetailBoardProps } from './types';

/**
 * GameDetailBoard - Public display/board configuration
 *
 * Shows what will be displayed on the public board during the game:
 * - Timer visibility
 * - Phase information
 * - Step text for participants
 * - Roles display
 */
export function GameDetailBoard({
  game,
  labels = {},
  className = '',
}: GameDetailBoardProps) {
  const boardWidgets = game.boardWidgets;

  if (!boardWidgets || boardWidgets.length === 0) {
    return null;
  }

  const titleLabel = labels.title ?? 'Publik tavla';
  const descriptionLabel = labels.description ?? 
    'Följande visas på den publika skärmen under spelet:';

  return (
    <section
      className={`rounded-2xl border border-border/60 bg-card p-6 ${className}`}
    >
      <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
        <ComputerDesktopIcon className="h-5 w-5 text-primary" />
        {titleLabel}
      </h2>

      <p className="text-sm text-muted-foreground mb-4">
        {descriptionLabel}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {boardWidgets.map((widget, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/30 p-3"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ComputerDesktopIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">
                {widget.title}
              </h3>
              {widget.detail && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {widget.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
