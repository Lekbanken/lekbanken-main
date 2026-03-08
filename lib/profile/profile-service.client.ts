/**
 * Profile Service Client
 * Client-side service for user profile operations
 * Uses passed Supabase client instead of server-side client
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type {
  UserProfile,
  UserPreferences,
  NotificationSettings,
  UserSession,
  OrganizationMembership,
  UserConsent,
  GDPRRequest,
  GDPRRequestType,
  ActivityLogEntry,
  CompleteProfile,
} from './types';

// =============================================================================
// CLIENT PROFILE SERVICE
// =============================================================================

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
      user,
      profile: profile || null,
      preferences: preferences || null,
      notifications: notifications || null,
      organizations: (memberships || []) as unknown as OrganizationMembership[],
      mfa: mfaData || null,
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
    const supabase = this.getSupabase()
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          ...data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to update profile:', error);
      return null;
    }

    return profile;
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
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true);

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

    return data || [];
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
    const { data, error } = await supabase
      .from('user_consents')
      .upsert(
        {
          user_id: userId,
          consent_type: consentType,
          granted,
          granted_at: granted ? new Date().toISOString() : null,
          withdrawn_at: !granted ? new Date().toISOString() : null,
          source: source || 'profile_settings',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,consent_type' }
      )
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to update consent:', error);
      return null;
    }

    return data;
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

    return data || [];
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

    return data;
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
      user_id: entry.user_id,
      action: entry.event_type,
      details: entry.payload,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      created_at: entry.created_at,
    }));
  }
}

export default ProfileService;
