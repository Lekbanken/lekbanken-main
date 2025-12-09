import { createServerRlsClient } from '@/lib/supabase/server'

// Flexible user type that works with Supabase User and custom shapes
type UserLike = {
  app_metadata?: Record<string, unknown>
  id: string
}

export function isSystemAdmin(user: UserLike | null | undefined) {
  const role = (user?.app_metadata as { role?: string } | undefined)?.role
  return role === 'system_admin'
}

export async function isTenantAdmin(tenantId: string, userId: string) {
  const supabase = await createServerRlsClient()
  const { data, error } = await supabase
    .from('tenant_memberships')
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
