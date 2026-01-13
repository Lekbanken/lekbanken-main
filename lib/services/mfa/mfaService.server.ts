/**
 * MFA Service - Server-side MFA operations
 *
 * Hybrid Security Model:
 * - All users CAN use MFA (optional)
 * - System admins MUST have MFA (required)
 * - Tenant admins (owner/admin) MUST have MFA (required)
 *
 * NOTE: Uses type casting because new tables (tenant_mfa_policies, mfa_trusted_devices)
 * and RPC functions will have types regenerated after migration runs.
 */

import { createServerRlsClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revokeAllDevices } from './mfaDevices.server'
import type {
  MFAUserSettings,
  TenantMFAPolicy,
  MFARequirementCheck,
  MFAStatus,
  MFARequiredReason,
} from '@/types/mfa'

// ============================================================================
// USER MFA SETTINGS
// ============================================================================

/**
 * Get user's MFA settings from user_mfa table
 */
export async function getUserMFASettings(userId: string): Promise<MFAUserSettings | null> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('user_mfa')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[MFA] Error getting user settings:', error)
    return null
  }

  return data as MFAUserSettings | null
}

/**
 * Create or update user MFA settings
 */
export async function upsertUserMFASettings(
  userId: string,
  settings: Partial<Omit<MFAUserSettings, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<MFAUserSettings | null> {
  const supabase = await createServerRlsClient()

  // Filter out undefined values and prepare update object
  const updateData: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  }

  // Only add defined settings
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      updateData[key] = value
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_mfa')
    .upsert(updateData, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    console.error('[MFA] Error upserting user settings:', error)
    return null
  }

  return data as MFAUserSettings
}

// ============================================================================
// TENANT MFA POLICY
// ============================================================================

/**
 * Get tenant MFA policy
 */
export async function getTenantMFAPolicy(tenantId: string): Promise<TenantMFAPolicy | null> {
  const supabase = await createServerRlsClient()
  // Cast since tenant_mfa_policies types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  const { data, error } = await db
    .from('tenant_mfa_policies')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    console.error('[MFA] Error getting tenant policy:', error)
    return null
  }

  return data as TenantMFAPolicy | null
}

/**
 * Create or update tenant MFA policy
 */
export async function upsertTenantMFAPolicy(
  tenantId: string,
  policy: Partial<Omit<TenantMFAPolicy, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<TenantMFAPolicy | null> {
  const supabase = await createServerRlsClient()
  // Cast since tenant_mfa_policies types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  const { data, error } = await db
    .from('tenant_mfa_policies')
    .upsert(
      {
        tenant_id: tenantId,
        ...policy,
      },
      { onConflict: 'tenant_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[MFA] Error upserting tenant policy:', error)
    return null
  }

  return data as TenantMFAPolicy
}

// ============================================================================
// MFA REQUIREMENT CHECK
// ============================================================================

interface MFARequirementResult {
  required: boolean
  reason: string | null
  grace_period_end: string | null
  enrolled: boolean
}

/**
 * Check if MFA is required for a user
 *
 * Requirements:
 * 1. System admins - always required
 * 2. Tenant admins (owner/admin role) - always required
 * 3. Regular users - required only if tenant policy enforces for all_users
 */
export async function checkMFARequirement(userId: string): Promise<MFARequirementCheck> {
  const supabase = await createServerRlsClient()
  // Cast since RPC function types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  // Use the database function for consistent logic
  const { data, error } = await db.rpc('user_requires_mfa', {
    target_user_id: userId,
  })

  if (error) {
    console.error('[MFA] Error checking requirement:', error)
    // Default to not required on error to avoid blocking users
    return {
      required: false,
      reason: null,
      enforcement_level: null,
      grace_period_active: false,
      days_remaining: null,
      enrolled: false,
    }
  }

  const results = data as MFARequirementResult[] | null
  const result = results?.[0]

  if (!result) {
    return {
      required: false,
      reason: null,
      enforcement_level: null,
      grace_period_active: false,
      days_remaining: null,
      enrolled: false,
    }
  }

  // Calculate grace period status
  const gracePeriodEnd = result.grace_period_end ? new Date(result.grace_period_end) : null
  const now = new Date()
  const gracePeriodActive = gracePeriodEnd ? gracePeriodEnd > now : false
  const daysRemaining = gracePeriodEnd
    ? Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return {
    required: result.required,
    reason: result.reason as MFARequiredReason,
    enforcement_level: result.reason === 'tenant_policy' ? 'all_users' : 'admins_required',
    grace_period_active: gracePeriodActive,
    days_remaining: daysRemaining,
    enrolled: result.enrolled,
  }
}

interface AdminRolesResult {
  is_system_admin: boolean
  tenant_admin_of: string[]
}

/**
 * Get user's admin roles (for determining MFA requirements)
 */
export async function getUserAdminRoles(
  userId: string
): Promise<{ isSystemAdmin: boolean; tenantAdminOf: string[] }> {
  const supabase = await createServerRlsClient()
  // Cast since RPC function types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  const { data, error } = await db.rpc('get_user_admin_roles', {
    target_user_id: userId,
  })

  if (error) {
    console.error('[MFA] Error getting admin roles:', error)
    return { isSystemAdmin: false, tenantAdminOf: [] }
  }

  const results = data as AdminRolesResult[] | null
  const result = results?.[0]

  return {
    isSystemAdmin: result?.is_system_admin ?? false,
    tenantAdminOf: result?.tenant_admin_of ?? [],
  }
}

// ============================================================================
// MFA STATUS
// ============================================================================

/**
 * Get comprehensive MFA status for a user
 */
export async function getMFAStatus(userId: string): Promise<MFAStatus> {
  const supabase = await createServerRlsClient()
  // Cast since mfa_trusted_devices types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  // Get user MFA settings
  const userSettings = await getUserMFASettings(userId)

  // Get requirement check
  const requirement = await checkMFARequirement(userId)

  // Get Supabase MFA factors
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const factors = user?.factors ?? []

  // Count trusted devices
  const { count: trustedDevicesCount } = await db
    .from('mfa_trusted_devices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())

  // Calculate recovery codes remaining
  const recoveryCodes = userSettings?.recovery_codes_count ?? 10
  const recoveryUsed = userSettings?.recovery_codes_used ?? 0

  return {
    is_enabled: userSettings?.enrolled_at !== null,
    is_required: requirement.required,
    required_reason: requirement.reason,
    enrolled_at: userSettings?.enrolled_at ?? null,
    last_verified_at: userSettings?.last_verified_at ?? null,
    recovery_codes_remaining: recoveryCodes - recoveryUsed,
    trusted_devices_count: (trustedDevicesCount as number | null) ?? 0,
    grace_period_end: userSettings?.grace_period_end ?? null,
    days_until_required: requirement.days_remaining,
    factors: {
      totp: factors.some((f) => f.factor_type === 'totp' && f.status === 'verified'),
      sms: factors.some((f) => f.factor_type === 'phone' && f.status === 'verified'),
      webauthn: false, // Not yet implemented
    },
  }
}

// ============================================================================
// GRACE PERIOD
// ============================================================================

/**
 * Set grace period for a user to enable MFA
 */
export async function setMFAGracePeriod(userId: string, days: number): Promise<boolean> {
  const gracePeriodEnd = new Date()
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + days)

  const result = await upsertUserMFASettings(userId, {
    grace_period_end: gracePeriodEnd.toISOString(),
  })

  return result !== null
}

/**
 * Clear grace period (after user enrolls in MFA)
 */
export async function clearMFAGracePeriod(userId: string): Promise<boolean> {
  const result = await upsertUserMFASettings(userId, {
    grace_period_end: null,
  })

  return result !== null
}

// ============================================================================
// ENROLLMENT HELPERS
// ============================================================================

/**
 * Mark user as enrolled in MFA
 */
export async function markMFAEnrolled(
  userId: string,
  reason: MFARequiredReason = null
): Promise<boolean> {
  const result = await upsertUserMFASettings(userId, {
    enrolled_at: new Date().toISOString(),
    enforced_reason: reason,
    grace_period_end: null, // Clear grace period on enrollment
  })

  return result !== null
}

/**
 * Update last MFA verification time
 */
export async function updateLastMFAVerification(userId: string): Promise<boolean> {
  const result = await upsertUserMFASettings(userId, {
    last_verified_at: new Date().toISOString(),
  })

  return result !== null
}

/**
 * Clear MFA enrollment (when user disables MFA)
 */
export async function clearMFAEnrollment(userId: string): Promise<boolean> {
  const supabase = await createServerRlsClient()

  const { error } = await supabase
    .from('user_mfa')
    .update({
      enrolled_at: null,
      last_verified_at: null,
      recovery_codes_hashed: null,
      recovery_codes_generated_at: null,
      recovery_codes_used: 0,
      methods: {},
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[MFA] Error clearing enrollment:', error)
    return false
  }

  // Also revoke all trusted devices
  await revokeAllDevices(userId, 'mfa_disabled')

  return true
}
