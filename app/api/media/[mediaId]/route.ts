import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Json } from '@/types/supabase'
import { logger } from '@/lib/utils/logger'
import { apiHandler } from '@/lib/api/route-handler'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  alt_text: z.string().max(500).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
})

// GET is intentionally public — RLS controls access
export const GET = apiHandler({
  auth: 'public',
  handler: async ({ params }) => {
  const { mediaId } = params
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('id', mediaId)
    .single()

  if (error || !data) {
    logger.error('Media not found', error ?? undefined, { 
      endpoint: '/api/media/[mediaId]',
      method: 'GET',
      mediaId 
    })
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }

  return NextResponse.json({ media: data })
  },
})

export const PATCH = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { mediaId } = params
  const supabase = await createServerRlsClient()
  const userId = auth!.user!.id

  const body = await req.json().catch(() => ({}))
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.alt_text !== undefined) updates.alt_text = parsed.data.alt_text
  if (parsed.data.metadata !== undefined) updates.metadata = parsed.data.metadata as Json

  const { data, error} = await supabase
    .from('media')
    .update(updates)
    .eq('id', mediaId)
    .select()
    .single()

  if (error) {
    logger.error('Failed to update media', error, {
      endpoint: '/api/media/[mediaId]',
      method: 'PATCH',
      mediaId,
      userId
    })
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 })
  }

  return NextResponse.json({ media: data })
  },
})

export const DELETE = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
  const { mediaId } = params
  const supabase = await createServerRlsClient()
  const userId = auth!.user!.id

  const { error } = await supabase.from('media').delete().eq('id', mediaId)

  if (error) {
    logger.error('Failed to delete media', error, {
      endpoint: '/api/media/[mediaId]',
      method: 'DELETE',
      mediaId,
      userId
    })
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
  },
})
