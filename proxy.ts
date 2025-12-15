import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'
import { env } from '@/lib/config/env'
import { deriveEffectiveGlobalRoleFromClaims, resolveTenantForMiddlewareRequest } from '@/lib/auth/middleware-helpers'
import { setTenantCookie, clearTenantCookie } from '@/lib/utils/tenantCookie'

const guestOnlyPaths = new Set(['/auth/login', '/auth/signup'])

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

function isProtectedPath(pathname: string) {
  return pathname.startsWith('/app') || pathname.startsWith('/admin')
}

export default async function proxy(request: NextRequest) {
  const requestId = generateRequestId()
  const pathname = request.nextUrl.pathname

  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)

  const supabase = createServerClient<Database>(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtected = isProtectedPath(pathname)
  const isGuestOnly = guestOnlyPaths.has(pathname)

  if (!user && isProtected) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    redirectResponse.headers.set('x-request-id', requestId)
    return redirectResponse
  }

  if (user && isGuestOnly) {
    const redirectResponse = NextResponse.redirect(new URL('/app', request.url))
    redirectResponse.headers.set('x-request-id', requestId)
    return redirectResponse
  }

  const effectiveRole = deriveEffectiveGlobalRoleFromClaims(user)
  if (user && pathname.startsWith('/admin') && effectiveRole !== 'system_admin') {
    const redirectResponse = NextResponse.redirect(new URL('/app', request.url))
    redirectResponse.headers.set('x-request-id', requestId)
    return redirectResponse
  }

  if (user && pathname.startsWith('/app')) {
    const { resolution } = await resolveTenantForMiddlewareRequest(request, [])

    if (resolution.redirect) {
      const redirectResponse = NextResponse.redirect(new URL(resolution.redirect, request.url))
      redirectResponse.headers.set('x-request-id', requestId)
      return redirectResponse
    }

    if (resolution.clearCookie) {
      clearTenantCookie(response.cookies)
    }

    if (resolution.tenantId) {
      response.headers.set('x-tenant-id', resolution.tenantId)
      await setTenantCookie(response.cookies, resolution.tenantId)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
