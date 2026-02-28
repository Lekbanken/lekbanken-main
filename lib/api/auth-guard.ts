import { headers } from 'next/headers'
import { getServerAuthContext } from '@/lib/auth/server-context'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { TenantRole } from '@/types/tenant'

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}

export async function requireAuth() {
  const ctx = await getServerAuthContext()
  if (!ctx.user) {
    throw new AuthError('Unauthorized', 401)
  }
  return ctx
}

export async function requireSystemAdmin() {
  const ctx = await requireAuth()
  if (ctx.effectiveGlobalRole !== 'system_admin') {
    throw new AuthError('Forbidden', 403)
  }
  return ctx
}

export async function requireTenantRole(roles: TenantRole[], tenantId?: string | null) {
  // TODO: consolidate tenant-resolution priority with resolveCurrentTenant
  // (app/actions/tenant.ts) to ensure identical rules. Currently this function
  // has its own fallback chain: param → header → ctx.activeTenant → first membership.
  const ctx = await requireAuth()
  const headerStore = await headers()
  const headerTenantId = headerStore.get('x-tenant-id')
  const resolvedTenantId =
    tenantId ??
    headerTenantId ??
    ctx.activeTenant?.id ??
    ctx.memberships.find((m) => m.tenant_id)?.tenant_id ??
    null

  if (!resolvedTenantId) {
    throw new AuthError('Tenant not selected', 400)
  }

  const membership = ctx.memberships.find((m) => m.tenant_id === resolvedTenantId)
  const tenantRole = membership?.role as TenantRole | null

  if (!tenantRole || !roles.includes(tenantRole)) {
    throw new AuthError('Forbidden', 403)
  }

  return {
    ...ctx,
    activeTenantRole: tenantRole,
    activeTenant: ctx.activeTenant,
  }
}

/**
 * Require the caller to be the host (owner) of a participant session, or a system admin.
 * Use for destructive/admin session operations: delete, archive, restore, token revoke/extend.
 */
export async function requireSessionHost(sessionId: string) {
  const ctx = await requireAuth()

  // System admins always pass
  if (ctx.effectiveGlobalRole === 'system_admin') {
    return ctx
  }

  const supabase = await createServiceRoleClient()
  const { data: session, error } = await supabase
    .from('participant_sessions')
    .select('host_user_id')
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    throw new AuthError('Session not found', 404)
  }

  if (session.host_user_id !== ctx.user!.id) {
    throw new AuthError('Forbidden', 403)
  }

  return ctx
}

/**
 * Require a cron/internal secret header OR system_admin auth.
 * For background maintenance jobs (e.g. token cleanup) that should not be publicly callable.
 *
 * Set CRON_SECRET in your environment and pass it via `Authorization: Bearer <secret>`.
 */
export async function requireCronOrAdmin() {
  const headerStore = await headers()
  const authHeader = headerStore.get('authorization') ?? ''
  const cronSecret = process.env.CRON_SECRET

  // Path 1: valid cron secret
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { via: 'cron' as const }
  }

  // Path 2: logged-in system_admin
  const ctx = await getServerAuthContext()
  if (ctx.user && ctx.effectiveGlobalRole === 'system_admin') {
    return { via: 'admin' as const, ...ctx }
  }

  throw new AuthError('Unauthorized', 401)
}
