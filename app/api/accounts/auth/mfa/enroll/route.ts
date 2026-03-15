import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logEnrollmentStarted } from '@/lib/services/mfa/mfaAudit.server'
import { apiHandler } from '@/lib/api/route-handler'

export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'auth',
  handler: async ({ auth }) => {
    const supabase = await createServerRlsClient()
    const user = auth!.user!

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error) {
      console.error('[mfa/enroll] enroll error', error)
      return NextResponse.json({ error: 'Failed to start MFA enrollment' }, { status: 500 })
    }

    await logEnrollmentStarted(user.id)

    return NextResponse.json({
      factor_id: data?.id,
      type: data?.type,
      qr_code: data?.totp?.qr_code,
      secret: data?.totp?.secret,
      uri: data?.totp?.uri,
    })
  },
})
