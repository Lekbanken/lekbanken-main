import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { checkMFARequirement } from '@/lib/services/mfa/mfaService.server'

export async function GET() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: factors, error } = await supabase.auth.mfa.listFactors()
  if (error) {
    console.error('[mfa/status] listFactors error', error)
    return NextResponse.json({ error: 'Failed to load MFA status' }, { status: 500 })
  }

  // Fetch our extended MFA settings (optional; may not exist yet for all users)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userMfa, error: userMfaError } = await (supabase as any)
    .from('user_mfa')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (userMfaError) {
    console.error('[mfa/status] user_mfa error', userMfaError)
    // Non-fatal: still return factors + basic status
  }

  // Requirement check (admin/tenant policy etc)
  const requirement = await checkMFARequirement(user.id)

  // Count trusted devices (head count)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: trustedDevicesCount, error: trustedDevicesError } = await (supabase as any)
    .from('mfa_trusted_devices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())

  if (trustedDevicesError) {
    console.error('[mfa/status] trusted devices count error', trustedDevicesError)
  }

  // Recovery codes remaining (if user_mfa exists; defaults match DB defaults)
  const recoveryCodes = (userMfa?.recovery_codes_count as number | null) ?? 10
  const recoveryUsed = (userMfa?.recovery_codes_used as number | null) ?? 0
  const recoveryCodesRemaining = Math.max(0, recoveryCodes - recoveryUsed)

  // Determine if MFA is enabled (use BOTH Supabase factors and our settings)
  const hasVerifiedTOTP = factors?.totp?.some((f) => f.status === 'verified') ?? false
  const hasVerifiedPhone = factors?.phone?.some((f) => f.status === 'verified') ?? false
  const isEnabledInSupabase = hasVerifiedTOTP || hasVerifiedPhone
  const isEnabledInSettings = Boolean(userMfa?.enrolled_at)
  const isEnabled = isEnabledInSupabase || isEnabledInSettings

  const enrolledAt = (userMfa?.enrolled_at as string | null) ?? null
  const lastVerifiedAt = (userMfa?.last_verified_at as string | null) ?? null
  const gracePeriodEnd = (userMfa?.grace_period_end as string | null) ?? null

  return NextResponse.json({
    // Supabase MFA factors
    factors: factors?.all ?? [],
    totp: factors?.totp ?? null,
    phone: factors?.phone ?? null,
    
    // Extended status (computed without extra Supabase auth roundtrips)
    is_enabled: isEnabled,
    is_required: requirement.required,
    required_reason: requirement.reason,
    enrolled_at: enrolledAt,
    last_verified_at: lastVerifiedAt,
    recovery_codes_remaining: recoveryCodesRemaining,
    trusted_devices_count: (trustedDevicesCount as number | null) ?? 0,
    grace_period_end: gracePeriodEnd,
    days_until_required: requirement.days_remaining,
    
    // Requirement details
    requirement: {
      required: requirement.required,
      reason: requirement.reason,
      grace_period_active: requirement.grace_period_active,
      days_remaining: requirement.days_remaining,
      enrolled: requirement.enrolled,
    },
    
    // Helper flags for frontend
    needs_enrollment: requirement.required && !requirement.enrolled,
    can_disable: !requirement.required,

    // Optional raw user_mfa row for legacy/diagnostics
    user_mfa: userMfa ?? null,
  })
}
