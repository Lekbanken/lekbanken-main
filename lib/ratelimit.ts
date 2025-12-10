/**
 * Rate Limiting Infrastructure
 * 
 * Uses Upstash Redis with sliding window algorithm to protect API endpoints
 * from abuse and spam attacks.
 * 
 * Configuration per endpoint type:
 * - API General: 100 requests/minute per IP
 * - Auth Endpoints: 10 requests/15 minutes per IP (strict)
 * - Media Upload: 10 requests/minute per userId
 * - Participants Join: 10 requests/minute per IP
 * - Participants Rejoin: 30 requests/minute per IP
 * - Participants State: 60 requests/minute per participantToken
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/lib/config/env';

// Initialize Redis client (only if credentials are configured)
let redis: Redis | null = null;
let rateLimitingEnabled = false;

try {
  if (env.upstash?.redisUrl && env.upstash?.redisToken) {
    redis = new Redis({
      url: env.upstash.redisUrl,
      token: env.upstash.redisToken,
    });
    rateLimitingEnabled = true;
  } else {
    console.warn('⚠️  Rate limiting disabled: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured');
  }
} catch (error) {
  console.error('Failed to initialize Redis for rate limiting:', error);
  rateLimitingEnabled = false;
}

/**
 * Rate limiters for different endpoint types
 */

// General API endpoints (100 requests per minute per IP)
export const apiLimiter = rateLimitingEnabled && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '60 s'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

// Auth endpoints (10 requests per 15 minutes per IP - strict to prevent brute force)
export const authLimiter = rateLimitingEnabled && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '15 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null;

// Media upload (10 requests per minute per userId)
export const mediaUploadLimiter = rateLimitingEnabled && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: 'ratelimit:media:upload',
    })
  : null;

// Participants join (10 requests per minute per IP)
export const participantJoinLimiter = rateLimitingEnabled && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: 'ratelimit:participant:join',
    })
  : null;

// Participants rejoin (30 requests per minute per IP - more lenient for reconnections)
export const participantRejoinLimiter = rateLimitingEnabled && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      analytics: true,
      prefix: 'ratelimit:participant:rejoin',
    })
  : null;

// Participants state polling (60 requests per minute per token - allows 1 req/sec polling)
export const participantStateLimiter = rateLimitingEnabled && redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '60 s'),
      analytics: true,
      prefix: 'ratelimit:participant:state',
    })
  : null;

/**
 * Rate limit result type
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Check rate limit for a given identifier and limiter
 * 
 * @param identifier - Unique identifier (IP, userId, token, etc.)
 * @param limiter - The rate limiter to use
 * @returns Rate limit result with headers data
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<RateLimitResult> {
  // If rate limiting is disabled, allow all requests
  if (!limiter || !rateLimitingEnabled) {
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      reset: Date.now() + 60000,
    };
  }

  try {
    const result = await limiter.limit(identifier);
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
    };
  } catch (error) {
    // On Redis error, fail open (allow request) to prevent outage
    console.error('Rate limit check failed:', error);
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Get rate limit headers for HTTP responses
 * 
 * @param result - Rate limit result
 * @returns Headers object
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Create a 429 Rate Limit Exceeded response
 * 
 * @param result - Rate limit result
 * @param message - Optional custom message
 * @returns Response object
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  message?: string
): Response {
  return new Response(
    JSON.stringify({
      error: 'rate_limit_exceeded',
      message: message || 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...getRateLimitHeaders(result),
      },
    }
  );
}

/**
 * Extract client IP from request
 * 
 * Checks x-forwarded-for and x-real-ip headers (Vercel sets these)
 * Falls back to 'unknown' if not found
 * 
 * @param request - The incoming request
 * @returns Client IP address
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list, take the first IP
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback (should rarely happen on Vercel)
  return 'unknown';
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitingEnabled(): boolean {
  return rateLimitingEnabled;
}
