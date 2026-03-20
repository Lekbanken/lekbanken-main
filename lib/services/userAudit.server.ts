import { createServerRlsClient } from '@/lib/supabase/server'
import type { Json, TablesInsert } from '@/types/supabase'

export async function logUserAuditEvent(params: {
  userId: string
  actorUserId: string
  eventType: string
  payload?: Record<string, unknown>
}) {
  const supabase = await createServerRlsClient()
  const auditPayload: TablesInsert<'user_audit_logs'> = {
    user_id: params.userId,
    actor_user_id: params.actorUserId,
    event_type: params.eventType,
    payload: (params.payload ?? {}) as Json,
  }

  await supabase.from('user_audit_logs').insert(auditPayload)
}
