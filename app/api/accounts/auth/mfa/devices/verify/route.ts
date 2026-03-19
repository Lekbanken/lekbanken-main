import { NextResponse } from 'next/server'
import { verifyTrustedDevice } from '@/lib/services/mfa/mfaDevices.server'
import { headers, cookies } from 'next/headers'
import { apiHandler } from '@/lib/api/route-handler'
import { readTenantIdFromCookies } from '@/lib/utils/tenantCookie'

/**
 * POST /api/accounts/auth/mfa/devices/verify
 * 
 * Verify if a device is trusted and can skip MFA.
 * Called during login to check if MFA challenge can be bypassed.
 */
export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'auth',
  handler: async ({ auth, req }) => {
    const user = auth!.user!

    const headersList = await headers()
    const userAgent = headersList.get('user-agent')

    const body = (await req.json().catch(() => ({}))) as {
      trust_token?: string
      device_fingerprint?: string
    }

    if (!body.trust_token || !body.device_fingerprint) {
      return NextResponse.json(
        { error: 'trust_token and device_fingerprint are required' },
        { status: 400 }
      )
    }

    // Tenant context from HMAC-signed cookie only — never trust client body (MFA-005)
    const cookieStore = await cookies()
    const tenantId = await readTenantIdFromCookies(cookieStore)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No active tenant cookie — cannot verify device trust' },
        { status: 400 }
      )
    }

    const result = await verifyTrustedDevice(
      user.id,
      body.trust_token,
      body.device_fingerprint,
      tenantId
    )

    if (!result.is_trusted) {
      return NextResponse.json({
        is_trusted: false,
        message: 'Device is not trusted or trust has expired',
      })
    }

    return NextResponse.json({
      is_trusted: true,
      device: {
        id: result.device?.id,
        device_name: result.device?.device_name,
        browser: result.device?.browser,
        os: result.device?.os,
        trusted_at: result.device?.trusted_at,
        expires_at: result.device?.expires_at,
      },
      user_agent_match: result.device?.user_agent === userAgent,
    })
  },
})
