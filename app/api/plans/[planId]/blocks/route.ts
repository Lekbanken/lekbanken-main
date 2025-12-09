import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validatePlanBlockPayload } from '@/lib/validation/plans'
import { fetchPlanWithRelations, recalcPlanDuration } from '@/lib/services/planner.server'

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

  const body = (await request.json().catch(() => ({}))) as {
    block_type?: 'game' | 'pause' | 'preparation' | 'custom'
    game_id?: string | null
    duration_minutes?: number | null
    title?: string | null
    notes?: string | null
    position?: number
    metadata?: Record<string, unknown> | null
    is_optional?: boolean | null
  }

  // Cast to any to satisfy Json typing for metadata during validation
  const validation = validatePlanBlockPayload(body as any, { mode: 'create' })
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  // Ensure game exists and is accessible when creating a game block
  if (body.block_type === 'game' && body.game_id) {
    const { data: gameRef, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('id', body.game_id)
      .maybeSingle()
    if (gameError || !gameRef) {
      return NextResponse.json({ error: 'Game not found for block' }, { status: 400 })
    }
  }

  const { data: existingBlocks, error: blocksError } = await supabase
    .from('plan_blocks')
    .select('id, position')
    .eq('plan_id', planId)
    .order('position', { ascending: true })

  if (blocksError) {
    console.error('[api/plans/:id/blocks] load error', blocksError)
    return NextResponse.json({ error: 'Failed to load blocks' }, { status: 500 })
  }

  const insertPosition =
    body.position !== undefined && existingBlocks
      ? Math.min(Math.max(body.position, 0), existingBlocks.length)
      : existingBlocks?.length ?? 0

  const { data: newBlock, error: insertError } = await supabase
    .from('plan_blocks')
    .insert(
      {
        plan_id: planId,
        block_type: body.block_type!,
        game_id: body.game_id ?? null,
        duration_minutes: body.duration_minutes ?? null,
        title: body.title ?? null,
        notes: body.notes ?? null,
        position: insertPosition,
        metadata: (body.metadata ?? {}) as any,
        is_optional: body.is_optional ?? false,
        created_by: user.id,
        updated_by: user.id,
      } as any
    )
    .select()
    .single()

  if (insertError || !newBlock) {
    console.error('[api/plans/:id/blocks] insert error', insertError)
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })
  }

  // Reorder positions to be sequential
  const orderedIds = existingBlocks?.map((b) => b.id) ?? []
  orderedIds.splice(insertPosition, 0, newBlock.id)

  const updates = orderedIds.map((id, idx) => ({ id, position: idx }))
  const { error: orderError } = await supabase.from('plan_blocks').upsert(updates as any)
  if (orderError) {
    console.error('[api/plans/:id/blocks] reorder error', orderError)
    return NextResponse.json({ error: 'Failed to reorder blocks' }, { status: 500 })
  }

  // Update total duration
  const { plan } = await fetchPlanWithRelations(planId)
  if (plan) {
    const totalTime = recalcPlanDuration(plan.blocks)
    await supabase
      .from('plans')
      .update({
        total_time_minutes: totalTime,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', planId)
  }

  const refreshed = await fetchPlanWithRelations(planId)
  return NextResponse.json({ plan: refreshed.plan }, { status: 201 })
}
