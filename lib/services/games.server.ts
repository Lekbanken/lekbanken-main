import 'server-only'

import { createServerRlsClient } from '@/lib/supabase/server'
import type { Tables, Database } from '@/types/supabase'

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
  steps?: Array<{
    id: string
    title: string | null
    body: string | null
    duration_seconds: number | null
    step_order: number
  }>
  materials?: Array<{
    items: string[] | null
    safety_notes: string | null
    preparation: string | null
    locale: string | null
  }>
}

export async function getGameById(gameId: string): Promise<GameWithRelations | null> {
  const supabase = await createServerRlsClient<Database>()

  const { data, error } = await supabase
    .from('games')
    .select(
      `
        *,
        product:products(*),
        main_purpose:purposes!main_purpose_id(*),
        translations:game_translations(*),
        media:game_media(*, media:media(*)),
        steps:game_steps(*),
        materials:game_materials(*)
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
  try {
    const supabase = await createServerRlsClient()

    // Find games with the same purpose or product, excluding the current game
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .neq('id', game.id)
      .eq('status', 'published')
      .or(
        `main_purpose_id.eq.${game.main_purpose_id ?? '00000000-0000-0000-0000-000000000000'},product_id.eq.${game.product_id ?? '00000000-0000-0000-0000-000000000000'}`
      )
      .limit(limit)

    if (error) {
      console.warn('[games.server] getRelatedGames query error', error)
      return []
    }

    return data as GameRow[]
  } catch (error) {
    console.error('[games.server] getRelatedGames error', error)
    return []
  }
}
