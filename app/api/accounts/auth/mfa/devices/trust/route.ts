import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { trustDevice } from '@/lib/services/mfa/mfaDevices.server'
import { headers } from 'next/headers'

/**
 * POST /api/accounts/auth/mfa/devices/trust
 * 
 * Trust a device after successful MFA verification.
 * The client should call this after completing MFA to enable
 * skipping MFA on future logins from this device.
 */
export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const headersList = await headers()
  const ipAddress =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip')
  const userAgent = headersList.get('user-agent')

  const body = (await request.json().catch(() => ({}))) as {
    device_fingerprint?: string
    device_name?: string
  }

  if (!body.device_fingerprint) {
    return NextResponse.json(
      { error: 'device_fingerprint is required' },
      { status: 400 }
    )
  }

  try {
    const result = await trustDevice(user.id, {
      device_fingerprint: body.device_fingerprint,
      device_name: body.device_name,
      user_agent: userAgent ?? undefined,
      ip_address: ipAddress ?? undefined,
    })

    return NextResponse.json({
      success: true,
      device_id: result.device_id,
      trust_token: result.trust_token,
      expires_at: result.expires_at,
    })
  } catch (error) {
    console.error('[mfa/devices/trust] Error:', error)
    return NextResponse.json(
      { error: 'Failed to trust device' },
      { status: 500 }
    )
  }
}
