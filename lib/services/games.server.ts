import 'server-only'

import { createServerRlsClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/supabase'

export type GameRow = Tables<'games'>

type GameTranslation = {
  game_id: string
  locale: string
  title: string
  short_description: string
  instructions: unknown
  materials: string[] | null
}

type GameMedia = {
  id: string
  game_id: string
  media_id: string
  tenant_id: string | null
  kind: 'cover' | 'gallery'
  position: number
  alt_text: string | null
  created_at: string
}

export type GameWithRelations = GameRow & {
  translations?: GameTranslation[]
  media?: GameMedia[]
}

export async function getGameById(gameId: string): Promise<GameWithRelations | null> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('games')
    .select(
      `
        *,
        product:products(*),
        main_purpose:purposes!main_purpose_id(*),
        translations:game_translations(*),
        media:game_media(*)
      `
    )
    .eq('id', gameId)
    .single()

  if (error) {
    console.error('[games.server] getGameById error', error)
    return null
  }

  return data as GameWithRelations
}

export async function getRelatedGames(
  game: GameRow,
  limit: number = 4
): Promise<GameRow[]> {
  const supabase = await createServerRlsClient()

  let query = supabase
    .from('games')
    .select('*')
    .eq('status', 'published')
    .neq('id', game.id)
    .limit(limit)

  if (game.energy_level) {
    query = query.eq('energy_level', game.energy_level)
  }

  if (game.category) {
    query = query.eq('category', game.category)
  }

  query = game.owner_tenant_id
    ? query.eq('owner_tenant_id', game.owner_tenant_id)
    : query.is('owner_tenant_id', null)

  const { data, error } = await query

  if (error) {
    console.error('[games.server] getRelatedGames error', error)
    return []
  }

  return data ?? []
}
