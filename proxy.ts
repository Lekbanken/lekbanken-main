import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'
import { env } from '@/lib/config/env'
import { deriveEffectiveGlobalRoleFromClaims, resolveTenantForMiddlewareRequest } from '@/lib/auth/middleware-helpers'
import { setTenantCookie, clearTenantCookie } from '@/lib/utils/tenantCookie'
import { defaultLocale, LOCALE_COOKIE, isValidLocale, type Locale } from '@/lib/i18n/config'
import { checkMFAStatus, MFA_TRUST_COOKIE, buildMFAChallengeUrl, buildMFAEnrollUrl, extractDeviceFingerprint } from '@/lib/auth/mfa-aal'
import { enhanceCookieOptions } from '@/lib/supabase/cookie-domain'
import { createFetchWithTimeout } from '@/lib/supabase/fetch-with-timeout'

const guestOnlyPaths = new Set(['/auth/login', '/auth/signup'])

// Platform domain suffix for subdomain routing
const PLATFORM_DOMAIN = '.lekbanken.no'
const PLATFORM_PRIMARY_HOST = 'app.lekbanken.no'
const DEMO_SUBDOMAIN = 'demo.lekbanken.no'
const DEMO_TENANT_ID = '00000000-0000-0000-0000-00000000de01'

// ============================================
// AUTH CIRCUIT BREAKER (module-level, per Edge isolate)
// Rolling-window: tracks recent failure timestamps instead of a
// consecutive counter.  This is robust in concurrent edge
// environments where request ordering is non-deterministic.
// ============================================
const AUTH_CB_THRESHOLD = 3        // failures in window before opening
const AUTH_CB_WINDOW_MS  = 30_000  // rolling window length
const AUTH_CB_PROBE_MS   = 2_000   // half-open probe lock duration
const AUTH_CB_MAX_TIMESTAMPS = 10  // cap stored timestamps

interface CircuitBreakerState {
  /** Recent failure timestamps (epoch ms), newest last. Max AUTH_CB_MAX_TIMESTAMPS entries. */
  failTimestamps: number[]
  /** While > Date.now(), only one probe is in-flight — others stay circuit-open. */
  probeLockedUntil: number
  /** Lifetime counter: how many times the circuit has tripped. */
  totalTripped: number
}

const authCircuit: CircuitBreakerState = {
  failTimestamps: [],
  probeLockedUntil: 0,
  totalTripped: 0,
}

type CircuitState = 'closed' | 'open' | 'half-open'

/** Prune timestamps older than the rolling window. */
function pruneCircuit() {
  const cutoff = Date.now() - AUTH_CB_WINDOW_MS
  authCircuit.failTimestamps = authCircuit.failTimestamps.filter(t => t > cutoff)
}

/** Determine current circuit state. */
function getAuthCircuitState(): CircuitState {
  pruneCircuit()
  if (authCircuit.failTimestamps.length < AUTH_CB_THRESHOLD) return 'closed'
  // Enough failures in window → circuit is open.
  // Check if probe lock has expired → half-open (exactly one request probes).
  if (Date.now() >= authCircuit.probeLockedUntil) return 'half-open'
  return 'open'
}

/** Acquire the probe lock. Returns true if this request is the probe. */
function tryAcquireProbe(): boolean {
  const now = Date.now()
  if (now >= authCircuit.probeLockedUntil) {
    authCircuit.probeLockedUntil = now + AUTH_CB_PROBE_MS
    return true
  }
  return false
}

function recordAuthFailure() {
  const now = Date.now()
  pruneCircuit()

  const wasTripped = authCircuit.failTimestamps.length >= AUTH_CB_THRESHOLD
  authCircuit.failTimestamps.push(now)

  // Keep array bounded
  if (authCircuit.failTimestamps.length > AUTH_CB_MAX_TIMESTAMPS) {
    authCircuit.failTimestamps = authCircuit.failTimestamps.slice(-AUTH_CB_MAX_TIMESTAMPS)
  }

  pruneCircuit()
  const isTripped = authCircuit.failTimestamps.length >= AUTH_CB_THRESHOLD
  // Only count when crossing threshold — not on every subsequent failure
  if (!wasTripped && isTripped) {
    authCircuit.totalTripped++
  }
}

function recordAuthSuccess() {
  // Full reset — healthy probe confirms upstream is back.
  authCircuit.failTimestamps = []
  authCircuit.probeLockedUntil = 0
}

// ============================================
// SCOREBOARD — lightweight counters for observability
// Logged periodically so operators can detect degraded state.
// ============================================
interface Scoreboard {
  total: number
  authDegraded: number
  mfaDegraded: number
  circuitTripped: number
  tenantCacheHits: number
  tenantCacheMisses: number
  tenantRpcAttempts: number
  tenantRpcErrors: number
  // Auth call detail
  authCalls: number
  authTimeouts: number
  authErrors: number
  // Latency buckets for auth calls (ms thresholds)
  authLat200: number   // < 200ms
  authLat500: number   // 200-500ms
  authLat1000: number  // 500-1000ms
  authLat2000: number  // 1000-2000ms
  authLatSlow: number  // >= 2000ms (or timeout)
  windowStart: number
}

const scoreboard: Scoreboard = {
  total: 0,
  authDegraded: 0,
  mfaDegraded: 0,
  circuitTripped: 0,
  tenantCacheHits: 0,
  tenantCacheMisses: 0,
  tenantRpcAttempts: 0,
  tenantRpcErrors: 0,
  authCalls: 0,
  authTimeouts: 0,
  authErrors: 0,
  authLat200: 0,
  authLat500: 0,
  authLat1000: 0,
  authLat2000: 0,
  authLatSlow: 0,
  windowStart: Date.now(),
}

function recordAuthLatency(ms: number) {
  if (ms < 200)       scoreboard.authLat200++
  else if (ms < 500)  scoreboard.authLat500++
  else if (ms < 1000) scoreboard.authLat1000++
  else if (ms < 2000) scoreboard.authLat2000++
  else                scoreboard.authLatSlow++
}

const SCOREBOARD_LOG_INTERVAL_MS = 60_000 // log every 60s

function flushScoreboardIfDue() {
  const elapsed = Date.now() - scoreboard.windowStart
  if (elapsed < SCOREBOARD_LOG_INTERVAL_MS || scoreboard.total === 0) return

  console.info(
    `[proxy:scoreboard] window=${Math.round(elapsed / 1000)}s` +
    ` total=${scoreboard.total}` +
    ` authDegraded=${scoreboard.authDegraded}` +
    ` mfaDegraded=${scoreboard.mfaDegraded}` +
    ` circuitTripped=${scoreboard.circuitTripped}` +
    ` tenantCache=${scoreboard.tenantCacheHits}hit/${scoreboard.tenantCacheMisses}miss` +
    ` tenantRpc=${scoreboard.tenantRpcAttempts}att/${scoreboard.tenantRpcErrors}err` +
    ` auth=${scoreboard.authCalls}calls/${scoreboard.authTimeouts}to/${scoreboard.authErrors}err` +
    ` latency=<200:${scoreboard.authLat200}|<500:${scoreboard.authLat500}|<1s:${scoreboard.authLat1000}|<2s:${scoreboard.authLat2000}|slow:${scoreboard.authLatSlow}` +
    ` cbTripsLifetime=${authCircuit.totalTripped}`
  )

  // Reset window counters (lifetime counters live on authCircuit)
  scoreboard.total = 0
  scoreboard.authDegraded = 0
  scoreboard.mfaDegraded = 0
  scoreboard.circuitTripped = 0
  scoreboard.tenantCacheHits = 0
  scoreboard.tenantCacheMisses = 0
  scoreboard.tenantRpcAttempts = 0
  scoreboard.tenantRpcErrors = 0
  scoreboard.authCalls = 0
  scoreboard.authTimeouts = 0
  scoreboard.authErrors = 0
  scoreboard.authLat200 = 0
  scoreboard.authLat500 = 0
  scoreboard.authLat1000 = 0
  scoreboard.authLat2000 = 0
  scoreboard.authLatSlow = 0
  scoreboard.windowStart = Date.now()
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Resolve the locale for a request.
 * Priority: Cookie → Accept-Language → Default
 */
function resolveLocale(request: NextRequest): Locale {
  // 1. Check cookie
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language')
  if (acceptLanguage) {
    // Parse Accept-Language header (e.g., "sv-SE,sv;q=0.9,en;q=0.8")
    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [code, q = 'q=1'] = lang.trim().split(';')
        return {
          code: code.split('-')[0].toLowerCase(), // Extract primary language code
          quality: parseFloat(q.replace('q=', '')) || 1,
        }
      })
      .sort((a, b) => b.quality - a.quality)

    for (const { code } of languages) {
      if (isValidLocale(code)) {
        return code
      }
    }
  }

  // 3. Default fallback
  return defaultLocale
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
  const middlewareStart = Date.now()
  try {
  const pathname = request.nextUrl.pathname
  const middlewareStart = Date.now()

  // Hard cap on total middleware wall-time. If earlier stages (auth, tenant RPC)
  // consumed most of the budget, skip remaining async work (MFA, /app tenant
  // resolution) to keep worst-case latency deterministic.
  const MIDDLEWARE_BUDGET_MS = 6_000
  function budgetRemaining(): number { return MIDDLEWARE_BUDGET_MS - (Date.now() - middlewareStart) }
  function isBudgetExhausted(): boolean { return budgetRemaining() <= 0 }

  let response = NextResponse.next({ request })
  response.headers.set('x-request-id', requestId)

  // ============================================
  // HOSTNAME EXTRACTION (needed early for cookie domain)
  // ============================================
  const hostname = extractHostname(request)

  // ============================================
  // LOCALE RESOLUTION
  // Resolve and set locale cookie for i18n
  // ============================================
  const locale = resolveLocale(request)
  const existingLocale = request.cookies.get(LOCALE_COOKIE)?.value
  
  // Set/update locale cookie if not already set or different
  if (!existingLocale || existingLocale !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })
  }

  const supabase = createServerClient<Database>(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // 1. Write refreshed tokens to request so downstream server code sees them
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        // 2. Recreate response from modified request to propagate cookies
        response = NextResponse.next({ request })
        response.headers.set('x-request-id', requestId)

        // 3. Write to response so the browser stores the refreshed tokens
        cookiesToSet.forEach(({ name, value, options }) => {
          const enhancedOptions = enhanceCookieOptions(options, hostname)
          response.cookies.set(name, value, enhancedOptions)
        })
      },
    },
    global: {
      // Aggressive timeouts for middleware — gateway must never block the page.
      // If Supabase is slow, we soft-fail and let server layout handle auth.
      fetch: createFetchWithTimeout(fetch, {
        logPrefix: '[supabase fetch:middleware]',
        restMs: 4_000,
        authMs: 4_000,
        functionsMs: 5_000,
        defaultMs: 5_000,
      }),
    },
  })

  const isProtected = isProtectedPath(pathname)
  
  // ============================================
  // HOSTNAME-BASED TENANT RESOLUTION (Phase A)
  // Only perform hostname resolution for protected paths (/app, /admin)
  // Uses cookie cache to avoid DB/RPC calls on every request.
  // ============================================
  
  // Cookie-based cache for hostname→tenant resolution.
  // After first RPC resolution, we store { host, tenantId } in a short-lived
  // cookie so subsequent requests skip the DB roundtrip entirely.
  // The `host` field prevents cross-domain cache poisoning when the same
  // browser visits multiple subdomains / custom domains.
  const HOST_TENANT_COOKIE = 'lb_host_tenant'
  
  const TENANT_COOKIE_VERSION = 1
  
  /**
   * Read the host-scoped tenant cookie. Returns the tenant ID only if
   * the cached hostname matches the current request hostname and
   * the cookie version matches the current format.
   */
  function readHostTenantCookie(): string | null {
    const raw = request.cookies.get(HOST_TENANT_COOKIE)?.value
    if (!raw) { scoreboard.tenantCacheMisses++; return null }
    try {
      const parsed = JSON.parse(raw) as { v?: number; host?: string; tenantId?: string }
      if (
        parsed.v === TENANT_COOKIE_VERSION &&
        typeof parsed.host === 'string' &&
        typeof parsed.tenantId === 'string' &&
        parsed.host === hostname &&
        isUuid(parsed.tenantId)
      ) {
        scoreboard.tenantCacheHits++
        return parsed.tenantId
      }
    } catch { /* malformed cookie — treat as miss */ }
    scoreboard.tenantCacheMisses++
    return null
  }
  
  /**
   * Write the host-scoped tenant cookie.
   */
  function writeHostTenantCookie(tenantId: string) {
    response.cookies.set(HOST_TENANT_COOKIE, JSON.stringify({ v: TENANT_COOKIE_VERSION, host: hostname, tenantId }), {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 300, // 5 minutes
      httpOnly: true,
    })
  }
  
  let hostTenantId: string | null = null
  let isHostTrusted = false
  let isDemoMode = false
  
  if (hostname) {
    // Check if hostname is built-in trusted (localhost, lekbanken.no, *.lekbanken.no)
    if (isBuiltInTrustedHost(hostname)) {
      isHostTrusted = true
      
      // Special case: demo.lekbanken.no - use fixed demo tenant ID
      if (hostname === DEMO_SUBDOMAIN) {
        isDemoMode = true
        hostTenantId = DEMO_TENANT_ID
        response.headers.set('x-demo-mode', 'true')
      }
      // For platform subdomains (not app.lekbanken.no or lekbanken.no), resolve tenant via RPC
      // Only do RPC lookup for protected paths to avoid unnecessary DB calls
      else if (isProtected && isPlatformSubdomain(hostname) && hostname !== PLATFORM_PRIMARY_HOST && hostname !== 'lekbanken.no') {
        // Try host-scoped cookie cache first to avoid DB roundtrip
        hostTenantId = readHostTenantCookie()
        if (!hostTenantId) {
          scoreboard.tenantRpcAttempts++
          try {
            hostTenantId = await resolveTenantByHostname(supabase, hostname, requestId)
          } catch (err) {
            scoreboard.tenantRpcErrors++
            console.warn(`[proxy:${requestId}] Tenant hostname resolution failed, soft-failing:`, err instanceof Error ? err.message : err)
          }
          if (hostTenantId) {
            writeHostTenantCookie(hostTenantId)
          }
        }
      }
    } else if (isProtected) {
      // Custom domain on protected path: must be verified in tenant_domains table
      hostTenantId = readHostTenantCookie()
      if (hostTenantId) {
        isHostTrusted = true
      } else {
        scoreboard.tenantRpcAttempts++
        try {
          hostTenantId = await resolveTenantByHostname(supabase, hostname, requestId)
        } catch (err) {
          scoreboard.tenantRpcErrors++
          console.warn(`[proxy:${requestId}] Tenant hostname resolution failed, soft-failing:`, err instanceof Error ? err.message : err)
        }
        if (hostTenantId) {
          isHostTrusted = true
          writeHostTenantCookie(hostTenantId)
        }
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

  // Soft-fail auth: if getUser() times out or errors, treat as unauthenticated
  // and let server layout handle the real auth check (which has its own timeout).
  // This prevents middleware from becoming a global bottleneck.
  //
  // Circuit breaker (rolling-window + probe lock):
  //   closed  → call auth normally
  //   open    → skip auth, flag degraded immediately
  //   half-open → one probe request goes through, others stay open
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null
  let authDegraded = false
  const circuitState = getAuthCircuitState()
  let effectiveCircuit: CircuitState = circuitState

  if (circuitState === 'open') {
    authDegraded = true
    scoreboard.circuitTripped++
    effectiveCircuit = 'open'
    console.warn(`[proxy:${requestId}] auth circuit OPEN (${authCircuit.failTimestamps.length} fails in window), skipping getUser()`)
  } else if (circuitState === 'half-open') {
    const acquired = tryAcquireProbe()
    if (!acquired) {
      // Another request is already probing — behave as open for this one
      authDegraded = true
      scoreboard.circuitTripped++
      effectiveCircuit = 'open'
      console.warn(`[proxy:${requestId}] auth circuit HALF-OPEN (probe in flight), skipping getUser()`)
    }
    // else: acquired probe — fall through to auth call below
  }

  // closed or half-open probe: actually call auth
  if (!authDegraded) {
    // NOTE on 401/403: Supabase auth-js only *throws* on network errors and
    // 502/503/504. A 401 (expired/missing JWT) returns { data: { user: null }, error }
    // without throwing. This means 401s naturally do NOT feed the circuit breaker —
    // which is exactly what we want: only infrastructure failures open the circuit.
    const authStart = Date.now()
    scoreboard.authCalls++
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
      recordAuthLatency(Date.now() - authStart)
      recordAuthSuccess()
    } catch (err) {
      const elapsed = Date.now() - authStart
      recordAuthLatency(elapsed)
      authDegraded = true
      // Distinguish timeout from other errors for scoreboard
      const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
      if (isTimeout) { scoreboard.authTimeouts++ } else { scoreboard.authErrors++ }
      recordAuthFailure()
      console.warn(`[proxy:${requestId}] auth.getUser() failed (${elapsed}ms, ${isTimeout ? 'timeout' : 'error'}), soft-failing:`, err instanceof Error ? err.message : err)
    }
  }

  // Expose effective circuit state + degraded flag to server layer and logs
  response.headers.set('x-auth-circuit', effectiveCircuit)
  if (authDegraded) {
    response.headers.set('x-auth-degraded', '1')
    scoreboard.authDegraded++
  }

  const isGuestOnly = guestOnlyPaths.has(pathname)

  // Demo subdomain: redirect unauthenticated users to demo start page
  if (!user && isProtected && isDemoMode) {
    // Check if user has demo session cookie but no auth
    const demoSessionId = request.cookies.get('demo_session_id')?.value
    if (!demoSessionId) {
      // No demo session - redirect to landing page to start demo
      const redirectResponse = NextResponse.redirect(new URL('/', request.url))
      redirectResponse.headers.set('x-request-id', requestId)
      return redirectResponse
    }
    // Has demo cookie but no auth - session may have expired
    // Let normal auth redirect handle it
  }

  if (!user && isProtected) {
    // If auth is degraded (timeout/network error), do NOT redirect to login.
    // Instead let the request through — the server-side auth check (which has
    // its own timeout + the actual session cookie) will handle it properly.
    // This prevents redirect loops when Supabase auth is slow but the session
    // cookie is still valid.
    if (!authDegraded) {
      const redirectUrl = new URL('/auth/login', request.url)
      redirectUrl.searchParams.set('redirect', `${request.nextUrl.pathname}${request.nextUrl.search}`)
      const redirectResponse = NextResponse.redirect(redirectUrl)
      redirectResponse.headers.set('x-request-id', requestId)
      return redirectResponse
    }
    // authDegraded: fall through — server layout will retry auth
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
  // MFA ENFORCEMENT (Sprint 4)
  // Check MFA requirements for protected paths
  // Skip for MFA-related paths to avoid redirect loops
  // ============================================
  
  const mfaExemptPaths = [
    '/auth/mfa-challenge',
    '/auth/signout',
    '/auth/callback',
    '/app/profile/security',
    '/api/',
  ]
  
  const isMFAExempt = mfaExemptPaths.some(p => pathname.startsWith(p))
  
  if (user && isProtected && !isMFAExempt && !isDemoMode && !authDegraded && !isBudgetExhausted()) {
    // Check MFA enforcement settings
    const enforceAdmins = process.env.MFA_ENFORCE_ADMINS !== 'false'
    const enforceTenantAdmins = process.env.MFA_ENFORCE_TENANT_ADMINS !== 'false'
    
    // Only check if enforcement is enabled
    if (enforceAdmins || enforceTenantAdmins) {
      try {
        // Get trusted device token from cookie
        const trustToken = request.cookies.get(MFA_TRUST_COOKIE)?.value
        const deviceFingerprint = extractDeviceFingerprint(request.headers, request.cookies)
        
        const mfaStatus = await checkMFAStatus(supabase, user, {
          trustToken,
          deviceFingerprint: deviceFingerprint ?? undefined,
          enforceAdmins,
          enforceTenantAdmins,
        })
        
        // Set MFA status headers for debugging/logging
        response.headers.set('x-mfa-required', mfaStatus.mfaRequired ? 'true' : 'false')
        response.headers.set('x-mfa-satisfied', mfaStatus.mfaSatisfied ? 'true' : 'false')
        
        if (mfaStatus.mfaRequired && !mfaStatus.mfaSatisfied) {
          // MFA required but not satisfied
          if (mfaStatus.mfaEnrolled) {
            // User is enrolled but needs to verify (AAL1 -> AAL2)
            const challengeUrl = buildMFAChallengeUrl(request.nextUrl)
            const redirectResponse = NextResponse.redirect(challengeUrl)
            redirectResponse.headers.set('x-request-id', requestId)
            redirectResponse.headers.set('x-mfa-redirect-reason', 'verification_required')
            return redirectResponse
          } else {
            // User not enrolled - redirect to enrollment page
            const enrollUrl = buildMFAEnrollUrl(request.nextUrl)
            const redirectResponse = NextResponse.redirect(enrollUrl)
            redirectResponse.headers.set('x-request-id', requestId)
            redirectResponse.headers.set('x-mfa-redirect-reason', 'enrollment_required')
            return redirectResponse
          }
        }
        
        // Add grace period warning header if applicable
        if (mfaStatus.gracePeriod?.active) {
          response.headers.set('x-mfa-grace-period', 'true')
          response.headers.set('x-mfa-grace-days', String(mfaStatus.gracePeriod.daysRemaining))
        }
      } catch (err) {
        // Soft-fail MFA: if checkMFAStatus times out, let the request through.
        // Server layout will handle MFA verification if needed.
        console.warn(`[proxy:${requestId}] MFA check failed, soft-failing:`, err instanceof Error ? err.message : err)
        response.headers.set('x-mfa-degraded', '1')
        scoreboard.mfaDegraded++
      }
    }
  }

  // ============================================
  // TENANT RESOLUTION FOR /app PATHS
  // Priority when user is logged in:
  //   1. Path override (/app/t/[tenantId]) - extracted directly, no membership check
  //   2. Hostname resolution (custom domain or subdomain)
  //   3. Cookie / membership fallback via resolver
  // ============================================
  
  if (pathname.startsWith('/app') && user && !isBudgetExhausted()) {
    // Extract path override directly (not via resolver, to avoid membership dependency)
    // Validate that it's a proper UUID to prevent garbage values
    const pathTenantIdRaw = extractPathTenantId(pathname)
    const pathTenantId = pathTenantIdRaw && isUuid(pathTenantIdRaw) ? pathTenantIdRaw : null
    
    // Run resolver for redirects and cookie/membership fallback
    const { resolution } = await resolveTenantForMiddlewareRequest(request, [])

    if (resolution.redirect) {
      try {
        const redirectResponse = NextResponse.redirect(new URL(resolution.redirect, request.url))
        redirectResponse.headers.set('x-request-id', requestId)
        return redirectResponse
      } catch {
        console.warn(`[proxy:${requestId}] malformed tenant redirect: ${resolution.redirect}`)
      }
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

  // Budget exhaustion header for observability
  const totalElapsed = Date.now() - middlewareStart
  if (totalElapsed >= MIDDLEWARE_BUDGET_MS) {
    response.headers.set('x-middleware-budget-exhausted', '1')
    console.warn(`[proxy:${requestId}] middleware budget exhausted (${totalElapsed}ms >= ${MIDDLEWARE_BUDGET_MS}ms)`)
  }
  response.headers.set('x-middleware-elapsed', String(totalElapsed))

  // Scoreboard: count request + flush if window elapsed
  scoreboard.total++
  flushScoreboardIfDue()

  return response
  } catch (err) {
    console.error(`[proxy:${requestId}] unhandled error after ${Date.now() - middlewareStart}ms`, err)
    const fallback = NextResponse.next({ request })
    fallback.headers.set('x-request-id', requestId)
    fallback.headers.set('x-middleware-error', '1')
    fallback.headers.set('x-middleware-elapsed', String(Date.now() - middlewareStart))
    return fallback
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
