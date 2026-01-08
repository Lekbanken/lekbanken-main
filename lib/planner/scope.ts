/**
 * Planner Scope Separation
 * 
 * Defines clear boundaries between Admin and App contexts for the Planner domain.
 * This helps prevent mixing of concerns and ensures proper capability enforcement.
 */

import type { PlannerStatus, PlannerVisibility } from '@/types/planner'

// ─────────────────────────────────────────────────────────────────────────────
// Scope Types
// ─────────────────────────────────────────────────────────────────────────────

/** The context in which the planner is being used */
export type PlannerScope = 'admin' | 'app'

/** Role-based access within a scope */
export type ScopeRole = 
  | 'viewer'      // Can only view plans
  | 'editor'      // Can create/edit own plans
  | 'manager'     // Can manage team plans
  | 'admin'       // Full access

/** Features available in each scope */
export type ScopeFeatures = {
  /** Can create new plans */
  canCreate: boolean
  /** Can view plan list */
  canViewList: boolean
  /** Can view individual plans */
  canViewDetail: boolean
  /** Can edit plans */
  canEdit: boolean
  /** Can delete plans */
  canDelete: boolean
  /** Can publish plans */
  canPublish: boolean
  /** Can archive/restore plans */
  canArchive: boolean
  /** Can copy plans */
  canCopy: boolean
  /** Can share plans */
  canShare: boolean
  /** Can export plans */
  canExport: boolean
  /** Can run plans (play mode) */
  canRun: boolean
  /** Can view versions */
  canViewVersions: boolean
  /** Can use bulk actions */
  canBulkActions: boolean
  /** Can create public templates */
  canCreateTemplates: boolean
  /** Can view analytics */
  canViewAnalytics: boolean
  /** Can access AI suggestions */
  canUseAI: boolean
}

/** Configuration for a specific scope */
export type ScopeConfig = {
  scope: PlannerScope
  /** Default status filter for this scope */
  defaultStatusFilter: PlannerStatus[] | null
  /** Default visibility filter */
  defaultVisibilityFilter: PlannerVisibility[] | null
  /** Whether to show archived plans by default */
  showArchivedByDefault: boolean
  /** Base route for this scope */
  baseRoute: string
  /** Available features */
  features: ScopeFeatures
}

// ─────────────────────────────────────────────────────────────────────────────
// Scope Configurations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin scope - Full access for system admins and tenant managers
 * Used in /admin/planner
 */
export const ADMIN_SCOPE_CONFIG: ScopeConfig = {
  scope: 'admin',
  defaultStatusFilter: null, // Show all statuses
  defaultVisibilityFilter: null, // Show all visibilities
  showArchivedByDefault: true, // Admins see archived
  baseRoute: '/admin/planner',
  features: {
    canCreate: true,
    canViewList: true,
    canViewDetail: true,
    canEdit: true,
    canDelete: true,
    canPublish: true,
    canArchive: true,
    canCopy: true,
    canShare: true,
    canExport: true,
    canRun: false, // Admins don't run plans
    canViewVersions: true,
    canBulkActions: true,
    canCreateTemplates: true,
    canViewAnalytics: true,
    canUseAI: true,
  },
}

/**
 * App scope - Regular user access
 * Used in /app/planner
 */
export const APP_SCOPE_CONFIG: ScopeConfig = {
  scope: 'app',
  defaultStatusFilter: ['draft', 'published', 'modified'], // Hide archived
  defaultVisibilityFilter: null,
  showArchivedByDefault: false,
  baseRoute: '/app/planner',
  features: {
    canCreate: true,
    canViewList: true,
    canViewDetail: true,
    canEdit: true,
    canDelete: true,
    canPublish: true,
    canArchive: true,
    canCopy: true,
    canShare: true,
    canExport: true,
    canRun: true, // Main feature for app users
    canViewVersions: true,
    canBulkActions: false, // Keep UI simple
    canCreateTemplates: false, // Only admins
    canViewAnalytics: false, // Keep UI simple
    canUseAI: true,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Scope Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the scope configuration for a given scope
 */
export function getScopeConfig(scope: PlannerScope): ScopeConfig {
  return scope === 'admin' ? ADMIN_SCOPE_CONFIG : APP_SCOPE_CONFIG
}

/**
 * Determine scope from a route path
 */
export function getScopeFromPath(path: string): PlannerScope {
  if (path.startsWith('/admin')) return 'admin'
  return 'app'
}

/**
 * Get the appropriate route for a plan in a given scope
 */
export function getPlanRoute(planId: string, scope: PlannerScope): string {
  const config = getScopeConfig(scope)
  return `${config.baseRoute}/${planId}`
}

/**
 * Get the list route for a scope
 */
export function getListRoute(scope: PlannerScope): string {
  return getScopeConfig(scope).baseRoute
}

/**
 * Check if a feature is available in a scope
 */
export function hasFeature(
  scope: PlannerScope,
  feature: keyof ScopeFeatures
): boolean {
  return getScopeConfig(scope).features[feature]
}

/**
 * Filter features based on scope and role
 * Combines scope config with role-based restrictions
 */
export function getEffectiveFeatures(
  scope: PlannerScope,
  role: ScopeRole
): ScopeFeatures {
  const baseFeatures = getScopeConfig(scope).features
  
  // Role-based overrides
  switch (role) {
    case 'viewer':
      return {
        ...baseFeatures,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canArchive: false,
        canBulkActions: false,
        canCreateTemplates: false,
        canUseAI: false,
      }
    
    case 'editor':
      return {
        ...baseFeatures,
        canBulkActions: false,
        canCreateTemplates: false,
        canViewAnalytics: false,
      }
    
    case 'manager':
      return {
        ...baseFeatures,
        canCreateTemplates: scope === 'admin',
      }
    
    case 'admin':
    default:
      return baseFeatures
  }
}

/**
 * Plan visibility rules per scope
 * Determines which plans are visible in each scope
 */
export type PlanVisibilityRule = {
  /** User must be owner */
  mustBeOwner?: boolean
  /** User must be member of owning tenant */
  mustBeTenantMember?: boolean
  /** Plan must have specific visibility */
  requiredVisibility?: PlannerVisibility[]
  /** Plan must have specific status */
  requiredStatus?: PlannerStatus[]
}

/**
 * Get visibility rules for a scope
 */
export function getVisibilityRules(scope: PlannerScope): PlanVisibilityRule {
  if (scope === 'admin') {
    return {
      // Admins see all plans they have access to via RLS
    }
  }
  
  return {
    // App users see their own + public + tenant shared
    requiredStatus: ['draft', 'published', 'modified'], // Hide archived by default
  }
}

/**
 * Context object to pass through components
 */
export type PlannerScopeContext = {
  scope: PlannerScope
  config: ScopeConfig
  role: ScopeRole
  features: ScopeFeatures
}

/**
 * Create a scope context from scope and role
 */
export function createScopeContext(
  scope: PlannerScope,
  role: ScopeRole = 'editor'
): PlannerScopeContext {
  return {
    scope,
    config: getScopeConfig(scope),
    role,
    features: getEffectiveFeatures(scope, role),
  }
}
