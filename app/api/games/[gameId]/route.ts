import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validateGamePayload } from '@/lib/validation/games'
import type { Database } from '@/types/supabase'

type GameUpdate = Database['public']['Tables']['games']['Update']

export async function GET(
  _request: Request,
  { params }: { params: { gameId: string } }
) {
  const supabase = await createServerRlsClient()
  const { data, error } = await supabase
    .from('games')
    .select(
      `
        *,
        translations:game_translations(*),
        media:game_media(*),
        product:products(*),
        main_purpose:purposes!main_purpose_id(*)
      `
    )
    .eq('id', params.gameId)
    .single()

  if (error) {
    console.error('[api/games/:id] fetch error', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ game: data })
}

export async function PATCH(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const supabase = await createServerRlsClient()
  const body = (await request.json().catch(() => ({}))) as Partial<GameUpdate> & {
    hasCoverImage?: boolean
  }

  const validation = validateGamePayload(body, { mode: 'update' })
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('games')
    .update({
      name: body.name,
      short_description: body.short_description,
      description: body.description,
      main_purpose_id: body.main_purpose_id,
      product_id: body.product_id,
      energy_level: body.energy_level,
      location_type: body.location_type,
      time_estimate_min: body.time_estimate_min,
      min_players: body.min_players,
      max_players: body.max_players,
      age_min: body.age_min,
      age_max: body.age_max,
      category: body.category,
      status: body.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.gameId)
    .select()
    .single()

  if (error) {
    console.error('[api/games/:id] update error', error)
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 })
  }

  return NextResponse.json({ game: data })
}
