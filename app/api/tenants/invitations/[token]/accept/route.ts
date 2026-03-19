import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'
import { apiHandler } from '@/lib/api/route-handler'
import { AuthError } from '@/lib/api/auth-guard'
import type { Database } from '@/types/supabase'

type TenantRole = Database['public']['Enums']['tenant_role_enum']

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
    const token = params.token
    const supabase = await createServerRlsClient()
    const user = auth!.user!

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
    if (tenantRow && (tenantRow.type === 'demo' || tenantRow.demo_flag) && auth!.effectiveGlobalRole !== 'system_admin') {
      throw new AuthError('Demo tenants cannot accept invites', 403)
    }

    const now = new Date()
    if (invite.expires_at && new Date(invite.expires_at) < now) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 400 })
    }

    // BUG-035 FIX: Verify the authenticated user's email matches the invitation email.
    // Without this check, any authenticated user with the token could accept the invite
    // and gain membership at the invitation's role on the target tenant.
    if (invite.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
      await logTenantAuditEvent({
        tenantId: invite.tenant_id,
        actorUserId: user.id,
        eventType: 'invitation_email_mismatch',
        payload: { expected: invite.email, actual: user.email },
      })
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      )
    }

    // BUG-036: Check for existing membership before upserting.
    // If user already has a membership with a higher role, keep it.
    const ROLE_RANK: Record<string, number> = { owner: 4, admin: 3, editor: 2, member: 1 }
    const inviteRole = invite.role as TenantRole

    const { data: existingMembership } = await supabase
      .from('user_tenant_memberships')
      .select('id, role, status')
      .eq('tenant_id', invite.tenant_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingMembership) {
      // User already a member — only upgrade role, never downgrade
      const existingRank = ROLE_RANK[existingMembership.role] ?? 0
      const inviteRank = ROLE_RANK[inviteRole] ?? 0
      const effectiveRole = inviteRank > existingRank ? inviteRole : existingMembership.role as TenantRole

      const { error: memberError } = await supabase
        .from('user_tenant_memberships')
        .update({ role: effectiveRole, status: 'active' })
        .eq('id', existingMembership.id)

      if (memberError) {
        console.error('[api/tenants/invitations/:token/accept] membership update error', memberError)
        return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
      }
    } else {
      // New membership
      const { error: memberError } = await supabase.from('user_tenant_memberships').insert({
        tenant_id: invite.tenant_id,
        user_id: user.id,
        role: inviteRole,
        status: 'active',
      })

      if (memberError) {
        console.error('[api/tenants/invitations/:token/accept] membership insert error', memberError)
        return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
      }
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
  },
})
