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
export function enhanceCookieOptions<T extends { domain?: string }>(
  options: T,
  hostname?: string | null
): T {
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
