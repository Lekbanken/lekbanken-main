import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ params }) => {
    const { tenantId } = params
    await requireTenantRole(['admin', 'owner'], tenantId)

    const supabase = await createServerRlsClient()
    const { data, error } = await supabase
      .from('tenant_audit_logs')
      .select('id, event_type, payload, created_at, actor_user_id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('[api/tenants/:id/audit-logs] list error', error)
      return NextResponse.json({ error: 'Failed to load audit logs' }, { status: 500 })
    }

    return NextResponse.json({ logs: data ?? [] })
  },
})
