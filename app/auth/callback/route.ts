import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

/**
 * OAuth Callback Handler
 * 
 * Handles the redirect from Supabase Auth after OAuth (Google, etc.)
 * Exchanges the auth code for a session and redirects to the app
 */

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('next') || '/app'

  if (code) {
    const supabase = createRouteHandlerClient<Database>({
      cookies,
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth exchange error:', error)
      return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }
  }

  // Redirect to the requested URL or app dashboard
  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
}
