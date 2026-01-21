import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
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

  const { allowedProductIds } = await getAllowedProductIds(supabase, activeTenantId || null, user?.id ?? null)
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
  const rlsClient = await createServerRlsClient()
  const cookieStore = await cookies()
  const {
    data: { user },
  } = await rlsClient.auth.getUser()

  const role = (user?.app_metadata as { role?: string } | undefined)?.role ?? null
  const isSuperAdmin = role === 'superadmin'
  const isSystemAdmin = role === 'system_admin' || isSuperAdmin
  const isTenantElevated = role === 'admin' || role === 'owner'

  if (!isSystemAdmin && !isTenantElevated) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const activeTenantId = isSystemAdmin ? null : await readTenantIdFromCookies(cookieStore)
  const supabase = supabaseAdmin
  const body = (await request.json().catch(() => ({}))) as Partial<GameUpdate> & {
    hasCoverImage?: boolean
  }

  const validation = validateGamePayload(body, { mode: 'update' })
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  // Ensure tenant admins can only edit their own games
  if (!isSystemAdmin && activeTenantId) {
    const { data: existing, error: existingError } = await supabase
      .from('games')
      .select('owner_tenant_id')
      .eq('id', gameId)
      .single()

    if (existingError || !existing || existing.owner_tenant_id !== activeTenantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
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
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params
  const rlsClient = await createServerRlsClient()
  const {
    data: { user },
  } = await rlsClient.auth.getUser()

  const role = (user?.app_metadata as { role?: string } | undefined)?.role ?? null
  const isSuperAdmin = role === 'superadmin'
  const isSystemAdmin = role === 'system_admin' || isSuperAdmin

  // System admins can delete any game, others go through RLS
  const supabase = isSystemAdmin ? supabaseAdmin : rlsClient

  // Check for active sessions (game_sessions uses: active, paused, completed, abandoned)
  const { count: activeSessionCount } = await supabaseAdmin
    .from('game_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .in('status', ['active', 'paused'])

  // Also check participant_sessions (uses: active, paused, locked, ended, archived, cancelled)
  const { count: activeParticipantSessionCount } = await supabaseAdmin
    .from('participant_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .in('status', ['active', 'paused'])

  const totalActiveSessions = (activeSessionCount ?? 0) + (activeParticipantSessionCount ?? 0)

  // Check if force delete is requested
  const { searchParams } = new URL(request.url)
  const forceDelete = searchParams.get('force') === 'true'

  if (totalActiveSessions > 0 && !forceDelete) {
    return NextResponse.json(
      { 
        error: 'Game has active sessions',
        code: 'ACTIVE_SESSIONS',
        activeSessionCount: totalActiveSessions,
        message: `Spelet har ${totalActiveSessions} aktiva sessioner som måste avslutas först.`
      }, 
      { status: 409 }
    )
  }

  // If force delete, end all active sessions first
  if (totalActiveSessions > 0 && forceDelete) {
    // game_sessions uses 'completed' as end state
    await supabaseAdmin
      .from('game_sessions')
      .update({ status: 'completed' })
      .eq('game_id', gameId)
      .in('status', ['active', 'paused'])

    // participant_sessions uses 'ended' as end state
    await supabaseAdmin
      .from('participant_sessions')
      .update({ status: 'ended' })
      .eq('game_id', gameId)
      .in('status', ['active', 'paused'])
  }

  const { error } = await supabase.from('games').delete().eq('id', gameId)

  if (error) {
    console.error('[api/games/:id] delete error', error)
    return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
