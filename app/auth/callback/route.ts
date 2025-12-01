import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

/**
 * OAuth & Recovery Callback Handler
 * 
 * Handles the redirect from Supabase Auth after:
 * - OAuth (Google, etc.)
 * - Password recovery
 * - Email confirmation
 * 
 * Exchanges the auth code for a session and redirects appropriately
 */

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const redirectTo = requestUrl.searchParams.get('next') || '/app'

  if (code) {
    const cookieStore = await cookies()
    
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
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth exchange error:', error)
      return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }

    // If this is a password recovery, redirect to recovery page
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/auth/recovery', requestUrl.origin))
    }
  }

  // Redirect to the requested URL or app dashboard
  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
}
