'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GameDetailActionsProps } from './types';

/**
 * Actions section with share and favorite buttons.
 */
export function GameDetailActions({
  gameId,
  gameName,
  labels = {},
  customActions,
  className,
}: GameDetailActionsProps) {
  const {
    share = 'Dela',
    favorite = 'Favorit',
    shareTitle = 'Dela denna lek',
  } = labels;

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: gameName,
          text: shareTitle,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or share failed - fallback to clipboard
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(window.location.href);
        }
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleFavorite = () => {
    // TODO: Implement favorite toggle via API
    console.log('Toggle favorite for game:', gameId);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{shareTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="default"
          className="w-full"
          onClick={handleShare}
        >
          {share}
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleFavorite}
        >
          {favorite}
        </Button>
        {customActions}
      </CardContent>
    </Card>
  );
}
