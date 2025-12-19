import { createServerRlsClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/types/supabase'

export async function logUserAuditEvent(params: {
  userId: string
  actorUserId: string
  eventType: string
  payload?: Record<string, unknown>
}) {
  const supabase = await createServerRlsClient()
  await (supabase as unknown as SupabaseClient).from('user_audit_logs').insert({
    user_id: params.userId,
    actor_user_id: params.actorUserId,
    event_type: params.eventType,
    payload: (params.payload ?? {}) as Json,
  })
}
