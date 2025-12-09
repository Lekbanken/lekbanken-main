import { NextResponse } from 'next/server'
import { createServerRlsClient, getRequestTenantId } from '@/lib/supabase/server'
import { validatePlanPayload } from '@/lib/validation/plans'
import { fetchPlanWithRelations } from '@/lib/services/planner.server'

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
  const role = (user.app_metadata as { role?: string } | null)?.role ?? null
  const tenantId = body.owner_tenant_id ?? headerTenant ?? null
  const visibility = body.visibility ?? 'private'
  const isSystemAdmin = role === 'system_admin' || role === 'admin'

  const validation = validatePlanPayload(
    { ...body, owner_tenant_id: tenantId, visibility } as any,
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
      metadata: (body.metadata ?? {}) as any,
      created_by: user.id,
      updated_by: user.id,
    } as any)
    .select()
    .single()

  if (error) {
    console.error('[api/plans] create error', error)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }

  const { plan } = await fetchPlanWithRelations(data.id)

  return NextResponse.json({ plan }, { status: 201 })
}
