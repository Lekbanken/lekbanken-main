import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { getUserTrustedDevices, revokeAllDevices } from '@/lib/services/mfa/mfaDevices.server'

/**
 * GET /api/accounts/auth/mfa/devices
 * 
 * List all trusted devices for the authenticated user
 */
export async function GET() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const devices = await getUserTrustedDevices(user.id)

  return NextResponse.json({
    devices: devices.map((device) => ({
      id: device.id,
      device_name: device.device_name,
      browser: device.browser,
      os: device.os,
      ip_address: device.ip_address,
      trusted_at: device.trusted_at,
      last_used_at: device.last_used_at,
      expires_at: device.expires_at,
    })),
    count: devices.length,
  })
}

/**
 * DELETE /api/accounts/auth/mfa/devices
 * 
 * Revoke all trusted devices for the authenticated user
 */
export async function DELETE() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const success = await revokeAllDevices(user.id, 'user_revoked_all')

  if (!success) {
    return NextResponse.json(
      { error: 'Failed to revoke devices' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'All trusted devices have been revoked',
  })
}
