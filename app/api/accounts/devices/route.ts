import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')
  return realIp ?? null
}

export async function GET() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_devices')
    .select('*')
    .eq('user_id', user.id)
    .order('last_seen_at', { ascending: false })

  if (error) {
    console.error('[accounts/devices] list error', error)
    return NextResponse.json({ error: 'Failed to load devices' }, { status: 500 })
  }

  return NextResponse.json({ devices: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    device_fingerprint?: string | null
    user_agent?: string | null
    device_type?: string | null
  }

  const fingerprint = body.device_fingerprint ?? null
  const ip = getClientIp(request)
  const now = new Date().toISOString()

  let deviceId: string | null = null

  if (fingerprint) {
    const { data: existing, error: selectErr } = await supabase
      .from('user_devices')
      .select('id')
      .eq('user_id', user.id)
      .eq('device_fingerprint', fingerprint)
      .maybeSingle()

    if (selectErr) {
      console.error('[accounts/devices] select error', selectErr)
      return NextResponse.json({ error: 'Failed to register device' }, { status: 500 })
    }

    if (existing) {
      deviceId = existing.id
      const { error: updateErr } = await supabase
        .from('user_devices')
        .update({
          user_agent: body.user_agent ?? null,
          device_type: body.device_type ?? null,
          ip_last: ip,
          last_seen_at: now,
        })
        .eq('id', existing.id!)
      if (updateErr) {
        console.error('[accounts/devices] update error', updateErr)
        return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
      }
    }
  }

  if (!deviceId) {
    const { data, error } = await supabase
      .from('user_devices')
      .insert({
        user_id: user.id,
        device_fingerprint: fingerprint,
        user_agent: body.user_agent ?? null,
        device_type: body.device_type ?? null,
        ip_last: ip,
        first_seen_at: now,
        last_seen_at: now,
      })
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[accounts/devices] insert error', error)
      return NextResponse.json({ error: 'Failed to register device' }, { status: 500 })
    }
    deviceId = data?.id ?? null
  }

  return NextResponse.json({ success: true, device_id: deviceId })
}
