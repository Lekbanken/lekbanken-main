import { createServerRlsClient } from '@/lib/supabase/server'

export async function logUserAuditEvent(params: {
  userId: string
  actorUserId: string
  eventType: string
  payload?: Record<string, unknown>
}) {
  const supabase = await createServerRlsClient()
  await (supabase as any).from('user_audit_logs').insert({
    user_id: params.userId,
    actor_user_id: params.actorUserId,
    event_type: params.eventType,
    payload: params.payload ?? {},
  })
}
