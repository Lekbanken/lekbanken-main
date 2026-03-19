import { NextResponse } from 'next/server'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
import { logTenantAuditEvent } from '@/lib/services/tenantAudit.server'
import { requireMfaIfEnabled } from '@/lib/utils/mfaGuard'
import type { Database } from '@/types/supabase'

type TenantRole = Database['public']['Enums']['tenant_role_enum']

export const PATCH = apiHandler({
  auth: 'user',
  handler: async ({ req, auth, params }) => {
    const { tenantId, userId } = params

    const mfa = await requireMfaIfEnabled()
    if (!mfa.ok) return NextResponse.json({ error: 'MFA required' }, { status: 403 })

    await requireTenantRole(['admin', 'owner'], tenantId)

    const supabase = await createServerRlsClient()

    const body = (await req.json().catch(() => ({}))) as {
      role?: TenantRole
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
    if (existingTenant && (existingTenant.type === 'demo' || existingTenant.demo_flag) && auth!.effectiveGlobalRole !== 'system_admin') {
      return NextResponse.json({ error: 'Demo tenants can only be modified by system admins' }, { status: 403 })
    }

    // BUG-037: Only include fields that were actually provided in the request body.
    // Previous code defaulted seat_assignment_id to null when not provided,
    // which would clear existing seat assignments unintentionally.
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (body.role !== undefined) updatePayload.role = body.role
    if (body.status !== undefined) updatePayload.status = body.status
    if (body.is_primary !== undefined) updatePayload.is_primary = body.is_primary
    if ('seat_assignment_id' in body) updatePayload.seat_assignment_id = body.seat_assignment_id ?? null

    // BUG-038: Clear existing primary membership before setting a new one.
    // The partial unique index (user_id WHERE is_primary = TRUE) enforces at most one primary.
    // Use service role to clear across tenants (RLS may block cross-tenant writes).
    if (body.is_primary === true) {
      const admin = createServiceRoleClient()
      await admin
        .from('user_tenant_memberships')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true)
    }

    const { data, error } = await supabase
      .from('user_tenant_memberships')
      .update(updatePayload)
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
      actorUserId: auth!.user!.id,
      eventType: 'member_updated',
      payload: { user_id: userId, ...body },
    })

    return NextResponse.json({ membership: data })
  },
})
