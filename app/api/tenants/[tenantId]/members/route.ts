import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'
import { requireMfaIfEnabled } from '@/lib/utils/mfaGuard'
import type { Database } from '@/lib/supabase/database.types'

type TenantRole = Database['public']['Enums']['tenant_role_enum']

export async function GET(
  _request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params
  const supabase = await createServerRlsClient()
  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .select('user_id, role, status, is_primary, created_at, updated_at')
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[api/tenants/:id/members] list error', error)
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
  }
  return NextResponse.json({ members: data ?? [] })
}

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

  const mfa = await requireMfaIfEnabled()
  if (!mfa.ok) return NextResponse.json({ error: 'MFA required' }, { status: 403 })

  if (!(isSystemAdmin(user) || (await isTenantAdmin(tenantId, user.id)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    user_id?: string
    role?: TenantRole
    status?: string
    is_primary?: boolean
    seat_assignment_id?: string | null
  }

  if (!body.user_id) {
    return NextResponse.json({ errors: ['user_id is required'] }, { status: 400 })
  }
  const allowedRoles = ['owner', 'admin', 'editor', 'member', 'organisation_admin', 'organisation_user', 'demo_org_admin', 'demo_org_user']
  if (body.role && !allowedRoles.includes(body.role)) {
    return NextResponse.json({ errors: ['invalid role'] }, { status: 400 })
  }

  // Demo tenants: only system_admin may mutate
  const { data: existingTenant } = await supabase.from('tenants').select('type,demo_flag').eq('id', tenantId).maybeSingle()
  if (existingTenant && (existingTenant.type === 'demo' || existingTenant.demo_flag) && !isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Demo tenants can only be modified by system admins' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .insert({
      tenant_id: tenantId,
      user_id: body.user_id,
      role: (body.role ?? 'member') as TenantRole,
      status: body.status ?? 'active',
      is_primary: body.is_primary ?? false,
      seat_assignment_id: body.seat_assignment_id ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[api/tenants/:id/members] insert error', error)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }

  await logTenantAuditEvent({
    tenantId,
    actorUserId: user.id,
    eventType: 'member_added',
    payload: { user_id: body.user_id, role: body.role },
  })

  return NextResponse.json({ membership: data }, { status: 201 })
}
