import 'server-only'

import { cookies } from 'next/headers'
import { createServerRlsClient } from '@/lib/supabase/server'
import { resolveTenant } from '@/lib/tenant/resolver'
import { deriveEffectiveGlobalRole } from '@/lib/auth/role'
import type { AuthContext, UserProfile } from '@/types/auth'
import type { TenantMembership, TenantRole, TenantWithMembership } from '@/types/tenant'

export async function getServerAuthContext(pathname?: string): Promise<AuthContext> {
  const cookieStore = await cookies()
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      profile: null,
      effectiveGlobalRole: null,
      memberships: [],
      activeTenant: null,
      activeTenantRole: null,
    }
  }

  const [profileResult, membershipsResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('user_tenant_memberships').select('*, tenant:tenants(*)').eq('user_id', user.id),
  ])

  const profile = (profileResult.data as UserProfile | null) ?? null
  const memberships = (membershipsResult.data as TenantMembership[] | null) ?? []
  const effectiveGlobalRole = deriveEffectiveGlobalRole(profile, user)

  const { tenant, tenantRole } = await resolveTenant({
    pathname,
    cookieStore,
    memberships,
  })

  return {
    user,
    profile,
    effectiveGlobalRole,
    memberships,
    activeTenant: tenant as TenantWithMembership | null,
    activeTenantRole: (tenantRole as TenantRole | null) ?? null,
  }
}
