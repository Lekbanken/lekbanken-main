/**
 * Shared plan capability checks for Planner API routes.
 *
 * This module is the domain's single source of truth for access control.
 * All planner mutation routes should use these helpers instead of
 * duplicating the profile+membership fetch + capability derivation pattern.
 *
 * RLS remains the last line of defense — these checks are defense-in-depth.
 */

import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildCapabilityContextFromMemberships,
  requireCapability,
  planToResource,
  type PlannerCapability,
} from '@/lib/auth/capabilities'
import { deriveEffectiveGlobalRole } from '@/lib/auth/role'

type AccessResult =
  | { allowed: true }
  | { allowed: false; response: NextResponse }

/**
 * Checks if the authenticated user has the given capability on a plan.
 *
 * Fetches profile + tenant memberships, builds capability context,
 * and calls `requireCapability`. Returns a 403 NextResponse on denial
 * or 404 if the plan doesn't exist (via RLS).
 *
 * Usage in route handlers:
 * ```
 * const check = await requirePlanAccess(supabase, user, planId, 'planner.plan.update')
 * if (!check.allowed) return check.response
 * ```
 */
export async function requirePlanAccess(
  supabase: SupabaseClient,
  user: User,
  planId: string,
  capability: PlannerCapability,
): Promise<AccessResult> {
  // Fetch plan ownership fields (minimal select)
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('owner_user_id, owner_tenant_id, visibility')
    .eq('id', planId)
    .maybeSingle()

  if (planError || !plan) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: { code: 'PLAN_NOT_FOUND', message: 'Plan not found' } },
        { status: 404 },
      ),
    }
  }

  // Fetch profile + memberships in parallel
  const [profileResult, membershipsResult] = await Promise.all([
    supabase.from('users').select('global_role').eq('id', user.id).single(),
    supabase.from('user_tenant_memberships').select('tenant_id, role').eq('user_id', user.id),
  ])

  const globalRole = deriveEffectiveGlobalRole(profileResult.data, user)
  const memberships = (membershipsResult.data ?? [])
    .filter((m) => Boolean(m.tenant_id) && Boolean(m.role))
    .map((m) => ({ tenant_id: m.tenant_id as string, role: m.role as string }))

  const capabilityCtx = buildCapabilityContextFromMemberships({
    userId: user.id,
    globalRole,
    memberships,
  })

  const planResource = planToResource({
    owner_user_id: plan.owner_user_id,
    owner_tenant_id: plan.owner_tenant_id,
    visibility: plan.visibility,
  })

  const check = requireCapability(capabilityCtx, planResource, capability)

  if (!check.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: { code: check.code, message: check.message } },
        { status: 403 },
      ),
    }
  }

  return { allowed: true }
}

/**
 * Convenience: checks `planner.plan.update` capability.
 * Use for block mutations, schedule mutations, and plan edits.
 */
export async function requirePlanEditAccess(
  supabase: SupabaseClient,
  user: User,
  planId: string,
): Promise<AccessResult> {
  return requirePlanAccess(supabase, user, planId, 'planner.plan.update')
}

/**
 * Convenience: checks `play.run.start` capability.
 * Use for plan start / run creation.
 */
export async function requirePlanStartAccess(
  supabase: SupabaseClient,
  user: User,
  planId: string,
): Promise<AccessResult> {
  return requirePlanAccess(supabase, user, planId, 'play.run.start')
}

/**
 * Convenience: checks `planner.plan.read` capability.
 * Use for schedule reads and plan reads where RLS isn't sufficient.
 */
export async function requirePlanReadAccess(
  supabase: SupabaseClient,
  user: User,
  planId: string,
): Promise<AccessResult> {
  return requirePlanAccess(supabase, user, planId, 'planner.plan.read')
}

/**
 * Validates that a user-provided tenant_id belongs to one of the user's
 * tenant memberships. System admins bypass this check.
 *
 * Use this for any route that accepts tenant_id from client input
 * (defense-in-depth — RLS also validates via `get_user_tenant_ids()`).
 */
export async function assertTenantMembership(
  supabase: SupabaseClient,
  user: User,
  tenantId: string,
): Promise<AccessResult> {
  const { data: profile } = await supabase
    .from('users')
    .select('global_role')
    .eq('id', user.id)
    .maybeSingle()

  const globalRole = deriveEffectiveGlobalRole(profile, user)
  if (globalRole === 'system_admin') {
    return { allowed: true }
  }

  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!membership) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: { code: 'INVALID_TENANT', message: 'Invalid tenant' } },
        { status: 403 },
      ),
    }
  }

  return { allowed: true }
}
