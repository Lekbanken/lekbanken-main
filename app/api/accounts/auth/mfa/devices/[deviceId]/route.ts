import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { revokeDevice } from '@/lib/services/mfa/mfaDevices.server'

interface RouteParams {
  params: Promise<{ deviceId: string }>
}

/**
 * DELETE /api/accounts/auth/mfa/devices/[deviceId]
 * 
 * Revoke a specific trusted device
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { deviceId } = await params

  if (!deviceId) {
    return NextResponse.json(
      { error: 'Device ID is required' },
      { status: 400 }
    )
  }

  const success = await revokeDevice(user.id, deviceId, 'user_revoked')

  if (!success) {
    return NextResponse.json(
      { error: 'Failed to revoke device. Device may not exist or you may not have permission.' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Device has been revoked',
  })
}
