/**
 * In-Memory Rate Limiting for Vercel Edge
 * 
 * Provides simple IP-based rate limiting without external dependencies.
 * For production, consider Vercel Edge Config or Supabase Edge Functions.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store (resets on deployment/restart)
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Rate limit configuration
 */
export const RATE_LIMITS = {
  api: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  auth: {
    limit: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  strict: {
    limit: 5,
    windowMs: 60 * 1000, // 1 minute (for sensitive operations)
  },
} as const;

/**
 * Get client identifier (IP address)
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from Vercel headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  return forwarded?.split(',')[0] || realIp || '127.0.0.1';
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  clientId: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(clientId);

  // No record or expired window - allow and create new record
  if (!record || now > record.resetAt) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: now + windowMs,
    };
  }

  // Within window - check if limit exceeded
  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    };
  }

  // Within limit - increment and allow
  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Apply rate limiting to a request
 * Returns NextResponse with 429 if rate limit exceeded
 */
export function applyRateLimit(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = 'api'
): NextResponse | null {
  const clientId = getClientId(request);
  const { limit, windowMs } = RATE_LIMITS[limitType];
  
  const { allowed, resetAt } = checkRateLimit(clientId, limit, windowMs);

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again after ${new Date(resetAt).toISOString()}`,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.floor(resetAt / 1000).toString(),
          'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Rate limit middleware helper
 * Usage in API route:
 * 
 * const rateLimitResponse = applyRateLimitMiddleware(request, 'auth');
 * if (rateLimitResponse) return rateLimitResponse;
 */
export function applyRateLimitMiddleware(
  request: NextRequest,
  limitType: keyof typeof RATE_LIMITS = 'api'
): NextResponse | null {
  return applyRateLimit(request, limitType);
}

/**
 * Clean up old rate limit records (optional, call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
