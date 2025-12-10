import { type NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Json } from '@/types/supabase'

const mediaSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['template', 'upload', 'ai']),
  url: z.string().url(),
  alt_text: z.string().max(500).optional().nullable(),
  tenant_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createServerRlsClient()
  const { searchParams } = new URL(request.url)

  const tenantId = searchParams.get('tenantId')
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  let query = supabase
    .from('media')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  if (type && ['template', 'upload', 'ai'].includes(type)) {
    query = query.eq('type', type as 'template' | 'upload' | 'ai')
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[api/media] GET error', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }

  return NextResponse.json({
    media: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = mediaSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('media')
    .insert({
      name: parsed.data.name,
      type: parsed.data.type,
      url: parsed.data.url,
      alt_text: parsed.data.alt_text ?? null,
      tenant_id: parsed.data.tenant_id ?? null,
      metadata: (parsed.data.metadata ?? {}) as Json,
    })
    .select()
    .single()

  if (error) {
    console.error('[api/media] POST error', error)
    return NextResponse.json({ error: 'Failed to create media' }, { status: 500 })
  }

  return NextResponse.json({ media: data }, { status: 201 })
}
