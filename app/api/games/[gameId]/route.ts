import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerRlsClient, supabaseAdmin } from '@/lib/supabase/server'
import { readTenantIdFromCookies } from '@/lib/utils/tenantCookie'
import { getAllowedProductIds } from '@/app/api/games/utils'
import { validateGamePayload } from '@/lib/validation/games'
import type { Database } from '@/types/supabase'

type GameUpdate = Database['public']['Tables']['games']['Update']

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  const rlsClient = await createServerRlsClient()
  const cookieStore = await cookies()
  const {
    data: { user },
  } = await rlsClient.auth.getUser()

  const role = (user?.app_metadata as { role?: string } | undefined)?.role ?? null
  const isSuperAdmin = role === 'superadmin'
  const isSystemAdmin = role === 'system_admin' || isSuperAdmin
  const isTenantElevated = role === 'admin' || role === 'owner'
  const isElevated = isSystemAdmin || isTenantElevated

  const supabase = isSystemAdmin ? supabaseAdmin : rlsClient
  const activeTenantId = isSystemAdmin ? null : await readTenantIdFromCookies(cookieStore)

  const { allowedProductIds } = await getAllowedProductIds(supabase, activeTenantId || null)
  if (activeTenantId && allowedProductIds.length === 0 && !isElevated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let query = supabase
    .from('games')
    .select(
      `
        *,
        translations:game_translations(*),
        media:game_media(*),
        product:products(*),
        main_purpose:purposes!games_main_purpose_id_fkey(*)
      `
    )
    .eq('id', gameId)

  if (!isElevated) {
    query = query.eq('status', 'published')
  }

  const { data, error } = await query.single()

  if (error || !data) {
    console.error('[api/games/:id] fetch error', error)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!isElevated) {
    if (activeTenantId) {
      const ownsGame = data.owner_tenant_id === activeTenantId || data.owner_tenant_id === null
      if (!ownsGame) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (allowedProductIds.length > 0 && data.product_id && !allowedProductIds.includes(data.product_id)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    } else {
      if (data.owner_tenant_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  } else if (isTenantElevated && data.owner_tenant_id && activeTenantId && data.owner_tenant_id !== activeTenantId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ game: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
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
    .eq('id', gameId)
    .select()
    .single()

  if (error) {
    console.error('[api/games/:id] update error', error)
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 })
  }

  return NextResponse.json({ game: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  const supabase = await createServerRlsClient()

  const { error } = await supabase.from('games').delete().eq('id', gameId)

  if (error) {
    console.error('[api/games/:id] delete error', error)
    return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
