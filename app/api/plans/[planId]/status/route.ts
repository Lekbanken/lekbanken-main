import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { deriveEffectiveGlobalRole } from '@/lib/auth/role'
import {
  buildCapabilityContextFromMemberships,
  derivePlanCapabilities,
  requireCapability,
  planToResource,
} from '@/lib/auth/capabilities'
import { assertTransition, getNextStatus, type PlanStatusAction } from '@/lib/planner/state-machine'
import type { PlannerStatus } from '@/types/planner'

type RequestBody = {
  status?: PlannerStatus
  action?: PlanStatusAction
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

  // Fetch existing plan
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (planError || !plan) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Plan not found' } },
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

  // Check update capability
  const planResource = planToResource(plan)
  const check = requireCapability(capabilityCtx, planResource, 'planner.plan.update')
  if (!check.allowed) {
    return NextResponse.json(
      { error: { code: check.code, message: check.message } },
      { status: 403 }
    )
  }

  // Determine the target status
  let targetStatus: PlannerStatus

  if (body.action) {
    // Action-based transition
    try {
      targetStatus = getNextStatus(plan.status as PlannerStatus, body.action)
    } catch (err) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_TRANSITION', 
            message: err instanceof Error ? err.message : 'Invalid status transition' 
          } 
        },
        { status: 400 }
      )
    }
  } else if (body.status) {
    // Direct status change
    targetStatus = body.status
    try {
      assertTransition(plan.status as PlannerStatus, targetStatus)
    } catch (err) {
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_TRANSITION', 
            message: err instanceof Error ? err.message : 'Invalid status transition' 
          } 
        },
        { status: 400 }
      )
    }
  } else {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Either status or action is required' } },
      { status: 400 }
    )
  }

  // Update the plan status
  const { data: updatedPlan, error: updateError } = await supabase
    .from('plans')
    .update({
      status: targetStatus,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', planId)
    .select()
    .single()

  if (updateError) {
    console.error('[api/plans/status] update error', updateError)
    return NextResponse.json(
      { error: { code: 'UPDATE_FAILED', message: 'Failed to update plan status' } },
      { status: 500 }
    )
  }

  // Build capabilities for response
  const caps = derivePlanCapabilities(capabilityCtx, planToResource(updatedPlan))
  const capsObj = {
    canRead: caps.has('planner.plan.read'),
    canUpdate: caps.has('planner.plan.update'),
    canDelete: caps.has('planner.plan.delete'),
    canPublish: caps.has('planner.plan.publish'),
    canSetVisibilityPublic: caps.has('planner.plan.visibility.public'),
    canCreateTemplate: caps.has('planner.template.create'),
    canStartRun: caps.has('play.run.start'),
  }

  return NextResponse.json({
    plan: {
      id: updatedPlan.id,
      name: updatedPlan.name,
      description: updatedPlan.description,
      visibility: updatedPlan.visibility,
      status: updatedPlan.status,
      ownerUserId: updatedPlan.owner_user_id,
      ownerTenantId: updatedPlan.owner_tenant_id,
      totalTimeMinutes: updatedPlan.total_time_minutes,
      currentVersionId: updatedPlan.current_version_id,
      updatedAt: updatedPlan.updated_at,
      metadata: updatedPlan.metadata,
      blocks: [],
    },
    _capabilities: capsObj,
    previousStatus: plan.status,
    newStatus: targetStatus,
  })
}
