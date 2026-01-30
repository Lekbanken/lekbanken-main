import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import type { ReactionType, GameReactionMap } from '@/types/game-reaction'

type BatchRequestBody = {
  gameIds?: unknown
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as BatchRequestBody
  const gameIds = Array.isArray(body.gameIds)
    ? body.gameIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []

  if (gameIds.length === 0) {
    return NextResponse.json({ success: true, reactions: {} satisfies GameReactionMap })
  }

  const supabase = await createServerRlsClient()
  const { data, error } = await supabase.rpc('get_game_reactions_batch', { p_game_ids: gameIds })

  if (error) {
    return NextResponse.json(
      { success: false, reactions: {} satisfies GameReactionMap, error: error.message },
      { status: 500 }
    )
  }

  const reactions: GameReactionMap = {}
  for (const id of gameIds) reactions[id] = null

  if (Array.isArray(data)) {
    for (const row of data as Array<{ game_id?: string | null; reaction?: string | null }>) {
      if (row?.game_id && row.reaction) {
        reactions[row.game_id] = row.reaction as ReactionType
      }
    }
  }

  return NextResponse.json({ success: true, reactions })
}

