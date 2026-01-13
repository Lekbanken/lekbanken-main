/**
 * MFA Audit Service - Logging all MFA-related events
 *
 * NOTE: Uses type casting because mfa_audit_log table types
 * will be regenerated after migration runs.
 */

import { createServerRlsClient } from '@/lib/supabase/server'
import type { MFAAuditEventType, MFAMethod } from '@/types/mfa'
import type { SupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

interface AuditEventData {
  userId: string
  tenantId?: string | null
  eventType: MFAAuditEventType
  method?: MFAMethod | null
  success?: boolean
  failureReason?: string
  failureCount?: number
  metadata?: Record<string, unknown>
}

/**
 * Get client info from request headers
 */
async function getClientInfo(): Promise<{
  ipAddress: string | null
  userAgent: string | null
  deviceFingerprint: string | null
}> {
  try {
    const headersList = await headers()
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip') ||
      null
    const userAgent = headersList.get('user-agent') || null
    const deviceFingerprint = headersList.get('x-device-fingerprint') || null

    return { ipAddress, userAgent, deviceFingerprint }
  } catch {
    return { ipAddress: null, userAgent: null, deviceFingerprint: null }
  }
}

/**
 * Log an MFA audit event
 */
export async function logMFAAuditEvent(data: AuditEventData): Promise<boolean> {
  const supabase = await createServerRlsClient()
  // Cast to any since mfa_audit_log table types not yet regenerated
  const db = supabase as unknown as SupabaseClient
  const clientInfo = await getClientInfo()

  const { error } = await db.from('mfa_audit_log').insert({
    user_id: data.userId,
    tenant_id: data.tenantId || null,
    event_type: data.eventType,
    method: data.method || null,
    ip_address: clientInfo.ipAddress,
    user_agent: clientInfo.userAgent,
    device_fingerprint: clientInfo.deviceFingerprint,
    success: data.success ?? true,
    failure_reason: data.failureReason || null,
    failure_count: data.failureCount || null,
    metadata: data.metadata || {},
  })

  if (error) {
    console.error('[MFA Audit] Error logging event:', error)
    return false
  }

  return true
}

// ============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON EVENTS
// ============================================================================

/**
 * Log enrollment started
 */
export async function logEnrollmentStarted(
  userId: string,
  tenantId?: string | null
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'enrollment_started',
    method: 'totp',
  })
}

/**
 * Log enrollment completed
 */
export async function logEnrollmentCompleted(
  userId: string,
  tenantId?: string | null,
  method: MFAMethod = 'totp'
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'enrollment_completed',
    method,
  })
}

/**
 * Log enrollment cancelled
 */
export async function logEnrollmentCancelled(
  userId: string,
  tenantId?: string | null
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'enrollment_cancelled',
  })
}

/**
 * Log successful verification
 */
export async function logVerificationSuccess(
  userId: string,
  tenantId?: string | null,
  method: MFAMethod = 'totp'
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'verification_success',
    method,
    success: true,
  })
}

/**
 * Log failed verification
 */
export async function logVerificationFailed(
  userId: string,
  tenantId?: string | null,
  method: MFAMethod = 'totp',
  reason: string = 'invalid_code',
  failureCount?: number
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'verification_failed',
    method,
    success: false,
    failureReason: reason,
    failureCount,
  })
}

/**
 * Log MFA disabled by user
 */
export async function logMFADisabledByUser(
  userId: string,
  tenantId?: string | null
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'disabled_by_user',
  })
}

/**
 * Log MFA disabled by admin
 */
export async function logMFADisabledByAdmin(
  userId: string,
  adminUserId: string,
  tenantId?: string | null
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'disabled_by_admin',
    metadata: { disabled_by: adminUserId },
  })
}

/**
 * Log recovery codes generated
 */
export async function logRecoveryCodesGenerated(
  userId: string,
  count: number = 10,
  tenantId?: string | null
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'recovery_code_generated',
    metadata: { codes_generated: count },
  })
}

/**
 * Log recovery code used
 */
export async function logRecoveryCodeUsed(
  userId: string,
  codesRemaining: number,
  tenantId?: string | null
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'recovery_code_used',
    method: 'recovery_code',
    metadata: { codes_remaining: codesRemaining },
  })
}

/**
 * Log device trusted
 */
export async function logDeviceTrusted(
  userId: string,
  tenantId: string,
  deviceName?: string
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'device_trusted',
    metadata: { device_name: deviceName },
  })
}

/**
 * Log device revoked
 */
export async function logDeviceRevoked(
  userId: string,
  tenantId: string,
  deviceId: string,
  reason: string = 'user_revoked'
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'device_revoked',
    metadata: { device_id: deviceId, reason },
  })
}

/**
 * Log enforcement triggered (admin enabled MFA requirement)
 */
export async function logEnforcementTriggered(
  userId: string,
  tenantId: string,
  enforcedBy: string
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'enforcement_triggered',
    metadata: { enforced_by: enforcedBy },
  })
}

/**
 * Log grace period warning sent
 */
export async function logGracePeriodWarning(
  userId: string,
  daysRemaining: number,
  tenantId?: string | null
): Promise<boolean> {
  return logMFAAuditEvent({
    userId,
    tenantId,
    eventType: 'grace_period_warning',
    metadata: { days_remaining: daysRemaining },
  })
}

// ============================================================================
// AUDIT LOG QUERIES
// ============================================================================

/**
 * Get recent MFA events for a user
 */
export async function getUserMFAAuditLog(
  userId: string,
  limit: number = 50
): Promise<Array<Record<string, unknown>>> {
  const supabase = await createServerRlsClient()
  // Cast to any since mfa_audit_log table types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  const { data, error } = await db
    .from('mfa_audit_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[MFA Audit] Error fetching user log:', error)
    return []
  }

  return (data as Array<Record<string, unknown>>) ?? []
}

/**
 * Get recent MFA events for a tenant
 */
export async function getTenantMFAAuditLog(
  tenantId: string,
  limit: number = 100
): Promise<Array<Record<string, unknown>>> {
  const supabase = await createServerRlsClient()
  // Cast to any since mfa_audit_log table types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  const { data, error } = await db
    .from('mfa_audit_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[MFA Audit] Error fetching tenant log:', error)
    return []
  }

  return (data as Array<Record<string, unknown>>) ?? []
}

/**
 * Get failed verification attempts for a user (for rate limiting)
 */
export async function getRecentFailedAttempts(
  userId: string,
  windowMinutes: number = 15
): Promise<number> {
  const supabase = await createServerRlsClient()
  // Cast to any since mfa_audit_log table types not yet regenerated
  const db = supabase as unknown as SupabaseClient

  const windowStart = new Date()
  windowStart.setMinutes(windowStart.getMinutes() - windowMinutes)

  const { count, error } = await db
    .from('mfa_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', 'verification_failed')
    .gte('created_at', windowStart.toISOString())

  if (error) {
    console.error('[MFA Audit] Error counting failed attempts:', error)
    return 0
  }

  return count ?? 0
}
