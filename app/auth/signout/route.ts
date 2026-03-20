import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { Database } from '@/types/supabase'
import { clearCookieVariants, enhanceCookieOptions } from '@/lib/supabase/cookie-domain'

/**
 * Server-side Sign Out Handler
 * 
 * This endpoint properly clears ALL auth-related cookies that were set server-side.
 * The browser client cannot clear httpOnly cookies, so we need this server endpoint.
 * 
 * Clears:
 * - Supabase auth session cookies (sb-*-auth-token)
 * - Tenant cookie (lb_tenant)
 * 
 * Usage: POST /auth/signout
 * Returns: { ok: true } on success, redirects to /auth/login
 */

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const hostname = headerStore.get('host')?.split(':')[0] || null
  
  // Create Supabase client with cookie access
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, enhanceCookieOptions(options, hostname))
          })
        },
      },
    }
  )

  // Sign out from Supabase (this clears the session server-side)
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('[signout] Supabase signOut error:', error)
  }

  // Explicitly delete the tenant cookie
  clearCookieVariants(cookieStore, 'lb_tenant', hostname)
  
  // Delete demo session cookie if exists
  clearCookieVariants(cookieStore, 'demo_session_id', hostname)

  // Delete any remaining Supabase cookies explicitly
  // This ensures httpOnly cookies are properly cleared
  const allCookies = cookieStore.getAll()
  for (const cookie of allCookies) {
    if (cookie.name.includes('sb-') || cookie.name.includes('supabase') || cookie.name.includes('demo')) {
      clearCookieVariants(cookieStore, cookie.name, hostname)
    }
  }

  console.log('[signout] Cleared all auth cookies')

  // Check if client wants JSON response or redirect
  const acceptHeader = request.headers.get('accept') || ''
  const wantsJson = acceptHeader.includes('application/json')

  if (wantsJson) {
    const response = NextResponse.json({ ok: true })
    // Add cache control headers to prevent stale data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  }

  // Redirect to login page with cache-busting
  const response = NextResponse.redirect(new URL('/auth/login?signedOut=true', request.url))
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
}

// Also support GET for direct browser navigation
export async function GET(request: NextRequest) {
  return POST(request)
}
