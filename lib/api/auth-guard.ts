import { headers } from 'next/headers'
import { getServerAuthContext } from '@/lib/auth/server-context'
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
