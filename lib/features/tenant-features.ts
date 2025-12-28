/**
 * Tenant Feature Flags & Quotas System
 * 
 * Stores feature configuration in tenant.metadata JSONB column.
 * Provides type-safe access to feature flags and quota limits.
 */

// =============================================================================
// Feature Flag Definitions
// =============================================================================

/** All available feature flags */
export type FeatureFlag =
  | 'triggers_enabled'           // Can use trigger automation
  | 'time_bank_enabled'          // Can use time bank feature
  | 'signals_enabled'            // Can send signals
  | 'decisions_enabled'          // Can create polls/votes
  | 'artifacts_enabled'          // Can create artifacts
  | 'roles_enabled'              // Can define custom roles
  | 'phases_enabled'             // Can define game phases
  | 'snapshots_enabled'          // Can create game snapshots
  | 'analytics_enabled'          // Can view analytics dashboard
  | 'replay_enabled'             // Can replay sessions
  | 'csv_import_enabled'         // Can import from CSV
  | 'csv_export_enabled'         // Can export to CSV
  | 'api_access_enabled'         // Can use public API
  | 'webhooks_enabled'           // Can configure webhooks
  | 'custom_branding_enabled'    // Can customize theme/branding
  | 'white_label_enabled'        // Full white-label mode
  | 'sso_enabled'                // Single Sign-On
  | 'advanced_triggers_enabled'  // Complex trigger conditions
  | 'multiplayer_enabled'        // Multi-device play
  | 'leaderboard_enabled';       // Gamification leaderboards

/** Quota limit definitions */
export type QuotaKey =
  | 'max_games'                  // Max games tenant can create
  | 'max_sessions_per_month'     // Monthly session limit
  | 'max_participants_per_session' // Participants per session
  | 'max_triggers_per_game'      // Triggers per game
  | 'max_artifacts_per_game'     // Artifacts per game
  | 'max_decisions_per_game'     // Decisions per game
  | 'max_roles_per_game'         // Roles per game
  | 'max_steps_per_game'         // Steps per game
  | 'max_storage_mb'             // Storage quota in MB
  | 'max_api_requests_per_day'   // API rate limit
  | 'session_duration_max_hours'; // Max session duration

// =============================================================================
// Default Values by Tier
// =============================================================================

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise' | 'unlimited';

/** Default feature flags per tier */
export const DEFAULT_FEATURES: Record<SubscriptionTier, FeatureFlag[]> = {
  free: [
    'artifacts_enabled',
    'roles_enabled',
    'phases_enabled',
  ],
  starter: [
    'artifacts_enabled',
    'roles_enabled',
    'phases_enabled',
    'triggers_enabled',
    'decisions_enabled',
    'analytics_enabled',
    'csv_export_enabled',
  ],
  pro: [
    'artifacts_enabled',
    'roles_enabled',
    'phases_enabled',
    'triggers_enabled',
    'time_bank_enabled',
    'signals_enabled',
    'decisions_enabled',
    'snapshots_enabled',
    'analytics_enabled',
    'replay_enabled',
    'csv_import_enabled',
    'csv_export_enabled',
    'custom_branding_enabled',
    'advanced_triggers_enabled',
    'multiplayer_enabled',
    'leaderboard_enabled',
  ],
  enterprise: [
    'artifacts_enabled',
    'roles_enabled',
    'phases_enabled',
    'triggers_enabled',
    'time_bank_enabled',
    'signals_enabled',
    'decisions_enabled',
    'snapshots_enabled',
    'analytics_enabled',
    'replay_enabled',
    'csv_import_enabled',
    'csv_export_enabled',
    'custom_branding_enabled',
    'advanced_triggers_enabled',
    'multiplayer_enabled',
    'leaderboard_enabled',
    'api_access_enabled',
    'webhooks_enabled',
    'sso_enabled',
    'white_label_enabled',
  ],
  unlimited: [
    'artifacts_enabled',
    'roles_enabled',
    'phases_enabled',
    'triggers_enabled',
    'time_bank_enabled',
    'signals_enabled',
    'decisions_enabled',
    'snapshots_enabled',
    'analytics_enabled',
    'replay_enabled',
    'csv_import_enabled',
    'csv_export_enabled',
    'custom_branding_enabled',
    'advanced_triggers_enabled',
    'multiplayer_enabled',
    'leaderboard_enabled',
    'api_access_enabled',
    'webhooks_enabled',
    'sso_enabled',
    'white_label_enabled',
  ],
};

/** Default quotas per tier */
export const DEFAULT_QUOTAS: Record<SubscriptionTier, Partial<Record<QuotaKey, number>>> = {
  free: {
    max_games: 3,
    max_sessions_per_month: 10,
    max_participants_per_session: 20,
    max_triggers_per_game: 5,
    max_artifacts_per_game: 10,
    max_decisions_per_game: 3,
    max_roles_per_game: 4,
    max_steps_per_game: 20,
    max_storage_mb: 100,
    max_api_requests_per_day: 0,
    session_duration_max_hours: 2,
  },
  starter: {
    max_games: 10,
    max_sessions_per_month: 50,
    max_participants_per_session: 50,
    max_triggers_per_game: 20,
    max_artifacts_per_game: 30,
    max_decisions_per_game: 10,
    max_roles_per_game: 8,
    max_steps_per_game: 50,
    max_storage_mb: 500,
    max_api_requests_per_day: 100,
    session_duration_max_hours: 4,
  },
  pro: {
    max_games: 50,
    max_sessions_per_month: 200,
    max_participants_per_session: 100,
    max_triggers_per_game: 100,
    max_artifacts_per_game: 100,
    max_decisions_per_game: 50,
    max_roles_per_game: 20,
    max_steps_per_game: 200,
    max_storage_mb: 2000,
    max_api_requests_per_day: 1000,
    session_duration_max_hours: 8,
  },
  enterprise: {
    max_games: 500,
    max_sessions_per_month: 2000,
    max_participants_per_session: 500,
    max_triggers_per_game: 500,
    max_artifacts_per_game: 500,
    max_decisions_per_game: 200,
    max_roles_per_game: 50,
    max_steps_per_game: 500,
    max_storage_mb: 10000,
    max_api_requests_per_day: 10000,
    session_duration_max_hours: 24,
  },
  unlimited: {
    max_games: -1, // -1 = unlimited
    max_sessions_per_month: -1,
    max_participants_per_session: -1,
    max_triggers_per_game: -1,
    max_artifacts_per_game: -1,
    max_decisions_per_game: -1,
    max_roles_per_game: -1,
    max_steps_per_game: -1,
    max_storage_mb: -1,
    max_api_requests_per_day: -1,
    session_duration_max_hours: -1,
  },
};

// =============================================================================
// Tenant Configuration Schema
// =============================================================================

/** Feature configuration stored in tenant.metadata */
export interface TenantFeatureConfig {
  /** Explicit feature overrides (true = enabled, false = disabled) */
  features?: Partial<Record<FeatureFlag, boolean>>;
  /** Quota overrides */
  quotas?: Partial<Record<QuotaKey, number>>;
  /** Beta features this tenant has access to */
  beta_features?: string[];
  /** Custom limits that don't fit standard quotas */
  custom_limits?: Record<string, number>;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse tenant metadata to extract feature config
 */
export function parseTenantFeatureConfig(
  metadata: Record<string, unknown> | null
): TenantFeatureConfig {
  if (!metadata) return {};
  return {
    features: (metadata.features as TenantFeatureConfig['features']) || {},
    quotas: (metadata.quotas as TenantFeatureConfig['quotas']) || {},
    beta_features: (metadata.beta_features as string[]) || [],
    custom_limits: (metadata.custom_limits as Record<string, number>) || {},
  };
}

/**
 * Check if a feature is enabled for a tenant
 */
export function isFeatureEnabled(
  flag: FeatureFlag,
  tier: SubscriptionTier,
  config: TenantFeatureConfig
): boolean {
  // Check explicit override first
  if (config.features && flag in config.features) {
    return config.features[flag] === true;
  }
  
  // Fall back to tier defaults
  return DEFAULT_FEATURES[tier]?.includes(flag) ?? false;
}

/**
 * Get quota limit for a tenant
 */
export function getQuotaLimit(
  key: QuotaKey,
  tier: SubscriptionTier,
  config: TenantFeatureConfig
): number {
  // Check explicit override first
  if (config.quotas && key in config.quotas) {
    return config.quotas[key] ?? 0;
  }
  
  // Fall back to tier defaults
  return DEFAULT_QUOTAS[tier]?.[key] ?? 0;
}

/**
 * Check if quota allows an action
 * @returns true if within quota, false if exceeded
 */
export function isWithinQuota(
  key: QuotaKey,
  currentUsage: number,
  tier: SubscriptionTier,
  config: TenantFeatureConfig
): boolean {
  const limit = getQuotaLimit(key, tier, config);
  if (limit === -1) return true; // Unlimited
  return currentUsage < limit;
}

/**
 * Get all enabled features for a tenant
 */
export function getEnabledFeatures(
  tier: SubscriptionTier,
  config: TenantFeatureConfig
): FeatureFlag[] {
  const tierDefaults = DEFAULT_FEATURES[tier] || [];
  const result = new Set<FeatureFlag>(tierDefaults);
  
  // Apply overrides
  if (config.features) {
    for (const [flag, enabled] of Object.entries(config.features)) {
      if (enabled) {
        result.add(flag as FeatureFlag);
      } else {
        result.delete(flag as FeatureFlag);
      }
    }
  }
  
  return Array.from(result);
}

/**
 * Get remaining quota
 */
export function getRemainingQuota(
  key: QuotaKey,
  currentUsage: number,
  tier: SubscriptionTier,
  config: TenantFeatureConfig
): number | null {
  const limit = getQuotaLimit(key, tier, config);
  if (limit === -1) return null; // Unlimited
  return Math.max(0, limit - currentUsage);
}

/**
 * Build metadata update for feature changes
 */
export function buildFeatureMetadataUpdate(
  currentMetadata: Record<string, unknown> | null,
  updates: Partial<TenantFeatureConfig>
): Record<string, unknown> {
  const config = parseTenantFeatureConfig(currentMetadata);
  return {
    ...currentMetadata,
    features: { ...config.features, ...updates.features },
    quotas: { ...config.quotas, ...updates.quotas },
    beta_features: updates.beta_features ?? config.beta_features,
    custom_limits: { ...config.custom_limits, ...updates.custom_limits },
  };
}
