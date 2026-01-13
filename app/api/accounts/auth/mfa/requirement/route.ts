/**
 * GET /api/accounts/auth/mfa/requirement
 *
 * Check MFA requirement status for the current user
 * Returns whether MFA is required, why, and enrollment status
 */

import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { getMFAStatus } from '@/lib/services/mfa/mfaService.server'

export async function GET() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const status = await getMFAStatus(user.id)

    return NextResponse.json({
      is_enabled: status.is_enabled,
      is_required: status.is_required,
      required_reason: status.required_reason,
      enrolled_at: status.enrolled_at,
      last_verified_at: status.last_verified_at,
      recovery_codes_remaining: status.recovery_codes_remaining,
      grace_period_end: status.grace_period_end,
      days_until_required: status.days_until_required,
      factors: status.factors,
      // Helper for frontend
      needs_enrollment: status.is_required && !status.is_enabled,
      can_disable: !status.is_required, // Cannot disable if MFA is required
    })
  } catch (error) {
    console.error('[MFA Requirement] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
