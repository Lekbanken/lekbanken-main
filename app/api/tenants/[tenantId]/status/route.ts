import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ req, auth, params }) => {
    const { tenantId } = params
    await requireTenantRole(['admin', 'owner'], tenantId)

    const supabase = await createServerRlsClient()

    const body = (await req.json().catch(() => ({}))) as { status?: string }
    if (!body.status) {
      return NextResponse.json({ errors: ['status is required'] }, { status: 400 })
    }
    if (!['active', 'suspended', 'trial', 'demo', 'archived'].includes(body.status)) {
      return NextResponse.json({ errors: ['invalid status'] }, { status: 400 })
    }

    // Demo tenants: only system_admin may change status
    const { data: existingTenant } = await supabase.from('tenants').select('type,demo_flag').eq('id', tenantId).maybeSingle()
    if (existingTenant && (existingTenant.type === 'demo' || existingTenant.demo_flag) && auth!.effectiveGlobalRole !== 'system_admin') {
      return NextResponse.json({ error: 'Demo tenants can only be modified by system admins' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('tenants')
      .update({ status: body.status, updated_by: auth!.user!.id, updated_at: new Date().toISOString() })
      .eq('id', tenantId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[api/tenants/:id/status] error', error)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    await logTenantAuditEvent({
      tenantId,
      actorUserId: auth!.user!.id,
      eventType: 'tenant_status_changed',
      payload: { status: body.status },
    })

    return NextResponse.json({ tenant: data })
  },
})
