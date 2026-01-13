import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logEnrollmentStarted } from '@/lib/services/mfa/mfaAudit.server'

export async function POST() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
  if (error) {
    console.error('[mfa/enroll] enroll error', error)
    return NextResponse.json({ error: 'Failed to start MFA enrollment' }, { status: 500 })
  }

  // Log enrollment started
  await logEnrollmentStarted(user.id)

  // Return in the format expected by the frontend
  return NextResponse.json({
    factor_id: data?.id,
    type: data?.type,
    qr_code: data?.totp?.qr_code,
    secret: data?.totp?.secret,
    uri: data?.totp?.uri,
  })
}
