// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { env } from '@/lib/config/env';

if (env.monitoring.sentryDsn) {
  Sentry.init({
    dsn: env.monitoring.sentryDsn,
    
    // Environment
    environment: env.monitoring.sentryEnvironment,
    
    // Performance Monitoring
    tracesSampleRate: env.isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev
    
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    
    // Filter out noisy errors
    ignoreErrors: [
      // Browser extension errors
      /Extensions\//i,
      /^Non-Error/,
      // Network errors
      'NetworkError',
      'Failed to fetch',
      // ResizeObserver (benign)
      'ResizeObserver loop limit exceeded',
    ],
    
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Add user context
    beforeSend(event) {
      // Don't send events in development unless explicitly enabled
      if (env.isDevelopment && !process.env.SENTRY_SEND_IN_DEV) {
        console.log('[Sentry] Event captured (not sent in dev):', event);
        return null;
      }
      
      return event;
    },
  });
}
