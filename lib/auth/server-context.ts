import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { createServerRlsClient } from '@/lib/supabase/server'
import { resolveTenant } from '@/lib/tenant/resolver'
import { deriveEffectiveGlobalRole } from '@/lib/auth/role'
import type { AuthContext, UserProfile } from '@/types/auth'
import type { TenantMembership, TenantRole, TenantWithMembership } from '@/types/tenant'

export async function getServerAuthContext(pathname?: string): Promise<AuthContext> {
  return getServerAuthContextCached(pathname)
}

// Cache within a single request to prevent duplicated `auth.getUser()` and related queries.
const getServerAuthContextCached = cache(async (pathname?: string): Promise<AuthContext> => {
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
    supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_tenant_memberships').select('*, tenant:tenants(*)').eq('user_id', user.id),
  ])

  // Build profile from DB or fallback to auth user metadata
  let profile: UserProfile | null = profileResult.data as UserProfile | null
  
  if (!profile && user) {
    // Create synthetic profile from auth user metadata when DB profile is missing
    profile = {
      id: user.id,
      email: user.email ?? null,
      full_name: (user.user_metadata?.full_name as string) ?? 
                 (user.user_metadata?.name as string) ?? 
                 user.email?.split('@')[0] ?? null,
      avatar_url: (user.user_metadata?.avatar_url as string) ?? 
                  (user.user_metadata?.picture as string) ?? null,
      created_at: user.created_at,
      updated_at: new Date().toISOString(),
    } as UserProfile
  }
  
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
})
