/**
 * MFA Types for Lekbanken
 *
 * Hybrid security model:
 * - All users CAN enable MFA (optional)
 * - System admins MUST have MFA (required)
 * - Tenant admins (owner/admin role) MUST have MFA (required)
 */

/**
 * MFA Enforcement Level
 * - optional: MFA available but not required
 * - admins_required: Required for system_admin and tenant admin/owner
 * - all_users: Required for everyone
 */
export type MFAEnforcementLevel = 'optional' | 'admins_required' | 'all_users'

/**
 * MFA Method Types
 */
export type MFAMethod = 'totp' | 'recovery_code' | 'sms' | 'webauthn'

/**
 * MFA Audit Event Types
 */
export type MFAAuditEventType =
  | 'enrollment_started'
  | 'enrollment_completed'
  | 'enrollment_cancelled'
  | 'verification_success'
  | 'verification_failed'
  | 'disabled_by_user'
  | 'disabled_by_admin'
  | 'recovery_code_generated'
  | 'recovery_code_used'
  | 'device_trusted'
  | 'device_revoked'
  | 'enforcement_triggered'
  | 'grace_period_warning'

/**
 * Reasons why MFA is required
 */
export type MFARequiredReason =
  | 'system_admin' // User is a system admin
  | 'tenant_admin' // User is tenant owner or admin
  | 'tenant_policy' // Tenant has enforced MFA for all
  | 'user_preference' // User enabled MFA voluntarily
  | null // MFA not required

/**
 * Tenant MFA Policy
 */
export interface TenantMFAPolicy {
  id: string
  tenant_id: string
  is_enforced: boolean
  enforcement_level: MFAEnforcementLevel
  grace_period_days: number
  allow_totp: boolean
  allow_sms: boolean
  allow_webauthn: boolean
  require_backup_email: boolean
  recovery_codes_required: boolean
  allow_trusted_devices: boolean
  trusted_device_duration_days: number
  enforced_at: string | null
  enforced_by: string | null
  created_at: string
  updated_at: string
}

/**
 * MFA User Settings (stored in user_mfa table)
 */
export interface MFAUserSettings {
  user_id: string
  tenant_id: string | null
  enforced_reason: MFARequiredReason
  enrolled_at: string | null
  last_verified_at: string | null
  recovery_codes_hashed: string[] | null
  recovery_codes_count: number
  recovery_codes_used: number
  recovery_codes_generated_at: string | null
  methods: Record<string, unknown>
  backup_email: string | null
  notification_preferences: MFANotificationPreferences
  grace_period_end: string | null
  created_at: string
  updated_at: string
}

/**
 * MFA Notification Preferences
 */
export interface MFANotificationPreferences {
  email_on_new_device?: boolean
  email_on_recovery_use?: boolean
  email_on_mfa_disabled?: boolean
}

/**
 * Trusted Device
 */
export interface MFATrustedDevice {
  id: string
  user_id: string
  tenant_id: string
  device_fingerprint: string
  device_name: string | null
  user_agent: string | null
  ip_address: string | null
  browser: string | null
  os: string | null
  trusted_at: string
  expires_at: string
  last_used_at: string | null
  is_revoked: boolean
  revoked_at: string | null
  revoked_reason: string | null
  created_at: string
}

/**
 * MFA Audit Event
 */
export interface MFAAuditEvent {
  id: string
  user_id: string
  tenant_id: string | null
  event_type: MFAAuditEventType
  method: MFAMethod | null
  ip_address: string | null
  user_agent: string | null
  device_fingerprint: string | null
  success: boolean
  failure_reason: string | null
  failure_count: number | null
  metadata: Record<string, unknown>
  created_at: string
}

/**
 * MFA Status for frontend display
 */
export interface MFAStatus {
  is_enabled: boolean
  is_required: boolean
  required_reason: MFARequiredReason
  enrolled_at: string | null
  last_verified_at: string | null
  recovery_codes_remaining: number
  trusted_devices_count: number
  grace_period_end: string | null
  days_until_required: number | null
  factors: {
    totp: boolean
    sms: boolean
    webauthn: boolean
  }
}

/**
 * MFA Requirement Check Result
 */
export interface MFARequirementCheck {
  required: boolean
  reason: MFARequiredReason
  enforcement_level: MFAEnforcementLevel | null
  grace_period_active: boolean
  days_remaining: number | null
  enrolled: boolean
}

/**
 * MFA Challenge State
 */
export interface MFAChallengeState {
  factor_id: string
  challenge_id: string
  expires_at: string
}

/**
 * Device Trust Request
 */
export interface DeviceTrustRequest {
  device_fingerprint: string
  device_name?: string
  user_agent: string
  ip_address?: string
}

/**
 * MFA Enrollment Data
 */
export interface MFAEnrollmentData {
  factor_id: string
  qr_code: string
  secret: string
  recovery_codes?: string[]
}

/**
 * Admin role check for tenant context
 */
export interface UserRoleContext {
  user_id: string
  is_system_admin: boolean
  tenant_roles: Array<{
    tenant_id: string
    role: 'owner' | 'admin' | 'editor' | 'member' | 'viewer'
  }>
}
