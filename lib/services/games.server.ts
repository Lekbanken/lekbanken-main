import 'server-only'

import { createServerRlsClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/supabase'

export type GameRow = Tables<'games'>
type ProductRow = Tables<'products'>
type PurposeRow = Tables<'purposes'>

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
  media?: Tables<'media'> | null
}

export type GameWithRelations = GameRow & {
  translations?: GameTranslation[]
  media?: GameMedia[]
  product?: ProductRow | null
  main_purpose?: PurposeRow | null
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
        media:game_media(*, media:media(*))
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
  const tenantQuery = game.owner_tenant_id ? `&tenantId=${game.owner_tenant_id}` : ''

  try {
    const response = await fetch(
      `/api/games/${game.id}/related?limit=${limit}${tenantQuery}`,
      { cache: 'no-store' }
    )

    if (!response.ok) {
      console.warn('[games.server] related fetch failed', response.status)
      return []
    }

    const json = (await response.json()) as { games?: GameRow[] }
    return json.games ?? []
  } catch (error) {
    console.error('[games.server] getRelatedGames error', error)
    return []
  }
}
