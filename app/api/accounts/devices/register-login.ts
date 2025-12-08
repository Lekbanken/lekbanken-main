// Utility to be used from login flows (server-side) to record session + device.
import { createServerRlsClient } from '@/lib/supabase/server'

type Params = {
  userId: string
  supabaseSessionId?: string | null
  deviceFingerprint?: string | null
  userAgent?: string | null
  ip?: string | null
  deviceType?: string | null
}

export async function recordLoginSession(params: Params) {
  const supabase = await createServerRlsClient()
  const now = new Date().toISOString()

  // Upsert device if fingerprint provided
  let deviceId: string | null = null
  if (params.deviceFingerprint) {
    const { data: existing } = await supabase
      .from('user_devices')
      .select('id')
      .eq('user_id', params.userId)
      .eq('device_fingerprint', params.deviceFingerprint)
      .maybeSingle()

    if (existing) {
      deviceId = existing.id
      await supabase
        .from('user_devices')
        .update({
          user_agent: params.userAgent ?? null,
          device_type: params.deviceType ?? null,
          ip_last: params.ip ?? null,
          last_seen_at: now,
        })
        .eq('id', existing.id)
    } else {
      const { data: inserted } = await supabase
        .from('user_devices')
        .insert({
          user_id: params.userId,
          device_fingerprint: params.deviceFingerprint,
          user_agent: params.userAgent ?? null,
          device_type: params.deviceType ?? null,
          ip_last: params.ip ?? null,
          first_seen_at: now,
          last_seen_at: now,
        })
        .select('id')
        .maybeSingle()
      deviceId = inserted?.id ?? null
    }
  }

  // Insert session record
  await supabase.from('user_sessions').insert({
    user_id: params.userId,
    supabase_session_id: params.supabaseSessionId ?? null,
    device_id: deviceId,
    ip: params.ip ?? null,
    user_agent: params.userAgent ?? null,
    last_login_at: now,
    last_seen_at: now,
  })
}
