/**
 * Planner Library Index
 * 
 * Centralizes exports for the Planner domain utilities.
 */

// Labels and constants
export {
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_BADGE_VARIANTS,
  VISIBILITY_LABELS,
  VISIBILITY_COLORS,
  VISIBILITY_BADGE_VARIANTS,
  STATUS_FILTER_OPTIONS,
  VISIBILITY_FILTER_OPTIONS,
  SORT_OPTIONS,
  BLOCK_TYPE_LABELS,
  BLOCK_TYPE_ICONS,
  formatDuration,
  formatDate,
  formatDateTime,
  type PlanSortOption,
} from './labels'

// State machine
export {
  canTransition,
  assertTransition,
  getValidNextStatuses,
  getNextStatus,
  canPerformAction,
  getAvailableActions,
  PlanStatusTransitionError,
  STATUS_METADATA,
  type PlanStatusAction,
} from './state-machine'

// Hooks
export { usePlanFilters, useDebouncedPlanFilters } from './hooks/usePlanFilters'
export type {
  UsePlanFiltersOptions,
  UsePlanFiltersResult,
  UseDebouncedPlanFiltersOptions,
} from './hooks/usePlanFilters'

export { useBulkActions } from './hooks/useBulkActions'

// DTOs (selectively export for external use)
export {
  // Schemas
  PlannerStatusSchema,
  PlannerVisibilitySchema,
  PlannerBlockTypeSchema,
  PlannerPlanSchema,
  PlannerBlockSchema,
  PlannerVersionSchema,
  PlanCapabilitiesSchema,
  PlanResponseSchema,
  PlanSearchResponseSchema,
  // Validation helpers
  validatePlanResponse,
  validatePlanSearchResponse,
  safeParsePlanResponse,
  safeParsePlanSearchResponse,
} from './dto'

export type {
  PlannerPlanDTO,
  PlannerBlockDTO,
  PlannerVersionDTO,
  PlannerGameSummaryDTO,
  PlannerNoteDTO,
  PlannerNotesDTO,
  PlanCapabilitiesDTO,
  PlanResponseDTO,
  PlanSearchResponseDTO,
  CreatePlanRequestDTO,
  UpdatePlanRequestDTO,
  CopyPlanRequestDTO,
} from './dto'

// i18n
export {
  t,
  getSection,
  scopedT,
  usePlannerTranslations,
  plannerLocales,
} from './i18n'
export type { PlannerLocale, PlannerTranslationKey } from './i18n'

// AI Assistance
export {
  generatePlanSuggestions,
  applySuggestion,
} from './ai-assist'
export type {
  PlanAIContext,
  PlanAISuggestionType,
  PlanAISuggestion,
  PlanAISuggestionRequest,
  PlanAISuggestionResponse,
} from './ai-assist'

// Analytics
export {
  calculateAggregateStats,
  generateInsights,
  formatAnalyticsValue,
} from './analytics'
export type {
  AnalyticsPeriod,
  TimeSeriesPoint,
  PlanUsageStats,
  PlanAggregateStats,
  PlanInsight,
  PlanAnalyticsResponse,
} from './analytics'

// Scope Separation
export {
  ADMIN_SCOPE_CONFIG,
  APP_SCOPE_CONFIG,
  getScopeConfig,
  getScopeFromPath,
  getPlanRoute,
  getListRoute,
  hasFeature,
  getEffectiveFeatures,
  getVisibilityRules,
  createScopeContext,
} from './scope'
export type {
  PlannerScope,
  ScopeRole,
  ScopeFeatures,
  ScopeConfig,
  PlanVisibilityRule,
  PlannerScopeContext,
} from './scope'
