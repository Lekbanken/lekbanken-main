import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getGameTriggers } from '@/lib/services/games.server'
import { mapTriggers } from '@/lib/game-display/mappers'

/**
 * GET /api/games/[gameId]/triggers
 *
 * Lazy-load triggers for a game.
 * Used by GameDetails page to load automation data on demand.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })
    }

    const dbTriggers = await getGameTriggers(gameId)

    // Map to canonical GameTrigger format
    const triggers = mapTriggers(
      dbTriggers.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        enabled: t.enabled,
        condition: t.condition,
        actions: t.actions,
        execute_once: t.execute_once,
        delay_seconds: t.delay_seconds,
        sort_order: t.sort_order,
      }))
    )

    return NextResponse.json({ triggers })
  } catch (error) {
    console.error('[api/games/:id/triggers] error', error)
    return NextResponse.json(
      { error: 'Failed to fetch triggers' },
      { status: 500 }
    )
  }
}
