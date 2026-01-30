/**
 * Tenant Helper Functions
 *
 * Utility functions for working with tenants, particularly distinguishing
 * between private (personal) tenants and organization tenants.
 */

import type { Tenant, TenantWithMembership } from '@/types/tenant'

/**
 * Check if a tenant is a private/personal tenant.
 * Private tenants are created for individual B2C purchases.
 */
export function isPrivateTenant(tenant: Tenant | TenantWithMembership | null | undefined): boolean {
  return tenant?.type === 'private'
}

/**
 * Check if a tenant is a demo tenant.
 */
export function isDemoTenant(tenant: Tenant | TenantWithMembership | null | undefined): boolean {
  return tenant?.type === 'demo'
}

/**
 * Get the personal/private tenant for a user from their tenant list.
 * Returns null if the user has no private tenant.
 *
 * Note: A user should have at most one private tenant.
 */
export function getPersonalTenantForUser(
  tenants: TenantWithMembership[]
): TenantWithMembership | null {
  return tenants.find((t) => t.type === 'private') ?? null
}

/**
 * Get all organization tenants for a user (excludes private and demo tenants).
 * These are the tenants that should appear in the "Organizations" section.
 */
export function getOrganizationTenants(tenants: TenantWithMembership[]): TenantWithMembership[] {
  return tenants.filter((t) => t.type !== 'private' && t.type !== 'demo')
}

/**
 * Determine the context mode based on the user's tenants.
 *
 * - 'personal-only': User only has a private tenant
 * - 'org-only': User only has organization tenant(s)
 * - 'mixed': User has both personal and organization tenants
 * - 'none': User has no tenants
 */
export type TenantContextMode = 'personal-only' | 'org-only' | 'mixed' | 'none'

export function getTenantContextMode(tenants: TenantWithMembership[]): TenantContextMode {
  const hasPersonal = tenants.some((t) => t.type === 'private')
  const hasOrg = tenants.some((t) => t.type !== 'private' && t.type !== 'demo')

  if (hasPersonal && hasOrg) return 'mixed'
  if (hasPersonal) return 'personal-only'
  if (hasOrg) return 'org-only'
  return 'none'
}

/**
 * Check if the tenant selector should be visible.
 * Hidden when user has only one option (single personal or single org tenant).
 */
export function shouldShowTenantSelector(tenants: TenantWithMembership[]): boolean {
  // Filter out demo tenants for this check
  const relevantTenants = tenants.filter((t) => t.type !== 'demo')
  return relevantTenants.length > 1
}

/**
 * Get the default tenant to select for a user.
 * Priority:
 * 1. Primary tenant (is_primary = true)
 * 2. First organization tenant
 * 3. Personal tenant
 */
export function getDefaultTenant(tenants: TenantWithMembership[]): TenantWithMembership | null {
  if (tenants.length === 0) return null

  // 1. Primary tenant
  const primary = tenants.find((t) => t.membership?.is_primary)
  if (primary) return primary

  // 2. First organization tenant
  const orgs = getOrganizationTenants(tenants)
  if (orgs.length > 0) return orgs[0]

  // 3. Personal tenant
  const personal = getPersonalTenantForUser(tenants)
  if (personal) return personal

  // 4. Fallback to first
  return tenants[0]
}

/**
 * Get display name for a tenant, with special handling for private tenants.
 */
export function getTenantDisplayName(
  tenant: Tenant | TenantWithMembership | null | undefined,
  t?: (key: string) => string
): string {
  if (!tenant) return ''

  if (isPrivateTenant(tenant)) {
    // Use translation if available, otherwise fallback
    return t?.('tenant.personal') ?? 'Mitt konto'
  }

  return tenant.name || ''
}
