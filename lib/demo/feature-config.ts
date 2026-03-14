/**
 * Demo Feature Configuration — Single Source of Truth
 *
 * Canonical list of features disabled in the free demo tier.
 * Imported by DemoFeatureGate (client), demo-detection (server), and FeatureGateMap.
 * Any change here automatically propagates to all gate layers.
 */

/**
 * Features locked in the free demo tier.
 * Premium tier gets all features unlocked.
 */
export const FREE_TIER_DISABLED_FEATURES = [
  'export_data',
  'invite_users',
  'modify_tenant_settings',
  'access_billing',
  'create_public_sessions',
  'advanced_analytics',
  'custom_branding',
] as const;

export type DisabledDemoFeature = (typeof FREE_TIER_DISABLED_FEATURES)[number];

/**
 * Check if a feature is locked in the free demo tier.
 */
export function isFreeTierLocked(feature: string): boolean {
  return (FREE_TIER_DISABLED_FEATURES as readonly string[]).includes(feature);
}
