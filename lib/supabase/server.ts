import 'server-only'

import { createClient as createServiceRoleSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { Database } from '@/types/supabase'
import { env } from '@/lib/config/env'

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
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })
}

/**
 * Get authenticated user from server context
 * Uses getUser() instead of getSession() for security - validates with auth server
 * This is the recommended way to get user on the server side.
 */
export async function getAuthUser() {
  const supabase = await createServerRlsClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.warn('[getAuthUser] Error fetching user:', error.message)
    return null
  }
  
  return user
}

/**
 * Service role client for background/admin tasks.
 * Never use this in the browser or in user-scoped request flows.
 */
export function createServiceRoleClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createServiceRoleSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey)
}

// Export singleton for rare admin tasks on the server only
export const supabaseAdmin = createServiceRoleClient()

export async function getRequestTenantId() {
  const headerStore = await headers()
  return headerStore.get('x-tenant-id')
}
