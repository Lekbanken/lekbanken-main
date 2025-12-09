import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'

export async function GET(
  _request: Request,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(isSystemAdmin(user as any) || (await isTenantAdmin(tenantId, user.id)))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
}
