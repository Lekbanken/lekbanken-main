import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

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

  return NextResponse.json({
    factorId: data?.id,
    type: data?.type,
    totp: data?.totp, // includes qr_code and secret
  })
}
