import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
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

    const { data, error } = await supabase
      .from('user_tenant_memberships')
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
      actorUserId: auth!.user!.id,
      eventType: 'member_updated',
      payload: { user_id: userId, ...body },
    })

    return NextResponse.json({ membership: data })
  },
})
