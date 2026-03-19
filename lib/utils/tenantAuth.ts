import { isSystemAdminFromUser } from '@/lib/auth/role'

// Flexible user type that works with Supabase User and custom shapes
type UserLike = {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  id: string
}

/**
 * Check if a user has system_admin role.
 * Delegates to the canonical role derivation in lib/auth/role.ts.
 */
export function isSystemAdmin(user: UserLike | null | undefined): boolean {
  return isSystemAdminFromUser((user ?? null) as never)
}

export async function isTenantAdmin(tenantId: string, userId: string) {
  const { createServerRlsClient } = await import('@/lib/supabase/server')
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
