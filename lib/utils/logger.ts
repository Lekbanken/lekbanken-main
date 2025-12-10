/**
 * Structured Logging Utility
 * 
 * Provides structured logging with automatic Sentry integration.
 * Replaces raw console.error calls with context-aware logging.
 */

import * as Sentry from '@sentry/nextjs';
import { env } from '@/lib/config/env';

export interface LogContext {
  userId?: string;
  tenantId?: string;
  requestId?: string;
  endpoint?: string;
  [key: string]: unknown;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Structured log entry format
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

/**
 * Format log entry as JSON for production, pretty-print for development
 */
function formatLog(entry: LogEntry): string {
  if (env.isDevelopment) {
    // Pretty format for development
    const parts = [
      `[${entry.level.toUpperCase()}]`,
      entry.message,
    ];
    if (entry.context) {
      parts.push(JSON.stringify(entry.context, null, 2));
    }
    if (entry.error) {
      parts.push(`Error: ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(entry.error.stack);
      }
    }
    return parts.join(' ');
  }
  
  // JSON format for production (parseable by log aggregators)
  return JSON.stringify(entry);
}

/**
 * Base logging function
 */
function log(level: LogLevel, message: string, error?: Error, context?: LogContext) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
  
  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  
  // Console output
  const formattedLog = formatLog(entry);
  switch (level) {
    case 'debug':
      console.debug(formattedLog);
      break;
    case 'info':
      console.info(formattedLog);
      break;
    case 'warn':
      console.warn(formattedLog);
      break;
    case 'error':
    case 'fatal':
      console.error(formattedLog);
      break;
  }
  
  // Send to Sentry for errors
  if ((level === 'error' || level === 'fatal') && env.monitoring.sentryDsn) {
    if (error) {
      Sentry.captureException(error, {
        level: level === 'fatal' ? 'fatal' : 'error',
        tags: {
          endpoint: context?.endpoint,
        },
        contexts: {
          custom: context,
        },
      });
    } else {
      Sentry.captureMessage(message, {
        level: level === 'fatal' ? 'fatal' : 'error',
        tags: {
          endpoint: context?.endpoint,
        },
        contexts: {
          custom: context,
        },
      });
    }
  }
}

/**
 * Public logging API
 */
export const logger = {
  debug(message: string, context?: LogContext) {
    log('debug', message, undefined, context);
  },
  
  info(message: string, context?: LogContext) {
    log('info', message, undefined, context);
  },
  
  warn(message: string, context?: LogContext) {
    log('warn', message, undefined, context);
  },
  
  error(message: string, error?: Error, context?: LogContext) {
    log('error', message, error, context);
  },
  
  fatal(message: string, error?: Error, context?: LogContext) {
    log('fatal', message, error, context);
  },
};

/**
 * Helper to create logger with pre-filled context
 */
export function createContextLogger(defaultContext: LogContext) {
  return {
    debug(message: string, additionalContext?: LogContext) {
      logger.debug(message, { ...defaultContext, ...additionalContext });
    },
    info(message: string, additionalContext?: LogContext) {
      logger.info(message, { ...defaultContext, ...additionalContext });
    },
    warn(message: string, additionalContext?: LogContext) {
      logger.warn(message, { ...defaultContext, ...additionalContext });
    },
    error(message: string, error?: Error, additionalContext?: LogContext) {
      logger.error(message, error, { ...defaultContext, ...additionalContext });
    },
    fatal(message: string, error?: Error, additionalContext?: LogContext) {
      logger.fatal(message, error, { ...defaultContext, ...additionalContext });
    },
  };
}

/**
 * Usage Examples:
 * 
 * // Basic usage
 * logger.error('Failed to fetch data', error, { endpoint: '/api/games' });
 * 
 * // With context logger (in API routes)
 * const requestLogger = createContextLogger({ 
 *   requestId: headers.get('x-request-id'),
 *   endpoint: '/api/games'
 * });
 * requestLogger.error('Database query failed', error);
 */
