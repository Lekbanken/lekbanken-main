import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerRlsClient, supabaseAdmin } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type PurposeRow = Database['public']['Tables']['purposes']['Row']

async function requireSystemAdmin() {
  const rls = await createServerRlsClient()
  const {
    data: { user },
  } = await rls.auth.getUser()
  const role = (user?.app_metadata as { role?: string } | undefined)?.role ?? null
  const isSystemAdmin = role === 'system_admin' || role === 'superadmin'
  return isSystemAdmin
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ purposeId: string }> }
) {
  const purposeId = (await params).purposeId
  const allowed = await requireSystemAdmin()
  if (!allowed) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as Partial<PurposeRow>

  const updates: Partial<PurposeRow> = {}
  if (body.name !== undefined) updates.name = body.name?.trim()
  if (body.purpose_key !== undefined) updates.purpose_key = body.purpose_key?.trim()
  if (body.type !== undefined) updates.type = body.type
  if (body.parent_id !== undefined) updates.parent_id = body.parent_id

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
  _request: NextRequest,
  { params }: { params: Promise<{ purposeId: string }> }
) {
  const purposeId = (await params).purposeId
  const allowed = await requireSystemAdmin()
  if (!allowed) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { error } = await supabaseAdmin.from('purposes').delete().eq('id', purposeId)
  if (error) {
    console.error('[api/purposes/:id] delete error', error)
    return NextResponse.json({ error: 'Failed to delete purpose' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
