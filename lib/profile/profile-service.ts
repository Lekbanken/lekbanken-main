/**
 * Profile Service
 * Enterprise-grade service layer for user profile operations
 */

import { createServerRlsClient } from '@/lib/supabase/server';
import { logUserAuditEvent } from '@/lib/services/userAudit.server';
import type { Database } from '@/types/supabase';
import type {
  User,
  UserProfile,
  UserPreferences,
  NotificationSettings,
  UserSession,
  LoginHistoryEntry,
  MFAStatus,
  TrustedDevice,
  OrganizationMembership,
  UserConsent,
  GDPRRequest,
  DataAccessLogEntry,
  ProfileChangeLogEntry,
  ActivityEntry,
  CompleteProfile,
  UpdateProfileInput,
  UpdatePreferencesInput,
  UpdateNotificationSettingsInput,
  GDPRRequestType,
  ConsentType,
} from './types';

// =============================================================================
// PROFILE SERVICE
// =============================================================================

export class ProfileService {
  // ---------------------------------------------------------------------------
  // GET PROFILE
  // ---------------------------------------------------------------------------

  /**
   * Get complete user profile with all related data
   */
  static async getCompleteProfile(userId: string): Promise<CompleteProfile | null> {
    const supabase = await createServerRlsClient();

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

    // Fetch preferences (may be tenant-specific, get first available)
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

    const organizations: OrganizationMembership[] = (memberships || []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      tenant_id: m.tenant_id,
      role: m.role as OrganizationMembership['role'],
      is_primary: m.is_primary,
      status: m.status as OrganizationMembership['status'],
      tenant: m.tenant as OrganizationMembership['tenant'],
      created_at: m.created_at,
    }));

    const mfa: MFAStatus | null = mfaData
      ? {
          is_enabled: !!mfaData.enrolled_at,
          enrolled_at: mfaData.enrolled_at,
          last_verified_at: mfaData.last_verified_at,
          factors: [],
          recovery_codes_remaining: mfaData.recovery_codes_hashed?.length || 0,
        }
      : null;

    return {
      user: user as User,
      profile: profile as UserProfile | null,
      preferences: preferences as UserPreferences | null,
      notifications: notifications as NotificationSettings | null,
      organizations,
      mfa,
    };
  }

  /**
   * Get basic user info
   */
  static async getUser(userId: string): Promise<User | null> {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[ProfileService] Failed to get user:', error);
      return null;
    }

    return data as User;
  }

  /**
   * Get extended profile
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[ProfileService] Failed to get profile:', error);
      return null;
    }

    return data as UserProfile | null;
  }

  // ---------------------------------------------------------------------------
  // UPDATE PROFILE
  // ---------------------------------------------------------------------------

  /**
   * Update user profile (basic info on users table)
   */
  static async updateUser(
    userId: string,
    updates: Partial<Pick<User, 'full_name' | 'avatar_url' | 'language' | 'preferred_theme' | 'show_theme_toggle_in_header'>>
  ): Promise<User | null> {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to update user:', error);
      throw new Error('Failed to update user');
    }

    // Log audit event
    await logUserAuditEvent({
      userId: userId,
      actorUserId: userId,
      eventType: 'profile.user_updated',
      payload: { fields: Object.keys(updates) },
    });

    return data as User;
  }

  /**
   * Update extended profile (user_profiles table)
   */
  static async updateProfile(userId: string, updates: UpdateProfileInput): Promise<UserProfile | null> {
    const supabase = await createServerRlsClient();

    // Upsert profile
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to update profile:', error);
      throw new Error('Failed to update profile');
    }

    // Log audit event
    await logUserAuditEvent({
      userId: userId,
      actorUserId: userId,
      eventType: 'profile.profile_updated',
      payload: { fields: Object.keys(updates) },
    });

    return data as UserProfile;
  }

  // ---------------------------------------------------------------------------
  // AVATAR
  // ---------------------------------------------------------------------------

  /**
   * Upload avatar to storage and update profile
   */
  static async uploadAvatar(userId: string, file: File): Promise<string> {
    const supabase = await createServerRlsClient();

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('File must be a valid image (JPEG, PNG, GIF, or WebP)');
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${userId}/${Date.now()}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[ProfileService] Failed to upload avatar:', uploadError);
      throw new Error('Failed to upload avatar');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename);

    // Update both users and user_profiles
    await Promise.all([
      supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userId),
      supabase.from('user_profiles').upsert(
        { user_id: userId, avatar_url: publicUrl },
        { onConflict: 'user_id' }
      ),
    ]);

    // Log audit event
    await logUserAuditEvent({
      userId: userId,
      actorUserId: userId,
      eventType: 'profile.avatar_uploaded',
      payload: { filename },
    });

    return publicUrl;
  }

  /**
   * Delete avatar
   */
  static async deleteAvatar(userId: string): Promise<void> {
    const supabase = await createServerRlsClient();

    // Get current avatar URL
    const { data: user } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (user?.avatar_url && user.avatar_url.includes('avatars/')) {
      // Extract path from URL
      const path = user.avatar_url.split('avatars/').pop();
      if (path) {
        await supabase.storage.from('avatars').remove([path]);
      }
    }

    // Clear avatar URLs
    await Promise.all([
      supabase.from('users').update({ avatar_url: null }).eq('id', userId),
      supabase.from('user_profiles').update({ avatar_url: null }).eq('user_id', userId),
    ]);

    // Log audit event
    await logUserAuditEvent({
      userId: userId,
      actorUserId: userId,
      eventType: 'profile.avatar_deleted',
      payload: {},
    });
  }

  // ---------------------------------------------------------------------------
  // PREFERENCES
  // ---------------------------------------------------------------------------

  /**
   * Get user preferences
   */
  static async getPreferences(userId: string, tenantId?: string): Promise<UserPreferences | null> {
    const supabase = await createServerRlsClient();

    let query = supabase.from('user_preferences').select('*').eq('user_id', userId);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('[ProfileService] Failed to get preferences:', error);
      return null;
    }

    return data as unknown as UserPreferences | null;
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(
    userId: string,
    updates: UpdatePreferencesInput,
    tenantId?: string
  ): Promise<UserPreferences | null> {
    const supabase = await createServerRlsClient();

    // Build upsert data - tenant_id is required in schema
    const upsertData: Database['public']['Tables']['user_preferences']['Insert'] = {
      user_id: userId,
      tenant_id: tenantId || userId, // Use userId as fallback tenant for personal preferences
      ...updates as Partial<Database['public']['Tables']['user_preferences']['Insert']>,
    };

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(upsertData, { onConflict: 'tenant_id,user_id' })
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to update preferences:', error);
      throw new Error('Failed to update preferences');
    }

    // Log audit event
    await logUserAuditEvent({
      userId: userId,
      actorUserId: userId,
      eventType: 'profile.preferences_updated',
      payload: { fields: Object.keys(updates) },
    });

    return data as unknown as UserPreferences;
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATION SETTINGS
  // ---------------------------------------------------------------------------

  /**
   * Get notification settings
   */
  static async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[ProfileService] Failed to get notification settings:', error);
      return null;
    }

    // Map notification_preferences columns to NotificationSettings type
    if (!data) return null;
    return {
      user_id: data.user_id,
      email_enabled: data.email_enabled ?? false,
      push_enabled: data.push_enabled ?? false,
      inapp_enabled: data.in_app_enabled ?? true,
      sms_enabled: data.sms_enabled ?? false,
      email_digest: (data.digest_frequency as 'real-time' | 'hourly' | 'daily' | 'weekly' | 'never') || 'daily',
      dnd_enabled: data.quiet_hours_enabled ?? false,
      dnd_start_time: data.quiet_hours_start ?? null,
      dnd_end_time: data.quiet_hours_end ?? null,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    } as NotificationSettings;
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(
    userId: string,
    updates: UpdateNotificationSettingsInput
  ): Promise<NotificationSettings | null> {
    const supabase = await createServerRlsClient();

    // Map NotificationSettings input to notification_preferences columns
    const mappedUpdates = {
      user_id: userId,
      email_enabled: updates.email_enabled,
      push_enabled: updates.push_enabled,
      in_app_enabled: updates.inapp_enabled,
      sms_enabled: updates.sms_enabled,
      digest_frequency: updates.email_digest,
      quiet_hours_enabled: updates.dnd_enabled,
      quiet_hours_start: updates.dnd_start_time,
      quiet_hours_end: updates.dnd_end_time,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(mappedUpdates, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to update notification settings:', error);
      throw new Error('Failed to update notification settings');
    }

    // Log audit event
    await logUserAuditEvent({
      userId: userId,
      actorUserId: userId,
      eventType: 'profile.notifications_updated',
      payload: { fields: Object.keys(updates) },
    });

    // Map back to NotificationSettings type
    return {
      user_id: data.user_id,
      email_enabled: data.email_enabled ?? false,
      push_enabled: data.push_enabled ?? false,
      inapp_enabled: data.in_app_enabled ?? true,
      sms_enabled: data.sms_enabled ?? false,
      email_digest: (data.digest_frequency as 'real-time' | 'hourly' | 'daily' | 'weekly' | 'never') || 'daily',
      dnd_enabled: data.quiet_hours_enabled ?? false,
      dnd_start_time: data.quiet_hours_start ?? null,
      dnd_end_time: data.quiet_hours_end ?? null,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    } as NotificationSettings;
  }

  // ---------------------------------------------------------------------------
  // SESSIONS
  // ---------------------------------------------------------------------------

  /**
   * Get active sessions
   */
  static async getActiveSessions(userId: string): Promise<UserSession[]> {
    const supabase = await createServerRlsClient();

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

    return (data || []) as unknown as UserSession[];
  }

  /**
   * Revoke a session
   */
  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    const supabase = await createServerRlsClient();

    const { error } = await supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('[ProfileService] Failed to revoke session:', error);
      throw new Error('Failed to revoke session');
    }

    // Log audit event
    await logUserAuditEvent({
      userId: userId,
      actorUserId: userId,
      eventType: 'security.session_revoked',
      payload: { session_id: sessionId },
    });
  }

  /**
   * Revoke all sessions except current
   */
  static async revokeAllSessions(userId: string, currentSessionId?: string): Promise<number> {
    const supabase = await createServerRlsClient();

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
      console.error('[ProfileService] Failed to revoke all sessions:', error);
      throw new Error('Failed to revoke sessions');
    }

    const count = data?.length || 0;

    // Log audit event
    await logUserAuditEvent({
      userId: userId,
      actorUserId: userId,
      eventType: 'security.all_sessions_revoked',
      payload: { count, kept_current: !!currentSessionId },
    });

    return count;
  }

  // ---------------------------------------------------------------------------
  // LOGIN HISTORY
  // ---------------------------------------------------------------------------

  /**
   * Get login history
   * Note: Uses user_audit_logs filtered by login events as login_history table may not exist
   */
  static async getLoginHistory(userId: string, limit = 50): Promise<LoginHistoryEntry[]> {
    const supabase = await createServerRlsClient();

    // Use user_audit_logs filtered by login-related events
    const { data, error } = await supabase
      .from('user_audit_logs')
      .select('*')
      .eq('user_id', userId)
      .in('event_type', ['security.login', 'security.logout', 'security.login_failed', 'auth.sign_in', 'auth.sign_out'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ProfileService] Failed to get login history:', error);
      return [];
    }

    // Map audit logs to LoginHistoryEntry format
    return (data || []).map(entry => ({
      id: entry.id,
      user_id: entry.user_id || userId,
      success: !entry.event_type.includes('failed'),
      method: 'password' as const,
      provider: null,
      ip_address: (entry.payload as Record<string, unknown>)?.ip_address as string || null,
      user_agent: (entry.payload as Record<string, unknown>)?.user_agent as string || null,
      device_info: null,
      country: null,
      city: null,
      failure_reason: entry.event_type.includes('failed') ? 'Authentication failed' : null,
      created_at: entry.created_at,
    })) as unknown as LoginHistoryEntry[];
  }

  // ---------------------------------------------------------------------------
  // DEVICES
  // ---------------------------------------------------------------------------

  /**
   * Get trusted devices
   */
  static async getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false });

    if (error) {
      console.error('[ProfileService] Failed to get devices:', error);
      return [];
    }

    // Map database columns to TrustedDevice type
    return (data || []).map(device => ({
      id: device.id,
      user_id: device.user_id,
      device_name: device.user_agent?.split(' ')[0] || 'Unknown Device',
      device_type: device.device_type || 'unknown',
      device_fingerprint: device.device_fingerprint,
      user_agent: device.user_agent,
      ip_last: device.ip_last as string | null,
      first_seen_at: device.first_seen_at,
      last_seen_at: device.last_seen_at,
      is_current: false, // Would need current session context to determine
      risk_score: device.risk_score,
      metadata: device.metadata || {},
    })) as TrustedDevice[];
  }

  /**
   * Remove a device
   */
  static async removeDevice(userId: string, deviceId: string): Promise<void> {
    const supabase = await createServerRlsClient();

    const { error } = await supabase
      .from('user_devices')
      .delete()
      .eq('id', deviceId)
      .eq('user_id', userId);

    if (error) {
      console.error('[ProfileService] Failed to remove device:', error);
      throw new Error('Failed to remove device');
    }

    // Log audit event
    await logUserAuditEvent({
      userId: userId,
      actorUserId: userId,
      eventType: 'security.device_removed',
      payload: { device_id: deviceId },
    });
  }

  // ---------------------------------------------------------------------------
  // ORGANIZATIONS
  // ---------------------------------------------------------------------------

  /**
   * Get organization memberships
   */
  static async getOrganizations(userId: string): Promise<OrganizationMembership[]> {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
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
      .eq('user_id', userId);

    if (error) {
      console.error('[ProfileService] Failed to get organizations:', error);
      return [];
    }

    return (data || []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      tenant_id: m.tenant_id,
      role: m.role as OrganizationMembership['role'],
      is_primary: m.is_primary,
      status: m.status as OrganizationMembership['status'],
      tenant: m.tenant as OrganizationMembership['tenant'],
      created_at: m.created_at,
    }));
  }

  /**
   * Leave an organization
   */
  static async leaveOrganization(userId: string, tenantId: string): Promise<void> {
    const supabase = await createServerRlsClient();

    // Check if user is owner
    const { data: membership } = await supabase
      .from('user_tenant_memberships')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (membership?.role === 'owner') {
      throw new Error('Cannot leave organization as owner. Transfer ownership first.');
    }

    const { error } = await supabase
      .from('user_tenant_memberships')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[ProfileService] Failed to leave organization:', error);
      throw new Error('Failed to leave organization');
    }

    // Log audit event
    await logUserAuditEvent({
      userId: userId,
      actorUserId: userId,
      eventType: 'organization.left',
      payload: { tenant_id: tenantId },
    });
  }

  // ---------------------------------------------------------------------------
  // GDPR & CONSENTS
  // ---------------------------------------------------------------------------

  /**
   * Get user consents
   */
  static async getConsents(userId: string): Promise<UserConsent[]> {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ProfileService] Failed to get consents:', error);
      return [];
    }

    return data as UserConsent[];
  }

  /**
   * Update consent
   */
  static async updateConsent(
    userId: string,
    consentType: ConsentType,
    purpose: string,
    granted: boolean,
    policyVersion: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserConsent> {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
      .from('user_consents')
      .upsert(
        {
          user_id: userId,
          consent_type: consentType,
          purpose,
          granted,
          policy_version: policyVersion,
          granted_at: granted ? new Date().toISOString() : null,
          withdrawn_at: !granted ? new Date().toISOString() : null,
          ip_address: ipAddress,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,consent_type,purpose,policy_version' }
      )
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to update consent:', error);
      throw new Error('Failed to update consent');
    }

    // Log audit event
    await logUserAuditEvent({
      userId: userId,
      actorUserId: userId,
      eventType: granted ? 'gdpr.consent_granted' : 'gdpr.consent_withdrawn',
      payload: { consent_type: consentType, purpose, policy_version: policyVersion },
    });

    return data as UserConsent;
  }

  /**
   * Submit GDPR request
   */
  static async submitGDPRRequest(
    userId: string,
    requestType: GDPRRequestType,
    details?: Record<string, unknown>
  ): Promise<GDPRRequest> {
    const supabase = await createServerRlsClient();

    const responseDeadline = new Date();
    responseDeadline.setDate(responseDeadline.getDate() + 30); // 30 days per GDPR

    const insertData: Database['public']['Tables']['gdpr_requests']['Insert'] = {
      user_id: userId,
      request_type: requestType,
      status: 'pending',
      request_details: (details ?? null) as Database['public']['Tables']['gdpr_requests']['Insert']['request_details'],
      requested_at: new Date().toISOString(),
      response_deadline: responseDeadline.toISOString(),
    };

    const { data, error } = await supabase
      .from('gdpr_requests')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Failed to submit GDPR request:', error);
      throw new Error('Failed to submit GDPR request');
    }

    // Log audit event
    await logUserAuditEvent({
      userId: userId,
      actorUserId: userId,
      eventType: `gdpr.request_submitted`,
      payload: { request_type: requestType, request_id: data.id },
    });

    return data as GDPRRequest;
  }

  /**
   * Get user's GDPR requests
   */
  static async getGDPRRequests(userId: string): Promise<GDPRRequest[]> {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ProfileService] Failed to get GDPR requests:', error);
      return [];
    }

    return data as GDPRRequest[];
  }

  /**
   * Get data access log
   */
  static async getDataAccessLog(userId: string, limit = 100): Promise<DataAccessLogEntry[]> {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
      .from('data_access_log')
      .select('*')
      .eq('subject_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ProfileService] Failed to get data access log:', error);
      return [];
    }

    return data as DataAccessLogEntry[];
  }

  // ---------------------------------------------------------------------------
  // ACTIVITY
  // ---------------------------------------------------------------------------

  /**
   * Get recent activity
   */
  static async getRecentActivity(userId: string, limit = 50): Promise<ActivityEntry[]> {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
      .from('user_audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ProfileService] Failed to get activity:', error);
      return [];
    }

    return (data || []).map((entry) => ({
      id: entry.id,
      user_id: entry.user_id || userId,
      event_type: entry.event_type,
      description: entry.event_type, // Could be enhanced with i18n
      metadata: (entry.payload || {}) as Record<string, unknown>,
      created_at: entry.created_at,
    })) as ActivityEntry[];
  }

  /**
   * Get profile change log
   * Note: Uses user_audit_logs filtered by profile events as profile_change_log table may not exist
   */
  static async getProfileChangeLog(userId: string, limit = 100): Promise<ProfileChangeLogEntry[]> {
    const supabase = await createServerRlsClient();

    // Use user_audit_logs filtered by profile-related events
    const { data, error } = await supabase
      .from('user_audit_logs')
      .select('*')
      .eq('user_id', userId)
      .like('event_type', 'profile.%')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ProfileService] Failed to get profile change log:', error);
      return [];
    }

    // Map audit logs to ProfileChangeLogEntry format
    return (data || []).map(entry => ({
      id: entry.id,
      user_id: entry.user_id || userId,
      field_name: (entry.payload as Record<string, unknown>)?.field_name as string || entry.event_type,
      old_value: ((entry.payload as Record<string, unknown>)?.old_value as string) ?? null,
      new_value: ((entry.payload as Record<string, unknown>)?.new_value as string) ?? null,
      change_type: 'updated' as const,
      changed_by: entry.actor_user_id || userId,
      ip_address: (entry.payload as Record<string, unknown>)?.ip_address as string || null,
      created_at: entry.created_at,
    })) as unknown as ProfileChangeLogEntry[];
  }
}

export default ProfileService;
