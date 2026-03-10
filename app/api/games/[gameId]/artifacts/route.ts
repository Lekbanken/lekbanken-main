import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getGameArtifacts, getGameStatus } from '@/lib/services/games.server'
import { mapArtifacts } from '@/lib/game-display/mappers'
import { requireGameAuth, canViewGame } from '@/lib/game-display/access'

/**
 * GET /api/games/[gameId]/artifacts
 *
 * Lazy-load artifacts (with variants) for a game.
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

    const dbArtifacts = await getGameArtifacts(gameId)

    // SECURITY: Filter to public-only variants and strip metadata secrets
    // for library/preview context (F8 + F8b)
    const publicArtifacts = dbArtifacts.map((a) => {
      const { correctCode: _correctCode, ...safeMetadata } = (a.metadata as Record<string, unknown>) ?? {}
      return {
        ...a,
        metadata: Object.keys(safeMetadata).length > 0 ? safeMetadata : null,
        variants: a.variants?.filter((v) => v.visibility === 'public'),
      }
    })

    // Map to canonical GameArtifact format
    const artifacts = mapArtifacts(
      publicArtifacts.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        artifact_type: a.artifact_type,
        artifact_order: a.artifact_order,
        tags: a.tags,
        metadata: a.metadata as Record<string, unknown> | null,
        variants: a.variants?.map((v) => ({
          id: v.id,
          title: v.title,
          body: v.body,
          visibility: v.visibility,
          visible_to_role_id: v.visible_to_role_id,
          variant_order: v.variant_order,
          media_ref: v.media_ref,
        })),
      }))
    )

    return NextResponse.json({ artifacts }, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('[api/games/:id/artifacts] error', error)
    return NextResponse.json(
      { error: 'Failed to fetch artifacts' },
      { status: 500 }
    )
  }
}
