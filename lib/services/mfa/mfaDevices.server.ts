/**
 * MFA Trusted Devices Service
 *
 * Allows users to trust devices so they don't need to enter MFA codes
 * every time they log in from the same device.
 */

import { createServerRlsClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MFATrustedDevice } from '@/types/mfa'
import { randomBytes, createHash } from 'crypto'
import { logDeviceTrusted, logDeviceRevoked } from './mfaAudit.server'

// ============================================================================
// TYPES
// ============================================================================

export interface TrustDeviceParams {
  device_fingerprint: string
  device_name?: string
  user_agent?: string
  ip_address?: string
  tenant_id?: string
}

export interface TrustDeviceResult {
  device_id: string
  trust_token: string
  expires_at: string
}

export interface VerifyDeviceResult {
  is_trusted: boolean
  device?: MFATrustedDevice
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a secure trust token
 */
function generateTrustToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex')
  const hash = createHash('sha256').update(token).digest('hex')
  return { token, hash }
}

/**
 * Parse browser from user agent string
 */
function parseUserAgentBrowser(ua?: string | null): string {
  if (!ua) return 'Unknown'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
  return 'Unknown'
}

/**
 * Parse OS from user agent string
 */
function parseUserAgentOS(ua?: string | null): string {
  if (!ua) return 'Unknown'
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return 'Unknown'
}

// ============================================================================
// TRUST DEVICE
// ============================================================================

/**
 * Trust a device for MFA bypass
 * 
 * When a user successfully completes MFA verification, they can choose to
 * trust the device. This stores a trust token that can be used to skip
 * MFA on subsequent logins.
 */
export async function trustDevice(
  userId: string,
  params: TrustDeviceParams
): Promise<TrustDeviceResult> {
  const supabase = await createServerRlsClient()
  // Cast since mfa_trusted_devices types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  // Get user's primary tenant if not provided
  let tenantId = params.tenant_id
  if (!tenantId) {
    // First try to get primary tenant
    const { data: primaryMembership } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle()
    
    if (primaryMembership?.tenant_id) {
      tenantId = primaryMembership.tenant_id
    } else {
      // Fall back to any tenant the user is a member of
      const { data: anyMembership } = await supabase
        .from('user_tenant_memberships')
        .select('tenant_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
      tenantId = anyMembership?.tenant_id
    }
  }

  // If still no tenant, use a system-level placeholder for users without tenants
  // This allows system admins or users in onboarding to still trust devices
  if (!tenantId) {
    // Use a constant UUID for "no tenant" devices - allows system admins to trust devices
    tenantId = '00000000-0000-0000-0000-000000000000'
  }

  // Generate trust token
  const { token, hash } = generateTrustToken()

  // Calculate expiry (default 30 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  // Parse user agent for device info
  const browser = parseUserAgentBrowser(params.user_agent)
  const os = parseUserAgentOS(params.user_agent)
  const deviceName = params.device_name || `${browser} on ${os}`

  // Upsert device (update if fingerprint exists)
  const { data, error } = await db
    .from('mfa_trusted_devices')
    .upsert(
      {
        user_id: userId,
        tenant_id: tenantId,
        device_fingerprint: params.device_fingerprint,
        device_name: deviceName,
        user_agent: params.user_agent,
        ip_address: params.ip_address,
        browser,
        os,
        trust_token_hash: hash,
        trusted_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        last_used_at: new Date().toISOString(),
        is_revoked: false,
        revoked_at: null,
        revoked_reason: null,
      },
      {
        onConflict: 'user_id,tenant_id,device_fingerprint',
      }
    )
    .select('id')
    .single()

  if (error) {
    console.error('[MFA Devices] Error trusting device:', error)
    throw new Error('Failed to trust device')
  }

  // Log audit event
  await logDeviceTrusted(userId, tenantId, deviceName)

  return {
    device_id: data.id,
    trust_token: token,
    expires_at: expiresAt.toISOString(),
  }
}

// ============================================================================
// VERIFY DEVICE
// ============================================================================

/**
 * Verify if a device is trusted
 * 
 * Called during login to check if the user can skip MFA verification.
 */
export async function verifyTrustedDevice(
  userId: string,
  trustToken: string,
  deviceFingerprint: string
): Promise<VerifyDeviceResult> {
  const supabase = await createServerRlsClient()
  // Cast since mfa_trusted_devices types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  // Hash the provided token for lookup
  const tokenHash = createHash('sha256').update(trustToken).digest('hex')

  // Look up device
  const { data, error } = await db
    .from('mfa_trusted_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('trust_token_hash', tokenHash)
    .eq('device_fingerprint', deviceFingerprint)
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) {
    return { is_trusted: false }
  }

  // Update last_used_at
  await db
    .from('mfa_trusted_devices')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return {
    is_trusted: true,
    device: data as MFATrustedDevice,
  }
}

// ============================================================================
// LIST DEVICES
// ============================================================================

/**
 * Get all trusted devices for a user
 */
export async function getUserTrustedDevices(
  userId: string
): Promise<MFATrustedDevice[]> {
  const supabase = await createServerRlsClient()
  // Cast since mfa_trusted_devices types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  const { data, error } = await db
    .from('mfa_trusted_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('is_revoked', false)
    .gt('expires_at', new Date().toISOString())
    .order('last_used_at', { ascending: false })

  if (error) {
    console.error('[MFA Devices] Error listing devices:', error)
    return []
  }

  return (data as MFATrustedDevice[]) ?? []
}

/**
 * Get all trusted devices for a tenant (admin view)
 */
export async function getTenantTrustedDevices(
  tenantId: string
): Promise<MFATrustedDevice[]> {
  const supabase = await createServerRlsClient()
  // Cast since mfa_trusted_devices types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  const { data, error } = await db
    .from('mfa_trusted_devices')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_revoked', false)
    .order('trusted_at', { ascending: false })

  if (error) {
    console.error('[MFA Devices] Error listing tenant devices:', error)
    return []
  }

  return (data as MFATrustedDevice[]) ?? []
}

// ============================================================================
// REVOKE DEVICES
// ============================================================================

/**
 * Revoke a specific trusted device
 */
export async function revokeDevice(
  userId: string,
  deviceId: string,
  reason: string = 'user_revoked'
): Promise<boolean> {
  const supabase = await createServerRlsClient()
  // Cast since mfa_trusted_devices types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  // First get the device to check ownership and get tenant_id
  const { data: device, error: fetchError } = await db
    .from('mfa_trusted_devices')
    .select('*')
    .eq('id', deviceId)
    .single()

  if (fetchError || !device) {
    console.error('[MFA Devices] Device not found:', fetchError)
    return false
  }

  // Verify ownership (RLS should handle this, but double-check)
  if (device.user_id !== userId) {
    console.error('[MFA Devices] User does not own device')
    return false
  }

  // Revoke the device
  const { error } = await db
    .from('mfa_trusted_devices')
    .update({
      is_revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
    })
    .eq('id', deviceId)

  if (error) {
    console.error('[MFA Devices] Error revoking device:', error)
    return false
  }

  // Log audit event
  await logDeviceRevoked(userId, device.tenant_id, deviceId, reason)

  return true
}

/**
 * Revoke all trusted devices for a user
 */
export async function revokeAllDevices(
  userId: string,
  reason: string = 'user_revoked_all'
): Promise<boolean> {
  const supabase = await createServerRlsClient()
  // Cast since mfa_trusted_devices types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  const { error } = await db
    .from('mfa_trusted_devices')
    .update({
      is_revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
    })
    .eq('user_id', userId)
    .eq('is_revoked', false)

  if (error) {
    console.error('[MFA Devices] Error revoking all devices:', error)
    return false
  }

  return true
}

/**
 * Admin function: Revoke a device for any user in a tenant
 */
export async function adminRevokeDevice(
  tenantId: string,
  deviceId: string,
  adminUserId: string
): Promise<boolean> {
  const supabase = await createServerRlsClient()
  // Cast since mfa_trusted_devices types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  // Verify the device belongs to the tenant
  const { data: device, error: fetchError } = await db
    .from('mfa_trusted_devices')
    .select('user_id')
    .eq('id', deviceId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !device) {
    console.error('[MFA Devices] Device not found in tenant:', fetchError)
    return false
  }

  // Revoke the device
  const { error } = await db
    .from('mfa_trusted_devices')
    .update({
      is_revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_reason: `Revoked by admin: ${adminUserId}`,
    })
    .eq('id', deviceId)

  if (error) {
    console.error('[MFA Devices] Error admin revoking device:', error)
    return false
  }

  // Log audit event
  await logDeviceRevoked(device.user_id, tenantId, deviceId, `admin_revoked:${adminUserId}`)

  return true
}
