'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameDetailSidebarProps } from './types';

/**
 * Composed sidebar wrapper for game detail page.
 * Includes quick info, actions, and optional custom content.
 */
export function GameDetailSidebar({
  game,
  labels = {},
  children,
  className,
}: GameDetailSidebarProps) {
  const {
    quickInfoTitle = 'Snabbinfo',
    status = 'Status',
    published = 'Publicerad',
    draft = 'Utkast',
    addedAt = 'Tillagd',
  } = labels;

  const statusText = game.status === 'published' ? published : draft;
  const createdAtDate = game.meta?.createdAt
    ? new Date(game.meta.createdAt).toLocaleDateString('sv-SE')
    : null;

  return (
    <aside className={className}>
      <div className="space-y-4">
        {/* Quick Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{quickInfoTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">{status}</p>
              <p className="text-foreground font-medium">{statusText}</p>
            </div>
            {createdAtDate && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">{addedAt}</p>
                <p className="text-foreground font-medium">{createdAtDate}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom children (start session CTA, actions, etc.) */}
        {children}
      </div>
    </aside>
  );
}
