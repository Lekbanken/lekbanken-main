import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { deriveEffectiveGlobalRole } from '@/lib/auth/role'
import {
  buildCapabilityContextFromMemberships,
  derivePlanCapabilities,
  planToResource,
} from '@/lib/auth/capabilities'
import { canTransition } from '@/lib/planner/state-machine'
import type { PlannerStatus } from '@/types/planner'

type BulkAction = 'archive' | 'restore' | 'delete' | 'publish'

type BulkRequestBody = {
  planIds: string[]
  action: BulkAction
}

type BulkResult = {
  success: boolean
  planId: string
  error?: string
}

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null) as BulkRequestBody | null

  if (!body?.planIds?.length || !body?.action) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'planIds and action are required' } },
      { status: 400 }
    )
  }

  const { planIds, action } = body

  // Validate action
  const validActions: BulkAction[] = ['archive', 'restore', 'delete', 'publish']
  if (!validActions.includes(action)) {
    return NextResponse.json(
      { error: { code: 'INVALID_ACTION', message: `Invalid action: ${action}` } },
      { status: 400 }
    )
  }

  // Limit batch size
  if (planIds.length > 50) {
    return NextResponse.json(
      { error: { code: 'BATCH_TOO_LARGE', message: 'Maximum 50 plans per batch' } },
      { status: 400 }
    )
  }

  // Fetch all plans
  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('id, status, visibility, owner_user_id, owner_tenant_id')
    .in('id', planIds)

  if (plansError) {
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: 'Failed to fetch plans' } },
      { status: 500 }
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

  const results: BulkResult[] = []

  for (const plan of plans ?? []) {
    const resource = planToResource(plan)
    const caps = derivePlanCapabilities(capabilityCtx, resource)
    const capsObj = Object.fromEntries([...caps].map((c) => [c, true]))

    // eslint-disable-next-line prefer-const -- result properties are mutated in switch
    let result: BulkResult = { success: false, planId: plan.id }

    try {
      switch (action) {
        case 'archive': {
          if (!capsObj['planner.plan.update']) {
            result.error = 'No permission to archive'
            break
          }
          if (!canTransition(plan.status as PlannerStatus, 'archived')) {
            result.error = `Cannot archive from ${plan.status} status`
            break
          }
          const { error } = await supabase
            .from('plans')
            .update({ status: 'archived', updated_by: user.id })
            .eq('id', plan.id)
          if (error) throw error
          result.success = true
          break
        }

        case 'restore': {
          if (!capsObj['planner.plan.update']) {
            result.error = 'No permission to restore'
            break
          }
          if (plan.status !== 'archived') {
            result.error = 'Only archived plans can be restored'
            break
          }
          const { error } = await supabase
            .from('plans')
            .update({ status: 'draft', updated_by: user.id })
            .eq('id', plan.id)
          if (error) throw error
          result.success = true
          break
        }

        case 'delete': {
          if (!capsObj['planner.plan.delete']) {
            result.error = 'No permission to delete'
            break
          }
          const { error } = await supabase.from('plans').delete().eq('id', plan.id)
          if (error) throw error
          result.success = true
          break
        }

        case 'publish': {
          if (!capsObj['planner.plan.publish']) {
            result.error = 'No permission to publish'
            break
          }
          if (!canTransition(plan.status as PlannerStatus, 'published')) {
            result.error = `Cannot publish from ${plan.status} status`
            break
          }
          // Just update status - version creation would need more logic
          const { error } = await supabase
            .from('plans')
            .update({ status: 'published', updated_by: user.id })
            .eq('id', plan.id)
          if (error) throw error
          result.success = true
          break
        }
      }
    } catch (err) {
      console.error(`[api/plans/bulk] Error processing ${plan.id}:`, err)
      result.error = 'Operation failed'
    }

    results.push(result)
  }

  // Not found plans
  const foundIds = new Set((plans ?? []).map((p) => p.id))
  for (const planId of planIds) {
    if (!foundIds.has(planId)) {
      results.push({ success: false, planId, error: 'Plan not found' })
    }
  }

  const successCount = results.filter((r) => r.success).length
  const failureCount = results.filter((r) => !r.success).length

  return NextResponse.json({
    results,
    summary: {
      total: planIds.length,
      success: successCount,
      failed: failureCount,
    },
  })
}
