/**
 * usePlanFilters Hook
 * 
 * Reusable hook for filtering, sorting, and searching plans.
 * Used by both Admin Planner and App Planner for consistency.
 */

import { useMemo, useState, useCallback } from 'react'
import type { PlannerPlan, PlannerStatus, PlannerVisibility } from '@/types/planner'
import type { PlanSortOption } from '@/lib/planner/labels'

// =============================================================================
// TYPES
// =============================================================================

export interface UsePlanFiltersOptions {
  plans: PlannerPlan[]
  initialSearch?: string
  initialStatus?: PlannerStatus | 'all'
  initialVisibility?: PlannerVisibility | 'all'
  initialSort?: PlanSortOption
  /**
   * If true, excludes archived plans from results unless explicitly filtered for
   */
  excludeArchivedByDefault?: boolean
}

export interface UsePlanFiltersResult {
  // State
  search: string
  statusFilter: PlannerStatus | 'all'
  visibilityFilter: PlannerVisibility | 'all'
  sort: PlanSortOption
  
  // Setters
  setSearch: (value: string) => void
  setStatusFilter: (value: PlannerStatus | 'all') => void
  setVisibilityFilter: (value: PlannerVisibility | 'all') => void
  setSort: (value: PlanSortOption) => void
  
  // Derived
  filteredPlans: PlannerPlan[]
  totalCount: number
  filteredCount: number
  
  // Actions
  clearFilters: () => void
  hasActiveFilters: boolean
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function usePlanFilters({
  plans,
  initialSearch = '',
  initialStatus = 'all',
  initialVisibility = 'all',
  initialSort = 'updated-desc',
  excludeArchivedByDefault = true,
}: UsePlanFiltersOptions): UsePlanFiltersResult {
  // State
  const [search, setSearch] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState<PlannerStatus | 'all'>(initialStatus)
  const [visibilityFilter, setVisibilityFilter] = useState<PlannerVisibility | 'all'>(initialVisibility)
  const [sort, setSort] = useState<PlanSortOption>(initialSort)

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      search.trim() !== '' ||
      statusFilter !== 'all' ||
      visibilityFilter !== 'all'
    )
  }, [search, statusFilter, visibilityFilter])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('all')
    setVisibilityFilter('all')
  }, [])

  // Filter and sort plans
  const filteredPlans = useMemo(() => {
    let result = [...plans]

    // Exclude archived by default unless specifically filtering for archived
    if (excludeArchivedByDefault && statusFilter !== 'archived') {
      result = result.filter((plan) => plan.status !== 'archived')
    }

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim()
      result = result.filter(
        (plan) =>
          plan.name.toLowerCase().includes(searchLower) ||
          plan.description?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((plan) => plan.status === statusFilter)
    }

    // Visibility filter
    if (visibilityFilter !== 'all') {
      result = result.filter((plan) => plan.visibility === visibilityFilter)
    }

    // Sorting
    result.sort((a, b) => {
      switch (sort) {
        case 'name-asc':
          return a.name.localeCompare(b.name, 'sv')
        case 'name-desc':
          return b.name.localeCompare(a.name, 'sv')
        case 'updated-desc':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'updated-asc':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        case 'duration-desc':
          return (b.totalTimeMinutes ?? 0) - (a.totalTimeMinutes ?? 0)
        case 'duration-asc':
          return (a.totalTimeMinutes ?? 0) - (b.totalTimeMinutes ?? 0)
        default:
          return 0
      }
    })

    return result
  }, [plans, search, statusFilter, visibilityFilter, sort, excludeArchivedByDefault])

  return {
    // State
    search,
    statusFilter,
    visibilityFilter,
    sort,
    
    // Setters
    setSearch,
    setStatusFilter,
    setVisibilityFilter,
    setSort,
    
    // Derived
    filteredPlans,
    totalCount: plans.length,
    filteredCount: filteredPlans.length,
    
    // Actions
    clearFilters,
    hasActiveFilters,
  }
}

// =============================================================================
// DEBOUNCED SEARCH VARIANT
// =============================================================================

export interface UseDebouncedPlanFiltersOptions extends UsePlanFiltersOptions {
  debounceMs?: number
}

export function useDebouncedPlanFilters({
  debounceMs = 300,
  ...options
}: UseDebouncedPlanFiltersOptions): UsePlanFiltersResult & {
  searchInput: string
  setSearchInput: (value: string) => void
} {
  const [searchInput, setSearchInput] = useState(options.initialSearch ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(options.initialSearch ?? '')

  // Debounce search input
  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, debounceMs)
    return () => clearTimeout(handler)
  }, [searchInput, debounceMs])

  const result = usePlanFilters({
    ...options,
    initialSearch: debouncedSearch,
  })

  // Override search with debounced version
  return {
    ...result,
    search: debouncedSearch,
    setSearch: setDebouncedSearch,
    searchInput,
    setSearchInput,
  }
}
