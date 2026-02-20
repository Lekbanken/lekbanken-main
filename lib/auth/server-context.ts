import 'server-only'

import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { createServerRlsClient } from '@/lib/supabase/server'
import { resolveTenant } from '@/lib/tenant/resolver'
import { deriveEffectiveGlobalRole } from '@/lib/auth/role'
import type { AuthContext, UserProfile } from '@/types/auth'
import type { TenantMembership, TenantRole, TenantWithMembership } from '@/types/tenant'

/**
 * Core user data that doesn't depend on pathname.
 * This is cached ONCE per request regardless of pathname variations.
 */
interface ServerUserData {
  user: AuthContext['user']
  profile: UserProfile | null
  effectiveGlobalRole: AuthContext['effectiveGlobalRole']
  memberships: TenantMembership[]
}

/**
 * Request-scoped unique ID for tracing.
 * Uses cache() to ensure same ID across all calls within a request.
 * Useful for distinguishing "2x in same request" (bug) vs "2x across requests" (OK).
 */
const getRequestId = cache(() => crypto.randomUUID().slice(0, 8))

/**
 * Request-scoped counter for detecting cache() failures.
 * Uses cache() itself to ensure counter is per-request, not global.
 * Only active in development when SUPABASE_TRACE_BOOTSTRAP=1.
 */
const getBootstrapCallCounter = cache(() => ({ count: 0 }))

/**
 * Cached fetcher for user data - NO pathname in cache key.
 * This ensures auth.getUser() and profile/membership queries only run ONCE per request,
 * even if getServerAuthContext() is called with different pathnames.
 */
const getServerUserDataCached = cache(async (): Promise<ServerUserData> => {
  // Dev-only: Detect if cache() is not working as expected
  // Opt-in via SUPABASE_TRACE_BOOTSTRAP=1 to avoid console noise
  if (process.env.NODE_ENV !== 'production' && process.env.SUPABASE_TRACE_BOOTSTRAP === '1') {
    const requestId = getRequestId()
    const counter = getBootstrapCallCounter()
    counter.count++
    
    console.info(`[bootstrap] requestId=${requestId} call #${counter.count}`)
    
    if (counter.count > 1) {
      const stack = new Error().stack?.split('\n').slice(2, 8).join('\n') || ''
      console.warn(
        `[getServerUserDataCached] WARNING: Bootstrap called ${counter.count}x in same request (${requestId})! ` +
        `This indicates cache() is not deduplicating correctly.\n${stack}`
      )
    }
  }

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

  return {
    user,
    profile,
    effectiveGlobalRole,
    memberships,
  }
})

export async function getServerAuthContext(pathname?: string): Promise<AuthContext> {
  // Detect if middleware flagged auth as degraded (timeout / network error).
  // When degraded, middleware let the request through instead of redirecting
  // to login, so we still attempt auth here — the server-side Supabase client
  // has its own timeout and may succeed even if middleware's shorter timeout
  // didn't. If both fail, we surface authDegraded so UI can show "retrying"
  // instead of hard-redirecting to login.
  const headerStore = await headers()
  const middlewareAuthDegraded = headerStore.get('x-auth-degraded') === '1'

  // Get user data from request-scoped cache (same for all pathname variations)
  const userData = await getServerUserDataCached()

  if (!userData.user) {
    return {
      user: null,
      profile: null,
      effectiveGlobalRole: null,
      memberships: [],
      activeTenant: null,
      activeTenantRole: null,
      // If middleware auth timed out AND server auth also returned no user,
      // the session might still be valid — flag as degraded so UI can retry.
      authDegraded: middlewareAuthDegraded,
    }
  }

  // Resolve tenant based on pathname (this is the only pathname-dependent part)
  const cookieStore = await cookies()
  const { tenant, tenantRole } = await resolveTenant({
    pathname,
    cookieStore,
    memberships: userData.memberships,
  })

  return {
    user: userData.user,
    profile: userData.profile,
    effectiveGlobalRole: userData.effectiveGlobalRole,
    memberships: userData.memberships,
    activeTenant: tenant as TenantWithMembership | null,
    activeTenantRole: (tenantRole as TenantRole | null) ?? null,
  }
}
