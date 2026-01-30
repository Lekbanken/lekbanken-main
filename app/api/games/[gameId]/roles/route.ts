import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getGameRoles } from '@/lib/services/games.server'
import { mapRoles } from '@/lib/game-display/mappers'

/**
 * GET /api/games/[gameId]/roles
 *
 * Lazy-load roles for a game.
 * Used by GameDetails page to load participant mode data on demand.
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

    const dbRoles = await getGameRoles(gameId)

    // Map to canonical GameRole format
    const roles = mapRoles(
      dbRoles.map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        color: r.color,
        role_order: r.role_order,
        public_description: r.public_description,
        private_instructions: r.private_instructions,
        private_hints: r.private_hints,
        min_count: r.min_count,
        max_count: r.max_count,
        assignment_strategy: r.assignment_strategy,
      }))
    )

    return NextResponse.json({ roles })
  } catch (error) {
    console.error('[api/games/:id/roles] error', error)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    )
  }
}
