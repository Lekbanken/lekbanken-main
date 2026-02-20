import 'server-only'

import { cache } from 'react'
import { createClient as createServiceRoleSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { Database } from '@/types/supabase'
import { env } from '@/lib/config/env'
import { enhanceCookieOptions } from '@/lib/supabase/cookie-domain'
import { createFetchWithTimeout } from '@/lib/supabase/fetch-with-timeout'

const supabaseUrl = env.supabase.url
const supabaseAnonKey = env.supabase.anonKey
const supabaseServiceRoleKey = env.supabase.serviceRoleKey

/**
 * Request-scoped RLS-aware client for server code (app router, server actions, route handlers).
 * Uses @supabase/ssr so refreshed tokens are written back to response cookies.
 * 
 * NOTE: This will trigger a Supabase warning in dev mode about getSession() being insecure.
 * This is expected behavior when using SSR with cookies. The warning means:
 * - Don't trust session data from cookies for security-critical operations
 * - Always use getUser() to validate user identity (validates with auth server)
 * - We handle this correctly by using getAuthUser() helper for auth checks
 * 
 * The warning is informational and does not indicate a security issue in our code.
 */
export async function createServerRlsClient() {
  return createServerRlsClientCached()
}

// Cache within a single RSC/server-action request to avoid repeated `/auth/v1/user` storms.
// Next.js scopes React `cache()` to the active request context.
const createServerRlsClientCached = cache(async () => {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const hostname = headerStore.get('host')?.split(':')[0] || null

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const enhancedOptions = enhanceCookieOptions(options, hostname)
          cookieStore.set(name, value, enhancedOptions)
        })
      },
    },
    global: {
      fetch: createFetchWithTimeout(fetch, { logPrefix: '[supabase fetch:server]' }),
    },
  })
})

/**
 * Get authenticated user from server context
 * Uses getUser() instead of getSession() for security - validates with auth server
 * This is the recommended way to get user on the server side.
 */
export async function getAuthUser() {
  return getAuthUserCached()
}

const getAuthUserCached = cache(async () => {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.warn('[getAuthUser] Error fetching user:', error.message)
    return null
  }

  return user
})

/**
 * Service role client for background/admin tasks.
 * Never use this in the browser or in user-scoped request flows.
 */
export function createServiceRoleClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createServiceRoleSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      fetch: createFetchWithTimeout(fetch, {
        logPrefix: '[supabase fetch:service-role]',
        restMs: 15_000,
        authMs: 10_000,
      }),
    },
  })
}

// Lazy-loaded singleton for admin tasks on the server only.
// Uses getter to avoid throwing during Next.js build when env var may not be set.
let _supabaseAdmin: ReturnType<typeof createServiceRoleClient> | null = null

export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createServiceRoleClient()
  }
  return _supabaseAdmin
}

/**
 * @deprecated Use getSupabaseAdmin() instead to avoid build-time errors
 */
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createServiceRoleClient>, {
  get(_, prop) {
    return getSupabaseAdmin()[prop as keyof ReturnType<typeof createServiceRoleClient>]
  },
})

export async function getRequestTenantId() {
  const headerStore = await headers()
  return headerStore.get('x-tenant-id')
}
