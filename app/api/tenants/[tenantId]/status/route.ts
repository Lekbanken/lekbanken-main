import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'

export async function POST(
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

  const body = (await request.json().catch(() => ({}))) as { status?: string }
  if (!body.status) {
    return NextResponse.json({ errors: ['status is required'] }, { status: 400 })
  }
  if (!['active', 'suspended', 'trial', 'demo', 'archived'].includes(body.status)) {
    return NextResponse.json({ errors: ['invalid status'] }, { status: 400 })
  }

  // Demo tenants: only system_admin may change status
  const { data: existingTenant } = await supabase.from('tenants').select('type,demo_flag').eq('id', tenantId).maybeSingle()
  if (existingTenant && (existingTenant.type === 'demo' || existingTenant.demo_flag) && !isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Demo tenants can only be modified by system admins' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('tenants')
    .update({ status: body.status, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
    .select()
    .maybeSingle()

  if (error) {
    console.error('[api/tenants/:id/status] error', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }

  await logTenantAuditEvent({
    tenantId,
    actorUserId: user.id,
    eventType: 'tenant_status_changed',
    payload: { status: body.status },
  })

  return NextResponse.json({ tenant: data })
}
