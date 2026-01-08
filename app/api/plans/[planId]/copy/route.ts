import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { deriveEffectiveGlobalRole } from '@/lib/auth/role'
import {
  buildCapabilityContextFromMemberships,
  derivePlanCapabilities,
  requireCapability,
  planToResource,
  capabilitiesToObject,
} from '@/lib/auth/capabilities'
import { fetchPlanWithRelations } from '@/lib/services/planner.server'
import type { PlannerVisibility } from '@/types/planner'
import type { Json } from '@/types/supabase'

type RequestBody = {
  name?: string
  visibility?: PlannerVisibility
  owner_tenant_id?: string | null
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  // Parse request body
  const body = (await request.json().catch(() => ({}))) as RequestBody

  // Fetch source plan with blocks
  const { data: sourcePlan, error: planError } = await supabase
    .from('plans')
    .select(`
      *,
      blocks:plan_blocks(*)
    `)
    .eq('id', planId)
    .single()

  if (planError || !sourcePlan) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Source plan not found' } },
      { status: 404 }
    )
  }

  // Build capability context
  const [profileResult, membershipsResult] = await Promise.all([
    supabase.from('users').select('global_role').eq('id', user.id).single(),
    supabase.from('user_tenant_memberships').select('tenant_id, role').eq('user_id', user.id),
  ])

  const globalRole = deriveEffectiveGlobalRole(profileResult.data, user)
  const memberships = (membershipsResult.data ?? [])
    .filter((m) => Boolean(m.tenant_id) && Boolean(m.role))
    .map((m) => ({ tenant_id: m.tenant_id as string, role: m.role as string }))

  const capabilityCtx = buildCapabilityContextFromMemberships({
    userId: user.id,
    globalRole,
    memberships,
  })

  // Check read capability on source plan
  const sourceResource = planToResource(sourcePlan)
  const readCheck = requireCapability(capabilityCtx, sourceResource, 'planner.plan.read')
  if (!readCheck.allowed) {
    return NextResponse.json(
      { error: { code: readCheck.code, message: readCheck.message } },
      { status: 403 }
    )
  }

  // Determine target visibility and tenant
  const targetVisibility = body.visibility ?? 'private'
  const targetTenantId = body.owner_tenant_id ?? null

  // If trying to copy as public, need system_admin
  if (targetVisibility === 'public' && globalRole !== 'system_admin') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Only system admins can create public plans' } },
      { status: 403 }
    )
  }

  // Create the new plan
  const newPlanName = body.name ?? `${sourcePlan.name} (kopia)`
  
  const { data: newPlan, error: createError } = await supabase
    .from('plans')
    .insert({
      name: newPlanName,
      description: sourcePlan.description,
      visibility: targetVisibility,
      status: 'draft',
      owner_user_id: user.id,
      owner_tenant_id: targetTenantId,
      metadata: {
        ...(sourcePlan.metadata as object ?? {}),
        copiedFrom: planId,
        copiedAt: new Date().toISOString(),
      } as Json,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (createError || !newPlan) {
    console.error('[api/plans/copy] create error', createError)
    return NextResponse.json(
      { error: { code: 'CREATE_FAILED', message: 'Failed to create plan copy' } },
      { status: 500 }
    )
  }

  // Copy blocks if source has any
  const sourceBlocks = sourcePlan.blocks ?? []
  if (sourceBlocks.length > 0) {
    const blockInserts = sourceBlocks.map((block: {
      block_type: 'game' | 'pause' | 'preparation' | 'custom'
      game_id: string | null
      duration_minutes: number | null
      title: string | null
      notes: string | null
      position: number
      metadata: Json | null
      is_optional: boolean | null
    }) => ({
      plan_id: newPlan.id,
      block_type: block.block_type,
      game_id: block.game_id,
      duration_minutes: block.duration_minutes,
      title: block.title,
      notes: block.notes,
      position: block.position,
      metadata: block.metadata,
      is_optional: block.is_optional,
      created_by: user.id,
      updated_by: user.id,
    }))

    const { error: blocksError } = await supabase
      .from('plan_blocks')
      .insert(blockInserts)

    if (blocksError) {
      console.error('[api/plans/copy] blocks insert error', blocksError)
      // Plan was created but blocks failed - still return success with warning
    }
  }

  // Fetch the complete new plan
  const { plan: completePlan } = await fetchPlanWithRelations(newPlan.id)

  // Build capabilities for the new plan
  const newPlanResource = planToResource(newPlan)
  const caps = derivePlanCapabilities(capabilityCtx, newPlanResource)
  const capsObj = capabilitiesToObject(caps)

  return NextResponse.json({
    plan: completePlan,
    _capabilities: capsObj,
    copiedFrom: {
      id: planId,
      name: sourcePlan.name,
    },
  }, { status: 201 })
}
