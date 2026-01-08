import { createServerRlsClient } from '@/lib/supabase/server'

// Flexible user type that works with Supabase User and custom shapes
type UserLike = {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  id: string
}

/**
 * Check if a user has system_admin role.
 * Mirrors logic from deriveEffectiveGlobalRole in lib/auth/role.ts
 * to ensure consistent behavior between page-level and API-level checks.
 */
export function isSystemAdmin(user: UserLike | null | undefined): boolean {
  if (!user) return false

  // Check app_metadata.role (primary location)
  const appRole = user.app_metadata?.role as string | undefined
  if (appRole === 'system_admin' || appRole === 'superadmin' || appRole === 'admin') {
    return true
  }

  // Check app_metadata.global_role
  const appGlobalRole = user.app_metadata?.global_role as string | undefined
  if (appGlobalRole === 'system_admin') {
    return true
  }

  // Check user_metadata.global_role
  const userGlobalRole = user.user_metadata?.global_role as string | undefined
  if (userGlobalRole === 'system_admin') {
    return true
  }

  return false
}

export async function isTenantAdmin(tenantId: string, userId: string) {
  const supabase = await createServerRlsClient()
  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) return false
  return data?.role === 'owner' || data?.role === 'admin'
}

export async function assertTenantAdminOrSystem(tenantId: string, user: UserLike | null | undefined) {
  if (!user) return false
  if (isSystemAdmin(user)) return true
  return isTenantAdmin(tenantId, user.id)
}
