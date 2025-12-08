import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'

export async function GET(
  _request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params
  const supabase = await createServerRlsClient()
  const { data: tenant, error } = await supabase.from('tenants').select('*').eq('id', tenantId).maybeSingle()
  if (error) {
    console.error('[api/tenants/:id] get error', error)
    return NextResponse.json({ error: 'Failed to load tenant' }, { status: 500 })
  }
  if (!tenant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ tenant })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(isSystemAdmin(user) || (await isTenantAdmin(tenantId, user.id)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string
    type?: string
    status?: string
    default_language?: string
    default_theme?: string
    demo_flag?: boolean
    metadata?: Record<string, unknown>
  }

  if (body.type && !['school', 'sports', 'workplace', 'private', 'demo'].includes(body.type)) {
    return NextResponse.json({ errors: ['invalid type'] }, { status: 400 })
  }
  if (body.status && !['active', 'suspended', 'trial', 'demo', 'archived'].includes(body.status)) {
    return NextResponse.json({ errors: ['invalid status'] }, { status: 400 })
  }

  // If demo tenant, only system_admin can mutate
  const { data: existingTenant } = await supabase.from('tenants').select('type,demo_flag').eq('id', tenantId).maybeSingle()
  if (existingTenant && (existingTenant.type === 'demo' || existingTenant.demo_flag) && !isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Demo tenants can only be modified by system admins' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('tenants')
    .update({
      name: body.name,
      type: body.type,
      status: body.status,
      default_language: body.default_language,
      default_theme: body.default_theme,
      demo_flag: body.demo_flag,
      metadata: body.metadata,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId)
    .select()
    .maybeSingle()

  if (error) {
    console.error('[api/tenants/:id] patch error', error)
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 })
  }

  if (data) {
    await logTenantAuditEvent({
      tenantId,
      actorUserId: user.id,
      eventType: 'tenant_updated',
      payload: body,
    })
  }
  return NextResponse.json({ tenant: data })
}
