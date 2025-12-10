import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'
import { requireMfaIfEnabled } from '@/lib/utils/mfaGuard'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ tenantId: string; userId: string }> }
) {
  const { tenantId, userId } = await context.params
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mfa = await requireMfaIfEnabled()
  if (!mfa.ok) return NextResponse.json({ error: 'MFA required' }, { status: 403 })

  if (!(isSystemAdmin(user) || (await isTenantAdmin(tenantId, user.id)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    role?: string
    status?: string
    is_primary?: boolean
    seat_assignment_id?: string | null
  }

  const allowedRoles = ['owner', 'admin', 'editor', 'member']
  const expandedRoles = ['owner','admin','editor','member','organisation_admin','organisation_user','demo_org_admin','demo_org_user']
  if (body.role && !allowedRoles.includes(body.role)) {
    if (!expandedRoles.includes(body.role)) {
      return NextResponse.json({ errors: ['invalid role'] }, { status: 400 })
    }
  }

  // Demo tenants: only system_admin may mutate
  const { data: existingTenant } = await supabase.from('tenants').select('type,demo_flag').eq('id', tenantId).maybeSingle()
  if (existingTenant && (existingTenant.type === 'demo' || existingTenant.demo_flag) && !isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Demo tenants can only be modified by system admins' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('tenant_memberships')
    .update({
      role: body.role,
      status: body.status,
      is_primary: body.is_primary,
      seat_assignment_id: body.seat_assignment_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .select()
    .maybeSingle()

  if (error) {
    console.error('[api/tenants/:id/members/:userId] update error', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }

  await logTenantAuditEvent({
    tenantId,
    actorUserId: user.id,
    eventType: 'member_updated',
    payload: { user_id: userId, ...body },
  })

  return NextResponse.json({ membership: data })
}
