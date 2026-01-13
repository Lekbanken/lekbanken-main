import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { getRecentFailedAttempts } from '@/lib/services/mfa/mfaAudit.server'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_WINDOW_MINUTES = 15

/**
 * POST /api/accounts/auth/mfa/challenge
 * 
 * Create an MFA challenge for TOTP verification.
 * This is used during login when a user has MFA enabled.
 */
export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { factor_id?: string }

  if (!body.factor_id) {
    return NextResponse.json(
      { error: 'factor_id is required' },
      { status: 400 }
    )
  }

  // Rate limiting check
  const failedAttempts = await getRecentFailedAttempts(user.id, LOCKOUT_WINDOW_MINUTES)
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Please try again later.' },
      { status: 429 }
    )
  }

  // Create the challenge via Supabase Auth
  const { data, error } = await supabase.auth.mfa.challenge({
    factorId: body.factor_id,
  })

  if (error) {
    console.error('[mfa/challenge] Challenge creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create MFA challenge' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    challenge_id: data.id,
    expires_at: data.expires_at,
  })
}
