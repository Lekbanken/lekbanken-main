import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
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

  const { blockIds } = (await request.json().catch(() => ({}))) as {
    blockIds?: string[]
  }

  if (!Array.isArray(blockIds) || blockIds.length === 0) {
    return NextResponse.json({ error: 'blockIds is required' }, { status: 400 })
  }

  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Load existing block ids for the plan to validate the reorder request
  const { data: existingBlocks, error: loadError } = await supabase
    .from('plan_blocks')
    .select('id, position, block_type, plan_id')
    .eq('plan_id', planId)
    .order('position', { ascending: true })

  if (loadError) {
    console.error('[api/plans/:id/blocks/reorder] load error', loadError)
    return NextResponse.json({ error: 'Failed to load blocks' }, { status: 500 })
  }

  const existingIds = (existingBlocks ?? []).map((b) => b.id)
  if (existingIds.length !== blockIds.length) {
    return NextResponse.json({ error: 'blockIds mismatch' }, { status: 400 })
  }

  const existingSet = new Set(existingIds)
  const incomingSet = new Set(blockIds)
  if (existingSet.size !== incomingSet.size || [...incomingSet].some((id) => !existingSet.has(id))) {
    return NextResponse.json({ error: 'blockIds must match current blocks' }, { status: 400 })
  }

  // Update positions one by one (upsert with partial data doesn't work reliably)
  for (let idx = 0; idx < blockIds.length; idx++) {
    const blockId = blockIds[idx]
    const { error: updateError } = await supabase
      .from('plan_blocks')
      .update({ position: idx })
      .eq('id', blockId)
      .eq('plan_id', planId)
    
    if (updateError) {
      console.error('[api/plans/:id/blocks/reorder] update error for block', blockId, updateError)
      return NextResponse.json({ error: 'Failed to reorder blocks' }, { status: 500 })
    }
  }

  // Refresh and update total duration
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
  return NextResponse.json({ plan: refreshed.plan })
}
