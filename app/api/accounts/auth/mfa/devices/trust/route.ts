import { NextResponse } from 'next/server'
import { z } from 'zod'
import { trustDevice } from '@/lib/services/mfa/mfaDevices.server'
import { headers } from 'next/headers'
import { apiHandler } from '@/lib/api/route-handler'

const trustDeviceSchema = z.object({
  device_fingerprint: z.string().min(1),
  device_name: z.string().optional(),
})

export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'auth',
  input: trustDeviceSchema,
  handler: async ({ auth, body }) => {
    const headersList = await headers()
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip')
    const userAgent = headersList.get('user-agent')

    const result = await trustDevice(auth!.user!.id, {
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
  },
})
