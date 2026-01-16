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
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // ---------------------------------------------------------------------------
  // GET PROFILE
  // ---------------------------------------------------------------------------

  /**
   * Get complete user profile with all related data
   */
  async getCompleteProfile(userId: string): Promise<CompleteProfile | null> {
    // Fetch user from users table
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[ProfileService] Failed to get user:', userError);
      return null;
    }

    // Fetch extended profile
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch preferences
    const { data: preferences } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch notification settings (using notification_preferences table)
    const { data: notifications } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch organization memberships
    const { data: memberships } = await this.supabase
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
    const { data: mfaData } = await this.supabase
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

  // ---------------------------------------------------------------------------
  // UPDATE PROFILE
  // ---------------------------------------------------------------------------

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data: profile, error } = await this.supabase
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
  async updatePreferences(userId: string, data: Partial<UserPreferences>): Promise<UserPreferences | null> {
    const { data: preferences, error } = await this.supabase
      .from('user_preferences')
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
      console.error('[ProfileService] Failed to update preferences:', error);
      return null;
    }

    return preferences;
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------

  /**
   * Get notification settings
   */
  async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[ProfileService] Failed to get notification settings:', error);
      return null;
    }

    if (!data) return null;

    // Map database columns to NotificationSettings type
    return {
      id: data.id,
      user_id: data.user_id,
      email_enabled: data.email_enabled ?? false,
      email_activity: data.email_enabled ?? false,
      email_mentions: data.email_enabled ?? false,
      email_comments: data.email_enabled ?? false,
      email_updates: data.email_enabled ?? false,
      email_marketing: data.marketing_emails ?? false,
      email_digest: (data.digest_frequency as NotificationSettings['email_digest']) || 'daily',
      push_enabled: data.push_enabled ?? false,
      push_activity: data.push_enabled ?? false,
      push_mentions: data.push_enabled ?? false,
      push_comments: data.push_enabled ?? false,
      sms_enabled: data.sms_enabled ?? false,
      sms_security_alerts: data.sms_enabled ?? false,
      sms_important_updates: data.sms_enabled ?? false,
      inapp_enabled: data.in_app_enabled ?? true,
      inapp_sound: true,
      dnd_enabled: data.quiet_hours_enabled ?? false,
      dnd_start_time: data.quiet_hours_start ?? null,
      dnd_end_time: data.quiet_hours_end ?? null,
      dnd_days: [],
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    } as NotificationSettings;
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<NotificationSettings | null> {
    // Map NotificationSettings to database columns
    const dbUpdate: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (settings.email_enabled !== undefined) dbUpdate.email_enabled = settings.email_enabled;
    if (settings.push_enabled !== undefined) dbUpdate.push_enabled = settings.push_enabled;
    if (settings.sms_enabled !== undefined) dbUpdate.sms_enabled = settings.sms_enabled;
    if (settings.inapp_enabled !== undefined) dbUpdate.in_app_enabled = settings.inapp_enabled;
    if (settings.dnd_enabled !== undefined) dbUpdate.quiet_hours_enabled = settings.dnd_enabled;
    if (settings.dnd_start_time !== undefined) dbUpdate.quiet_hours_start = settings.dnd_start_time;
    if (settings.dnd_end_time !== undefined) dbUpdate.quiet_hours_end = settings.dnd_end_time;
    if (settings.email_digest !== undefined) dbUpdate.digest_frequency = settings.email_digest;
    if (settings.email_marketing !== undefined) dbUpdate.marketing_emails = settings.email_marketing;

    const upsertData = dbUpdate as Database['public']['Tables']['notification_preferences']['Insert'];
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .upsert(upsertData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to update notification settings:', error);
      return null;
    }

    return data;
  }

  // ---------------------------------------------------------------------------
  // SESSIONS
  // ---------------------------------------------------------------------------

  /**
   * Get active sessions
   */
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    const { data, error } = await this.supabase
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
    const { error } = await this.supabase
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
    let query = this.supabase
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
    const { data, error } = await this.supabase
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
    const { data, error } = await this.supabase
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
    const { data, error } = await this.supabase
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
    const responseDeadline = new Date();
    responseDeadline.setDate(responseDeadline.getDate() + 30);

    const { data, error } = await this.supabase
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
    const { data, error } = await this.supabase
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
