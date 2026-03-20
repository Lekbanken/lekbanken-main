/**
 * Cross-Subdomain Cookie Domain Configuration
 * 
 * This module provides cookie domain configuration for Supabase auth cookies
 * to work across all platform subdomains (*.lekbanken.no).
 * 
 * WHY THIS IS NEEDED:
 * - @supabase/ssr doesn't set a cookie domain, making cookies "host-only"
 * - Host-only cookies set on www.lekbanken.no won't be sent to demo.lekbanken.no
 * - For multi-tenant subdomain routing, we need cookies shared across *.lekbanken.no
 * 
 * SECURITY CONSIDERATIONS:
 * - Only sets domain for platform domains (*.lekbanken.no)
 * - Custom domains get host-only cookies (more restrictive)
 * - Localhost gets no domain (development mode)
 */

const PLATFORM_DOMAIN = '.lekbanken.no'
const EXPIRED_COOKIE_DATE = new Date(0)

type CookieMutationStore = {
  set: (name: string, value: string, options?: Record<string, unknown>) => void
  delete: (name: string) => void
}

/**
 * Determine if we should set a shared cookie domain.
 * 
 * @param hostname - The current request hostname (e.g., "www.lekbanken.no")
 * @returns The cookie domain to use, or undefined for host-only cookies
 */
export function getCookieDomain(hostname?: string | null): string | undefined {
  // Development: no domain attribute (host-only)
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return undefined
  }
  
  // Platform subdomains: share across *.lekbanken.no
  if (hostname.endsWith(PLATFORM_DOMAIN) || hostname === 'lekbanken.no') {
    return PLATFORM_DOMAIN
  }
  
  // Custom domains: host-only (no domain attribute)
  return undefined
}

/**
 * Enhance cookie options with cross-subdomain domain attribute.
 * Use this to wrap cookie options before passing to Next.js cookies API.
 * 
 * @param options - Original cookie options from Supabase
 * @param hostname - The current request hostname
 * @returns Enhanced cookie options with domain if applicable
 */
export function enhanceCookieOptions<T extends Record<string, unknown>>(
  options: T & { domain?: string },
  hostname?: string | null
): T & { domain?: string } {
  const domain = getCookieDomain(hostname)
  if (domain) {
    return { ...options, domain }
  }
  return options
}

/**
 * Get hostname from browser window (client-side only)
 */
export function getBrowserHostname(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return window.location.hostname
}

function isLocalHostname(hostname?: string | null): boolean {
  return !hostname || hostname === 'localhost' || hostname === '127.0.0.1'
}

export function clearBrowserCookieVariants(name: string, hostname?: string | null) {
  if (typeof document === 'undefined') {
    return
  }

  const domains = new Set<string>()
  if (hostname && !isLocalHostname(hostname)) {
    domains.add(hostname)
    const sharedDomain = getCookieDomain(hostname)
    if (sharedDomain) {
      domains.add(sharedDomain)
    }
  }

  const base = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
  document.cookie = base
  domains.forEach((domain) => {
    document.cookie = `${base}; Domain=${domain}`
  })
}

export function setBrowserCookie(
  name: string,
  value: string,
  options: {
    path?: string
    maxAge?: number
    expires?: Date
    sameSite?: 'lax' | 'strict' | 'none'
    secure?: boolean
    domain?: string
  } = {},
  hostname?: string | null
) {
  if (typeof document === 'undefined') {
    return
  }

  const enhancedOptions = enhanceCookieOptions(options, hostname)
  const parts = [
    `${name}=${value}`,
    `Path=${enhancedOptions.path ?? '/'}`,
    enhancedOptions.maxAge ? `Max-Age=${enhancedOptions.maxAge}` : null,
    enhancedOptions.expires ? `Expires=${enhancedOptions.expires.toUTCString()}` : null,
    enhancedOptions.domain ? `Domain=${enhancedOptions.domain}` : null,
    `SameSite=${enhancedOptions.sameSite ?? 'Lax'}`,
    enhancedOptions.secure ? 'Secure' : null,
  ].filter(Boolean)

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (!enhancedOptions.secure && isHttps) {
    parts.push('Secure')
  }

  document.cookie = parts.join('; ')
}

export function clearCookieVariants(
  cookieStore: CookieMutationStore,
  name: string,
  hostname?: string | null
) {
  cookieStore.delete(name)

  if (isLocalHostname(hostname)) {
    return
  }

  const domains = new Set<string>()
  if (hostname) {
    domains.add(hostname)
  }

  const sharedDomain = getCookieDomain(hostname)
  if (sharedDomain) {
    domains.add(sharedDomain)
  }

  const secure = process.env.NODE_ENV === 'production'

  domains.forEach((domain) => {
    cookieStore.set(name, '', {
      path: '/',
      domain,
      expires: EXPIRED_COOKIE_DATE,
      maxAge: 0,
      sameSite: 'lax',
      secure,
    })
  })
}
