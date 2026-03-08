import { NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type NotificationPreferenceRow = Database['public']['Tables']['notification_preferences']['Row']
type NotificationPreferenceInsert = Database['public']['Tables']['notification_preferences']['Insert']
type NotificationPreferenceUpdate = Database['public']['Tables']['notification_preferences']['Update']

async function getAuthedUserId() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

function mapRowToSettings(data: NotificationPreferenceRow | null) {
  if (!data) return null

  const digest = (() => {
    const raw = String(data.digest_frequency ?? 'realtime')
    if (raw === 'realtime') return 'real-time'
    return raw
  })()

  return {
    id: data.id,
    user_id: data.user_id,
    email_enabled: data.email_enabled ?? true,
    email_activity: data.email_enabled ?? true,
    email_mentions: data.email_enabled ?? true,
    email_comments: data.email_enabled ?? true,
    email_updates: data.email_enabled ?? true,
    email_marketing: false,
    email_digest: digest,
    push_enabled: data.push_enabled ?? true,
    push_activity: data.push_enabled ?? true,
    push_mentions: data.push_enabled ?? true,
    push_comments: data.push_enabled ?? true,
    sms_enabled: data.sms_enabled ?? false,
    sms_security_alerts: data.sms_enabled ?? false,
    sms_important_updates: data.sms_enabled ?? false,
    inapp_enabled: data.in_app_enabled ?? true,
    inapp_sound: true,
    dnd_enabled: data.quiet_hours_enabled ?? false,
    dnd_start_time: (data.quiet_hours_start as string | null) ?? null,
    dnd_end_time: (data.quiet_hours_end as string | null) ?? null,
    dnd_days: [],
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
  }
}

export async function GET() {
  const userId = await getAuthedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .is('tenant_id', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[accounts/profile/notifications] load error', error)
    return NextResponse.json({ error: 'Failed to load notification settings' }, { status: 500 })
  }

  return NextResponse.json({ settings: mapRowToSettings(data ?? null) })
}

export async function PATCH(request: NextRequest) {
  const userId = await getAuthedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    settings?: Record<string, unknown>
  } | null

  const settings = body?.settings ?? {}
  const dbUpdate: NotificationPreferenceUpdate = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  }

  if (typeof settings.email_enabled === 'boolean') dbUpdate.email_enabled = settings.email_enabled
  if (typeof settings.push_enabled === 'boolean') dbUpdate.push_enabled = settings.push_enabled
  if (typeof settings.sms_enabled === 'boolean') dbUpdate.sms_enabled = settings.sms_enabled
  if (typeof settings.inapp_enabled === 'boolean') dbUpdate.in_app_enabled = settings.inapp_enabled
  if (typeof settings.dnd_enabled === 'boolean') dbUpdate.quiet_hours_enabled = settings.dnd_enabled
  if (settings.dnd_start_time === null || typeof settings.dnd_start_time === 'string') {
    dbUpdate.quiet_hours_start = settings.dnd_start_time
  }
  if (settings.dnd_end_time === null || typeof settings.dnd_end_time === 'string') {
    dbUpdate.quiet_hours_end = settings.dnd_end_time
  }
  if (typeof settings.email_digest === 'string') {
    dbUpdate.digest_frequency =
      settings.email_digest === 'real-time' || settings.email_digest === 'hourly'
        ? 'realtime'
        : settings.email_digest
  }

  const admin = createServiceRoleClient()
  const { data: existingRow, error: existingError } = await admin
    .from('notification_preferences')
    .select('id')
    .eq('user_id', userId)
    .is('tenant_id', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) {
    console.error('[accounts/profile/notifications] resolve row error', existingError)
    return NextResponse.json({ error: 'Failed to resolve notification settings' }, { status: 500 })
  }

  const result = existingRow?.id
    ? await admin
        .from('notification_preferences')
        .update(dbUpdate)
        .eq('id', existingRow.id)
        .select('*')
        .single()
    : await admin
        .from('notification_preferences')
        .insert({
          ...(dbUpdate as NotificationPreferenceInsert),
          tenant_id: null,
        })
        .select('*')
        .single()

  if (result.error) {
    console.error('[accounts/profile/notifications] save error', result.error)
    return NextResponse.json({ error: result.error.message || 'Failed to save notification settings' }, { status: 500 })
  }

  return NextResponse.json({ settings: mapRowToSettings(result.data) })
}