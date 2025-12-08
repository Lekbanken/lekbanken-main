import { createServerRlsClient } from '@/lib/supabase/server'

type UserMeta = {
  app_metadata?: { role?: string }
  id: string
}

export function isSystemAdmin(user: UserMeta | null | undefined) {
  return user?.app_metadata?.role === 'system_admin'
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

export async function assertTenantAdminOrSystem(tenantId: string, user: UserMeta | null | undefined) {
  if (!user) return false
  if (isSystemAdmin(user)) return true
  return isTenantAdmin(tenantId, user.id)
}
