/**
 * Supabase Browser Client (SSR-ready)
 *
 * Stores the auth session in HTTP cookies so that:
 * - middleware and server components can read the session
 * - refresh tokens are written via `setAll` when Supabase rotates tokens
 * 
 * Uses Web Locks API to prevent refresh token race conditions across tabs.
 */

import { createBrowserClient as createSupabaseBrowserClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { env } from '@/lib/config/env'
import { enhanceCookieOptions, getBrowserHostname } from '@/lib/supabase/cookie-domain'
import { createFetchWithTimeout } from '@/lib/supabase/fetch-with-timeout'

const supabaseUrl = env.supabase.url
const supabaseAnonKey = env.supabase.anonKey

// =============================================================================
// Web Locks API for cross-tab token refresh coordination
// =============================================================================
// Prevents race conditions where multiple tabs try to refresh the same token
// simultaneously, causing "Invalid Refresh Token" errors.
// 
// Signature: LockFunc = <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R>
// =============================================================================

const supportsWebLocks = typeof navigator !== 'undefined' && 'locks' in navigator

/**
 * Custom lock function using Web Locks API.
 * Coordinates token refresh across tabs to prevent race conditions.
 */
async function navigatorLockFunc<R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  if (!supportsWebLocks) {
    // Fallback: execute without locking (older browsers)
    return fn()
  }

  const abortController = new AbortController()
  
  // Set up timeout if specified (positive value)
  if (acquireTimeout > 0) {
    setTimeout(() => abortController.abort(), acquireTimeout)
  }

  try {
    return await navigator.locks.request(
      name,
      {
        mode: 'exclusive',
        signal: acquireTimeout > 0 ? abortController.signal : undefined,
      },
      async () => {
        return await fn()
      }
    )
  } catch (err) {
    // Handle abort (timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      const timeoutError = new Error(
        `Lock "${name}" could not be acquired within ${acquireTimeout}ms`
      )
      ;(timeoutError as Error & { isAcquireTimeout: boolean }).isAcquireTimeout = true
      throw timeoutError
    }
    throw err
  }
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  // Enhance cookie options with cross-subdomain domain for platform domains
  const hostname = getBrowserHostname()
  const enhancedOptions = enhanceCookieOptions(options, hostname)
  
  // Minimal cookie serializer for browser usage; mirrors Next.js defaults.
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${enhancedOptions.path ?? '/'}`,
    enhancedOptions.maxAge ? `Max-Age=${enhancedOptions.maxAge}` : null,
    enhancedOptions.expires ? `Expires=${enhancedOptions.expires.toUTCString()}` : null,
    enhancedOptions.domain ? `Domain=${enhancedOptions.domain}` : null,
    `SameSite=${enhancedOptions.sameSite ?? 'Lax'}`,
    enhancedOptions.secure ? 'Secure' : null,
  ].filter(Boolean)

  // fall back to Secure when running on https even if not explicitly set
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (!enhancedOptions.secure && isHttps) parts.push('Secure')

  document.cookie = parts.join('; ')
}

function readBrowserCookies() {
  if (typeof document === 'undefined') return []

  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const separatorIndex = cookie.indexOf('=')
      const name = cookie.substring(0, separatorIndex)
      const value = cookie.substring(separatorIndex + 1)
      return { name, value }
    })
}

function instantiateBrowserClient(): SupabaseClient<Database> {
  return createSupabaseBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return readBrowserCookies()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => serializeCookie(name, value, options))
      },
    },
    global: {
      fetch: createFetchWithTimeout(fetch, { logPrefix: '[supabase fetch:browser]' }),
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Prevent race conditions across tabs when refreshing tokens
      // Without this, multiple tabs can try to refresh simultaneously,
      // causing "Invalid Refresh Token: Refresh Token Not Found" errors
      lock: supportsWebLocks ? navigatorLockFunc : undefined,
    },
  })
}

let browserClient: SupabaseClient<Database> | null = null

export function createBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('createBrowserClient must be called in the browser')
  }
  if (!browserClient) {
    browserClient = instantiateBrowserClient()
  }
  return browserClient
}

// Lazy-initialized singleton for client components
// Use createBrowserClient() directly for explicit control
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return createBrowserClient()[prop as keyof SupabaseClient<Database>]
  },
})
