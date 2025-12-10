/**
 * API Rate Limiting Helpers
 * 
 * Utility functions to easily add rate limiting to API routes.
 * 
 * Usage example:
 * ```typescript
 * export async function POST(request: Request) {
 *   // Check rate limit
 *   const rateLimitResult = await applyRateLimit(request, 'auth');
 *   if (rateLimitResult) return rateLimitResult; // Returns 429 if exceeded
 *   
 *   // Continue with normal request handling...
 * }
 * ```
 */

import {
  apiLimiter,
  authLimiter,
  mediaUploadLimiter,
  participantJoinLimiter,
  participantRejoinLimiter,
  participantStateLimiter,
  checkRateLimit,
  createRateLimitResponse,
  getClientIp,
  type RateLimitResult,
} from '@/lib/ratelimit';
import { logger } from '@/lib/utils/logger';
import type { Ratelimit } from '@upstash/ratelimit';

export type RateLimitType = 
  | 'api'                    // General API: 100 req/min per IP
  | 'auth'                   // Auth endpoints: 10 req/15min per IP
  | 'media:upload'           // Media upload: 10 req/min per userId
  | 'participant:join'       // Join session: 10 req/min per IP
  | 'participant:rejoin'     // Rejoin session: 30 req/min per IP
  | 'participant:state';     // State polling: 60 req/min per token

/**
 * Get the appropriate rate limiter for a given type
 */
function getRateLimiter(type: RateLimitType): Ratelimit | null {
  switch (type) {
    case 'api':
      return apiLimiter;
    case 'auth':
      return authLimiter;
    case 'media:upload':
      return mediaUploadLimiter;
    case 'participant:join':
      return participantJoinLimiter;
    case 'participant:rejoin':
      return participantRejoinLimiter;
    case 'participant:state':
      return participantStateLimiter;
    default:
      return apiLimiter;
  }
}

/**
 * Get identifier for rate limiting based on type
 */
function getIdentifier(request: Request, type: RateLimitType): string {
  const ip = getClientIp(request);
  
  // Participant state uses token if available
  if (type === 'participant:state') {
    const token = request.headers.get('x-participant-token');
    if (token) {
      return `participant:${token}`;
    }
  }
  
  // Media upload ideally uses userId (not implemented yet - would need session extraction)
  // For now, fall back to IP
  
  // Default: use IP address
  return ip;
}

/**
 * Apply rate limiting to an API route
 * 
 * @param request - The incoming request
 * @param type - Type of rate limit to apply
 * @param customMessage - Optional custom error message
 * @returns Response with 429 status if rate limit exceeded, null if allowed
 * 
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const rateLimitResult = await applyRateLimit(request, 'auth');
 *   if (rateLimitResult) return rateLimitResult;
 *   
 *   // Handle request...
 * }
 * ```
 */
export async function applyRateLimit(
  request: Request,
  type: RateLimitType,
  customMessage?: string
): Promise<Response | null> {
  const limiter = getRateLimiter(type);
  const identifier = getIdentifier(request, type);
  
  const result = await checkRateLimit(identifier, limiter);
  
  if (!result.success) {
    // Log rate limit exceeded
    const url = new URL(request.url);
    logger.warn('Rate limit exceeded', {
      endpoint: url.pathname,
      ip: getClientIp(request),
      limiter: type,
      limit: result.limit,
      remaining: result.remaining,
      reset: new Date(result.reset).toISOString(),
    });
    
    // Return 429 response
    return createRateLimitResponse(result, customMessage);
  }
  
  // Rate limit passed, return null (no response needed)
  return null;
}

/**
 * Get rate limit result without blocking the request
 * Useful for adding headers to successful responses
 * 
 * @param request - The incoming request
 * @param type - Type of rate limit to check
 * @returns Rate limit result
 */
export async function checkRateLimitOnly(
  request: Request,
  type: RateLimitType
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(type);
  const identifier = getIdentifier(request, type);
  
  return await checkRateLimit(identifier, limiter);
}

/**
 * Add rate limit headers to a response
 * 
 * @param response - The response to add headers to
 * @param result - The rate limit result
 * @returns Response with added headers
 */
export function addRateLimitHeaders(response: Response, result: RateLimitResult): Response {
  const newHeaders = new Headers(response.headers);
  
  newHeaders.set('X-RateLimit-Limit', String(result.limit));
  newHeaders.set('X-RateLimit-Remaining', String(result.remaining));
  newHeaders.set('X-RateLimit-Reset', String(result.reset));
  
  if (result.retryAfter) {
    newHeaders.set('Retry-After', String(result.retryAfter));
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
