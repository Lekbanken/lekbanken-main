import { NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'

/**
 * Standard API error class with status code and optional error code
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message: string, code?: string, details?: unknown): ApiError {
    return new ApiError(400, message, code, details)
  }

  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(message = 'Unauthorized', code?: string): ApiError {
    return new ApiError(401, message, code)
  }

  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message = 'Forbidden', code?: string): ApiError {
    return new ApiError(403, message, code)
  }

  /**
   * Create a 404 Not Found error
   */
  static notFound(message = 'Not found', code?: string): ApiError {
    return new ApiError(404, message, code)
  }

  /**
   * Create a 409 Conflict error
   */
  static conflict(message: string, code?: string, details?: unknown): ApiError {
    return new ApiError(409, message, code, details)
  }

  /**
   * Create a 500 Internal Server Error
   */
  static internal(message = 'Internal server error', code?: string): ApiError {
    return new ApiError(500, message, code)
  }
}

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: string
  code?: string
  details?: unknown
  requestId: string
  timestamp: string
}

/**
 * Convert any error to a standard NextResponse
 * 
 * @param error - Error to convert
 * @param requestId - Unique request ID for tracing
 * @returns NextResponse with error details
 */
export function errorResponse(error: unknown, requestId: string): NextResponse {
  const timestamp = new Date().toISOString()

  // Handle ApiError instances
  if (error instanceof ApiError) {
    const response: ErrorResponse = {
      error: error.message,
      code: error.code,
      details: error.details,
      requestId,
      timestamp,
    }
    return NextResponse.json(response, { status: error.statusCode })
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Log unexpected errors
    logger.error('Unexpected API error', error, { requestId })

    const response: ErrorResponse = {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId,
      timestamp,
    }
    return NextResponse.json(response, { status: 500 })
  }

  // Handle unknown error types
  logger.error('Unknown API error type', undefined, { 
    requestId,
    errorType: typeof error,
    errorValue: String(error)
  })

  const response: ErrorResponse = {
    error: 'Internal server error',
    code: 'UNKNOWN_ERROR',
    requestId,
    timestamp,
  }
  return NextResponse.json(response, { status: 500 })
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, requestId?: string): NextResponse {
  const response: Record<string, unknown> = data as Record<string, unknown>
  
  if (requestId) {
    response.requestId = requestId
  }
  
  return NextResponse.json(response)
}
