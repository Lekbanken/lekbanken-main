/**
 * Director Mode Preview Page
 *
 * Renders the Director Mode UI in a full-page layout using game
 * definition data — NO session, NO realtime, NO Supabase.
 *
 * Route: /app/games/:gameId/director-preview
 *
 * Architecture:
 *   - Server component fetches game data (steps, artifacts, triggers)
 *   - Client component (DirectorPreviewClient) wraps DirectorModePanel
 *   - shouldEnableRealtime() returns false (no sessionId)
 */

import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getGameByIdPreview } from '@/lib/services/games.server';
import { mapDbGameToDetailPreview } from '@/lib/game-display';
import type { DbGame } from '@/lib/game-display';
import DirectorPreviewClient from './director-preview-client';

type Props = {
  params: Promise<{ gameId: string }>;
};

export default async function DirectorPreviewPage({ params }: Props) {
  const { gameId } = await params;
  const t = await getTranslations('app.gameDetail');

  const dbGame = await getGameByIdPreview(gameId);
  if (!dbGame) notFound();

  const game = mapDbGameToDetailPreview(dbGame as unknown as DbGame);

  return (
    <DirectorPreviewClient
      gameId={game.id}
      gameTitle={game.title}
      steps={game.steps ?? []}
      phases={game.phases ?? []}
      artifacts={game.artifacts ?? []}
      triggers={game.triggers ?? []}
      backLabel={t('directorPreview.backToGame')}
      backHref={`/app/games/${gameId}`}
    />
  );
}
