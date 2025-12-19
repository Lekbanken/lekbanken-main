import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validatePlanBlockPayload } from '@/lib/validation/plans'
import { fetchPlanWithRelations } from '@/lib/services/planner.server'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ planId: string; blockId: string }> }
) {
  const params = await context.params
  const planId = normalizeId(params?.planId)
  const blockId = normalizeId(params?.blockId)
  if (!planId || !blockId) {
    return NextResponse.json({ error: 'Invalid plan or block id' }, { status: 400 })
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

  const validation = validatePlanBlockPayload(
    {
      block_type: body.block_type,
      game_id: body.game_id,
      duration_minutes: body.duration_minutes,
      position: body.position,
    },
    { mode: 'update' }
  )
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

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

  const { data: existingBlocks, error: loadError } = await supabase
    .from('plan_blocks')
    .select('id, position')
    .eq('plan_id', planId)
    .order('position', { ascending: true })

  if (loadError) {
    console.error('[api/plans/:id/blocks/:blockId] load error', loadError)
    return NextResponse.json({ error: 'Failed to load blocks' }, { status: 500 })
  }

  const target = existingBlocks?.find((b) => b.id === blockId)
  if (!target) {
    return NextResponse.json({ error: 'Block not found' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }

  if (body.block_type) updates.block_type = body.block_type
  if (body.game_id !== undefined) updates.game_id = body.game_id
  if (body.duration_minutes !== undefined) updates.duration_minutes = body.duration_minutes
  if (body.title !== undefined) updates.title = body.title
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.metadata !== undefined) updates.metadata = body.metadata
  if (body.is_optional !== undefined) updates.is_optional = body.is_optional

  const { error: updateError } = await supabase
    .from('plan_blocks')
    .update(updates)
    .eq('id', blockId)

  if (updateError) {
    console.error('[api/plans/:id/blocks/:blockId] update error', updateError)
    return NextResponse.json({ error: 'Failed to update block' }, { status: 500 })
  }

  if (body.position !== undefined && existingBlocks) {
    const sanitized = Math.min(Math.max(body.position, 0), existingBlocks.length - 1)
    const orderedIds = existingBlocks.map((b) => b.id)
    const currentIndex = orderedIds.indexOf(blockId)
    orderedIds.splice(currentIndex, 1)
    orderedIds.splice(sanitized, 0, blockId)
    const reorderPayload = orderedIds.map((id, idx) => ({ id, position: idx }))
    const { error: orderError } = await supabase
      .from('plan_blocks')
      // @ts-expect-error - upsert accepts partial rows for reordering
      .upsert(reorderPayload)
    if (orderError) {
      console.error('[api/plans/:id/blocks/:blockId] reorder error', orderError)
      return NextResponse.json({ error: 'Failed to reorder blocks' }, { status: 500 })
    }
  }

  const refreshed = await fetchPlanWithRelations(planId)
  return NextResponse.json({ plan: refreshed.plan })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ planId: string; blockId: string }> }
) {
  const params = await context.params
  const planId = normalizeId(params?.planId)
  const blockId = normalizeId(params?.blockId)
  if (!planId || !blockId) {
    return NextResponse.json({ error: 'Invalid plan or block id' }, { status: 400 })
  }
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: existingBlocks, error: loadError } = await supabase
    .from('plan_blocks')
    .select('id, position')
    .eq('plan_id', planId)
    .order('position', { ascending: true })

  if (loadError) {
    console.error('[api/plans/:id/blocks/:blockId] load error', loadError)
    return NextResponse.json({ error: 'Failed to load blocks' }, { status: 500 })
  }

  const target = existingBlocks?.find((b) => b.id === blockId)
  if (!target) {
    return NextResponse.json({ error: 'Block not found' }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from('plan_blocks')
    .delete()
    .eq('id', blockId)

  if (deleteError) {
    console.error('[api/plans/:id/blocks/:blockId] delete error', deleteError)
    return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 })
  }

  if (existingBlocks && existingBlocks.length > 1) {
    const remainingIds = existingBlocks.filter((b) => b.id !== blockId).map((b) => b.id)
    const reorderPayload = remainingIds.map((id, idx) => ({ id, position: idx }))
    const { error: orderError } = await supabase
      .from('plan_blocks')
      // @ts-expect-error - upsert accepts partial rows for reordering
      .upsert(reorderPayload)
    if (orderError) {
      console.error('[api/plans/:id/blocks/:blockId] reorder after delete error', orderError)
      return NextResponse.json({ error: 'Failed to reorder blocks' }, { status: 500 })
    }
  }

  const refreshed = await fetchPlanWithRelations(planId)
  return NextResponse.json({ plan: refreshed.plan })
}
