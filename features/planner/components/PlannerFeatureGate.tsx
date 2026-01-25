'use client';

import type { ReactNode } from 'react';
import { usePlannerFeature, type PlannerFeatureFlag } from '@/lib/features/planner-features';

// =============================================================================
// Feature Gate Component
// =============================================================================

interface PlannerFeatureGateProps {
  flag: PlannerFeatureFlag;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally render content based on feature flag.
 * 
 * @example
 * <PlannerFeatureGate flag="planner_v2" fallback={<PlannerLegacy />}>
 *   <PlannerV2 />
 * </PlannerFeatureGate>
 */
export function PlannerFeatureGate({ flag, children, fallback = null }: PlannerFeatureGateProps) {
  const { isEnabled } = usePlannerFeature(flag);
  return isEnabled ? <>{children}</> : <>{fallback}</>;
}
