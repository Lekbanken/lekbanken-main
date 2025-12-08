import { createServerRlsClient } from '@/lib/supabase/server'

export async function logTenantAuditEvent(params: {
  tenantId: string
  actorUserId: string
  eventType: string
  payload?: Record<string, unknown>
}) {
  const supabase = await createServerRlsClient()
  const payload = params.payload ?? {}
  await supabase.from('tenant_audit_logs').insert({
    tenant_id: params.tenantId,
    actor_user_id: params.actorUserId,
    event_type: params.eventType,
    payload,
  })
}
