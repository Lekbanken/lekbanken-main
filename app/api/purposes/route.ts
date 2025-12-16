import { NextResponse } from 'next/server'
import { createServerRlsClient, supabaseAdmin } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type PurposeRow = Database['public']['Tables']['purposes']['Row']

type PurposeInput = Partial<PurposeRow> & { tenant_id?: string | null; is_standard?: boolean }

function isSystemAdmin(role: string | null) {
  return role === 'system_admin' || role === 'superadmin'
}

export async function GET(request: Request) {
  const supabase = await createServerRlsClient()
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')
  const includeStandard = searchParams.get('includeStandard') !== 'false'

  let query = supabase.from('purposes').select('*').order('created_at', { ascending: true })
  if (tenantId === 'null') {
    query = query.eq('tenant_id', null)
  } else if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }
  if (!includeStandard) {
    query = query.eq('is_standard', false)
  }

  const { data, error } = await query

  if (error) {
    console.error('[api/purposes] fetch error', error)
    return NextResponse.json({ error: 'Failed to load purposes' }, { status: 500 })
  }

  const items: PurposeRow[] = data ?? []
  return NextResponse.json({ purposes: items })
}

export async function POST(request: Request) {
  const rlsClient = await createServerRlsClient()
  const {
    data: { user },
  } = await rlsClient.auth.getUser()
  const role = (user?.app_metadata as { role?: string } | undefined)?.role ?? null
  if (!isSystemAdmin(role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as PurposeInput
  if (!body.name || !body.purpose_key || !body.type) {
    return NextResponse.json({ error: 'name, purpose_key and type are required' }, { status: 400 })
  }
  if (body.type === 'sub' && !body.parent_id) {
    return NextResponse.json({ error: 'parent_id required for sub purpose' }, { status: 400 })
  }

  // Standard flag is controlled by seed; force false for user-created
  const isStandard = false

  const { data, error } = await supabaseAdmin
    .from('purposes')
    .insert({
      name: body.name.trim(),
      purpose_key: body.purpose_key.trim(),
      type: body.type,
      parent_id: body.parent_id ?? null,
      tenant_id: body.tenant_id ?? null,
      is_standard: isStandard,
    })
    .select()
    .single()

  if (error) {
    console.error('[api/purposes] insert error', error)
    return NextResponse.json({ error: 'Failed to create purpose' }, { status: 500 })
  }

  return NextResponse.json({ purpose: data }, { status: 201 })
}
