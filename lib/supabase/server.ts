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
