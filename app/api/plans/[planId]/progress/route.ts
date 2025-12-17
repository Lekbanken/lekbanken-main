import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned'

export async function GET(_request: Request, context: { params: Promise<{ planId: string }> }) {
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

  const { data, error } = await supabase
    .from('plan_play_progress')
    .select('*')
    .eq('plan_id', planId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[api/plans/:id/progress] load error', error)
    return NextResponse.json({ error: 'Failed to load progress' }, { status: 500 })
  }

  return NextResponse.json({ progress: data ?? null })
}

export async function POST(request: Request, context: { params: Promise<{ planId: string }> }) {
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

  const body = (await request.json().catch(() => ({}))) as {
    current_block_id?: string | null
    status?: ProgressStatus
    metadata?: Record<string, unknown> | null
  }

  let currentPosition: number | null = null

  if (body.current_block_id) {
    const { data: blockRef, error: blockError } = await supabase
      .from('plan_blocks')
      .select('id, position')
      .eq('id', body.current_block_id)
      .eq('plan_id', planId)
      .maybeSingle()

    if (blockError) {
      console.error('[api/plans/:id/progress] block lookup error', blockError)
      return NextResponse.json({ error: 'Failed to validate block' }, { status: 500 })
    }

    if (!blockRef) {
      return NextResponse.json({ errors: ['current_block_id must belong to plan'] }, { status: 400 })
    }

    currentPosition = blockRef.position ?? null
  }

  const status: ProgressStatus = body.status ?? 'in_progress'
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('plan_play_progress')
    .upsert(
      {
        plan_id: planId,
        user_id: user.id,
        current_block_id: body.current_block_id ?? null,
        current_position: currentPosition,
        status,
        completed_at: status === 'completed' ? now : null,
        metadata: (body.metadata ?? {}) as Json,
        updated_at: now,
      },
      { onConflict: 'plan_id,user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[api/plans/:id/progress] upsert error', error)
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
  }

  return NextResponse.json({ progress: data })
}
