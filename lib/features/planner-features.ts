/**
 * Planner Feature Flags
 * 
 * Controls rollout of Planner v2 UI features.
 * Integrates with tenant feature system for gradual rollout.
 */

// =============================================================================
// Feature Flag Definitions
// =============================================================================

/** Planner-specific feature flags */
export type PlannerFeatureFlag =
  | 'planner_v2'        // Master toggle for new Planner UI
  | 'planner_calendar'  // Calendar view with scheduling (Phase 3)
  | 'planner_gestures'; // Advanced touch gestures (Phase 4)

/** All planner feature flags with metadata */
export const PLANNER_FEATURES: Record<PlannerFeatureFlag, {
  name: string;
  description: string;
  phase: 1 | 2 | 3 | 4;
  defaultEnabled: boolean;
}> = {
  planner_v2: {
    name: 'Planner v2 UI',
    description: 'New mobile-first planner interface with AppShell integration',
    phase: 1,
    defaultEnabled: true,
  },
  planner_calendar: {
    name: 'Planner Calendar',
    description: 'Calendar view for scheduling and viewing plan executions',
    phase: 3,
    defaultEnabled: true,
  },
  planner_gestures: {
    name: 'Advanced Gestures',
    description: 'Long-press, pinch-to-zoom, and haptic feedback',
    phase: 4,
    defaultEnabled: true,
  },
};

// =============================================================================
// Feature Flag Storage
// =============================================================================

/** 
 * Storage interface for feature flags.
 * Can be implemented with different backends:
 * - localStorage (client-side dev testing)
 * - tenant.metadata (per-tenant)
 * - user.metadata (per-user)
 * - environment variables (global)
 */
interface PlannerFeatureStorage {
  get(flag: PlannerFeatureFlag): boolean | undefined;
  set(flag: PlannerFeatureFlag, enabled: boolean): void;
}

/** Environment variable storage (global) */
const envStorage: PlannerFeatureStorage = {
  get(flag) {
    if (typeof process === 'undefined') return undefined;
    const envKey = `NEXT_PUBLIC_${flag.toUpperCase()}`;
    const value = process.env[envKey];
    if (value === undefined) return undefined;
    return value === 'true' || value === '1';
  },
  set() {
    // Environment variables are read-only
    console.warn('Cannot set environment variable feature flags at runtime');
  },
};

/** Local storage (client-side dev testing) */
const localStorageStorage: PlannerFeatureStorage = {
  get(flag) {
    if (typeof window === 'undefined') return undefined;
    const value = localStorage.getItem(`feature:${flag}`);
    if (value === null) return undefined;
    return value === 'true';
  },
  set(flag, enabled) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`feature:${flag}`, String(enabled));
  },
};

// =============================================================================
// Feature Flag Checking
// =============================================================================

/**
 * Check if a planner feature flag is enabled.
 * 
 * Priority order:
 * 1. Environment variable (NEXT_PUBLIC_PLANNER_V2=true)
 * 2. localStorage override (for dev testing)
 * 3. Tenant metadata (future: when integrated)
 * 4. Default value from PLANNER_FEATURES
 * 
 * @example
 * if (isPlannerFeatureEnabled('planner_v2')) {
 *   return <PlannerV2 />;
 * }
 * return <PlannerLegacy />;
 */
export function isPlannerFeatureEnabled(flag: PlannerFeatureFlag): boolean {
  // 1. Check environment variable
  const envValue = envStorage.get(flag);
  if (envValue !== undefined) {
    return envValue;
  }

  // 2. Check localStorage (dev override)
  if (typeof window !== 'undefined') {
    const localValue = localStorageStorage.get(flag);
    if (localValue !== undefined) {
      return localValue;
    }
  }

  // 3. TODO: Check tenant/user metadata when integrated
  // const tenantValue = getTenantFeature(flag);
  // if (tenantValue !== undefined) return tenantValue;

  // 4. Return default
  return PLANNER_FEATURES[flag].defaultEnabled;
}

/**
 * Override a feature flag (for dev testing).
 * Only works in browser environment.
 */
export function setPlannerFeatureOverride(flag: PlannerFeatureFlag, enabled: boolean): void {
  localStorageStorage.set(flag, enabled);
}

/**
 * Clear a feature flag override.
 */
export function clearPlannerFeatureOverride(flag: PlannerFeatureFlag): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`feature:${flag}`);
}

/**
 * Clear all feature flag overrides.
 */
export function clearAllPlannerFeatureOverrides(): void {
  if (typeof window === 'undefined') return;
  Object.keys(PLANNER_FEATURES).forEach((flag) => {
    localStorage.removeItem(`feature:${flag}`);
  });
}

// =============================================================================
// React Hook
// =============================================================================

/**
 * React hook for checking planner feature flags.
 * Re-renders when localStorage changes (for dev testing).
 * 
 * @example
 * function PlannerPage() {
 *   const { isEnabled, toggle } = usePlannerFeature('planner_v2');
 *   
 *   if (isEnabled) {
 *     return <PlannerV2 />;
 *   }
 *   return <PlannerLegacy />;
 * }
 */
export function usePlannerFeature(flag: PlannerFeatureFlag) {
  // In SSR, just return the computed value without useState to avoid hydration issues
  const isEnabled = isPlannerFeatureEnabled(flag);
  
  return {
    isEnabled,
    toggle: () => setPlannerFeatureOverride(flag, !isEnabled),
    enable: () => setPlannerFeatureOverride(flag, true),
    disable: () => setPlannerFeatureOverride(flag, false),
    reset: () => clearPlannerFeatureOverride(flag),
  };
}
