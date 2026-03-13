import { z } from 'zod'
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/route-handler'
import { createServerRlsClient } from '@/lib/supabase/server'
import type { ReactionType, GameReactionMap } from '@/types/game-reaction'

const batchSchema = z.object({
  gameIds: z.array(z.string().uuid()).min(1).max(100),
})

export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'api',
  input: batchSchema,
  handler: async ({ body }) => {
    const { gameIds } = body

    const supabase = await createServerRlsClient()
    const { data, error } = await supabase.rpc('get_game_reactions_batch', { p_game_ids: gameIds })

    if (error) {
      console.error('[game-reactions/batch] RPC error:', error)
      return NextResponse.json(
        { success: false, reactions: {} satisfies GameReactionMap },
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
  },
})

