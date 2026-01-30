import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getGameArtifacts } from '@/lib/services/games.server'
import { mapArtifacts } from '@/lib/game-display/mappers'

/**
 * GET /api/games/[gameId]/artifacts
 *
 * Lazy-load artifacts (with variants) for a game.
 * Used by GameDetails page to load artifact data on demand.
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

    const dbArtifacts = await getGameArtifacts(gameId)

    // Map to canonical GameArtifact format
    const artifacts = mapArtifacts(
      dbArtifacts.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        artifact_type: a.artifact_type,
        artifact_order: a.artifact_order,
        tags: a.tags,
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

    return NextResponse.json({ artifacts })
  } catch (error) {
    console.error('[api/games/:id/artifacts] error', error)
    return NextResponse.json(
      { error: 'Failed to fetch artifacts' },
      { status: 500 }
    )
  }
}
