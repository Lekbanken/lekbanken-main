import { createServerRlsClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MFARequiredReason } from '@/types/mfa'

export interface MFAGuardResult {
  ok: boolean
  reason?: 'unauthorized' | 'mfa_required'
  /** Why MFA is required (if not ok) */
  requirementReason?: MFARequiredReason
  /** Whether user has grace period remaining */
  gracePeriodActive?: boolean
  /** Days remaining in grace period */
  daysRemaining?: number
}

/**
 * MFA enforcement helper - Hybrid security model
 *
 * Checks:
 * 1. System admins - ALWAYS require MFA
 * 2. Tenant admins (owner/admin role) - ALWAYS require MFA
 * 3. Regular users - Check tenant policy (if 'all_users' enforcement)
 *
 * Returns { ok: boolean, reason?: string, requirementReason?: string }
 */
export async function requireMfaIfEnabled(): Promise<MFAGuardResult> {
  // Check if MFA enforcement is globally disabled
  const enforceAdmins = process.env.MFA_ENFORCE_ADMINS !== 'false'
  const enforceTenantAdmins = process.env.MFA_ENFORCE_TENANT_ADMINS !== 'false'

  // If both are explicitly disabled, skip all checks
  if (!enforceAdmins && !enforceTenantAdmins) {
    return { ok: true }
  }

  const supabase = await createServerRlsClient()
  const db = supabase as unknown as SupabaseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, reason: 'unauthorized' }
  }

  // Use database function for consistent logic
  const { data: requirementData, error: requirementError } = await db.rpc('user_requires_mfa', {
    target_user_id: user.id,
  })

  if (requirementError) {
    console.error('[MFA Guard] Error checking requirement:', requirementError)
    // Don't block on error - log and allow
    return { ok: true }
  }

  const requirement = requirementData?.[0]

  // If MFA is not required for this user
  if (!requirement?.required) {
    return { ok: true }
  }

  // Check enforcement settings based on reason
  const requirementReason = requirement.reason as MFARequiredReason

  if (requirementReason === 'system_admin' && !enforceAdmins) {
    return { ok: true }
  }

  if (requirementReason === 'tenant_admin' && !enforceTenantAdmins) {
    return { ok: true }
  }

  // MFA is required - check if enrolled
  if (requirement.enrolled) {
    return { ok: true }
  }

  // Check grace period
  if (requirement.grace_period_end) {
    const gracePeriodEnd = new Date(requirement.grace_period_end)
    const now = new Date()

    if (gracePeriodEnd > now) {
      const daysRemaining = Math.ceil(
        (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        ok: true, // Allow during grace period
        gracePeriodActive: true,
        daysRemaining,
        requirementReason,
      }
    }
  }

  // MFA required but not enrolled and no grace period
  return {
    ok: false,
    reason: 'mfa_required',
    requirementReason,
  }
}

/**
 * Check if current user is a privileged admin (system or tenant admin)
 * Returns true if user is system_admin or has owner/admin role in any tenant
 */
export async function isPrivilegedAdmin(): Promise<boolean> {
  const supabase = await createServerRlsClient()
  const db = supabase as unknown as SupabaseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  const { data: roles } = await db.rpc('get_user_admin_roles', {
    target_user_id: user.id,
  })

  const result = roles?.[0]
  return result?.is_system_admin || (result?.tenant_admin_of?.length ?? 0) > 0
}

/**
 * Get detailed MFA status for current user
 */
export async function getMFAEnrollmentStatus(): Promise<{
  enrolled: boolean
  required: boolean
  reason: MFARequiredReason
  enrolledAt: string | null
}> {
  const supabase = await createServerRlsClient()
  const db = supabase as unknown as SupabaseClient
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { enrolled: false, required: false, reason: null, enrolledAt: null }
  }

  // Check requirement
  const { data: requirementData } = await db.rpc('user_requires_mfa', {
    target_user_id: user.id,
  })

  const requirement = requirementData?.[0]

  // Get enrollment status
  const { data: mfaRow } = await db
    .from('user_mfa')
    .select('enrolled_at')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    enrolled: mfaRow?.enrolled_at !== null,
    required: requirement?.required ?? false,
    reason: (requirement?.reason as MFARequiredReason) ?? null,
    enrolledAt: mfaRow?.enrolled_at ?? null,
  }
}
