import { NextResponse } from 'next/server'
import { createServerRlsClient, supabaseAdmin } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type PurposeRow = Database['public']['Tables']['purposes']['Row']

export async function GET() {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('purposes')
    .select('*')
    .order('created_at', { ascending: true })

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
  const isSystemAdmin = role === 'system_admin' || role === 'superadmin'
  if (!isSystemAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as Partial<PurposeRow>
  if (!body.name || !body.purpose_key || !body.type) {
    return NextResponse.json({ error: 'name, purpose_key and type are required' }, { status: 400 })
  }
  if (body.type === 'sub' && !body.parent_id) {
    return NextResponse.json({ error: 'parent_id required for sub purpose' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('purposes')
    .insert({
      name: body.name.trim(),
      purpose_key: body.purpose_key.trim(),
      type: body.type,
      parent_id: body.parent_id ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[api/purposes] insert error', error)
    return NextResponse.json({ error: 'Failed to create purpose' }, { status: 500 })
  }

  return NextResponse.json({ purpose: data }, { status: 201 })
}
