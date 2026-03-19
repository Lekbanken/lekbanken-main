/**
 * Profile Service Client
 * Client-side service for user profile operations
 * Uses passed Supabase client instead of server-side client
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type {
  User,
  UserProfile,
  UserPreferences,
  NotificationSettings,
  UserSession,
  OrganizationMembership,
  UserConsent,
  ConsentType,
  GDPRRequest,
  GDPRRequestType,
  GDPRRequestStatus,
  ActivityLogEntry,
  CompleteProfile,
  MFAStatus,
  MFAFactor,
} from './types';

// =============================================================================
// CLIENT PROFILE SERVICE
// =============================================================================

type Json = Database['public']['Tables']['users']['Row']['avatar_config']
type UserRow = Database['public']['Tables']['users']['Row']
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row']
type UserPreferencesRow = Database['public']['Tables']['user_preferences']['Row']
type NotificationPreferenceRow = Database['public']['Tables']['notification_preferences']['Row']
type UserConsentRow = Database['public']['Tables']['user_consents']['Row']
type GDPRRequestRow = Database['public']['Tables']['gdpr_requests']['Row']
type UserMfaRow = Database['public']['Tables']['user_mfa']['Row']
type UserConsentInsert = Database['public']['Tables']['user_consents']['Insert']

const THEME_VALUES = new Set(['light', 'dark', 'system'])
const VISIBILITY_VALUES = new Set(['public', 'private', 'organization'])
const CONSENT_VALUES = new Set<ConsentType>(['essential', 'functional', 'analytics', 'marketing', 'special_category', 'parental'])
const GDPR_REQUEST_TYPES = new Set<GDPRRequestType>(['access', 'rectification', 'erasure', 'restriction', 'portability', 'objection'])
const GDPR_REQUEST_STATUSES = new Set<GDPRRequestStatus>(['pending', 'in_progress', 'completed', 'rejected', 'cancelled'])

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asStringArray(value: Json | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.reduce<string[]>((items, item) => {
      if (typeof item === 'string') {
        items.push(item)
      }
      return items
    }, [])
  }
  return []
}

function asThemePreference(value: string | null | undefined): User['preferred_theme'] {
  return value && THEME_VALUES.has(value) ? value as User['preferred_theme'] : 'system'
}

function asVisibility(value: string | null | undefined): UserProfile['profile_visibility'] {
  return value && VISIBILITY_VALUES.has(value) ? value as UserProfile['profile_visibility'] : 'private'
}

function asConsentType(value: string): ConsentType {
  return CONSENT_VALUES.has(value as ConsentType) ? value as ConsentType : 'essential'
}

function asGdprRequestType(value: string): GDPRRequestType {
  return GDPR_REQUEST_TYPES.has(value as GDPRRequestType) ? value as GDPRRequestType : 'access'
}

function asGdprRequestStatus(value: string): GDPRRequestStatus {
  return GDPR_REQUEST_STATUSES.has(value as GDPRRequestStatus) ? value as GDPRRequestStatus : 'pending'
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    language: row.language,
    avatar_url: row.avatar_url,
    preferred_theme: asThemePreference(row.preferred_theme),
    show_theme_toggle_in_header: row.show_theme_toggle_in_header,
    global_role: row.global_role ?? 'member',
    email_verified: row.email_verified ?? false,
    mfa_enforced: row.mfa_enforced ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapUserProfile(row: UserProfileRow | null): UserProfile | null {
  if (!row) return null

  return {
    user_id: row.user_id,
    display_name: row.display_name,
    first_name: null,
    last_name: null,
    phone: row.phone,
    phone_verified: false,
    backup_email: null,
    job_title: row.job_title,
    organisation: row.organisation,
    bio: null,
    timezone: row.timezone ?? 'Europe/Stockholm',
    locale: row.locale,
    avatar_url: row.avatar_url,
    cover_photo_url: null,
    birth_date: null,
    pronouns: null,
    location: null,
    social_links: {},
    profile_visibility: 'private',
    show_email: false,
    show_phone: false,
    onboarding_completed: false,
    last_seen_at: null,
    metadata: asRecord(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapUserPreferences(row: UserPreferencesRow | null): UserPreferences | null {
  if (!row) return null

  return {
    id: row.id,
    user_id: row.user_id,
    tenant_id: row.tenant_id,
    language: row.language,
    theme: asThemePreference(row.theme),
    timezone: 'Europe/Stockholm',
    date_format: 'YYYY-MM-DD',
    time_format: '24h',
    first_day_of_week: 1,
    compact_mode: false,
    animations_enabled: true,
    high_contrast: false,
    reduce_motion: false,
    text_size: 'medium',
    screen_reader_mode: false,
    content_language_preferences: asStringArray(row.preferred_game_categories),
    content_maturity_level: row.content_maturity_level === 'kids' || row.content_maturity_level === 'teen' || row.content_maturity_level === 'mature'
      ? row.content_maturity_level
      : 'all',
    profile_visibility: asVisibility(row.profile_visibility),
    show_stats_publicly: row.show_stats_publicly ?? false,
    allow_friend_requests: row.allow_friend_requests ?? true,
    allow_messages: row.allow_messages ?? true,
    enable_recommendations: row.enable_recommendations ?? true,
    recommendation_frequency: row.recommendation_frequency ?? 'weekly',
    keyboard_shortcuts_enabled: true,
    custom_shortcuts: {},
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  }
}

function mapNotificationSettings(row: NotificationPreferenceRow | null): NotificationSettings | null {
  if (!row) return null

  const digest = row.digest_frequency === 'real-time' || row.digest_frequency === 'hourly' || row.digest_frequency === 'daily' || row.digest_frequency === 'weekly' || row.digest_frequency === 'never'
    ? row.digest_frequency
    : 'real-time'

  return {
    id: row.id,
    user_id: row.user_id,
    email_enabled: row.email_enabled ?? true,
    email_activity: row.gameplay_notifications ?? row.email_enabled ?? true,
    email_mentions: row.support_notifications ?? row.email_enabled ?? true,
    email_comments: row.achievement_notifications ?? row.email_enabled ?? true,
    email_updates: row.system_notifications ?? row.email_enabled ?? true,
    email_marketing: false,
    email_digest: digest,
    push_enabled: row.push_enabled ?? true,
    push_activity: row.gameplay_notifications ?? row.push_enabled ?? true,
    push_mentions: row.support_notifications ?? row.push_enabled ?? true,
    push_comments: row.achievement_notifications ?? row.push_enabled ?? true,
    sms_enabled: row.sms_enabled ?? false,
    sms_security_alerts: row.sms_enabled ?? false,
    sms_important_updates: row.sms_enabled ?? false,
    inapp_enabled: row.in_app_enabled ?? true,
    inapp_sound: true,
    dnd_enabled: row.quiet_hours_enabled ?? false,
    dnd_start_time: row.quiet_hours_start,
    dnd_end_time: row.quiet_hours_end,
    dnd_days: [],
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  }
}

function mapMfaFactors(value: Json | null | undefined): MFAFactor[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const factor = item as Record<string, unknown>
      const type = factor.type === 'totp' || factor.type === 'phone' || factor.type === 'webauthn' ? factor.type : 'totp'
      const status = factor.status === 'verified' || factor.status === 'unverified' ? factor.status : 'verified'

      return {
        id: typeof factor.id === 'string' ? factor.id : crypto.randomUUID(),
        type,
        status,
        friendly_name: typeof factor.friendly_name === 'string' ? factor.friendly_name : null,
        created_at: typeof factor.created_at === 'string' ? factor.created_at : new Date().toISOString(),
      } satisfies MFAFactor
    })
    .filter((factor): factor is MFAFactor => Boolean(factor))
}

function mapMfaStatus(row: UserMfaRow | null): MFAStatus | null {
  if (!row) return null

  const factors = mapMfaFactors(row.methods)
  return {
    is_enabled: Boolean(row.enrolled_at || factors.length > 0),
    enrolled_at: row.enrolled_at,
    last_verified_at: row.last_verified_at,
    factors,
    recovery_codes_remaining: Math.max((row.recovery_codes_count ?? 0) - (row.recovery_codes_used ?? 0), 0),
  }
}

function mapUserConsent(row: UserConsentRow): UserConsent {
  return {
    id: row.id,
    user_id: row.user_id,
    tenant_id: row.tenant_id,
    consent_type: asConsentType(row.consent_type),
    purpose: row.purpose,
    granted: row.granted,
    policy_version: row.policy_version,
    granted_at: row.granted_at,
    withdrawn_at: row.withdrawn_at,
    expires_at: row.expires_at,
    parental_consent: row.parental_consent ?? false,
    verified_at: row.verified_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapGdprRequest(row: GDPRRequestRow): GDPRRequest {
  return {
    id: row.id,
    user_id: row.user_id,
    tenant_id: row.tenant_id,
    request_type: asGdprRequestType(row.request_type),
    status: asGdprRequestStatus(row.status),
    request_details: asRecord(row.request_details),
    response_details: asRecord(row.response_details),
    rejection_reason: row.rejection_reason,
    handled_by: row.handled_by,
    requested_at: row.requested_at,
    acknowledged_at: row.acknowledged_at,
    completed_at: row.completed_at,
    response_deadline: row.response_deadline,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export class ProfileService {
  private supabase?: SupabaseClient<Database>;

  constructor(supabase?: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  private getSupabase(): SupabaseClient<Database> {
    if (!this.supabase) {
      throw new Error('Supabase client is required for this operation')
    }
    return this.supabase
  }

  private async requestJson<T>(input: string, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; details?: string }
      | T
      | null

    if (!response.ok) {
      const errorPayload = payload as { error?: string; details?: string } | null
      throw new Error(errorPayload?.details || errorPayload?.error || `Request failed: ${response.status}`)
    }

    return payload as T
  }

  private toError(err: unknown): Error {
    if (err instanceof Error) return err
    if (typeof err === 'string') return new Error(err)
    if (!err || typeof err !== 'object') return new Error(String(err))

    const maybe = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const parts = [
      typeof maybe.message === 'string' ? maybe.message : null,
      typeof maybe.details === 'string' ? maybe.details : null,
      typeof maybe.hint === 'string' ? maybe.hint : null,
      typeof maybe.code === 'string' ? maybe.code : null,
    ].filter((p): p is string => Boolean(p))

    if (parts.length > 0) return new Error(parts.join(' | '))

    try {
      return new Error(JSON.stringify(err))
    } catch {
      return new Error('Unknown error')
    }
  }

  // ---------------------------------------------------------------------------
  // GET PROFILE
  // ---------------------------------------------------------------------------

  /**
   * Get complete user profile with all related data
   */
  async getCompleteProfile(userId: string): Promise<CompleteProfile | null> {
    const supabase = this.getSupabase()
    // Fetch user from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[ProfileService] Failed to get user:', userError);
      return null;
    }

    // Fetch extended profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch notification settings (using notification_preferences table)
    const { data: notifications } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch organization memberships
    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select(`
        id,
        user_id,
        tenant_id,
        role,
        is_primary,
        status,
        created_at,
        tenant:tenants(id, name, slug)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    // Fetch MFA status
    const { data: mfaData } = await supabase
      .from('user_mfa')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      user: mapUser(user),
      profile: mapUserProfile(profile),
      preferences: mapUserPreferences(preferences),
      notifications: mapNotificationSettings(notifications),
      organizations: (memberships || []) as unknown as OrganizationMembership[],
      mfa: mapMfaStatus(mfaData),
    };
  }

  /**
   * Get user preferences (lightweight; avoids fetching full profile).
   */
  async getPreferences(tenantId: string, userId: string): Promise<UserPreferences | null> {
    void userId
    const payload = await this.requestJson<{ preferences: UserPreferences | null }>(
      `/api/accounts/profile/preferences?tenantId=${encodeURIComponent(tenantId)}`
    )
    const data = payload.preferences

    // Back-compat: older DB rows might still contain 'auto' while UI expects 'system'.
    if (data && typeof (data as { theme?: unknown }).theme === 'string' && (data as { theme: string }).theme === 'auto') {
      ;(data as { theme: string }).theme = 'system'
    }

    return (data as UserPreferences) || null
  }

  /**
   * Get organization memberships for the user (lightweight).
   */
  async getOrganizationMemberships(userId: string): Promise<OrganizationMembership[]> {
    void userId
    const payload = await this.requestJson<{ organizations: OrganizationMembership[] }>(
      '/api/accounts/profile/organizations'
    )

    return payload.organizations ?? []
  }

  // ---------------------------------------------------------------------------
  // UPDATE PROFILE
  // ---------------------------------------------------------------------------

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | null> {
    void userId
    const payload = await this.requestJson<{ profile: UserProfile | null }>(
      '/api/accounts/profile',
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    )

    return payload.profile ?? null
  }

  // ---------------------------------------------------------------------------
  // PREFERENCES
  // ---------------------------------------------------------------------------

  /**
   * Update user preferences
   */
  async updatePreferences(tenantId: string, userId: string, data: Partial<UserPreferences>): Promise<UserPreferences | null> {
    // Prevent cross-tenant bugs and PK conflicts by never sending identity columns from UI state.
    const updates = { ...(data as Record<string, unknown>) }
    delete updates.id
    delete updates.tenant_id
    delete updates.user_id
    delete updates.created_at
    delete updates.updated_at

    void userId
    const payload = await this.requestJson<{ preferences: UserPreferences | null }>(
      '/api/accounts/profile/preferences',
      {
        method: 'PATCH',
        body: JSON.stringify({ tenantId, preferences: updates }),
      }
    )

    return payload.preferences;
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------

  /**
   * Get notification settings
   */
  async getNotificationSettings(
    userId: string
  ): Promise<{ settings: NotificationSettings | null; error: Error | null }> {
    void userId
    try {
      const payload = await this.requestJson<{ settings: NotificationSettings | null }>(
        '/api/accounts/profile/notifications'
      )
      return { settings: payload.settings, error: null }
    } catch (error) {
      return { settings: null, error: this.toError(error) }
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<NotificationSettings | null> {
    void userId
    const payload = await this.requestJson<{ settings: NotificationSettings | null }>(
      '/api/accounts/profile/notifications',
      {
        method: 'PATCH',
        body: JSON.stringify({ settings }),
      }
    )

    return payload.settings;
  }

  // ---------------------------------------------------------------------------
  // SESSIONS
  // ---------------------------------------------------------------------------

  /**
   * Get active sessions
   */
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    const supabase = this.getSupabase()
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .order('last_seen_at', { ascending: false });

    if (error) {
      console.error('[ProfileService] Failed to get sessions:', error);
      return [];
    }

    return (data || []).map((session) => ({
      id: session.id,
      user_id: session.user_id,
      supabase_session_id: session.supabase_session_id,
      device_id: session.device_id,
      device_name: null,
      device_type: null,
      browser: null,
      os: null,
      ip: session.ip as string | null,
      country: null,
      city: null,
      is_current: false,
      is_trusted: false,
      last_seen_at: session.last_seen_at,
      created_at: session.last_login_at || new Date().toISOString(),
      revoked_at: session.revoked_at,
    })) as unknown as UserSession[];
  }

  /**
   * Revoke a session
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const supabase = this.getSupabase()
    const { error } = await supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('[ProfileService] Failed to revoke session:', error);
      throw new Error('Failed to revoke session');
    }
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(userId: string, currentSessionId?: string): Promise<number> {
    const supabase = this.getSupabase()
    let query = supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null);

    if (currentSessionId) {
      query = query.neq('id', currentSessionId);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error('[ProfileService] Failed to revoke sessions:', error);
      return 0;
    }

    return data?.length || 0;
  }

  // ---------------------------------------------------------------------------
  // CONSENTS
  // ---------------------------------------------------------------------------

  /**
   * Get user consents
   */
  async getUserConsents(userId: string): Promise<UserConsent[]> {
    const supabase = this.getSupabase()
    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ProfileService] Failed to get consents:', error);
      return [];
    }

    return (data || []).map(mapUserConsent);
  }

  /**
   * Update consent
   */
  async updateConsent(
    userId: string,
    consentType: string,
    granted: boolean,
    source?: string
  ): Promise<UserConsent | null> {
    const supabase = this.getSupabase()
    const payload: UserConsentInsert = {
      user_id: userId,
      consent_type: consentType,
      granted,
      granted_at: granted ? new Date().toISOString() : null,
      withdrawn_at: !granted ? new Date().toISOString() : null,
      purpose: source || 'profile_settings',
      policy_version: 'current',
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('user_consents')
      .upsert(payload, { onConflict: 'user_id,consent_type' })
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to update consent:', error);
      return null;
    }

    return mapUserConsent(data);
  }

  // ---------------------------------------------------------------------------
  // GDPR
  // ---------------------------------------------------------------------------

  /**
   * Get GDPR requests
   */
  async getGDPRRequests(userId: string): Promise<GDPRRequest[]> {
    const supabase = this.getSupabase()
    const { data, error } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ProfileService] Failed to get GDPR requests:', error);
      return [];
    }

    return (data || []).map(mapGdprRequest);
  }

  /**
   * Submit GDPR request
   */
  async submitGDPRRequest(request: {
    user_id: string;
    request_type: GDPRRequestType;
    reason?: string;
  }): Promise<GDPRRequest | null> {
    const supabase = this.getSupabase()
    const responseDeadline = new Date();
    responseDeadline.setDate(responseDeadline.getDate() + 30);

    const { data, error } = await supabase
      .from('gdpr_requests')
      .insert({
        user_id: request.user_id,
        request_type: request.request_type,
        status: 'pending',
        request_details: request.reason ? { reason: request.reason } : {},
        requested_at: new Date().toISOString(),
        response_deadline: responseDeadline.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to submit GDPR request:', error);
      throw new Error('Failed to submit GDPR request');
    }

    return mapGdprRequest(data);
  }

  // ---------------------------------------------------------------------------
  // ACTIVITY
  // ---------------------------------------------------------------------------

  /**
   * Get activity log
   */
  async getActivityLog(userId: string, limit = 50): Promise<ActivityLogEntry[]> {
    const supabase = this.getSupabase()
    const { data, error } = await supabase
      .from('user_audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ProfileService] Failed to get activity log:', error);
      return [];
    }

    return (data || []).map((entry) => ({
      id: entry.id,
      user_id: entry.user_id ?? userId,
      action: entry.event_type,
      details: typeof entry.payload === 'string' ? entry.payload : asRecord(entry.payload),
      created_at: entry.created_at,
    }));
  }
}

export default ProfileService;
