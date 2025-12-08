import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'
import { randomUUID } from 'crypto'

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

  const body = (await request.json().catch(() => ({}))) as {
    email?: string
    role?: string
    expires_at?: string
  }
  if (!body.email) {
    return NextResponse.json({ errors: ['email is required'] }, { status: 400 })
  }
  const emailPattern = /\S+@\S+\.\S+/
  if (!emailPattern.test(body.email)) {
    return NextResponse.json({ errors: ['invalid email'] }, { status: 400 })
  }
  const allowedRoles = ['owner', 'admin', 'editor', 'member']
  if (body.role && !allowedRoles.includes(body.role)) {
    return NextResponse.json({ errors: ['invalid role'] }, { status: 400 })
  }

  // Demo tenants: only system_admin may mutate
  const { data: existingTenant } = await supabase.from('tenants').select('type,demo_flag').eq('id', tenantId).maybeSingle()
  if (existingTenant && (existingTenant.type === 'demo' || existingTenant.demo_flag) && !isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Demo tenants can only be modified by system admins' }, { status: 403 })
  }

  const token = randomUUID()

  const { data, error } = await supabase
    .from('tenant_invitations')
    .insert({
      tenant_id: tenantId,
      email: body.email,
      role: body.role ?? 'member',
      token,
      invited_by: user.id,
      expires_at: body.expires_at ? new Date(body.expires_at).toISOString() : null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[api/tenants/:id/invitations] create error', error)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }

  await logTenantAuditEvent({
    tenantId,
    actorUserId: user.id,
    eventType: 'invitation_created',
    payload: { email: body.email, role: body.role },
  })

  return NextResponse.json({ invitation: data }, { status: 201 })
}
