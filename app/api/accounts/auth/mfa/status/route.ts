import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { getMFAStatus, checkMFARequirement } from '@/lib/services/mfa/mfaService.server'

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

  // Get comprehensive MFA status
  const status = await getMFAStatus(user.id)
  const requirement = await checkMFARequirement(user.id)

  return NextResponse.json({
    // Supabase MFA factors
    factors: factors?.all ?? [],
    totp: factors?.totp ?? null,
    phone: factors?.phone ?? null,
    
    // Enhanced status from our service
    is_enabled: status.is_enabled,
    is_required: status.is_required,
    required_reason: status.required_reason,
    enrolled_at: status.enrolled_at,
    last_verified_at: status.last_verified_at,
    recovery_codes_remaining: status.recovery_codes_remaining,
    trusted_devices_count: status.trusted_devices_count,
    grace_period_end: status.grace_period_end,
    days_until_required: status.days_until_required,
    
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
  })
}
