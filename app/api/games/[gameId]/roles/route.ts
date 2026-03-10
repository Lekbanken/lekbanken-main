import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getGameRoles, getGameStatus } from '@/lib/services/games.server'
import { mapRoles } from '@/lib/game-display/mappers'
import { requireGameAuth, canViewGame } from '@/lib/game-display/access'

/**
 * GET /api/games/[gameId]/roles
 *
 * Lazy-load roles for a game.
 * Requires authenticated session. Enforces published-status access.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const ctx = await requireGameAuth()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params

    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })
    }

    const gameStatus = await getGameStatus(gameId)
    const access = await canViewGame(gameStatus)
    if (!access.allowed) {
      const status = access.reason === 'not-found' ? 404 : 403
      return NextResponse.json({ error: access.reason === 'not-found' ? 'Game not found' : 'Forbidden' }, { status })
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
        min_count: r.min_count,
        max_count: r.max_count,
      }))
    )

    return NextResponse.json({ roles }, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('[api/games/:id/roles] error', error)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    )
  }
}
