/**
 * User Profile Domain Types
 * Enterprise-grade type definitions for the complete user profile system
 */

import { z } from 'zod';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export const LANGUAGES = ['NO', 'SE', 'EN'] as const;
export type LanguageCode = (typeof LANGUAGES)[number];

export const THEMES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEMES)[number];

export const PROFILE_VISIBILITY = ['public', 'private', 'organization'] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITY)[number];

export const EMAIL_FREQUENCIES = ['real-time', 'hourly', 'daily', 'weekly', 'never'] as const;
export type EmailFrequency = (typeof EMAIL_FREQUENCIES)[number];

export const NOTIFICATION_CHANNELS = ['email', 'push', 'sms', 'in_app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const CONSENT_TYPES = ['essential', 'functional', 'analytics', 'marketing', 'special_category', 'parental'] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export const GDPR_REQUEST_TYPES = ['access', 'rectification', 'erasure', 'restriction', 'portability', 'objection'] as const;
export type GDPRRequestType = (typeof GDPR_REQUEST_TYPES)[number];

export const GDPR_REQUEST_STATUS = ['pending', 'in_progress', 'completed', 'rejected', 'cancelled'] as const;
export type GDPRRequestStatus = (typeof GDPR_REQUEST_STATUS)[number];

export const TEXT_SIZES = ['small', 'medium', 'large', 'extra-large'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const TIME_FORMATS = ['12h', '24h'] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

// =============================================================================
// USER & PROFILE TYPES
// =============================================================================

/**
 * Core user from auth.users / public.users
 */
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  language: LanguageCode;
  avatar_url: string | null;
  preferred_theme: ThemePreference;
  show_theme_toggle_in_header: boolean;
  global_role: 'system_admin' | 'private_user' | 'demo_private_user' | 'member';
  email_verified: boolean;
  mfa_enforced: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Extended user profile (user_profiles table)
 */
export interface UserProfile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  backup_email: string | null;
  job_title: string | null;
  organisation: string | null;
  bio: string | null;
  timezone: string;
  locale: string | null;
  avatar_url: string | null;
  cover_photo_url: string | null;
  birth_date: string | null;
  pronouns: string | null;
  location: string | null;
  social_links: SocialLinks;
  profile_visibility: ProfileVisibility;
  show_email: boolean;
  show_phone: boolean;
  onboarding_completed: boolean;
  last_seen_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  github?: string;
  website?: string;
  [key: string]: string | undefined;
}

/**
 * Combined profile data for UI
 */
export interface CompleteProfile {
  user: User;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  notifications: NotificationSettings | null;
  organizations: OrganizationMembership[];
  mfa: MFAStatus | null;
}

// =============================================================================
// PREFERENCES TYPES
// =============================================================================

/**
 * User preferences (user_preferences table)
 */
export interface UserPreferences {
  id: string;
  user_id: string;
  tenant_id: string | null;
  
  // Localization
  language: string | null;
  theme: ThemePreference;
  timezone: string;
  date_format: DateFormat;
  time_format: TimeFormat;
  first_day_of_week: number; // 0 = Sunday, 1 = Monday
  
  // UI Preferences
  compact_mode: boolean;
  animations_enabled: boolean;
  
  // Accessibility
  high_contrast: boolean;
  reduce_motion: boolean;
  text_size: TextSize;
  screen_reader_mode: boolean;
  
  // Content Preferences
  content_language_preferences: string[];
  content_maturity_level: 'kids' | 'teen' | 'mature' | 'all';
  
  // Privacy
  profile_visibility: ProfileVisibility;
  show_stats_publicly: boolean;
  allow_friend_requests: boolean;
  allow_messages: boolean;
  
  // Recommendations
  enable_recommendations: boolean;
  recommendation_frequency: string;
  
  // Keyboard
  keyboard_shortcuts_enabled: boolean;
  custom_shortcuts: Record<string, string>;
  
  created_at: string;
  updated_at: string;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

/**
 * Notification settings
 */
export interface NotificationSettings {
  id: string;
  user_id: string;
  
  // Email Notifications
  email_enabled: boolean;
  email_activity: boolean;
  email_mentions: boolean;
  email_comments: boolean;
  email_updates: boolean;
  email_marketing: boolean;
  email_digest: EmailFrequency;
  
  // Push Notifications
  push_enabled: boolean;
  push_activity: boolean;
  push_mentions: boolean;
  push_comments: boolean;
  
  // SMS Notifications
  sms_enabled: boolean;
  sms_security_alerts: boolean;
  sms_important_updates: boolean;
  
  // In-App Notifications
  inapp_enabled: boolean;
  inapp_sound: boolean;
  
  // Do Not Disturb
  dnd_enabled: boolean;
  dnd_start_time: string | null; // HH:MM format
  dnd_end_time: string | null;
  dnd_days: number[]; // [0, 6] for Sunday, Saturday
  
  created_at: string;
  updated_at: string;
}

/**
 * Notification category for UI
 */
export interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
    inapp: boolean;
  };
}

// =============================================================================
// SECURITY TYPES
// =============================================================================

/**
 * User session
 */
export interface UserSession {
  id: string;
  user_id: string;
  supabase_session_id: string | null;
  device_id: string | null;
  device_name: string | null;
  device_type: 'desktop' | 'mobile' | 'tablet' | null;
  browser: string | null;
  os: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  is_current: boolean;
  is_trusted: boolean;
  last_seen_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

/**
 * Login history entry
 */
export interface LoginHistoryEntry {
  id: string;
  user_id: string;
  success: boolean;
  method: 'password' | 'oauth' | 'magic_link' | 'mfa' | 'sso';
  provider: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_info: Record<string, unknown> | null;
  country: string | null;
  city: string | null;
  failure_reason: string | null;
  created_at: string;
}

/**
 * MFA status
 */
export interface MFAStatus {
  is_enabled: boolean;
  enrolled_at: string | null;
  last_verified_at: string | null;
  factors: MFAFactor[];
  recovery_codes_remaining: number;
}

export interface MFAFactor {
  id: string;
  type: 'totp' | 'phone' | 'webauthn';
  status: 'verified' | 'unverified';
  friendly_name: string | null;
  created_at: string;
}

/**
 * Trusted device
 */
export interface TrustedDevice {
  id: string;
  device_fingerprint: string | null;
  user_agent: string | null;
  device_type: string | null;
  device_name: string | null;
  ip_last: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_current: boolean;
}

// =============================================================================
// ORGANIZATION TYPES
// =============================================================================

export interface OrganizationMembership {
  id: string;
  user_id: string;
  tenant_id: string;
  role: 'owner' | 'admin' | 'editor' | 'member';
  is_primary: boolean;
  status: 'active' | 'pending' | 'suspended';
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
  };
  created_at: string;
}

export interface OrganizationInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invited_by: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  expires_at: string;
  created_at: string;
}

// =============================================================================
// GDPR & PRIVACY TYPES
// =============================================================================

/**
 * User consent record
 */
export interface UserConsent {
  id: string;
  user_id: string;
  tenant_id: string | null;
  consent_type: ConsentType;
  purpose: string;
  granted: boolean;
  policy_version: string;
  granted_at: string | null;
  withdrawn_at: string | null;
  expires_at: string | null;
  parental_consent: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GDPR request
 */
export interface GDPRRequest {
  id: string;
  user_id: string;
  tenant_id: string | null;
  request_type: GDPRRequestType;
  status: GDPRRequestStatus;
  request_details: Record<string, unknown> | null;
  response_details: Record<string, unknown> | null;
  rejection_reason: string | null;
  handled_by: string | null;
  requested_at: string;
  acknowledged_at: string | null;
  completed_at: string | null;
  response_deadline: string;
  created_at: string;
  updated_at: string;
}

/**
 * Data access log entry (for transparency)
 */
export interface DataAccessLogEntry {
  id: string;
  accessor_user_id: string | null;
  accessor_role: string | null;
  subject_user_id: string;
  data_category: string;
  fields_accessed: string[];
  operation: 'read' | 'create' | 'update' | 'delete' | 'export' | 'bulk_read';
  legal_basis: string | null;
  purpose: string | null;
  created_at: string;
}

/**
 * Profile change log entry
 */
export interface ProfileChangeLogEntry {
  id: string;
  user_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_type: 'created' | 'updated' | 'deleted';
  changed_by: string | null;
  ip_address: string | null;
  created_at: string;
}

/**
 * Activity log entry (for activity page)
 */
export interface ActivityLogEntry {
  id: string;
  user_id: string;
  action: string;
  details?: Record<string, unknown> | string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// =============================================================================
// CONNECTED ACCOUNTS & INTEGRATIONS
// =============================================================================

export interface ConnectedAccount {
  id: string;
  user_id: string;
  provider: 'google' | 'microsoft' | 'github' | 'facebook' | 'linkedin';
  provider_account_id: string;
  provider_account_email: string | null;
  scopes: string[];
  is_primary: boolean;
  is_active: boolean;
  connected_at: string;
  last_used_at: string | null;
}

export interface APIKey {
  id: string;
  user_id: string;
  tenant_id: string | null;
  name: string;
  key_prefix: string; // First 8 chars (visible)
  scopes: string[];
  last_used_at: string | null;
  usage_count: number;
  rate_limit: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface Webhook {
  id: string;
  user_id: string;
  tenant_id: string | null;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  success_count: number;
  failure_count: number;
  created_at: string;
}

// =============================================================================
// ACTIVITY & AUDIT TYPES
// =============================================================================

export interface ActivityEntry {
  id: string;
  user_id: string;
  event_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  actor_user_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// =============================================================================
// FORM SCHEMAS (ZOD)
// =============================================================================

export const updateProfileSchema = z.object({
  display_name: z.string().max(100).optional(),
  first_name: z.string().max(50).optional(),
  last_name: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number').optional().nullable(),
  location: z.string().max(100).optional(),
  pronouns: z.string().max(30).optional(),
  timezone: z.string().optional(),
  profile_visibility: z.enum(PROFILE_VISIBILITY).optional(),
  show_email: z.boolean().optional(),
  show_phone: z.boolean().optional(),
  social_links: z.record(z.string().url().or(z.literal(''))).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updatePreferencesSchema = z.object({
  language: z.enum(LANGUAGES).optional(),
  theme: z.enum(THEMES).optional(),
  timezone: z.string().optional(),
  date_format: z.enum(DATE_FORMATS).optional(),
  time_format: z.enum(TIME_FORMATS).optional(),
  first_day_of_week: z.number().min(0).max(6).optional(),
  compact_mode: z.boolean().optional(),
  animations_enabled: z.boolean().optional(),
  high_contrast: z.boolean().optional(),
  reduce_motion: z.boolean().optional(),
  text_size: z.enum(TEXT_SIZES).optional(),
  keyboard_shortcuts_enabled: z.boolean().optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export const updateNotificationSettingsSchema = z.object({
  email_enabled: z.boolean().optional(),
  email_activity: z.boolean().optional(),
  email_mentions: z.boolean().optional(),
  email_comments: z.boolean().optional(),
  email_updates: z.boolean().optional(),
  email_marketing: z.boolean().optional(),
  email_digest: z.enum(EMAIL_FREQUENCIES).optional(),
  push_enabled: z.boolean().optional(),
  push_activity: z.boolean().optional(),
  push_mentions: z.boolean().optional(),
  push_comments: z.boolean().optional(),
  sms_enabled: z.boolean().optional(),
  sms_security_alerts: z.boolean().optional(),
  inapp_enabled: z.boolean().optional(),
  inapp_sound: z.boolean().optional(),
  dnd_enabled: z.boolean().optional(),
  dnd_start_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  dnd_end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  dnd_days: z.array(z.number().min(0).max(6)).optional(),
});

export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const changeEmailSchema = z.object({
  new_email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required to change email'),
});

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

export const gdprRequestSchema = z.object({
  request_type: z.enum(GDPR_REQUEST_TYPES),
  details: z.string().max(1000).optional(),
});

export type GDPRRequestInput = z.infer<typeof gdprRequestSchema>;

export const consentUpdateSchema = z.object({
  consent_type: z.enum(CONSENT_TYPES),
  purpose: z.string(),
  granted: z.boolean(),
  policy_version: z.string(),
});

export type ConsentUpdateInput = z.infer<typeof consentUpdateSchema>;

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ProfileResponse {
  success: boolean;
  data?: CompleteProfile;
  error?: string;
}

export interface UpdateResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  error?: string;
}

// =============================================================================
// NAVIGATION TYPES
// =============================================================================

export interface ProfileNavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  description?: string;
  badge?: string | number;
}

export const PROFILE_NAV_ITEMS: ProfileNavItem[] = [
  {
    id: 'overview',
    label: 'profile.nav.overview',
    href: '/app/profile',
    icon: 'UserCircleIcon',
    description: 'profile.nav.overviewDesc',
  },
  {
    id: 'general',
    label: 'profile.nav.general',
    href: '/app/profile/general',
    icon: 'UserIcon',
    description: 'profile.nav.generalDesc',
  },
  {
    id: 'account',
    label: 'profile.nav.account',
    href: '/app/profile/account',
    icon: 'AtSymbolIcon',
    description: 'profile.nav.accountDesc',
  },
  {
    id: 'security',
    label: 'profile.nav.security',
    href: '/app/profile/security',
    icon: 'ShieldCheckIcon',
    description: 'profile.nav.securityDesc',
  },
  {
    id: 'privacy',
    label: 'profile.nav.privacy',
    href: '/app/profile/privacy',
    icon: 'LockClosedIcon',
    description: 'profile.nav.privacyDesc',
  },
  {
    id: 'notifications',
    label: 'profile.nav.notifications',
    href: '/app/profile/notifications',
    icon: 'BellIcon',
    description: 'profile.nav.notificationsDesc',
  },
  {
    id: 'preferences',
    label: 'profile.nav.preferences',
    href: '/app/profile/preferences',
    icon: 'Cog6ToothIcon',
    description: 'profile.nav.preferencesDesc',
  },
  {
    id: 'organizations',
    label: 'profile.nav.organizations',
    href: '/app/profile/organizations',
    icon: 'BuildingOfficeIcon',
    description: 'profile.nav.organizationsDesc',
  },
  {
    id: 'activity',
    label: 'profile.nav.activity',
    href: '/app/profile/activity',
    icon: 'ClockIcon',
    description: 'profile.nav.activityDesc',
  },
];
