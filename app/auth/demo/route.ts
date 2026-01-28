/**
 * Demo Authentication Endpoint
 * POST /auth/demo - Start a demo session
 * GET /auth/demo - Check if demo is available
 */

import { NextResponse } from 'next/server';
import { setupDemoUser, DEMO_TENANT_ID } from '@/lib/auth/ephemeral-users';
import { cookies, headers } from 'next/headers';
import { checkDemoRateLimit, getClientIP, getRateLimitHeaders } from '@/lib/rate-limit/demo-rate-limit';
import { setTenantCookie } from '@/lib/utils/tenantCookie';
import type { DemoTier } from '@/lib/auth/ephemeral-users';

/**
 * Check if demo is enabled
 * Can be controlled via environment variable for maintenance
 */
function isDemoEnabled(): boolean {
  // TODO: Add environment variable DEMO_ENABLED
  // For now, always enabled
  return process.env.DEMO_ENABLED !== 'false';
}

/**
 * GET /auth/demo
 * Check if demo is available
 *
 * Response: { available: boolean, message?: string }
 */
export async function GET() {
  const enabled = isDemoEnabled();

  return NextResponse.json({
    available: enabled,
    message: enabled ? 'Demo is available' : 'Demo is temporarily unavailable',
  });
}

/**
 * POST /auth/demo
 * Create ephemeral demo user and start session
 *
 * Optional query params:
 * - tier: 'free' | 'premium' (default: 'free')
 * - redirect: URL to redirect after demo start (default: /app?onboarding=true)
 *
 * Response: Redirect to demo app
 */
export async function POST(request: Request) {
  try {
    // Check if demo is enabled
    if (!isDemoEnabled()) {
      return NextResponse.json(
        {
          error: 'Demo is temporarily unavailable',
          code: 'DEMO_DISABLED',
        },
        { status: 503 }
      );
    }

    // Rate limiting - check before any expensive operations
    const headersList = await headers();
    const clientIP = getClientIP(headersList);
    const rateLimitResult = await checkDemoRateLimit(clientIP);

    if (!rateLimitResult.success) {
      console.warn(`[POST /auth/demo] Rate limit exceeded for IP: ${clientIP}`);
      
      const response = NextResponse.json(
        {
          error: rateLimitResult.error || 'Too many demo requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.reset,
        },
        { status: 429 }
      );

      // Add rate limit headers
      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
      for (const [key, value] of Object.entries(rateLimitHeaders)) {
        response.headers.set(key, value);
      }
      response.headers.set('Retry-After', (rateLimitResult.reset - Math.floor(Date.now() / 1000)).toString());

      return response;
    }

    // Parse query params
    const url = new URL(request.url);
    const tierParam = url.searchParams.get('tier') as DemoTier | null;
    const redirectParam = url.searchParams.get('redirect');

    // Validate tier
    const tier: DemoTier = tierParam === 'premium' ? 'premium' : 'free';

    // Security: Premium tier requires special access code (for sales use)
    if (tier === 'premium') {
      const accessCode = url.searchParams.get('code');
      const validCode = process.env.DEMO_PREMIUM_ACCESS_CODE || 'DEMO_PREMIUM_2024';

      if (accessCode !== validCode) {
        return NextResponse.json(
          {
            error: 'Invalid access code for premium demo',
            code: 'INVALID_ACCESS_CODE',
          },
          { status: 403 }
        );
      }
    }

    console.log(`[POST /auth/demo] Starting demo session (tier: ${tier})`);

    // Step 1-3: Create ephemeral user, sign in, create demo session
    const { user, session, demoSession, error } = await setupDemoUser(tier);

    if (error || !user || !session) {
      console.error('[POST /auth/demo] Demo setup failed:', error);

      // Check specific error types
      if (error?.message?.includes('rate limit')) {
        return NextResponse.json(
          {
            error: 'Too many demo requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to start demo session. Please try again.',
          code: 'DEMO_SETUP_FAILED',
          details: error?.message,
        },
        { status: 500 }
      );
    }

    // Step 4: Set demo session cookie (for client-side tracking)
    // demoSession has { id: string, expires_at: string } from createDemoSession
    const typedDemoSession = demoSession as { id: string; expires_at: string } | null;
    if (typedDemoSession) {
      const expiresAt = new Date(typedDemoSession.expires_at);
      const cookieStore = await cookies();

      // Set demo session cookie
      cookieStore.set('demo_session_id', typedDemoSession.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
        // Enable cross-subdomain cookie for demo.lekbanken.no support
        domain: process.env.NODE_ENV === 'production' ? '.lekbanken.no' : undefined,
      });

      // CRITICAL: Set tenant cookie so the app knows which tenant to use
      // Without this, user lands on "no tenant assigned" page
      // Use the proper setTenantCookie function which handles HMAC signing
      const headerStore = await headers();
      const hostname = headerStore.get('host')?.split(':')[0] || 'localhost';
      await setTenantCookie(cookieStore, DEMO_TENANT_ID, { hostname });

      console.log(`[POST /auth/demo] Demo session created: ${typedDemoSession.id}, tenant: ${DEMO_TENANT_ID}`);
    }

    // Step 5: Redirect to demo subdomain
    // IMPORTANT: Always redirect demo users to demo.lekbanken.no for proper tenant isolation
    const isProduction = process.env.NODE_ENV === 'production';
    const demoHost = isProduction ? 'https://demo.lekbanken.no' : '';
    const defaultRedirect = `${demoHost}/app?demo=true&onboarding=true`;
    
    // If custom redirect provided, ensure it goes to demo subdomain in production
    let redirectUrl = redirectParam || defaultRedirect;
    if (isProduction && redirectParam && !redirectParam.startsWith('https://demo.lekbanken.no')) {
      // Prepend demo subdomain to relative paths
      if (redirectParam.startsWith('/')) {
        redirectUrl = `https://demo.lekbanken.no${redirectParam}`;
      } else {
        // For absolute URLs not on demo subdomain, use default
        redirectUrl = defaultRedirect;
      }
    }

    console.log(`[POST /auth/demo] Redirecting to: ${redirectUrl}`);

    // In production, redirect to full URL; in dev, use relative path
    if (isProduction) {
      return NextResponse.redirect(redirectUrl);
    } else {
      return NextResponse.redirect(new URL(redirectUrl || '/app?demo=true&onboarding=true', request.url));
    }
  } catch (error) {
    console.error('[POST /auth/demo] Unexpected error:', error);

    return NextResponse.json(
      {
        error: 'An unexpected error occurred. Please try again.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /auth/demo
 * End current demo session (early exit)
 *
 * Response: { success: boolean }
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const demoSessionId = cookieStore.get('demo_session_id')?.value;

    if (!demoSessionId) {
      return NextResponse.json({
        success: false,
        message: 'No active demo session',
      });
    }

    // Note: Actual session end is handled by demo-detection utilities
    // This just clears the cookie
    cookieStore.delete('demo_session_id');

    console.log(`[DELETE /auth/demo] Demo session ended: ${demoSessionId}`);

    return NextResponse.json({
      success: true,
      message: 'Demo session ended',
    });
  } catch (error) {
    console.error('[DELETE /auth/demo] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to end demo session',
      },
      { status: 500 }
    );
  }
}
