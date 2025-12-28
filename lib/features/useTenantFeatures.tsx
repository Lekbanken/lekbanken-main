'use client';

import { useMemo } from 'react';
import type { Tenant } from '@/types/tenant';
import {
  type FeatureFlag,
  type QuotaKey,
  type SubscriptionTier,
  type TenantFeatureConfig,
  parseTenantFeatureConfig,
  isFeatureEnabled,
  getQuotaLimit,
  isWithinQuota,
  getEnabledFeatures,
  getRemainingQuota,
} from '@/lib/features/tenant-features';

type UseTenantFeaturesProps = {
  tenant: Tenant | null;
};

type UseTenantFeaturesReturn = {
  /** Check if a specific feature is enabled */
  hasFeature: (flag: FeatureFlag) => boolean;
  /** Get quota limit for a key */
  getLimit: (key: QuotaKey) => number;
  /** Check if usage is within quota */
  checkQuota: (key: QuotaKey, currentUsage: number) => boolean;
  /** Get remaining quota (null = unlimited) */
  remaining: (key: QuotaKey, currentUsage: number) => number | null;
  /** Get all enabled features */
  enabledFeatures: FeatureFlag[];
  /** Current subscription tier */
  tier: SubscriptionTier;
  /** Raw feature config */
  config: TenantFeatureConfig;
  /** Is the tenant on a paid tier */
  isPaid: boolean;
  /** Is the tenant on enterprise tier */
  isEnterprise: boolean;
};

/**
 * Hook to access tenant feature flags and quotas
 * 
 * @example
 * ```tsx
 * const { hasFeature, checkQuota } = useTenantFeatures({ tenant });
 * 
 * if (!hasFeature('triggers_enabled')) {
 *   return <UpgradePrompt feature="triggers" />;
 * }
 * 
 * if (!checkQuota('max_games', currentGameCount)) {
 *   return <QuotaExceeded quota="games" />;
 * }
 * ```
 */
export function useTenantFeatures({ tenant }: UseTenantFeaturesProps): UseTenantFeaturesReturn {
  const tier = useMemo<SubscriptionTier>(() => {
    if (!tenant) return 'free';
    const tierString = tenant.subscription_tier?.toLowerCase();
    if (tierString === 'starter') return 'starter';
    if (tierString === 'pro') return 'pro';
    if (tierString === 'enterprise') return 'enterprise';
    if (tierString === 'unlimited') return 'unlimited';
    return 'free';
  }, [tenant]);

  const config = useMemo<TenantFeatureConfig>(() => {
    if (!tenant?.metadata) return {};
    return parseTenantFeatureConfig(tenant.metadata as Record<string, unknown>);
  }, [tenant]);

  const enabledFeatures = useMemo(
    () => getEnabledFeatures(tier, config),
    [tier, config]
  );

  const hasFeature = useMemo(
    () => (flag: FeatureFlag) => isFeatureEnabled(flag, tier, config),
    [tier, config]
  );

  const getLimit = useMemo(
    () => (key: QuotaKey) => getQuotaLimit(key, tier, config),
    [tier, config]
  );

  const checkQuota = useMemo(
    () => (key: QuotaKey, currentUsage: number) => isWithinQuota(key, currentUsage, tier, config),
    [tier, config]
  );

  const remaining = useMemo(
    () => (key: QuotaKey, currentUsage: number) => getRemainingQuota(key, currentUsage, tier, config),
    [tier, config]
  );

  const isPaid = tier !== 'free';
  const isEnterprise = tier === 'enterprise' || tier === 'unlimited';

  return {
    hasFeature,
    getLimit,
    checkQuota,
    remaining,
    enabledFeatures,
    tier,
    config,
    isPaid,
    isEnterprise,
  };
}

/**
 * Component to conditionally render based on feature flag
 */
export function FeatureGate({
  feature,
  tenant,
  children,
  fallback,
}: {
  feature: FeatureFlag;
  tenant: Tenant | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasFeature } = useTenantFeatures({ tenant });
  
  if (hasFeature(feature)) {
    return <>{children}</>;
  }
  
  return fallback ? <>{fallback}</> : null;
}

/**
 * Component to show quota usage
 */
export function QuotaIndicator({
  quotaKey,
  currentUsage,
  tenant,
  showBar = true,
}: {
  quotaKey: QuotaKey;
  currentUsage: number;
  tenant: Tenant | null;
  showBar?: boolean;
}) {
  const { getLimit, remaining } = useTenantFeatures({ tenant });
  const limit = getLimit(quotaKey);
  const rem = remaining(quotaKey, currentUsage);
  
  if (limit === -1) {
    return (
      <span className="text-sm text-muted-foreground">
        {currentUsage} (obegränsad)
      </span>
    );
  }
  
  const percentage = Math.min(100, (currentUsage / limit) * 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className={isAtLimit ? 'text-destructive' : isNearLimit ? 'text-amber-500' : 'text-foreground'}>
          {currentUsage} / {limit}
        </span>
        {rem !== null && (
          <span className="text-muted-foreground">
            {rem} kvar
          </span>
        )}
      </div>
      {showBar && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
