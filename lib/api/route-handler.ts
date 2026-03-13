import type { NextRequest, NextResponse } from 'next/server'
import { ZodError, type ZodSchema } from 'zod'

import {
  requireAuth,
  requireSystemAdmin,
  requireTenantRole,
  requireCronOrAdmin,
  AuthError,
} from '@/lib/api/auth-guard'
import { resolveParticipant, REJECTED_PARTICIPANT_STATUSES, type ResolvedParticipant } from '@/lib/api/play-auth'
import { ApiError, errorResponse, generateRequestId } from '@/lib/api/errors'
import { applyRateLimit, type RATE_LIMITS } from '@/lib/utils/rate-limiter'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { AuthContext } from '@/types/auth'
import type { TenantRole } from '@/types/tenant'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RateLimitTier = keyof typeof RATE_LIMITS

type AuthLevel =
  | 'public'
  | 'user'
  | 'participant'
  | 'system_admin'
  | { tenantRole: TenantRole[]; tenantId?: string }
  | { sessionHost: (params: Record<string, string>) => string }
  | 'cron_or_admin'

interface RouteContext<TInput = undefined> {
  req: NextRequest
  /** Auth context — null only when auth is 'public' and user is not logged in */
  auth: AuthContext | null
  /** Participant context — non-null only when auth is 'participant' */
  participant: ResolvedParticipant | null
  /** Validated request body (only present when `input` schema is provided) */
  body: TInput
  /** Dynamic route params (e.g. { id: '...' }) */
  params: Record<string, string>
  /** Unique request ID for tracing */
  requestId: string
}

interface RouteHandlerConfig<TInput = undefined> {
  /** Auth requirement for this route */
  auth: AuthLevel
  /** Rate limiting tier (omit for no rate limiting) */
  rateLimit?: RateLimitTier
  /** Zod schema for request body validation (POST/PUT/PATCH/DELETE) */
  input?: ZodSchema<TInput>
  /** The route handler function */
  handler: (ctx: RouteContext<TInput>) => Promise<NextResponse>
}

// Next.js App Router route handler signature
type NextRouteHandler = (
  req: NextRequest,
  segmentData: { params: Promise<Record<string, string>> }
) => Promise<NextResponse | Response>

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Standardized API route handler wrapper.
 *
 * Enforces:
 * 1. Rate limiting (optional)
 * 2. Authentication & authorization
 * 3. Request body validation via Zod (optional)
 * 4. Consistent error response format via `errorResponse()`
 * 5. Request ID tracing
 *
 * Usage:
 * ```ts
 * export const POST = apiHandler({
 *   auth: 'user',
 *   rateLimit: 'api',
 *   input: createGameSchema,
 *   handler: async ({ auth, body, params, requestId }) => {
 *     // auth.user is guaranteed non-null here
 *     return NextResponse.json({ data: result })
 *   },
 * })
 * ```
 */
export function apiHandler<TInput = undefined>(
  config: RouteHandlerConfig<TInput>
): NextRouteHandler {
  return async (
    req: NextRequest,
    segmentData: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const requestId = generateRequestId()

    try {
      // 1. Rate limiting (auto-apply 'participant' tier for participant auth)
      const effectiveRateLimit = config.rateLimit ??
        (config.auth === 'participant' ? 'participant' as RateLimitTier : undefined)
      if (effectiveRateLimit) {
        const rateLimitResponse = applyRateLimit(req, effectiveRateLimit)
        if (rateLimitResponse) return rateLimitResponse
      }

      // 2. Authentication & authorization
      let auth: AuthContext | null = null
      let participant: ResolvedParticipant | null = null

      if (config.auth === 'participant') {
        participant = await resolveParticipantAuth(req)
      } else {
        auth = await resolveAuth(config.auth)
      }

      // 3. Input validation
      const body = await parseInput(req, config.input, requestId)

      // 4. Resolve dynamic route params
      const params = segmentData?.params ? await segmentData.params : {}

      // 5. Execute handler
      return await config.handler({
        req,
        auth,
        participant,
        body: body as TInput,
        params,
        requestId,
      })
    } catch (error) {
      // Convert AuthError to ApiError for consistent format
      if (error instanceof AuthError) {
        return errorResponse(
          new ApiError(error.status, error.message),
          requestId
        )
      }

      // Convert ZodError to 400 with validation details
      if (error instanceof ZodError) {
        return errorResponse(
          ApiError.badRequest(
            'Invalid payload',
            'VALIDATION_ERROR',
            error.flatten()
          ),
          requestId
        )
      }

      // All other errors (ApiError, Error, unknown) handled by errorResponse
      return errorResponse(error, requestId)
    }
  }
}

// ---------------------------------------------------------------------------
// Participant auth resolution
// ---------------------------------------------------------------------------

/**
 * Resolve participant from `x-participant-token` header.
 *
 * Error model (DD-2):
 *   401 — missing token, invalid token, expired token
 *   403 — blocked or kicked participant
 *
 * Never returns 404 (prevents token enumeration).
 */
async function resolveParticipantAuth(req: NextRequest): Promise<ResolvedParticipant> {
  const token = req.headers.get('x-participant-token')
  if (!token) {
    throw new ApiError(401, 'Missing participant token')
  }

  const participant = await resolveParticipant(req as unknown as Request)
  if (!participant) {
    // Token was provided but lookup failed — could be invalid, expired, or blocked.
    // Re-check to distinguish 401 vs 403 for correct error code.
    const supabase = createServiceRoleClient()
    const { data: row } = await supabase
      .from('participants')
      .select('status, token_expires_at')
      .eq('participant_token', token)
      .maybeSingle()

    if (row && REJECTED_PARTICIPANT_STATUSES.has(row.status ?? '')) {
      throw new ApiError(403, 'Participant access denied')
    }
    // All other failures (invalid token, expired, not found) → 401
    throw new ApiError(401, 'Invalid or expired participant token')
  }

  return participant
}

// ---------------------------------------------------------------------------
// Auth resolution
// ---------------------------------------------------------------------------

async function resolveAuth(auth: AuthLevel): Promise<AuthContext | null> {
  if (auth === 'public') {
    return null
  }

  if (auth === 'participant') {
    // Handled by resolveParticipantAuth() before this function is called.
    // This branch should never be reached.
    throw new Error('Participant auth should be resolved via resolveParticipantAuth()')
  }

  if (auth === 'user') {
    return await requireAuth()
  }

  if (auth === 'system_admin') {
    return await requireSystemAdmin()
  }

  if (auth === 'cron_or_admin') {
    // requireCronOrAdmin returns a different shape — normalize to AuthContext | null
    const result = await requireCronOrAdmin()
    if (result.via === 'cron') return null
    // via === 'admin' returns the full auth context spread
    const { via: _via, ...ctx } = result
    return ctx as AuthContext
  }

  if ('tenantRole' in auth) {
    const ctx = await requireTenantRole(auth.tenantRole, auth.tenantId)
    return ctx as AuthContext
  }

  if ('sessionHost' in auth) {
    // NOTE: sessionHost is a reserved interface — not a fully enforced
    // first-class auth mode yet. Currently falls back to requireAuth().
    // Session ownership validation must be done in the handler itself.
    // Full enforcement deferred to Phase 3 migration (~5 routes).
    return await requireAuth()
  }

  return await requireAuth()
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

async function parseInput<TInput>(
  req: NextRequest,
  schema: ZodSchema<TInput> | undefined,
  _requestId: string
): Promise<TInput | undefined> {
  if (!schema) return undefined

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw ApiError.badRequest('Invalid JSON body', 'INVALID_JSON')
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw ApiError.badRequest(
      'Invalid payload',
      'VALIDATION_ERROR',
      parsed.error.flatten()
    )
  }

  return parsed.data
}
