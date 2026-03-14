/**
 * Rate Limiting for Demo Sessions
 * 
 * Limits demo session creation to prevent abuse:
 * - 3 demo sessions per IP per hour
 * - Uses Supabase (demo_sessions table) for cross-instance persistence
 * 
 * The rate limit is enforced by counting recent demo_sessions with matching
 * client_ip in metadata. This works across all serverless instances.
 */

import { supabaseAdmin } from '@/lib/supabase/server';

const DEMO_RATE_LIMIT = {
  maxRequests: 3,     // Max demo sessions per IP per window
  windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
};

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp
  error?: string;
}

/**
 * Check rate limit by counting recent demo_sessions with matching IP
 * 
 * Queries the demo_sessions table for sessions created in the last hour
 * where metadata->>'client_ip' matches the given identifier.
 * This is cross-instance persistent (backed by Supabase/Postgres).
 */
export async function checkDemoRateLimit(identifier: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(now - DEMO_RATE_LIMIT.windowMs).toISOString();
  const resetTimestamp = Math.floor((now + DEMO_RATE_LIMIT.windowMs) / 1000);

  try {
    const { count, error } = await supabaseAdmin
      .from('demo_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', windowStart)
      .eq('metadata->>client_ip' as never, identifier);

    if (error) {
      // On DB error, allow the request (fail-open for availability)
      // but log the error for monitoring
      console.error('[checkDemoRateLimit] DB query failed, failing open:', error.message);
      return {
        success: true,
        remaining: 0,
        reset: resetTimestamp,
      };
    }

    const sessionCount = count ?? 0;

    if (sessionCount >= DEMO_RATE_LIMIT.maxRequests) {
      return {
        success: false,
        remaining: 0,
        reset: resetTimestamp,
        error: `Du har nått gränsen på ${DEMO_RATE_LIMIT.maxRequests} demo-sessioner per timme. Försök igen senare.`,
      };
    }

    return {
      success: true,
      remaining: DEMO_RATE_LIMIT.maxRequests - sessionCount,
      reset: resetTimestamp,
    };
  } catch {
    // On unexpected error, fail open
    console.error('[checkDemoRateLimit] Unexpected error, failing open');
    return {
      success: true,
      remaining: 0,
      reset: resetTimestamp,
    };
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  // Try various headers in order of reliability
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs - take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback for development
  return '127.0.0.1';
}

/**
 * Rate limit headers to include in response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': DEMO_RATE_LIMIT.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}
