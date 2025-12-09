import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'
import { createServerRlsClient } from '@/lib/supabase/server'

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
  const userAgent = request.headers.get('user-agent') ?? null
  const forwarded = request.headers.get('x-forwarded-for')
  const clientIp = forwarded ? forwarded.split(',')[0]?.trim() : request.headers.get('x-real-ip')

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

    // Record session/device
    const rlsClient = await createServerRlsClient()
    type LooseSupabase = { from: (table: string) => ReturnType<typeof rlsClient.from> }
    const loose = rlsClient as unknown as LooseSupabase
    const {
      data: { user },
    } = await rlsClient.auth.getUser()

    if (user) {
      const now = new Date().toISOString()
      // Upsert device with fingerprint = null (OAuth flow) but keep UA/IP
      const { data: deviceRow } = await loose
        .from('user_devices')
        .insert({
          user_id: user.id,
          device_fingerprint: null,
          user_agent: userAgent,
          ip_last: clientIp,
          first_seen_at: now,
          last_seen_at: now,
        })
        .select('id')
        .maybeSingle()

        await loose.from('user_sessions').insert({
        // using loose typing avoids missing table in generated types
        user_id: user.id,
        supabase_session_id: null,
        device_id: deviceRow?.id ?? null,
        ip: clientIp,
        user_agent: userAgent,
        last_login_at: now,
        last_seen_at: now,
      })
    }

    // If this is a password recovery, redirect to recovery page
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/auth/recovery', requestUrl.origin))
    }
  }

  // Redirect to the requested URL or app dashboard
  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
}
