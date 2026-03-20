import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { createHash } from 'crypto'
import type { Tables } from '@/types/supabase'
import {
  logRecoveryCodeUsed,
  getRecentFailedAttempts,
  logVerificationFailed,
} from '@/lib/services/mfa/mfaAudit.server'
import { updateLastMFAVerification } from '@/lib/services/mfa/mfaService.server'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_WINDOW_MINUTES = 15

type UserMfaRow = Tables<'user_mfa'>

/**
 * POST /api/accounts/auth/mfa/recovery-codes/verify
 * 
 * Verify a recovery code during MFA challenge.
 * This allows users who have lost their authenticator app to still log in.
 */
export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'auth',
  handler: async ({ auth, req }) => {
    const supabase = await createServerRlsClient()
    const userId = auth!.user!.id

    const body = (await req.json().catch(() => ({}))) as { code?: string }

    if (!body.code) {
      return NextResponse.json(
        { error: 'Recovery code is required' },
        { status: 400 }
      )
    }

    const failedAttempts = await getRecentFailedAttempts(userId, LOCKOUT_WINDOW_MINUTES)
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const { data: userMfa, error: fetchError } = await supabase
      .from('user_mfa')
      .select('recovery_codes_hashed, recovery_codes_count, recovery_codes_used, tenant_id')
      .eq('user_id', userId)
      .single()

    const recoveryCodes = userMfa?.recovery_codes_hashed as UserMfaRow['recovery_codes_hashed']

    if (fetchError || !recoveryCodes) {
      await logVerificationFailed(userId, null, 'recovery_code', 'No recovery codes found')
      return NextResponse.json(
        { error: 'No recovery codes found. Please contact support.' },
        { status: 400 }
      )
    }

    const normalizedCode = body.code.replace(/-/g, '').toUpperCase()
    const codeHash = createHash('sha256').update(normalizedCode).digest('hex')

    const codeIndex = recoveryCodes.findIndex((hash) => hash === codeHash)

    if (codeIndex === -1) {
      await logVerificationFailed(
        userId,
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

    const updatedCodes = [...recoveryCodes]
    updatedCodes[codeIndex] = ''

    const newUsedCount = (userMfa.recovery_codes_used ?? 0) + 1
    const remaining = (userMfa.recovery_codes_count ?? 10) - newUsedCount

    const { error: updateError } = await supabase
      .from('user_mfa')
      .update({
        recovery_codes_hashed: updatedCodes,
        recovery_codes_used: newUsedCount,
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('[mfa/recovery-codes/verify] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to verify recovery code' },
        { status: 500 }
      )
    }

    await updateLastMFAVerification(userId)

    await logRecoveryCodeUsed(userId, remaining, userMfa.tenant_id)

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
  },
})
