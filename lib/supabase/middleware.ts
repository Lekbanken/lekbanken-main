/**
 * Supabase Auth Middleware
 *
 * Middleware för att hantera sessioner, refresha tokens och säkra routes.
 * Körs på alla requests för att upprätthålla autentisering.
 * 
 * Note: En full SSR middleware implementeras senare med @supabase/ssr.
 * För nu är auth-kontrollen helt på klient-sidan + API route protection.
 */

import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // List of protected routes that require authentication
  const protectedRoutes = ['/app', '/admin']
  const pathname = request.nextUrl.pathname

  // Check if route needs protection
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (!isProtectedRoute) {
    // Public routes - no auth required
    return NextResponse.next()
  }

  // For now, auth check is done on client-side via useAuth hook
  // Full server-side auth will be implemented with @supabase/ssr
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Protect app and admin routes
    '/app/:path*',
    '/admin/:path*',
    // Also run on auth routes to handle redirects
    '/auth/:path*',
  ],
}
