import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validatePlanPayload } from '@/lib/validation/plans'
import type { Json } from '@/types/supabase'
import { fetchPlanWithRelations } from '@/lib/services/planner.server'
import {
  buildCapabilityContextFromMemberships,
  derivePlanCapabilities,
  capabilitiesToObject,
  requireCapability,
  planToResource,
} from '@/lib/auth/capabilities'
import { deriveEffectiveGlobalRole } from '@/lib/auth/role'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ planId: string }> }
) {
  const params = await context.params
  const planId = normalizeId(params?.planId)
  if (!planId) {
    return NextResponse.json({ error: { code: 'INVALID_ID', message: 'Invalid plan id' } }, { status: 400 })
  }

  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  const { plan, raw } = await fetchPlanWithRelations(planId)
  if (!plan || !raw) {
    return NextResponse.json({ error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found' } }, { status: 404 })
  }

  // Fetch user profile and memberships for capabilities
  const [profileResult, membershipsResult] = await Promise.all([
    supabase.from('users').select('global_role').eq('id', user.id).single(),
    supabase.from('user_tenant_memberships').select('tenant_id, role').eq('user_id', user.id),
  ])

  const globalRole = deriveEffectiveGlobalRole(profileResult.data, user)
  const memberships = membershipsResult.data ?? []

  const capabilityCtx = buildCapabilityContextFromMemberships({
    userId: user.id,
    globalRole,
    memberships,
  })

  const planResource = planToResource({
    owner_user_id: raw.owner_user_id,
    owner_tenant_id: raw.owner_tenant_id,
    visibility: raw.visibility,
  })

  const caps = derivePlanCapabilities(capabilityCtx, planResource)

  return NextResponse.json({
    plan,
    _capabilities: capabilitiesToObject(caps),
  })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ planId: string }> }
) {
  const params = await context.params
  const planId = normalizeId(params?.planId)
  if (!planId) {
    return NextResponse.json({ error: { code: 'INVALID_ID', message: 'Invalid plan id' } }, { status: 400 })
  }

  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  // Fetch plan first to check capabilities
  const { raw: existingPlan } = await fetchPlanWithRelations(planId)
  if (!existingPlan) {
    return NextResponse.json({ error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found' } }, { status: 404 })
  }

  // Get user context for capability check
  const [profileResult, membershipsResult] = await Promise.all([
    supabase.from('users').select('global_role').eq('id', user.id).single(),
    supabase.from('user_tenant_memberships').select('tenant_id, role').eq('user_id', user.id),
  ])

  const globalRole = deriveEffectiveGlobalRole(profileResult.data, user)
  const memberships = membershipsResult.data ?? []

  const capabilityCtx = buildCapabilityContextFromMemberships({
    userId: user.id,
    globalRole,
    memberships,
  })

  const planResource = planToResource({
    owner_user_id: existingPlan.owner_user_id,
    owner_tenant_id: existingPlan.owner_tenant_id,
    visibility: existingPlan.visibility,
  })

  // Check update capability
  const updateCheck = requireCapability(capabilityCtx, planResource, 'planner.plan.update')
  if (!updateCheck.allowed) {
    return NextResponse.json(
      { error: { code: updateCheck.code, message: updateCheck.message } },
      { status: 403 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string
    description?: string | null
    metadata?: Record<string, unknown> | null
  }

  const validation = validatePlanPayload(
    {
      name: body.name,
    },
    { mode: 'update' }
  )
  if (!validation.ok) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validation.errors } }, { status: 400 })
  }

  const { error } = await supabase
    .from('plans')
    .update({
      name: body.name,
      description: body.description,
      metadata: (body.metadata ?? undefined) as Json | undefined,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', planId)

  if (error) {
    console.error('[api/plans/:id] update error', error)
    return NextResponse.json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update plan' } }, { status: 500 })
  }

  const { plan, raw } = await fetchPlanWithRelations(planId)
  
  // Recalculate capabilities for response
  const caps = derivePlanCapabilities(capabilityCtx, planToResource({
    owner_user_id: raw!.owner_user_id,
    owner_tenant_id: raw!.owner_tenant_id,
    visibility: raw!.visibility,
  }))

  return NextResponse.json({ plan, _capabilities: capabilitiesToObject(caps) })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ planId: string }> }
) {
  const params = await context.params
  const planId = normalizeId(params?.planId)
  if (!planId) {
    return NextResponse.json({ error: { code: 'INVALID_ID', message: 'Invalid plan id' } }, { status: 400 })
  }

  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  // Fetch plan first to check capabilities
  const { raw: existingPlan } = await fetchPlanWithRelations(planId)
  if (!existingPlan) {
    return NextResponse.json({ error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found' } }, { status: 404 })
  }

  // Get user context for capability check
  const [profileResult, membershipsResult] = await Promise.all([
    supabase.from('users').select('global_role').eq('id', user.id).single(),
    supabase.from('user_tenant_memberships').select('tenant_id, role').eq('user_id', user.id),
  ])

  const globalRole = deriveEffectiveGlobalRole(profileResult.data, user)
  const memberships = membershipsResult.data ?? []

  const capabilityCtx = buildCapabilityContextFromMemberships({
    userId: user.id,
    globalRole,
    memberships,
  })

  const planResource = planToResource({
    owner_user_id: existingPlan.owner_user_id,
    owner_tenant_id: existingPlan.owner_tenant_id,
    visibility: existingPlan.visibility,
  })

  // Check delete capability
  const deleteCheck = requireCapability(capabilityCtx, planResource, 'planner.plan.delete')
  if (!deleteCheck.allowed) {
    return NextResponse.json(
      { error: { code: deleteCheck.code, message: deleteCheck.message } },
      { status: 403 }
    )
  }

  // Soft delete: update to archived status (we'll add status field in migration)
  // For now, perform actual delete since status field doesn't exist yet
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId)

  if (error) {
    console.error('[api/plans/:id] delete error', error)
    return NextResponse.json({ error: { code: 'DELETE_FAILED', message: 'Failed to delete plan' } }, { status: 500 })
  }

  return NextResponse.json({ deleted: true, id: planId })
}
