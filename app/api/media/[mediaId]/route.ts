import { type NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Json } from '@/types/supabase'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  alt_text: z.string().max(500).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('id', mediaId)
    .single()

  if (error || !data) {
    console.error('[api/media/:id] GET error', error)
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }

  return NextResponse.json({ media: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
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
    console.error('[api/media/:id] PATCH error', error)
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 })
  }

  return NextResponse.json({ media: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase.from('media').delete().eq('id', mediaId)

  if (error) {
    console.error('[api/media/:id] DELETE error', error)
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
