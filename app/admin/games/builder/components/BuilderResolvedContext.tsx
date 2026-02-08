'use client';

/**
 * BuilderResolvedContext
 *
 * Provides memoized resolveDraft() result to all builder components.
 * This ensures:
 * 1. Single source of truth for validation
 * 2. No duplicate resolves per render
 * 3. Consistent error routing across components
 *
 * @see docs/builder/SPRINT2_WIRING_PLAN.md
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  resolveDraft,
  errorsForEntity,
  errorsForPath,
  firstErrorForPath,
  hasErrorsForEntity,
  entitySeverity,
  type ResolveResult,
} from '@/lib/builder/resolver';
import type { BuilderError, EntityType } from '@/types/builder-error';

// =============================================================================
// Context Types
// =============================================================================

export interface BuilderResolvedContextValue extends ResolveResult {
  /**
   * Helper to get errors for a specific entity type.
   * @example errorsFor('step', stepId)
   */
  errorsFor: (entityType: EntityType, entityId?: string) => BuilderError[];

  /**
   * Helper to get errors by path prefix.
   * @example pathErrors('steps[0].title')
   */
  pathErrors: (pathPrefix: string) => BuilderError[];

  /**
   * Helper to get first error for exact path.
   * @example firstError('core.name')
   */
  firstError: (path: string) => BuilderError | undefined;

  /**
   * Check if entity has any errors.
   * @example hasErrors('artifact', artifactId)
   */
  hasErrors: (entityType: EntityType, entityId?: string) => boolean;

  /**
   * Get severity for entity (error/warning/undefined).
   * @example severity('step', stepId)
   */
  severity: (entityType: EntityType, entityId?: string) => 'error' | 'warning' | undefined;
}

// =============================================================================
// Context
// =============================================================================

const BuilderResolvedContext = createContext<BuilderResolvedContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

export interface BuilderResolvedProviderProps {
  /** The current draft state to validate */
  draft: Parameters<typeof resolveDraft>[0];
  children: ReactNode;
}

/**
 * Provider that runs resolveDraft once per draft change.
 * All child components can access validation results via useBuilderResolved().
 */
export function BuilderResolvedProvider({
  draft,
  children,
}: BuilderResolvedProviderProps) {
  // Memoize resolver result - only recalculates when draft changes
  const resolved = useMemo(() => resolveDraft(draft), [draft]);

  // Create context value with helper methods bound to errors array
  const value = useMemo<BuilderResolvedContextValue>(() => ({
    ...resolved,
    errorsFor: (entityType: EntityType, entityId?: string) =>
      errorsForEntity(resolved.errors, entityType, entityId),
    pathErrors: (pathPrefix: string) =>
      errorsForPath(resolved.errors, pathPrefix),
    firstError: (path: string) =>
      firstErrorForPath(resolved.errors, path),
    hasErrors: (entityType: EntityType, entityId?: string) =>
      hasErrorsForEntity(resolved.errors, entityType, entityId),
    severity: (entityType: EntityType, entityId?: string) =>
      entitySeverity(resolved.errors, entityType, entityId),
  }), [resolved]);

  return (
    <BuilderResolvedContext.Provider value={value}>
      {children}
    </BuilderResolvedContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access the resolved draft validation results.
 * Must be used within BuilderResolvedProvider.
 *
 * @example
 * const { isGatePassed, errorsFor, blockingErrorsFor } = useBuilderResolved();
 * const stepErrors = errorsFor('step', step.id);
 * const canPublish = isGatePassed('playable');
 */
export function useBuilderResolved(): BuilderResolvedContextValue {
  const ctx = useContext(BuilderResolvedContext);
  if (!ctx) {
    throw new Error(
      'useBuilderResolved must be used within BuilderResolvedProvider'
    );
  }
  return ctx;
}

// =============================================================================
// Selector Hooks (for specific use cases)
// =============================================================================

/**
 * Check if a specific gate is passed.
 * @example const canSave = useGatePassed('draft');
 */
export function useGatePassed(gate: 'draft' | 'playable' | 'publish'): boolean {
  const { isGatePassed } = useBuilderResolved();
  return isGatePassed(gate);
}

/**
 * Get blocking errors for a specific gate.
 * @example const errors = useBlockingErrors('playable');
 */
export function useBlockingErrors(gate: 'draft' | 'playable' | 'publish'): BuilderError[] {
  const { blockingErrorsFor } = useBuilderResolved();
  return blockingErrorsFor(gate);
}

/**
 * Get validation counts.
 */
export function useValidationCounts(): ResolveResult['counts'] {
  const { counts } = useBuilderResolved();
  return counts;
}
