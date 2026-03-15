import { NextResponse } from 'next/server'
import { revokeDevice } from '@/lib/services/mfa/mfaDevices.server'
import { apiHandler } from '@/lib/api/route-handler'

/**
 * DELETE /api/accounts/auth/mfa/devices/[deviceId]
 * 
 * Revoke a specific trusted device
 */
export const DELETE = apiHandler({
  auth: 'user',
  rateLimit: 'auth',
  handler: async ({ auth, params }) => {
    const user = auth!.user!
    const { deviceId } = params

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
  },
})
