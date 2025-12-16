import { type NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Json } from '@/types/supabase'
import { logger } from '@/lib/utils/logger'

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
  const mainPurposeId = searchParams.get('mainPurposeId')
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  // Special handling for templates filtered by main_purpose_id
  if (type === 'template' && mainPurposeId) {
    const { data: templateData, error: templateError } = await supabase
      .from('media_templates')
      .select(`
        media_id,
        priority,
        media:media(*)
      `)
      .eq('main_purpose_id', mainPurposeId)
      .is('sub_purpose_id', null)
      .order('priority', { ascending: false })
      .limit(10)

    if (templateError) {
      logger.error('Failed to fetch templates by purpose', templateError, {
        endpoint: '/api/media',
        method: 'GET',
        mainPurposeId
      })
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    // Extract media from templates and filter out nulls
    const media = (templateData ?? [])
      .map(t => t.media)
      .filter(Boolean)

    return NextResponse.json({
      media,
      total: media.length,
      limit,
      offset: 0,
    })
  }

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
    logger.error('Failed to fetch media', error, { 
      endpoint: '/api/media',
      method: 'GET',
      tenantId: tenantId ?? undefined,
      type: type ?? undefined
    })
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
    logger.error('Failed to create media', error, {
      endpoint: '/api/media',
      method: 'POST',
      userId: user.id,
      mediaType: parsed.data.type
    })
    return NextResponse.json({ error: 'Failed to create media' }, { status: 500 })
  }

  return NextResponse.json({ media: data }, { status: 201 })
}
