import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

export async function POST(
  request: Request,
  context: { params: Promise<{ planId: string }> }
) {
  const params = await context.params
  const planId = normalizeId(params?.planId)
  if (!planId) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 })
  }
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { content?: string }
  if (!body.content || body.content.trim().length === 0) {
    return NextResponse.json({ errors: ['content is required'] }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('plan_notes_private')
    .upsert(
      {
        content: body.content.trim(),
        plan_id: planId,
        created_by: user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'plan_id,created_by' }
    )
    .select()
    .single()

  if (error) {
    console.error('[api/plans/:id/notes/private] upsert error', error)
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }

  return NextResponse.json({ note: data })
}
