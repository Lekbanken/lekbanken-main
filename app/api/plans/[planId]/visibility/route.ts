import { NextResponse } from 'next/server'
import { createServerRlsClient, getRequestTenantId } from '@/lib/supabase/server'
import { deriveEffectiveGlobalRole } from '@/lib/auth/role'
import { validatePlanPayload } from '@/lib/validation/plans'
import { fetchPlanWithRelations } from '@/lib/services/planner.server'
import type { UserProfile } from '@/types/auth'

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
    visibility?: 'private' | 'tenant' | 'public'
    owner_tenant_id?: string | null
  }

  const { data: profile } = await supabase
    .from('users')
    .select('global_role,role')
    .eq('id', user.id)
    .maybeSingle()
  const effectiveGlobalRole = deriveEffectiveGlobalRole((profile as UserProfile | null) ?? null, user)
  const isSystemAdmin = effectiveGlobalRole === 'system_admin'
  const headerTenant = await getRequestTenantId()

  const { plan } = await fetchPlanWithRelations(planId)
  if (!plan) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const targetVisibility = body.visibility ?? plan.visibility
  const targetTenant = body.owner_tenant_id ?? plan.ownerTenantId ?? headerTenant ?? null

  const validation = validatePlanPayload(
    { name: plan.name, visibility: targetVisibility, owner_tenant_id: targetTenant },
    { mode: 'update', isSystemAdmin }
  )

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  const { error } = await supabase
    .from('plans')
    .update({
      visibility: targetVisibility,
      owner_tenant_id: targetVisibility === 'tenant' ? targetTenant : plan.ownerTenantId ?? null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)

  if (error) {
    console.error('[api/plans/:id/visibility] update error', error)
    return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 })
  }

  const refreshed = await fetchPlanWithRelations(planId)
  return NextResponse.json({ plan: refreshed.plan })
}
