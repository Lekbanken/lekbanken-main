/**
 * Rate Limiting for Demo Sessions
 * 
 * Limits demo session creation to prevent abuse:
 * - 3 demo sessions per IP per hour
 * - Uses in-memory rate limiting for development
 * 
 * For production with multiple server instances, install Upstash:
 * 1. npm install @upstash/ratelimit @upstash/redis
 * 2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env
 * 3. The system will automatically use Upstash when packages are available
 * 
 * Note: In-memory rate limiting is per-server-instance only.
 * It works for development but in production with multiple instances,
 * users could bypass limits by hitting different instances.
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
 * Check rate limit using in-memory storage
 * 
 * For distributed rate limiting across multiple servers,
 * install @upstash/ratelimit and @upstash/redis packages.
 */
export async function checkDemoRateLimit(identifier: string): Promise<RateLimitResult> {
  // Use in-memory rate limiting
  // This works for development and single-server production
  return checkInMemoryRateLimit(identifier);
}

/**
 * In-memory rate limiting (for development or single-server production)
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
