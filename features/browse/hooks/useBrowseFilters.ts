/**
 * useBrowseFilters Hook
 *
 * Manages filter state, fetches coverage data, and calculates visible filters
 * based on user's playMode capabilities and data coverage thresholds.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FilterCoverage, FilterDefinition, FilterOptions, PlayMode } from '../types';
import {
  createDefaultCoverage,
  deriveUserCapabilities,
  getVisibleFilters,
  hasSuperFiltersVisible,
} from '../capabilities';
import { getSuperFilterGroups, FILTER_GROUP_META } from '../filterRegistry';
import type { FilterGroup } from '../filterRegistry';

// =============================================================================
// TYPES
// =============================================================================

export type FilterOptionsWithCoverage = FilterOptions & {
  coverage: FilterCoverage;
  metadata?: {
    cached: boolean;
    cachedAt: string | null;
    ttlSeconds: number;
  };
};

export type VisibleFilterGroups = {
  basic: FilterDefinition[];
  super: {
    groupKey: FilterGroup;
    label: string;
    icon: string;
    filters: FilterDefinition[];
  }[];
};

export type UseBrowseFiltersResult = {
  /** Filter options from API (products, purposes, etc.) */
  options: FilterOptions | null;
  /** Coverage data from API */
  coverage: FilterCoverage;
  /** Whether coverage data is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Visible filter groups based on playMode and coverage */
  visibleGroups: VisibleFilterGroups;
  /** Whether any super filters are visible */
  hasSuperFilters: boolean;
  /** Refetch coverage data */
  refetch: () => Promise<void>;
};

// =============================================================================
// HOOK
// =============================================================================

export function useBrowseFilters(
  tenantId: string | null,
  userPlayModes: PlayMode[] = ['basic']
): UseBrowseFiltersResult {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [coverage, setCoverage] = useState<FilterCoverage>(createDefaultCoverage());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derive user capabilities from their playModes
  const userCapabilities = useMemo(
    () => deriveUserCapabilities(userPlayModes),
    [userPlayModes]
  );

  // Calculate visible filters based on capabilities and coverage
  // Returns Map<FilterGroup, FilterDefinition[]>
  const visibleFiltersMap = useMemo(
    () => getVisibleFilters(userCapabilities, coverage),
    [userCapabilities, coverage]
  );

  // Group visible filters into basic and super sections
  const visibleGroups = useMemo<VisibleFilterGroups>(() => {
    // Get visible basic filters from the map
    const visibleBasic = visibleFiltersMap.get('basic') ?? [];

    // Get super groups and their visible filters
    const superGroupKeys = getSuperFilterGroups();
    const visibleSuper = superGroupKeys
      .map((groupKey) => {
        const groupMeta = FILTER_GROUP_META[groupKey];
        const filtersInGroup = visibleFiltersMap.get(groupKey) ?? [];

        return {
          groupKey,
          label: groupMeta?.labelKey ?? groupKey,
          icon: groupMeta?.icon ?? '📁',
          filters: filtersInGroup,
        };
      })
      .filter((group) => group.filters.length > 0);

    return { basic: visibleBasic, super: visibleSuper };
  }, [visibleFiltersMap]);

  // Check if any super filters are visible
  const hasSuperFilters = useMemo(
    () => hasSuperFiltersVisible(userCapabilities, coverage),
    [userCapabilities, coverage]
  );

  // Fetch filter options and coverage from API
  const fetchFilters = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/browse/filters${tenantId ? `?tenantId=${tenantId}` : ''}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to load filters: ${res.status}`);
      }

      const json = (await res.json()) as {
        products: { id: string; name: string | null }[];
        purposes: { id: string; name: string | null }[];
        subPurposes: { id: string; name: string | null; parent_id?: string | null }[];
        coverage?: FilterCoverage;
        metadata?: {
          cached: boolean;
          cachedAt: string | null;
          ttlSeconds: number;
        };
      };

      setOptions({
        products: json.products ?? [],
        mainPurposes: json.purposes ?? [],
        subPurposes: json.subPurposes ?? [],
      });

      if (json.coverage) {
        setCoverage(json.coverage);
      }
    } catch (err) {
      console.error('[useBrowseFilters] fetch failed', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setOptions({ products: [], mainPurposes: [], subPurposes: [] });
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Fetch on mount and when tenantId changes
  useEffect(() => {
    void fetchFilters();
  }, [fetchFilters]);

  return {
    options,
    coverage,
    isLoading,
    error,
    visibleGroups,
    hasSuperFilters,
    refetch: fetchFilters,
  };
}
