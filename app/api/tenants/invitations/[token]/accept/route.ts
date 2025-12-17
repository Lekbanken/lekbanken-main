import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'
import { isSystemAdmin } from '@/lib/utils/tenantAuth'
import type { Database } from '@/lib/supabase/database.types'

type TenantRole = Database['public']['Enums']['tenant_role_enum']

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: invite, error } = await supabase
    .from('tenant_invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (error || !invite) {
    console.error('[api/tenants/invitations/:token/accept] load error', error)
    return NextResponse.json({ error: 'Invalid invite' }, { status: 400 })
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Invite already used or revoked' }, { status: 400 })
  }

  // Demo tenants: block accept unless system_admin
  const { data: tenantRow } = await supabase.from('tenants').select('type,demo_flag').eq('id', invite.tenant_id).maybeSingle()
  if (tenantRow && (tenantRow.type === 'demo' || tenantRow.demo_flag) && !isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Demo tenants cannot accept invites' }, { status: 403 })
  }

  const now = new Date()
  if (invite.expires_at && new Date(invite.expires_at) < now) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 400 })
  }

  const { error: memberError } = await supabase.from('user_tenant_memberships').upsert(
    {
      tenant_id: invite.tenant_id,
      user_id: user.id,
      role: invite.role as TenantRole,
      status: 'active',
    },
    { onConflict: 'tenant_id,user_id' }
  )

  if (memberError) {
    console.error('[api/tenants/invitations/:token/accept] membership error', memberError)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }

  await supabase
    .from('tenant_invitations')
    .update({ status: 'accepted', accepted_at: now.toISOString() })
    .eq('token', token)

  await logTenantAuditEvent({
    tenantId: invite.tenant_id,
    actorUserId: user.id,
    eventType: 'invitation_accepted',
    payload: { token },
  })

  return NextResponse.json({ ok: true })
}
