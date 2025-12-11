/**
 * Error Tracking using Supabase
 * 
 * Logs errors to the error_tracking table for monitoring and debugging.
 * Integrates with existing logger.ts for consistent error handling.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

interface ErrorContext {
  userId?: string;
  tenantId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  [key: string]: unknown;
}

/**
 * Track error to Supabase error_tracking table
 */
export async function trackError(
  message: string,
  error: Error | unknown,
  context?: ErrorContext
): Promise<void> {
  try {
    // Log locally first (immediate feedback)
    logger.error(message, error instanceof Error ? error : undefined, context);

    // Get service role client (bypasses RLS)
    const supabase = createServiceRoleClient();

    // Extract error details
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : {
      message: String(error),
      stack: null,
      name: 'UnknownError',
    };

    // Insert into error_tracking table
    const { error: insertError } = await supabase
      .from('error_tracking')
      .insert({
        tenant_id: context?.tenantId || null,
        user_id: context?.userId || null,
        error_type: errorDetails.name,
        error_message: message,
        stack_trace: errorDetails.stack || null,
        request_path: context?.endpoint || null,
        request_method: context?.method || null,
        user_agent: null, // Can be added from request headers if needed
        metadata: {
          ...context,
          originalErrorMessage: errorDetails.message,
        },
        severity: determineSeverity(errorDetails.name),
      });

    if (insertError) {
      // If we can't log to database, at least log locally
      console.error('[error-tracker] Failed to insert error to database:', insertError);
    }
  } catch (trackingError) {
    // Never throw from error tracking (silent failure)
    console.error('[error-tracker] Failed to track error:', trackingError);
  }
}

/**
 * Determine error severity based on error type
 */
function determineSeverity(errorName: string): 'low' | 'medium' | 'high' | 'critical' {
  const criticalErrors = ['DatabaseError', 'AuthenticationError', 'SecurityError'];
  const highErrors = ['ValidationError', 'NotFoundError', 'PermissionError'];
  const mediumErrors = ['TimeoutError', 'NetworkError'];

  if (criticalErrors.some(e => errorName.includes(e))) return 'critical';
  if (highErrors.some(e => errorName.includes(e))) return 'high';
  if (mediumErrors.some(e => errorName.includes(e))) return 'medium';
  return 'low';
}

/**
 * Quick helper for common error tracking patterns
 */
export const errorTracker = {
  /**
   * Track API endpoint error
   */
  api: async (
    endpoint: string,
    method: string,
    error: Error | unknown,
    additionalContext?: Omit<ErrorContext, 'endpoint' | 'method'>
  ) => {
    await trackError(
      `API error in ${method} ${endpoint}`,
      error,
      { endpoint, method, ...additionalContext }
    );
  },

  /**
   * Track authentication error
   */
  auth: async (
    message: string,
    error: Error | unknown,
    context?: ErrorContext
  ) => {
    await trackError(
      `Auth error: ${message}`,
      error,
      { ...context, errorType: 'AuthenticationError' }
    );
  },

  /**
   * Track database error
   */
  database: async (
    operation: string,
    error: Error | unknown,
    context?: ErrorContext
  ) => {
    await trackError(
      `Database error during ${operation}`,
      error,
      { ...context, errorType: 'DatabaseError' }
    );
  },
};
