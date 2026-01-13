/**
 * Rate Limiting for Demo Sessions
 * 
 * Limits demo session creation to prevent abuse:
 * - 3 demo sessions per IP per hour
 * - Uses Upstash Redis when available, falls back to in-memory
 * 
 * Setup:
 * 1. npm install @upstash/ratelimit @upstash/redis
 * 2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env
 */

// In-memory fallback for development/when Upstash not configured
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

const DEMO_RATE_LIMIT = {
  maxRequests: 3,     // Max demo sessions
  windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
};

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp
  error?: string;
}

/**
 * Check rate limit using Upstash Redis (if available) or in-memory fallback
 */
export async function checkDemoRateLimit(identifier: string): Promise<RateLimitResult> {
  // Try Upstash first if configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await checkUpstashRateLimit(identifier);
    } catch (error) {
      console.warn('[rate-limit] Upstash error, falling back to in-memory:', error);
      return checkInMemoryRateLimit(identifier);
    }
  }

  // Fall back to in-memory rate limiting
  return checkInMemoryRateLimit(identifier);
}

/**
 * Upstash Redis rate limiting
 */
async function checkUpstashRateLimit(identifier: string): Promise<RateLimitResult> {
  // Dynamic import to avoid errors when package not installed
  // These packages are optional - install with: npm install @upstash/ratelimit @upstash/redis
  try {
    // @ts-expect-error - Optional dependency, may not be installed
    const { Ratelimit } = await import('@upstash/ratelimit');
    // @ts-expect-error - Optional dependency, may not be installed
    const { Redis } = await import('@upstash/redis');

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(DEMO_RATE_LIMIT.maxRequests, '1 h'),
      analytics: true,
      prefix: 'demo_ratelimit',
    });

    const result = await ratelimit.limit(identifier);

    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // Package not installed - throw to trigger fallback
    throw error;
  }
}

/**
 * In-memory rate limiting (for development or when Upstash not available)
 */
function checkInMemoryRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const key = `demo:${identifier}`;
  
  // Clean up expired entries periodically
  if (Math.random() < 0.1) {
    cleanupExpiredEntries();
  }

  const existing = inMemoryStore.get(key);
  
  if (!existing || existing.resetAt <= now) {
    // First request or window expired - reset
    inMemoryStore.set(key, {
      count: 1,
      resetAt: now + DEMO_RATE_LIMIT.windowMs,
    });
    
    return {
      success: true,
      remaining: DEMO_RATE_LIMIT.maxRequests - 1,
      reset: Math.floor((now + DEMO_RATE_LIMIT.windowMs) / 1000),
    };
  }

  if (existing.count >= DEMO_RATE_LIMIT.maxRequests) {
    // Rate limited
    return {
      success: false,
      remaining: 0,
      reset: Math.floor(existing.resetAt / 1000),
      error: `Du har nått gränsen på ${DEMO_RATE_LIMIT.maxRequests} demo-sessioner per timme. Försök igen senare.`,
    };
  }

  // Increment count
  existing.count += 1;
  inMemoryStore.set(key, existing);

  return {
    success: true,
    remaining: DEMO_RATE_LIMIT.maxRequests - existing.count,
    reset: Math.floor(existing.resetAt / 1000),
  };
}

/**
 * Clean up expired entries from in-memory store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of inMemoryStore.entries()) {
    if (value.resetAt <= now) {
      inMemoryStore.delete(key);
    }
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
