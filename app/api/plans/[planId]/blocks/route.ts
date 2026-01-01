import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validatePlanBlockPayload } from '@/lib/validation/plans'
import { mapBlockToPlanner } from '@/lib/services/planner.server'
import type { Json } from '@/types/supabase'

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

  const validation = validatePlanBlockPayload(
    {
      block_type: body.block_type,
      game_id: body.game_id,
      duration_minutes: body.duration_minutes,
      position: body.position,
    },
    { mode: 'create' }
  )
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
        metadata: (body.metadata ?? {}) as Json,
        is_optional: body.is_optional ?? false,
        created_by: user.id,
        updated_by: user.id,
      }
    )
    .select()
    .single()

  if (insertError || !newBlock) {
    console.error('[api/plans/:id/blocks] insert error', insertError)
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })
  }

  // Reorder positions to be sequential using individual updates
  const orderedIds = existingBlocks?.map((b) => b.id) ?? []
  orderedIds.splice(insertPosition, 0, newBlock.id)

  // Update positions one by one (upsert doesn't work for partial updates)
  for (let idx = 0; idx < orderedIds.length; idx++) {
    const blockId = orderedIds[idx]
    const { error: orderError } = await supabase
      .from('plan_blocks')
      .update({ position: idx })
      .eq('id', blockId)
    
    if (orderError) {
      console.error('[api/plans/:id/blocks] reorder error for block', blockId, orderError)
      // Continue anyway, position ordering is not critical
    }
  }

  // Fetch the created block with game relation for client
  const { data: createdBlock, error: fetchError } = await supabase
    .from('plan_blocks')
    .select(`
      *,
      games (
        id,
        name,
        slug,
        description,
        min_players,
        max_players,
        time_estimate_min,
        time_estimate_max,
        energy_level,
        location_type,
        translations:game_translations (
          locale,
          title,
          short_description
        ),
        media:game_media (
          kind,
          media_id,
          position
          ,
          media:media (
            url
          )
        )
      )
    `)
    .eq('id', newBlock.id)
    .single()

  if (fetchError || !createdBlock) {
    console.error('[api/plans/:id/blocks] fetch created block error', fetchError)
    // Return basic block without game relation if fetch fails
    const fallbackBlock = mapBlockToPlanner(newBlock as unknown as Parameters<typeof mapBlockToPlanner>[0])
    return NextResponse.json({ block: fallbackBlock }, { status: 201 })
  }

  const mappedBlock = mapBlockToPlanner(createdBlock as unknown as Parameters<typeof mapBlockToPlanner>[0])
  return NextResponse.json({ block: mappedBlock }, { status: 201 })
}
