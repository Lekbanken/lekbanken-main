/**
 * GET /api/accounts/auth/mfa/requirement
 *
 * Check MFA requirement status for the current user
 * Returns whether MFA is required, why, and enrollment status
 */

import { NextResponse } from 'next/server'
import { getMFAStatus } from '@/lib/services/mfa/mfaService.server'
import { apiHandler } from '@/lib/api/route-handler'

export const GET = apiHandler({
  auth: 'user',
  rateLimit: 'api',
  handler: async ({ auth }) => {
    const status = await getMFAStatus(auth!.user!.id)

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
  },
})
