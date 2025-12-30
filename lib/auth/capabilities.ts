/**
 * Planner Capabilities System
 *
 * Centralized capability derivation for Planner domain.
 * Used by both API routes and client-side UI guards.
 *
 * IMPORTANT: RLS remains the last line of defense.
 * Capabilities are for UX/API guards only.
 */

import type { GlobalRole } from '@/types/auth'
import type { TenantRole } from '@/types/tenant'
import type { PlannerVisibility } from '@/types/planner'

// -----------------------------------------------------------------------------
// Capability Types
// -----------------------------------------------------------------------------

export const PLANNER_CAPABILITIES = [
  'planner.plan.read',
  'planner.plan.update',
  'planner.plan.delete',
  'planner.plan.publish',
  'planner.plan.visibility.public',
  'planner.template.create',
  'planner.template.publish',
  'play.run.start',
  'play.run.read',
] as const

export type PlannerCapability = (typeof PLANNER_CAPABILITIES)[number]

export interface PlanCapabilities {
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
  canPublish: boolean
  canSetVisibilityPublic: boolean
  canCreateTemplate: boolean
  canStartRun: boolean
}

// -----------------------------------------------------------------------------
// Context Types
// -----------------------------------------------------------------------------

export interface CapabilityContext {
  userId: string
  globalRole: GlobalRole | null
  tenantMemberships: Array<{
    tenantId: string
    role: TenantRole
  }>
}

export interface PlanResource {
  ownerUserId: string
  ownerTenantId: string | null
  visibility: PlannerVisibility
}

// -----------------------------------------------------------------------------
// Core Capability Derivation
// -----------------------------------------------------------------------------

/**
 * Derives the set of capabilities a user has for a given plan.
 *
 * Decision matrix:
 * - READ: owner, tenant member (if visibility != private), public plans, system_admin
 * - UPDATE/DELETE/PUBLISH: owner, tenant_admin (if visibility != private), system_admin
 * - VISIBILITY.PUBLIC: system_admin only
 * - TEMPLATE.CREATE: owner, system_admin
 * - RUN.START: anyone who can read
 */
export function derivePlanCapabilities(
  ctx: CapabilityContext,
  plan: PlanResource
): Set<PlannerCapability> {
  const caps = new Set<PlannerCapability>()

  const isOwner = plan.ownerUserId === ctx.userId
  const isSystemAdmin = ctx.globalRole === 'system_admin'

  // Check tenant membership
  const tenantMembership = plan.ownerTenantId
    ? ctx.tenantMemberships.find((m) => m.tenantId === plan.ownerTenantId)
    : null
  const isTenantMember = !!tenantMembership
  // Tenant admin roles are 'owner' or 'admin'
  const isTenantAdmin = tenantMembership?.role === 'owner' || tenantMembership?.role === 'admin'

  // READ access
  const canRead =
    plan.visibility === 'public' ||
    isOwner ||
    (isTenantMember && plan.visibility !== 'private') ||
    isSystemAdmin

  if (canRead) {
    caps.add('planner.plan.read')
    caps.add('play.run.start')
    caps.add('play.run.read')
  }

  // UPDATE/DELETE/PUBLISH access
  // Owner can always update their own plans
  // Tenant admin can update tenant-visible plans (not private)
  // System admin can update any plan
  const canWrite =
    isOwner ||
    (isTenantAdmin && plan.visibility !== 'private') ||
    isSystemAdmin

  if (canWrite) {
    caps.add('planner.plan.update')
    caps.add('planner.plan.delete')
    caps.add('planner.plan.publish')
  }

  // PUBLIC VISIBILITY - only system_admin
  if (isSystemAdmin) {
    caps.add('planner.plan.visibility.public')
  }

  // TEMPLATE creation - owner or system_admin
  if (isOwner || isSystemAdmin) {
    caps.add('planner.template.create')
    if (isSystemAdmin) {
      caps.add('planner.template.publish')
    }
  }

  return caps
}

// -----------------------------------------------------------------------------
// Conversion Helpers
// -----------------------------------------------------------------------------

/**
 * Converts capability set to object format for API responses.
 * This is what gets sent as `_capabilities` in responses.
 */
export function capabilitiesToObject(caps: Set<PlannerCapability>): PlanCapabilities {
  return {
    canRead: caps.has('planner.plan.read'),
    canUpdate: caps.has('planner.plan.update'),
    canDelete: caps.has('planner.plan.delete'),
    canPublish: caps.has('planner.plan.publish'),
    canSetVisibilityPublic: caps.has('planner.plan.visibility.public'),
    canCreateTemplate: caps.has('planner.template.create'),
    canStartRun: caps.has('play.run.start'),
  }
}

/**
 * Quick check if user has a specific capability.
 */
export function hasCapability(
  ctx: CapabilityContext,
  plan: PlanResource,
  capability: PlannerCapability
): boolean {
  const caps = derivePlanCapabilities(ctx, plan)
  return caps.has(capability)
}

// -----------------------------------------------------------------------------
// Context Builder Helpers
// -----------------------------------------------------------------------------

/**
 * Builds CapabilityContext from common auth patterns.
 * Use this in API routes to create the context.
 */
export function buildCapabilityContext(params: {
  userId: string
  globalRole: GlobalRole | null
  tenantMemberships: Array<{ tenantId: string; role: TenantRole }>
}): CapabilityContext {
  return {
    userId: params.userId,
    globalRole: params.globalRole,
    tenantMemberships: params.tenantMemberships,
  }
}

/**
 * Builds CapabilityContext from server auth memberships.
 * Handles the mapping from TenantMembership[] to simplified format.
 */
export function buildCapabilityContextFromMemberships(params: {
  userId: string
  globalRole: GlobalRole | null
  memberships: Array<{ tenant_id: string; role: string }>
}): CapabilityContext {
  return {
    userId: params.userId,
    globalRole: params.globalRole,
    tenantMemberships: params.memberships.map((m) => ({
      tenantId: m.tenant_id,
      role: m.role as TenantRole,
    })),
  }
}

/**
 * Builds PlanResource from database row.
 * Use this to convert DB plan to capability-checkable resource.
 */
export function planToResource(plan: {
  owner_user_id: string
  owner_tenant_id: string | null
  visibility: string
}): PlanResource {
  return {
    ownerUserId: plan.owner_user_id,
    ownerTenantId: plan.owner_tenant_id,
    visibility: plan.visibility as PlannerVisibility,
  }
}

// -----------------------------------------------------------------------------
// Guard Functions for API Routes
// -----------------------------------------------------------------------------

export type CapabilityCheckResult =
  | { allowed: true }
  | { allowed: false; code: string; message: string }

/**
 * Checks if user has required capability, returns error info if not.
 * Use this in API routes for consistent error handling.
 */
export function requireCapability(
  ctx: CapabilityContext,
  plan: PlanResource,
  capability: PlannerCapability
): CapabilityCheckResult {
  const caps = derivePlanCapabilities(ctx, plan)

  if (caps.has(capability)) {
    return { allowed: true }
  }

  // Return appropriate error based on capability
  const errorMessages: Record<PlannerCapability, { code: string; message: string }> = {
    'planner.plan.read': {
      code: 'PLAN_NOT_FOUND',
      message: 'Planen kunde inte hittas',
    },
    'planner.plan.update': {
      code: 'FORBIDDEN',
      message: 'Du har inte behörighet att redigera denna plan',
    },
    'planner.plan.delete': {
      code: 'FORBIDDEN',
      message: 'Du har inte behörighet att radera denna plan',
    },
    'planner.plan.publish': {
      code: 'FORBIDDEN',
      message: 'Du har inte behörighet att publicera denna plan',
    },
    'planner.plan.visibility.public': {
      code: 'FORBIDDEN',
      message: 'Endast systemadministratörer kan sätta planer som publika',
    },
    'planner.template.create': {
      code: 'FORBIDDEN',
      message: 'Du har inte behörighet att skapa mallar från denna plan',
    },
    'planner.template.publish': {
      code: 'FORBIDDEN',
      message: 'Endast systemadministratörer kan publicera mallar',
    },
    'play.run.start': {
      code: 'FORBIDDEN',
      message: 'Du har inte behörighet att starta denna plan',
    },
    'play.run.read': {
      code: 'FORBIDDEN',
      message: 'Du har inte behörighet att se detta genomförande',
    },
  }

  return {
    allowed: false,
    ...errorMessages[capability],
  }
}
