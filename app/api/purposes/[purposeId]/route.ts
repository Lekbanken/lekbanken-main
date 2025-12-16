import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerRlsClient, supabaseAdmin } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type PurposeRow = Database['public']['Tables']['purposes']['Row']

type PurposeInput = Partial<PurposeRow> & { tenant_id?: string | null; is_standard?: boolean }

async function requireSystemAdmin() {
  const rls = await createServerRlsClient()
  const {
    data: { user },
  } = await rls.auth.getUser()
  const role = (user?.app_metadata as { role?: string } | undefined)?.role ?? null
  const isSystemAdmin = role === 'system_admin' || role === 'superadmin'
  return isSystemAdmin
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ purposeId: string }> }
) {
  const purposeId = (await params).purposeId

  const [
    { count: gamesMain },
    { count: gamesSecondary },
    { count: productLinks },
    { count: mediaLinks },
    { count: childSubs },
  ] = await Promise.all([
    supabaseAdmin.from('games').select('id', { count: 'exact', head: true }).eq('main_purpose_id', purposeId),
    supabaseAdmin
      .from('game_secondary_purposes')
      .select('game_id', { count: 'exact', head: true })
      .eq('purpose_id', purposeId),
    supabaseAdmin
      .from('product_purposes')
      .select('product_id', { count: 'exact', head: true })
      .eq('purpose_id', purposeId),
    supabaseAdmin.from('media').select('id', { count: 'exact', head: true }).eq('purpose_id', purposeId),
    supabaseAdmin.from('purposes').select('id', { count: 'exact', head: true }).eq('parent_id', purposeId),
  ])

  return NextResponse.json({
    usage: {
      gamesMain: gamesMain ?? 0,
      gamesSecondary: gamesSecondary ?? 0,
      products: productLinks ?? 0,
      media: mediaLinks ?? 0,
      childSubs: childSubs ?? 0,
    },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ purposeId: string }> }
) {
  const purposeId = (await params).purposeId
  const allowed = await requireSystemAdmin()
  if (!allowed) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as PurposeInput

  const { data: existing, error: getError } = await supabaseAdmin.from('purposes').select('*').eq('id', purposeId).maybeSingle()
  if (getError) {
    console.error('[api/purposes/:id] fetch error', getError)
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
  if (!existing) {
    // Already deleted; treat as success
    return NextResponse.json({ ok: true, missing: true })
  }
  if (existing.is_standard) {
    return NextResponse.json({ error: 'Standard purposes are read-only' }, { status: 403 })
  }

  const updates: PurposeInput = {}
  if (body.name !== undefined) updates.name = body.name?.trim()
  if (body.purpose_key !== undefined) updates.purpose_key = body.purpose_key?.trim()
  if (body.type !== undefined) updates.type = body.type
  if (body.parent_id !== undefined) updates.parent_id = body.parent_id
  if (body.tenant_id !== undefined) updates.tenant_id = body.tenant_id

  if (updates.type === 'sub' && !updates.parent_id) {
    return NextResponse.json({ error: 'parent_id required for sub purpose' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.from('purposes').update(updates).eq('id', purposeId).select().single()
  if (error) {
    console.error('[api/purposes/:id] update error', error)
    return NextResponse.json({ error: 'Failed to update purpose' }, { status: 500 })
  }

  return NextResponse.json({ purpose: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ purposeId: string }> }
) {
  const purposeId = (await params).purposeId
  const allowed = await requireSystemAdmin()
  if (!allowed) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { data: existing, error: getError } = await supabaseAdmin.from('purposes').select('is_standard').eq('id', purposeId).single()
  if (getError || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (existing.is_standard) {
    return NextResponse.json({ error: 'Standard purposes are read-only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const detach = searchParams.get('detach') === 'true'

  if (detach) {
    // Delete child sub-purposes first (non-standard only)
    await supabaseAdmin.from('purposes').delete().eq('parent_id', purposeId).eq('is_standard', false)
    await supabaseAdmin.from('games').update({ main_purpose_id: null }).eq('main_purpose_id', purposeId)
    await supabaseAdmin.from('game_secondary_purposes').delete().eq('purpose_id', purposeId)
    await supabaseAdmin.from('product_purposes').delete().eq('purpose_id', purposeId)
    await supabaseAdmin.from('media').update({ purpose_id: null }).eq('purpose_id', purposeId)
  }

  const { error } = await supabaseAdmin.from('purposes').delete().eq('id', purposeId)
  if (error) {
    console.error('[api/purposes/:id] delete error', error)
    return NextResponse.json({ error: 'Failed to delete purpose' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
