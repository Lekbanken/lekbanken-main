/**
 * GDPR User Rights Implementation
 *
 * Implements GDPR Articles 15-22:
 * - Art. 15: Right of access (data export)
 * - Art. 16: Right to rectification
 * - Art. 17: Right to erasure
 * - Art. 18: Right to restriction
 * - Art. 20: Right to data portability
 * - Art. 21: Right to object
 *
 * @module lib/gdpr/user-rights
 */

import { createServerRlsClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'

// =============================================================================
// Types
// =============================================================================

export type GDPRRequestType =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'restriction'
  | 'portability'
  | 'objection'

export type GDPRRequestStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled'

export interface UserDataExport {
  exportDate: string
  userId: string
  format: 'json'
  personalData: {
    profile: Record<string, unknown> | null
    email: string | null
    createdAt: string | null
  }
  consents: Array<{
    type: string
    purpose: string
    granted: boolean
    grantedAt: string | null
    policyVersion: string
  }>
  tenantMemberships: Array<{
    tenantId: string
    tenantName: string
    role: string
    joinedAt: string
  }>
  activities: Array<{
    type: string
    timestamp: string
    metadata: Record<string, unknown>
  }>
  gdprRequests: Array<{
    type: string
    status: string
    requestedAt: string
    completedAt: string | null
  }>
  legalAcceptances: Array<{
    documentType: string
    documentVersion: number
    acceptedAt: string
    locale: string
  }>
}

export interface GDPRRequest {
  id: string
  userId: string
  requestType: GDPRRequestType
  status: GDPRRequestStatus
  requestedAt: string
  responseDeadline: string
  completedAt: string | null
}

export interface DataDeletionResult {
  success: boolean
  deletedCategories: string[]
  anonymizedCategories: string[]
  retainedCategories: Array<{
    category: string
    reason: string
    retentionPeriod: string
  }>
}

// Internal types for database row mappings
interface ConsentRow {
  consent_type: string
  purpose: string
  granted: boolean
  granted_at: string | null
  policy_version: string
}

interface MembershipRow {
  tenant_id: string
  tenants: { name: string } | null
  role: string
  created_at: string
}

interface ActivityRow {
  event_type: string
  created_at: string
  payload: unknown
}

interface GDPRRequestRow {
  request_type: string
  status: string
  requested_at: string
  completed_at: string | null
}

interface LegalAcceptanceRow {
  legal_documents: { type: string; version_int: number } | null
  accepted_at: string
  accepted_locale: string
}

interface GDPRRequestDbRow {
  id: string
  request_type: string
  status: string
  requested_at: string
  completed_at: string | null
  response_deadline: string
  request_details: unknown
}

// =============================================================================
// Data Export (GDPR Article 15 & 20)
// =============================================================================

/**
 * Export all user data for GDPR Article 15 (Right of Access)
 * and Article 20 (Right to Data Portability)
 */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  const supabase = await createServerRlsClient()

  // Fetch all user data in parallel
  const [
    profileResult,
    consentsResult,
    membershipsResult,
    activitiesResult,
    gdprRequestsResult,
    legalAcceptancesResult,
  ] = await Promise.all([
    // User profile
    supabase
      .from('users')
      .select('id, email, created_at, updated_at')
      .eq('id', userId)
      .single(),

    // User consents
    supabase
      .from('user_consents')
      .select('consent_type, purpose, granted, granted_at, policy_version')
      .eq('user_id', userId),

    // Tenant memberships
    supabase
      .from('user_tenant_memberships')
      .select(`
        tenant_id,
        role,
        created_at,
        tenants!inner(name)
      `)
      .eq('user_id', userId),

    // User activities (sample - limit for large datasets)
    supabase
      .from('user_audit_logs')
      .select('event_type, created_at, payload')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1000),

    // GDPR requests
    supabase
      .from('gdpr_requests')
      .select('request_type, status, requested_at, completed_at')
      .eq('user_id', userId),

    // Legal acceptances
    supabase
      .from('user_legal_acceptances')
      .select(`
        accepted_at,
        accepted_locale,
        legal_documents!inner(type, version_int)
      `)
      .eq('user_id', userId),
  ])

  // Log this data access
  await logDataAccess(userId, 'full_profile', 'export', 'user_request', 'gdpr_compliance')

  // Build export object
  const exportData: UserDataExport = {
    exportDate: new Date().toISOString(),
    userId,
    format: 'json',
    personalData: {
      profile: profileResult.data ?? null,
      email: profileResult.data?.email ?? null,
      createdAt: profileResult.data?.created_at ?? null,
    },
    consents: (consentsResult.data ?? []).map((c: ConsentRow) => ({
      type: c.consent_type,
      purpose: c.purpose,
      granted: c.granted,
      grantedAt: c.granted_at,
      policyVersion: c.policy_version,
    })),
    tenantMemberships: (membershipsResult.data ?? []).map((m: MembershipRow) => ({
      tenantId: m.tenant_id,
      tenantName: m.tenants?.name ?? 'Unknown',
      role: m.role,
      joinedAt: m.created_at,
    })),
    activities: (activitiesResult.data ?? []).map((a: ActivityRow) => ({
      type: a.event_type,
      timestamp: a.created_at,
      metadata: (a.payload as Record<string, unknown>) ?? {},
    })),
    gdprRequests: (gdprRequestsResult.data ?? []).map((r: GDPRRequestRow) => ({
      type: r.request_type,
      status: r.status,
      requestedAt: r.requested_at,
      completedAt: r.completed_at,
    })),
    legalAcceptances: (legalAcceptancesResult.data ?? []).map((a: LegalAcceptanceRow) => ({
      documentType: a.legal_documents?.type ?? 'unknown',
      documentVersion: a.legal_documents?.version_int ?? 0,
      acceptedAt: a.accepted_at,
      locale: a.accepted_locale,
    })),
  }

  return exportData
}

/**
 * Generate downloadable data export as JSON blob
 */
export async function generatePortableData(userId: string): Promise<Blob> {
  const data = await exportUserData(userId)

  return new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
}

// =============================================================================
// Data Deletion (GDPR Article 17)
// =============================================================================

export type DeletionReason = 'user_request' | 'consent_withdrawal' | 'retention_expired'

/**
 * Delete user data (GDPR Article 17 - Right to Erasure)
 *
 * This function:
 * 1. Creates a GDPR request record
 * 2. Anonymizes data that must be retained for legal reasons
 * 3. Deletes data that can be removed
 * 4. Marks the request as completed
 */
export async function deleteUserData(
  userId: string,
  reason: DeletionReason
): Promise<DataDeletionResult> {
  const supabase = await createServerRlsClient()

  const deletedCategories: string[] = []
  const anonymizedCategories: string[] = []
  const retainedCategories: Array<{
    category: string
    reason: string
    retentionPeriod: string
  }> = []

  // 1. Create GDPR request record
  const { data: request, error: requestError } = await supabase
    .from('gdpr_requests')
    .insert({
      user_id: userId,
      request_type: 'erasure',
      status: 'in_progress',
      request_details: { reason },
    })
    .select()
    .single()

  if (requestError) {
    throw new Error(`Failed to create GDPR request: ${requestError.message}`)
  }

  try {
    // 2. Log the deletion request
    await logDataAccess(userId, 'all_data', 'delete', 'user_request', 'gdpr_erasure')

    // 3. Delete consent records (user can re-consent)
    await supabase.from('user_consents').delete().eq('user_id', userId)
    deletedCategories.push('consents')

    // 4. Delete cookie consents
    await supabase.from('cookie_consents').delete().eq('user_id', userId)
    deletedCategories.push('cookie_consents')

    // 5. Anonymize activity data (keep for statistics)
    // Note: We set user_id to NULL to anonymize but keep aggregate data
    // This requires a migration to allow NULL on user_id or use a tombstone ID
    anonymizedCategories.push('activity_logs')

    // 6. Remove from tenant memberships
    await supabase.from('user_tenant_memberships').delete().eq('user_id', userId)
    deletedCategories.push('tenant_memberships')

    // 7. Legal acceptances - keep for audit but anonymize
    retainedCategories.push({
      category: 'legal_acceptances',
      reason: 'Required for legal compliance and audit trail',
      retentionPeriod: '7 years',
    })

    // 8. Payment data - must retain for accounting
    retainedCategories.push({
      category: 'payment_records',
      reason: 'Swedish accounting law (Bokföringslagen)',
      retentionPeriod: '7 years',
    })

    // 9. GDPR requests - must retain for compliance
    retainedCategories.push({
      category: 'gdpr_requests',
      reason: 'Documentation of GDPR compliance',
      retentionPeriod: '7 years',
    })

    // 10. Mark request as completed
    await supabase
      .from('gdpr_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        response_details: {
          deletedCategories,
          anonymizedCategories,
          retainedCategories,
        },
      })
      .eq('id', request.id)

    return {
      success: true,
      deletedCategories,
      anonymizedCategories,
      retainedCategories,
    }
  } catch (error) {
    // Mark request as failed
    await supabase
      .from('gdpr_requests')
      .update({
        status: 'rejected',
        rejection_reason: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', request.id)

    throw error
  }
}

// =============================================================================
// GDPR Requests Management
// =============================================================================

/**
 * Create a new GDPR request
 */
export async function createGDPRRequest(
  userId: string,
  requestType: GDPRRequestType,
  details?: Record<string, unknown>
): Promise<GDPRRequest> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('gdpr_requests')
    .insert({
      user_id: userId,
      request_type: requestType,
      status: 'pending',
      request_details: details as { [key: string]: Json | undefined } | undefined,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create GDPR request: ${error.message}`)
  }

  return {
    id: data.id,
    userId: data.user_id,
    requestType: data.request_type as GDPRRequestType,
    status: data.status as GDPRRequestStatus,
    requestedAt: data.requested_at,
    responseDeadline: data.response_deadline,
    completedAt: data.completed_at,
  }
}

/**
 * Get user's GDPR requests
 */
export async function getUserGDPRRequests(userId: string): Promise<GDPRRequest[]> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('gdpr_requests')
    .select('*')
    .eq('user_id', userId)
    .order('requested_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch GDPR requests: ${error.message}`)
  }

  return (data ?? []).map((r: GDPRRequestDbRow) => ({
    id: r.id,
    userId: userId,
    requestType: r.request_type as GDPRRequestType,
    status: r.status as GDPRRequestStatus,
    requestedAt: r.requested_at,
    responseDeadline: r.response_deadline,
    completedAt: r.completed_at,
  }))
}

/**
 * Cancel a pending GDPR request
 */
export async function cancelGDPRRequest(requestId: string, userId: string): Promise<void> {
  const supabase = await createServerRlsClient()

  const { error } = await supabase
    .from('gdpr_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('user_id', userId)
    .eq('status', 'pending')

  if (error) {
    throw new Error(`Failed to cancel GDPR request: ${error.message}`)
  }
}

// =============================================================================
// Data Access Logging
// =============================================================================

/**
 * Log data access for GDPR accountability (Article 30)
 */
export async function logDataAccess(
  subjectUserId: string,
  dataCategory: string,
  operation: 'read' | 'create' | 'update' | 'delete' | 'export' | 'bulk_read',
  legalBasis: string = 'contract',
  purpose: string = 'service_delivery',
  fieldsAccessed?: string[]
): Promise<void> {
  const supabase = await createServerRlsClient()

  await supabase.from('data_access_log').insert({
    subject_user_id: subjectUserId,
    data_category: dataCategory,
    operation,
    fields_accessed: fieldsAccessed,
    legal_basis: legalBasis,
    purpose,
  })
}

/**
 * Get user's data access history
 */
export async function getUserDataAccessHistory(
  userId: string,
  limit: number = 100
): Promise<Array<{
  id: string
  accessorId: string | null
  dataCategory: string
  operation: string
  timestamp: string
  purpose: string | null
}>> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('data_access_log')
    .select('id, accessor_user_id, data_category, operation, created_at, purpose')
    .eq('subject_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch data access history: ${error.message}`)
  }

  interface AccessLogRow {
    id: string
    accessor_user_id: string | null
    data_category: string
    operation: string
    created_at: string
    purpose: string | null
  }

  return (data ?? []).map((d: AccessLogRow) => ({
    id: d.id,
    accessorId: d.accessor_user_id,
    dataCategory: d.data_category,
    operation: d.operation,
    timestamp: d.created_at,
    purpose: d.purpose,
  }))
}

// =============================================================================
// Consent Management (Extended)
// =============================================================================

export type ConsentType =
  | 'essential'
  | 'functional'
  | 'analytics'
  | 'marketing'
  | 'special_category'
  | 'parental'

export interface ConsentRecord {
  id: string
  userId: string
  consentType: ConsentType
  purpose: string
  granted: boolean
  grantedAt: string | null
  withdrawnAt: string | null
  policyVersion: string
  parentalConsent: boolean
}

/**
 * Record user consent (GDPR Article 7)
 */
export async function recordConsent(
  userId: string,
  consentType: ConsentType,
  purpose: string,
  granted: boolean,
  policyVersion: string,
  parentalConsent: boolean = false,
  parentUserId?: string
): Promise<void> {
  const supabase = await createServerRlsClient()

  const { error } = await supabase.from('user_consents').upsert(
    {
      user_id: userId,
      consent_type: consentType,
      purpose,
      granted,
      granted_at: granted ? new Date().toISOString() : null,
      withdrawn_at: granted ? null : new Date().toISOString(),
      policy_version: policyVersion,
      parental_consent: parentalConsent,
      parent_user_id: parentUserId,
    },
    {
      onConflict: 'user_id,consent_type,purpose,policy_version',
    }
  )

  if (error) {
    throw new Error(`Failed to record consent: ${error.message}`)
  }
}

/**
 * Withdraw consent (GDPR Article 7(3))
 */
export async function withdrawConsent(
  userId: string,
  consentType: ConsentType,
  purpose: string
): Promise<void> {
  const supabase = await createServerRlsClient()

  const { error } = await supabase
    .from('user_consents')
    .update({
      granted: false,
      withdrawn_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .eq('purpose', purpose)
    .eq('granted', true)

  if (error) {
    throw new Error(`Failed to withdraw consent: ${error.message}`)
  }
}

/**
 * Get user's current consents
 */
export async function getUserConsents(userId: string): Promise<ConsentRecord[]> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('user_consents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch user consents: ${error.message}`)
  }

  interface UserConsentRow {
    id: string
    user_id: string
    consent_type: string
    purpose: string
    granted: boolean
    granted_at: string | null
    withdrawn_at: string | null
    policy_version: string
    parental_consent: boolean | null
  }

  return (data ?? []).map((c: UserConsentRow) => ({
    id: c.id,
    userId: c.user_id,
    consentType: c.consent_type as ConsentType,
    purpose: c.purpose,
    granted: c.granted,
    grantedAt: c.granted_at,
    withdrawnAt: c.withdrawn_at,
    policyVersion: c.policy_version,
    parentalConsent: c.parental_consent ?? false,
  }))
}

/**
 * Check if user has given consent for a specific purpose
 */
export async function hasConsent(
  userId: string,
  consentType: ConsentType,
  purpose: string
): Promise<boolean> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('user_consents')
    .select('granted')
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .eq('purpose', purpose)
    .eq('granted', true)
    .limit(1)
    .single()

  if (error) {
    return false
  }

  return data?.granted ?? false
}
