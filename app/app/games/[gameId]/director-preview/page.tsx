/**
 * Director Mode Preview Page
 *
 * Renders the Director Mode UI in a full-page layout using game
 * definition data — NO session, NO realtime, NO Supabase.
 *
 * Route: /app/games/:gameId/director-preview
 *
 * Architecture:
 *   - Server component fetches FULL game data (steps, artifacts, triggers, roles)
 *   - Client component (DirectorPreviewClient) wraps DirectorModeDrawer in preview mode
 *   - shouldEnableRealtime() returns false (no sessionId)
 *
 * Uses getGameByIdFull (not Preview) so artifacts/triggers/roles load correctly.
 */

import { notFound } from 'next/navigation';
import { getGameByIdFull } from '@/lib/services/games.server';
import { mapDbGameToDetailFull } from '@/lib/game-display/mappers';
import type { DbGame } from '@/lib/game-display';
import DirectorPreviewClient from './director-preview-client';

type Props = {
  params: Promise<{ gameId: string }>;
};

export default async function DirectorPreviewPage({ params }: Props) {
  const { gameId } = await params;

  const dbGame = await getGameByIdFull(gameId);
  if (!dbGame) notFound();

  // We use getGameByIdFull intentionally (not Preview) so artifacts, triggers
  // and roles are included — parity with the live Director Mode session shell.
  const game = mapDbGameToDetailFull(dbGame as unknown as DbGame);

  // Hard guard: participant-mode games have no facilitator → no Director Mode.
  // Returns 404 to avoid confirming the gameId exists (enumeration defence).
  if (game.playMode === 'participants') {
    notFound();
  }

  return (
    <DirectorPreviewClient
      gameId={game.id}
      gameTitle={game.title}
      steps={game.steps ?? []}
      phases={game.phases ?? []}
      artifacts={game.artifacts ?? []}
      triggers={game.triggers ?? []}
      backHref={`/app/games/${gameId}`}
    />
  );
}
