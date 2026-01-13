import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  logRecoveryCodeUsed,
  getRecentFailedAttempts,
  logVerificationFailed,
} from '@/lib/services/mfa/mfaAudit.server'
import { updateLastMFAVerification } from '@/lib/services/mfa/mfaService.server'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_WINDOW_MINUTES = 15

// Type for user_mfa row (until types are regenerated)
interface UserMFARow {
  recovery_codes_hashed: string[] | null
  recovery_codes_count: number | null
  recovery_codes_used: number | null
  tenant_id: string | null
}

/**
 * POST /api/accounts/auth/mfa/recovery-codes/verify
 * 
 * Verify a recovery code during MFA challenge.
 * This allows users who have lost their authenticator app to still log in.
 */
export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { code?: string }

  if (!body.code) {
    return NextResponse.json(
      { error: 'Recovery code is required' },
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

  // Get stored recovery codes
  // Cast to bypass type errors until db types are regenerated
  const db = supabase as unknown as SupabaseClient
  const { data, error: fetchError } = await db
    .from('user_mfa')
    .select('recovery_codes_hashed, recovery_codes_count, recovery_codes_used, tenant_id')
    .eq('user_id', user.id)
    .single()

  const userMfa = data as UserMFARow | null

  if (fetchError || !userMfa?.recovery_codes_hashed) {
    await logVerificationFailed(user.id, null, 'recovery_code', 'No recovery codes found')
    return NextResponse.json(
      { error: 'No recovery codes found. Please contact support.' },
      { status: 400 }
    )
  }

  // Normalize the input code (remove dashes and uppercase)
  const normalizedCode = body.code.replace(/-/g, '').toUpperCase()
  
  // Hash the provided code for comparison
  const codeHash = createHash('sha256').update(normalizedCode).digest('hex')

  // Find matching code
  const hashedCodes = userMfa.recovery_codes_hashed
  const codeIndex = hashedCodes.findIndex((hash) => hash === codeHash)

  if (codeIndex === -1) {
    await logVerificationFailed(
      user.id,
      userMfa.tenant_id,
      'recovery_code',
      'Invalid recovery code',
      failedAttempts + 1
    )
    return NextResponse.json(
      { error: 'Invalid recovery code' },
      { status: 400 }
    )
  }

  // Mark code as used (set to empty string to preserve array indices)
  const updatedCodes = [...hashedCodes]
  updatedCodes[codeIndex] = ''

  const newUsedCount = (userMfa.recovery_codes_used ?? 0) + 1
  const remaining = (userMfa.recovery_codes_count ?? 10) - newUsedCount

  // Update the database
  const { error: updateError } = await supabase
    .from('user_mfa')
    .update({
      recovery_codes_hashed: updatedCodes,
      recovery_codes_used: newUsedCount,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (updateError) {
    console.error('[mfa/recovery-codes/verify] Update error:', updateError)
    return NextResponse.json(
      { error: 'Failed to verify recovery code' },
      { status: 500 }
    )
  }

  // Update last verification time
  await updateLastMFAVerification(user.id)

  // Log successful usage
  await logRecoveryCodeUsed(user.id, remaining, userMfa.tenant_id)

  // Return success with warning if running low on codes
  const response: {
    success: boolean
    codes_remaining: number
    warning?: string
  } = {
    success: true,
    codes_remaining: remaining,
  }

  if (remaining <= 2) {
    response.warning = 'You are running low on recovery codes. Please generate new codes.'
  }

  return NextResponse.json(response)
}
