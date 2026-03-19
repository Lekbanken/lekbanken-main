import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateGamePayload } from '@/lib/validation/games'
import { apiHandler } from '@/lib/api/route-handler'

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { gameId } = params
  const ctx = auth!

  // BUG-028: Use canonical auth — check tenant membership role, not app_metadata.role.
  // Fetch game ownership via service role to ensure visibility regardless of RLS on drafts.
  const adminClient = createServiceRoleClient()
  const { data: game, error: fetchError } = await adminClient
    .from('games')
    .select('owner_tenant_id')
    .eq('id', gameId)
    .single()

  if (fetchError || !game) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (ctx.effectiveGlobalRole !== 'system_admin') {
    if (!game.owner_tenant_id) {
      return NextResponse.json({ error: 'Forbidden: only system_admin can publish global games' }, { status: 403 })
    }
    const membership = ctx.memberships.find(m => m.tenant_id === game.owner_tenant_id)
    const tenantRole = membership?.role
    if (tenantRole !== 'admin' && tenantRole !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: publish requires admin/owner in game tenant' }, { status: 403 })
    }
  }

  const body = (await req.json().catch(() => ({}))) as {
    hasCoverImage?: boolean
    force?: boolean
  }

  const validation = validateGamePayload({ hasCoverImage: body.hasCoverImage }, { mode: 'publish' })
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  // Require at least one cover image before publish
  const { data: covers, error: coverError } = await adminClient
    .from('game_media')
    .select('id')
    .eq('game_id', gameId)
    .eq('kind', 'cover')

  if (coverError) {
    console.error('[api/games/:id/publish] cover check error', coverError)
    return NextResponse.json({ error: 'Failed to verify media' }, { status: 500 })
  }

  if (!covers || covers.length === 0) {
    return NextResponse.json({ error: 'Cover image required before publish' }, { status: 400 })
  }

  const { data, error } = await adminClient
    .from('games')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', gameId)
    .select()
    .single()

  if (error) {
    console.error('[api/games/:id/publish] publish error', error)
    return NextResponse.json({ error: 'Failed to publish game' }, { status: 500 })
  }

  return NextResponse.json({ game: data })
},
})
