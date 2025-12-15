import type { cookies } from 'next/headers'
import type { NextRequest, NextResponse } from 'next/server'

type CookieStore = Awaited<ReturnType<typeof cookies>>

const COOKIE_NAME = 'lb_tenant'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const encoder = new TextEncoder()

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

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: COOKIE_MAX_AGE,
}

export async function readTenantIdFromCookies(cookieStore?: Pick<CookieStore, 'get'> | NextRequest['cookies']) {
  if (!cookieStore) return null
  return unpack(cookieStore.get(COOKIE_NAME)?.value ?? null)
}

export async function setTenantCookie(
  cookieStore: Pick<CookieStore, 'set'> | NextResponse['cookies'],
  tenantId: string
) {
  const value = await pack(tenantId)
  cookieStore.set(COOKIE_NAME, value, cookieOptions)
}

export function clearTenantCookie(cookieStore: CookieStore | NextResponse['cookies']) {
  cookieStore.delete(COOKIE_NAME)
}
