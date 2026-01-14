import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerRlsClient } from '@/lib/supabase/server'
import { logUserAuditEvent } from '@/lib/services/userAudit.server'
import {
  logEnrollmentCompleted,
  logVerificationSuccess,
  logVerificationFailed,
  getRecentFailedAttempts,
} from '@/lib/services/mfa/mfaAudit.server'
import { markMFAEnrolled, updateLastMFAVerification, checkMFARequirement } from '@/lib/services/mfa/mfaService.server'
import { trustDevice } from '@/lib/services/mfa/mfaDevices.server'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_WINDOW_MINUTES = 15

interface VerifyRequestBody {
  factor_id?: string
  code?: string
  is_enrollment?: boolean
  trust_device?: boolean
  device_fingerprint?: string
  device_name?: string
}

export async function POST(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as VerifyRequestBody
  if (!body.factor_id || !body.code) {
    return NextResponse.json({ errors: ['factor_id and code are required'] }, { status: 400 })
  }

  // Rate limiting check
  const failedAttempts = await getRecentFailedAttempts(user.id, LOCKOUT_WINDOW_MINUTES)
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Please try again later.' },
      { status: 429 }
    )
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: body.factor_id,
    code: body.code,
  })

  if (error) {
    console.error('[mfa/verify] verify error', error)
    
    // Log failed attempt
    await logVerificationFailed(user.id, null, 'totp', error.message, failedAttempts + 1)
    
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  // Determine if this is enrollment or regular verification
  const isEnrollment = body.is_enrollment === true

  if (isEnrollment) {
    // Get requirement reason for audit
    const requirement = await checkMFARequirement(user.id)
    await markMFAEnrolled(user.id, requirement.reason)
    await logEnrollmentCompleted(user.id, null, 'totp')
  } else {
    await updateLastMFAVerification(user.id)
    await logVerificationSuccess(user.id, null, 'totp')
  }

  await logUserAuditEvent({
    userId: user.id,
    actorUserId: user.id,
    eventType: isEnrollment ? 'mfa_enrolled' : 'mfa_verified',
    payload: { factor_id: body.factor_id },
  })

  // Handle device trust if requested
  let trustToken: string | undefined
  if (body.trust_device && body.device_fingerprint) {
    try {
      const headersList = await headers()
      const ipAddress =
        headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headersList.get('x-real-ip') ||
        undefined
      const userAgent = headersList.get('user-agent') || undefined

      const result = await trustDevice(user.id, {
        device_fingerprint: body.device_fingerprint,
        device_name: body.device_name,
        user_agent: userAgent,
        ip_address: ipAddress,
      })
      trustToken = result.trust_token
    } catch (trustError) {
      // Log but don't fail the verification if device trust fails
      console.warn('[mfa/verify] Failed to trust device:', trustError)
    }
  }

  return NextResponse.json({ 
    success: true,
    trust_token: trustToken,
  })
}
