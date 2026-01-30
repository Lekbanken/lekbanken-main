/**
 * Tenant Guards
 *
 * Runtime guards and assertions for tenant-related operations.
 * These help prevent accidental misuse of private tenants in org contexts.
 */

import type { Tenant, TenantWithMembership } from '@/types/tenant'
import { isPrivateTenant } from './helpers'

/**
 * Log a warning in development if an admin operation is attempted on a private tenant.
 * Private tenants shouldn't have admin operations like "add member", "billing settings", etc.
 */
export function assertNotPrivateTenantForAdmin(
  tenant: Tenant | TenantWithMembership | null | undefined,
  operation?: string
): void {
  if (process.env.NODE_ENV === 'development' && isPrivateTenant(tenant)) {
    console.warn(
      `⚠️ Admin operation${operation ? ` "${operation}"` : ''} attempted on private tenant:`,
      tenant?.id
    )
  }
}

/**
 * Log a warning in development if private tenants appear in an org-only list.
 * This catches bugs where private tenants leak into org selectors/lists.
 */
export function warnIfPrivateInOrgList(
  tenants: TenantWithMembership[],
  context?: string
): void {
  if (process.env.NODE_ENV === 'development') {
    const privateInList = tenants.filter((t) => t.type === 'private')
    if (privateInList.length > 0) {
      console.warn(
        `⚠️ Private tenant(s) found in org list${context ? ` (${context})` : ''}:`,
        privateInList.map((t) => ({ id: t.id, name: t.name }))
      )
    }
  }
}

/**
 * Assert that a tenant is not null/undefined.
 * Throws in development, logs warning in production.
 */
export function assertTenantExists(
  tenant: Tenant | TenantWithMembership | null | undefined,
  context?: string
): asserts tenant is Tenant | TenantWithMembership {
  if (!tenant) {
    const message = `Tenant is required${context ? ` for ${context}` : ''}`
    if (process.env.NODE_ENV === 'development') {
      throw new Error(message)
    } else {
      console.error(`⚠️ ${message}`)
    }
  }
}

/**
 * Guard for operations that should only happen on organization tenants.
 * Returns false and logs a warning if the tenant is private.
 */
export function isOrgOnlyOperation(
  tenant: Tenant | TenantWithMembership | null | undefined,
  operation: string
): boolean {
  if (isPrivateTenant(tenant)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `⚠️ Org-only operation "${operation}" blocked for private tenant:`,
        tenant?.id
      )
    }
    return false
  }
  return true
}
