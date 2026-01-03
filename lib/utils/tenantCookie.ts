import type { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'

type CookieStore = Awaited<ReturnType<typeof cookies>>

const COOKIE_NAME = 'lb_tenant'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const encoder = new TextEncoder()

// Platform domain for cross-subdomain cookie sharing
const PLATFORM_DOMAIN = '.lekbanken.no'

function getSecret(): string | null {
  const secret = process.env.TENANT_COOKIE_SECRET || process.env.JWT_SECRET
  if (!secret) {
    console.warn('[tenantCookie] TENANT_COOKIE_SECRET (or JWT_SECRET) is not set - tenant cookies will be skipped')
    return null
  }
  return secret
}

async function hmacHex(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function pack(tenantId: string) {
  const secret = getSecret()
  if (!secret) return tenantId // Return unsigned if no secret
  return `${tenantId}.${await hmacHex(tenantId, secret)}`
}

async function unpack(raw?: string | null) {
  if (!raw) return null
  
  const secret = getSecret()
  if (!secret) {
    // If no secret, just return the raw value (unsigned mode)
    // But only if it looks like a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(raw) ? raw : null
  }
  
  const [tenantId, signature] = raw.split('.')
  if (!tenantId || !signature) return null
  const expected = await hmacHex(tenantId, secret)
  // Constant-time-ish comparison
  const a = signature
  const b = expected
  if (a.length !== b.length) return null
  let match = 0
  for (let i = 0; i < a.length; i += 1) {
    match |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return match === 0 ? tenantId : null
}

/**
 * Build cookie options based on hostname context.
 * - For *.lekbanken.no: share cookie across subdomains (domain: .lekbanken.no)
 * - For custom domains: host-only cookie (no domain attr)
 * - For localhost: host-only, non-secure
 */
function buildCookieOptions(hostname?: string | null) {
  const isProduction = process.env.NODE_ENV === 'production'
  const isPlatformDomain = hostname?.endsWith(PLATFORM_DOMAIN) || hostname === 'lekbanken.no'
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  
  const options: {
    httpOnly: boolean
    sameSite: 'lax' | 'strict' | 'none'
    secure: boolean
    path: string
    maxAge: number
    domain?: string
  } = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction && !isLocalhost,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  }
  
  // For platform subdomains, share cookie across *.lekbanken.no
  // This allows seamless tenant switching within the platform
  if (isPlatformDomain && !isLocalhost) {
    options.domain = PLATFORM_DOMAIN
  }
  // For custom domains: no domain attr = host-only cookie (more secure)
  // Browser will only send it back to the exact same host
  
  return options
}

export interface SetTenantCookieOptions {
  /** The hostname of the request, used to determine cookie domain */
  hostname?: string | null
}

export async function readTenantIdFromCookies(cookieStore?: Pick<CookieStore, 'get'> | NextRequest['cookies']) {
  if (!cookieStore) return null
  return unpack(cookieStore.get(COOKIE_NAME)?.value ?? null)
}

export async function setTenantCookie(
  cookieStore: Pick<CookieStore, 'set'> | NextResponse['cookies'],
  tenantId: string,
  options?: SetTenantCookieOptions
) {
  const value = await pack(tenantId)
  const cookieOptions = buildCookieOptions(options?.hostname)
  cookieStore.set(COOKIE_NAME, value, cookieOptions)
}

export function clearTenantCookie(cookieStore: CookieStore | NextResponse['cookies']) {
  cookieStore.delete(COOKIE_NAME)
}
