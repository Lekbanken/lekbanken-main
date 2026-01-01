import { NextResponse } from 'next/server'
import { createServerRlsClient, getRequestTenantId } from '@/lib/supabase/server'
import { validatePlanPayload } from '@/lib/validation/plans'
import { deriveEffectiveGlobalRole } from '@/lib/auth/role'
import { fetchPlanWithRelations } from '@/lib/services/planner.server'
import { logGamificationEventV1 } from '@/lib/services/gamification-events.server'
import type { Json } from '@/types/supabase'
import type { UserProfile } from '@/types/auth'

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string
    description?: string | null
    visibility?: 'private' | 'tenant' | 'public'
    owner_tenant_id?: string | null
    metadata?: Record<string, unknown>
  }

  const headerTenant = await getRequestTenantId()
  const { data: profile } = await supabase
    .from('users')
    .select('global_role,role')
    .eq('id', user.id)
    .maybeSingle()
  const tenantId = body.owner_tenant_id ?? headerTenant ?? null
  const visibility = body.visibility ?? 'private'
  const effectiveGlobalRole = deriveEffectiveGlobalRole((profile as UserProfile | null) ?? null, user)
  const isSystemAdmin = effectiveGlobalRole === 'system_admin'

  const validation = validatePlanPayload(
    {
      name: body.name,
      visibility,
      owner_tenant_id: tenantId ?? undefined,
    },
    { mode: 'create', isSystemAdmin }
  )
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('plans')
    .insert({
      name: body.name?.trim() || 'Ny plan',
      description: body.description ?? null,
      owner_user_id: user.id,
      owner_tenant_id: tenantId,
      visibility,
      metadata: (body.metadata ?? {}) as Json,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[api/plans] create error', error)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }

  try {
    await logGamificationEventV1({
      tenantId,
      actorUserId: user.id,
      eventType: 'plan_created',
      source: 'planner',
      idempotencyKey: `plan:${data.id}:created`,
      metadata: {
        planId: data.id,
        visibility,
      },
    })
  } catch (e) {
    console.warn('[api/plans] gamification event log failed', e)
  }

  const { plan } = await fetchPlanWithRelations(data.id)

  return NextResponse.json({ plan }, { status: 201 })
}
