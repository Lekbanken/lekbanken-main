/**
 * MFA AAL (Authenticator Assurance Level) Helpers
 * 
 * Lightweight helpers for checking MFA requirements in middleware.
 * These work with the Supabase client available in proxy.ts.
 */

import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Cookie name for trusted device token
export const MFA_TRUST_COOKIE = 'mfa_trust_token'

// How long to trust a device (in seconds)
export const MFA_TRUST_DURATION = 30 * 24 * 60 * 60 // 30 days

export interface MFACheckResult {
  /** Whether MFA verification is satisfied */
  mfaSatisfied: boolean
  /** Whether MFA is required for this user */
  mfaRequired: boolean
  /** Current AAL level */
  currentAAL: 'aal1' | 'aal2' | null
  /** Whether user is enrolled in MFA */
  mfaEnrolled: boolean
  /** Whether device is trusted (can bypass MFA) */
  deviceTrusted: boolean
  /** Reason MFA is required */
  requirementReason?: 'system_admin' | 'tenant_admin' | 'tenant_policy' | null
  /** Grace period info */
  gracePeriod?: {
    active: boolean
    daysRemaining: number
  } | null
}

/**
 * Extract device fingerprint from cookies/headers
 * Simple implementation - consider FingerprintJS for production
 */
export function extractDeviceFingerprint(headers: Headers, _cookies: { get: (name: string) => { value: string } | undefined }): string | null {
  const userAgent = headers.get('user-agent') || ''
  const acceptLang = headers.get('accept-language') || ''
  
  // Simple fingerprint from available data
  const components = [
    userAgent,
    acceptLang,
    headers.get('sec-ch-ua') || '',
    headers.get('sec-ch-ua-platform') || '',
  ]
  
  // Create simple hash
  const str = components.join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * Check if MFA is required and satisfied for a user
 * Lightweight check suitable for middleware
 */
export async function checkMFAStatus(
  supabase: SupabaseClient<Database>,
  user: User,
  options?: {
    trustToken?: string
    deviceFingerprint?: string
    enforceAdmins?: boolean
    enforceTenantAdmins?: boolean
  }
): Promise<MFACheckResult> {
  const enforceAdmins = options?.enforceAdmins ?? true
  const enforceTenantAdmins = options?.enforceTenantAdmins ?? true
  
  // Default result
  const result: MFACheckResult = {
    mfaSatisfied: true,
    mfaRequired: false,
    currentAAL: null,
    mfaEnrolled: false,
    deviceTrusted: false,
    requirementReason: null,
    gracePeriod: null,
  }

  try {
    // 1. Check current AAL level from Supabase Auth
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    result.currentAAL = aalData?.currentLevel as 'aal1' | 'aal2' | null
    
    // 2. Check if user has verified MFA factors
    const { data: factors } = await supabase.auth.mfa.listFactors()
    result.mfaEnrolled = factors?.totp?.some(f => f.status === 'verified') ?? false
    
    // 3. Check if MFA is required for this user via RPC
    // Note: Using type assertion since RPC may not be in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: requirementData, error: reqError } = await (supabase as any).rpc('user_requires_mfa', {
      target_user_id: user.id,
    })
    
    if (reqError) {
      console.error('[MFA AAL] Error checking requirement:', reqError.message)
      // On error, be permissive - log and allow
      return result
    }
    
    const requirement = requirementData?.[0]
    
    if (!requirement?.required) {
      // MFA not required
      return result
    }
    
    // MFA is required
    result.mfaRequired = true
    result.requirementReason = requirement.reason as 'system_admin' | 'tenant_admin' | 'tenant_policy'
    
    // Check enforcement settings
    if (result.requirementReason === 'system_admin' && !enforceAdmins) {
      result.mfaRequired = false
      return result
    }
    
    if (result.requirementReason === 'tenant_admin' && !enforceTenantAdmins) {
      result.mfaRequired = false
      return result
    }
    
    // Check if user is enrolled
    if (requirement.enrolled && result.currentAAL === 'aal2') {
      // Enrolled and verified at AAL2
      result.mfaSatisfied = true
      return result
    }
    
    // Check grace period
    if (requirement.grace_period_end) {
      const gracePeriodEnd = new Date(requirement.grace_period_end)
      const now = new Date()
      
      if (gracePeriodEnd > now) {
        const daysRemaining = Math.ceil(
          (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        result.gracePeriod = { active: true, daysRemaining }
        result.mfaSatisfied = true
        return result
      }
    }
    
    // Check trusted device if token provided
    if (options?.trustToken && options?.deviceFingerprint && result.mfaEnrolled) {
      const isTrusted = await checkTrustedDevice(
        supabase,
        user.id,
        options.trustToken,
        options.deviceFingerprint
      )
      if (isTrusted) {
        result.deviceTrusted = true
        result.mfaSatisfied = true
        return result
      }
    }
    
    // MFA required but not satisfied
    if (result.mfaEnrolled && result.currentAAL !== 'aal2') {
      // User enrolled but hasn't verified this session
      result.mfaSatisfied = false
      return result
    }
    
    if (!result.mfaEnrolled) {
      // User not enrolled and no grace period
      result.mfaSatisfied = false
      return result
    }
    
    return result
  } catch (error) {
    console.error('[MFA AAL] Unexpected error:', error)
    // Be permissive on errors
    return result
  }
}

/**
 * Check if a device is trusted for MFA bypass
 */
async function checkTrustedDevice(
  supabase: SupabaseClient<Database>,
  userId: string,
  trustToken: string,
  deviceFingerprint: string
): Promise<boolean> {
  try {
    // Hash the token for comparison
    const tokenHash = await hashToken(trustToken)
    
    // Check if device is trusted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('mfa_trusted_devices')
      .select('id, expires_at')
      .eq('user_id', userId)
      .eq('trust_token_hash', tokenHash)
      .eq('device_fingerprint', deviceFingerprint)
      .eq('is_revoked', false)
      .single()
    
    if (error || !data) {
      return false
    }
    
    // Check if not expired
    const expiresAt = new Date(data.expires_at)
    if (expiresAt <= new Date()) {
      return false
    }
    
    // Update last_used_at (fire and forget)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('mfa_trusted_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {})
      .catch(() => {})
    
    return true
  } catch {
    return false
  }
}

/**
 * Simple token hashing for comparison
 * Uses Web Crypto API available in Edge runtime
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Build the MFA challenge redirect URL
 */
export function buildMFAChallengeUrl(
  currentUrl: URL,
  options?: { includeRedirect?: boolean }
): string {
  const challengeUrl = new URL('/auth/mfa-challenge', currentUrl.origin)
  
  if (options?.includeRedirect !== false) {
    const redirectPath = currentUrl.pathname + currentUrl.search
    if (redirectPath && redirectPath !== '/') {
      challengeUrl.searchParams.set('redirect', redirectPath)
    }
  }
  
  return challengeUrl.toString()
}

/**
 * Build the MFA enrollment redirect URL
 */
export function buildMFAEnrollUrl(
  currentUrl: URL,
  options?: { includeRedirect?: boolean }
): string {
  const enrollUrl = new URL('/app/profile/security', currentUrl.origin)
  
  if (options?.includeRedirect !== false) {
    const redirectPath = currentUrl.pathname + currentUrl.search
    if (redirectPath && redirectPath !== '/') {
      enrollUrl.searchParams.set('redirect', redirectPath)
    }
  }
  
  // Add query param to trigger enrollment modal
  enrollUrl.searchParams.set('enroll', 'true')
  
  return enrollUrl.toString()
}
