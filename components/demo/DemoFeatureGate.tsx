/**
 * Demo Feature Gate Component
 * Locks premium features in free demo tier
 * Shows upgrade message to unlock
 */

'use client';

import { useIsDemo, useDemoTier, useConvertDemo } from '@/hooks/useIsDemo';
import { LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { ReactNode } from 'react';

interface DemoFeatureGateProps {
  children: ReactNode;
  feature: string;
  fallback?: ReactNode;
  message?: string;
  premiumOnly?: boolean; // If true, show even for premium tier
}

/**
 * Feature Gate - Wraps components that should be locked in demo
 *
 * Usage:
 * <DemoFeatureGate feature="export_data">
 *   <ExportButton />
 * </DemoFeatureGate>
 */
export function DemoFeatureGate({
  children,
  feature,
  fallback,
  message,
  premiumOnly = false,
}: DemoFeatureGateProps) {
  const { isDemoMode } = useIsDemo();
  const tier = useDemoTier();
  const convertDemo = useConvertDemo();

  // If not in demo, show content
  if (!isDemoMode) {
    return <>{children}</>;
  }

  // If premium tier and not premiumOnly, show content
  if (tier === 'premium' && !premiumOnly) {
    return <>{children}</>;
  }

  // Free tier restrictions
  const FREE_TIER_DISABLED_FEATURES = [
    'export_data',
    'invite_users',
    'modify_tenant_settings',
    'access_billing',
    'create_public_sessions',
    'advanced_analytics',
    'custom_branding',
  ];

  const isLocked = tier === 'free' && FREE_TIER_DISABLED_FEATURES.includes(feature);

  if (!isLocked) {
    return <>{children}</>;
  }

  // Feature is locked - show fallback or default locked UI
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default locked UI with overlay
  return (
    <div className="relative">
      {/* Blurred/disabled content */}
      <div className="pointer-events-none opacity-40 blur-sm" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
        <div className="text-center max-w-sm px-6 py-8">
          <LockClosedIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Premium Feature
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {message || 'This feature is not available in the free demo tier.'}
          </p>
          <button
            onClick={async () => {
              await convertDemo('contact_sales', undefined, {
                source: 'feature_gate',
                feature,
              });
              window.location.href = '/contact';
            }}
            className="
              inline-flex items-center gap-2
              px-4 py-2
              bg-blue-600 text-white
              hover:bg-blue-700
              font-medium text-sm
              rounded-md
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            "
          >
            <SparklesIcon className="h-4 w-4" aria-hidden="true" />
            Contact Sales to Unlock
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Simpler version for buttons/links
 * Shows disabled state with tooltip
 */
interface DemoButtonGateProps {
  children: ReactNode;
  feature: string;
  tooltip?: string;
}

export function DemoButtonGate({ children, feature, tooltip }: DemoButtonGateProps) {
  const { isDemoMode } = useIsDemo();
  const tier = useDemoTier();

  // If not in demo or premium, show normally
  if (!isDemoMode || tier === 'premium') {
    return <>{children}</>;
  }

  // Check if feature is disabled
  const FREE_TIER_DISABLED_FEATURES = [
    'export_data',
    'invite_users',
    'modify_tenant_settings',
    'access_billing',
    'create_public_sessions',
    'advanced_analytics',
    'custom_branding',
  ];

  const isLocked = FREE_TIER_DISABLED_FEATURES.includes(feature);

  if (!isLocked) {
    return <>{children}</>;
  }

  // Show disabled button with lock icon
  return (
    <div className="relative inline-block group">
      <div className="pointer-events-none opacity-50" aria-disabled="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <LockClosedIcon className="h-4 w-4 text-gray-500" aria-hidden="true" />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2
            px-3 py-2
            bg-gray-900 text-white text-xs rounded
            whitespace-nowrap
            opacity-0 group-hover:opacity-100
            transition-opacity
            pointer-events-none
            z-10
          "
          role="tooltip"
        >
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

/**
 * Feature availability badge
 * Shows "Free" or "Premium" label
 */
interface DemoFeatureBadgeProps {
  feature: string;
  className?: string;
}

export function DemoFeatureBadge({ feature, className = '' }: DemoFeatureBadgeProps) {
  const { isDemoMode } = useIsDemo();

  if (!isDemoMode) {
    return null;
  }

  const FREE_TIER_DISABLED_FEATURES = [
    'export_data',
    'invite_users',
    'modify_tenant_settings',
    'access_billing',
    'create_public_sessions',
    'advanced_analytics',
    'custom_branding',
  ];

  const isPremium = FREE_TIER_DISABLED_FEATURES.includes(feature);

  return (
    <span
      className={`
        inline-flex items-center gap-1
        px-2 py-1
        text-xs font-medium rounded
        ${isPremium ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}
        ${className}
      `}
    >
      {isPremium && <SparklesIcon className="h-3 w-3" aria-hidden="true" />}
      {isPremium ? 'Premium' : 'Free'}
    </span>
  );
}
