import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'
import { env } from '@/lib/config/env'
import { deriveEffectiveGlobalRoleFromClaims, resolveTenantForMiddlewareRequest } from '@/lib/auth/middleware-helpers'
import { setTenantCookie, clearTenantCookie } from '@/lib/utils/tenantCookie'

const guestOnlyPaths = new Set(['/auth/login', '/auth/signup'])

// Platform domain suffix for subdomain routing
const PLATFORM_DOMAIN = '.lekbanken.no'
const PLATFORM_PRIMARY_HOST = 'app.lekbanken.no'

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

function isProtectedPath(pathname: string) {
  return pathname.startsWith('/app') || pathname.startsWith('/admin')
}

/**
 * Extract tenant ID from path override URL pattern /app/t/[tenantId]/...
 * This is handled directly in proxy to work without membership validation.
 */
function extractPathTenantId(pathname: string): string | null {
  const match = pathname.match(/^\/app\/t\/([^/]+)/i)
  return match?.[1] ?? null
}

/**
 * Validate that a string is a valid UUID (v1-v5 compatible).
 */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

// ============================================
// HOSTNAME RESOLUTION HELPERS (Security-critical)
// ============================================

/**
 * Safely extract and normalize hostname from request headers.
 * Priority: x-forwarded-host (if trusted) > host header
 * Security: Validates header format, strips port, lowercases.
 */
function extractHostname(request: NextRequest): string | null {
  // Try x-forwarded-host first (set by reverse proxy/CDN)
  let rawHost = request.headers.get('x-forwarded-host')
  
  // Security: Only trust x-forwarded-host if x-forwarded-proto is also present
  // (indicates request came through trusted infrastructure)
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (rawHost && !forwardedProto) {
    // Suspicious: x-forwarded-host without proto, fall back to host
    rawHost = null
  }
  
  // Security: Reject malformed x-forwarded-host (multiple hosts, whitespace)
  if (rawHost && (/[,\s]/.test(rawHost) || rawHost.includes('\n'))) {
    rawHost = null
  }
  
  // Fallback to host header
  if (!rawHost) {
    rawHost = request.headers.get('host')
  }
  
  if (!rawHost) return null
  
  // Normalize: strip port, lowercase
  const hostname = rawHost.split(':')[0].toLowerCase().trim()
  
  // Basic validation: hostname should be non-empty and not contain suspicious chars
  if (!hostname || /[^a-z0-9.-]/.test(hostname)) {
    return null
  }
  
  return hostname
}

/**
 * Check if hostname is a platform subdomain (*.lekbanken.no)
 */
function isPlatformSubdomain(hostname: string): boolean {
  return hostname.endsWith(PLATFORM_DOMAIN) || hostname === 'lekbanken.no'
}

/**
 * Check if hostname is allowed without database verification.
 * Returns true for localhost (dev) and *.lekbanken.no (platform).
 */
function isBuiltInTrustedHost(hostname: string): boolean {
  // Development: localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true
  }
  // Platform domains: *.lekbanken.no
  if (isPlatformSubdomain(hostname)) {
    return true
  }
  return false
}

/**
 * Resolve tenant ID from hostname via database lookup.
 * Checks tenant_domains table for active custom domains.
 * Also handles platform subdomains (tenant.lekbanken.no).
 */
async function resolveTenantByHostname(
  supabase: ReturnType<typeof createServerClient<Database>>,
  hostname: string,
  requestId: string
): Promise<string | null> {
  try {
    // Note: RPC function must exist in database. Type assertion needed until types are regenerated.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('get_tenant_id_by_hostname', {
      p_hostname: hostname,
    })
    
    if (error) {
      console.error(`[proxy:${requestId}] RPC get_tenant_id_by_hostname error:`, error.message)
      return null
    }
    
    // Validate that data is a UUID string
    if (data && typeof data === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data)) {
      return data
    }
    
    return null
  } catch (err) {
    console.error(`[proxy:${requestId}] Unexpected error in hostname resolution:`, err)
    return null
  }
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

  const isProtected = isProtectedPath(pathname)
  
  // ============================================
  // HOSTNAME-BASED TENANT RESOLUTION (Phase A)
  // Only perform hostname resolution for protected paths (/app, /admin)
  // ============================================
  
  const hostname = extractHostname(request)
  let hostTenantId: string | null = null
  let isHostTrusted = false
  
  if (hostname) {
    // Check if hostname is built-in trusted (localhost, lekbanken.no, *.lekbanken.no)
    if (isBuiltInTrustedHost(hostname)) {
      isHostTrusted = true
      // For platform subdomains (not app.lekbanken.no or lekbanken.no), resolve tenant via RPC
      // Only do RPC lookup for protected paths to avoid unnecessary DB calls
      if (isProtected && isPlatformSubdomain(hostname) && hostname !== PLATFORM_PRIMARY_HOST && hostname !== 'lekbanken.no') {
        hostTenantId = await resolveTenantByHostname(supabase, hostname, requestId)
      }
    } else if (isProtected) {
      // Custom domain on protected path: must be verified in tenant_domains table
      hostTenantId = await resolveTenantByHostname(supabase, hostname, requestId)
      if (hostTenantId) {
        isHostTrusted = true
      }
    } else {
      // Custom domain on non-protected path: allow without verification
      isHostTrusted = true
    }
  }
  
  // Security: Block untrusted hosts on protected paths
  if (!isHostTrusted && isProtected && hostname) {
    console.warn(`[proxy:${requestId}] Untrusted host blocked: ${hostname}`)
    return new NextResponse('Not Found', { status: 404, headers: { 'x-request-id': requestId } })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  // Gate: /admin/* requires system_admin, EXCEPT /admin/tenant/* which allows
  // any authenticated user through (tenant membership validated by layout guard)
  if (user && pathname.startsWith('/admin') && !pathname.startsWith('/admin/tenant/') && effectiveRole !== 'system_admin') {
    const redirectResponse = NextResponse.redirect(new URL('/app', request.url))
    redirectResponse.headers.set('x-request-id', requestId)
    return redirectResponse
  }

  // ============================================
  // TENANT RESOLUTION FOR /app PATHS
  // Priority when user is logged in:
  //   1. Path override (/app/t/[tenantId]) - extracted directly, no membership check
  //   2. Hostname resolution (custom domain or subdomain)
  //   3. Cookie / membership fallback via resolver
  // ============================================
  
  if (pathname.startsWith('/app') && user) {
    // Extract path override directly (not via resolver, to avoid membership dependency)
    // Validate that it's a proper UUID to prevent garbage values
    const pathTenantIdRaw = extractPathTenantId(pathname)
    const pathTenantId = pathTenantIdRaw && isUuid(pathTenantIdRaw) ? pathTenantIdRaw : null
    
    // Run resolver for redirects and cookie/membership fallback
    const { resolution } = await resolveTenantForMiddlewareRequest(request, [])

    if (resolution.redirect) {
      const redirectResponse = NextResponse.redirect(new URL(resolution.redirect, request.url))
      redirectResponse.headers.set('x-request-id', requestId)
      return redirectResponse
    }

    if (resolution.clearCookie) {
      clearTenantCookie(response.cookies)
    }

    // Determine final tenant ID with correct priority:
    // 1. Path override (extracted directly, always wins for logged-in user)
    // 2. Hostname-resolved tenant
    // 3. Cookie/membership-resolved tenant from resolver
    let finalTenantId: string | null = null
    
    if (pathTenantId) {
      // Path override has highest priority - no membership check in middleware
      // RLS and API layer will enforce access control
      finalTenantId = pathTenantId
    } else if (hostTenantId) {
      // Hostname resolution is second priority
      finalTenantId = hostTenantId
    } else if (resolution.tenantId) {
      // Cookie/membership fallback
      finalTenantId = resolution.tenantId
    }

    // Set header and cookie exactly once based on final tenant
    if (finalTenantId) {
      response.headers.set('x-tenant-id', finalTenantId)
      await setTenantCookie(response.cookies, finalTenantId, { hostname })
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
