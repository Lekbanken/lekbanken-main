import { NextResponse } from 'next/server'
import { z } from 'zod'
import { trustDevice } from '@/lib/services/mfa/mfaDevices.server'
import { cookies, headers } from 'next/headers'
import { apiHandler } from '@/lib/api/route-handler'
import { readTenantIdFromCookies } from '@/lib/utils/tenantCookie'
import { requireCanonicalMfaTenant } from '@/lib/auth/mfa-tenant'

const trustDeviceSchema = z.object({
  device_fingerprint: z.string().min(1),
  device_name: z.string().optional(),
})

export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'auth',
  input: trustDeviceSchema,
  handler: async ({ auth, body }) => {
    const cookieStore = await cookies()
    const rawTenantId = await readTenantIdFromCookies(cookieStore)
    if (!rawTenantId) {
      return NextResponse.json(
        { error: 'No active tenant cookie - cannot trust MFA trusted device' },
        { status: 400 }
      )
    }

    const headersList = await headers()
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip')
    const userAgent = headersList.get('user-agent')
    const tenantId = requireCanonicalMfaTenant(
      rawTenantId,
      'trust'
    )

    const result = await trustDevice(auth!.user!.id, {
      device_fingerprint: body.device_fingerprint,
      device_name: body.device_name,
      user_agent: userAgent ?? undefined,
      ip_address: ipAddress ?? undefined,
      tenant_id: tenantId,
    })

    return NextResponse.json({
      success: true,
      device_id: result.device_id,
      trust_token: result.trust_token,
      expires_at: result.expires_at,
    })
  },
})
