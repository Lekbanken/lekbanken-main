// This file configures the initialization of Sentry for edge runtime.
// The config you add here will be used whenever middleware runs.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { env } from '@/lib/config/env';

if (env.monitoring.sentryDsn) {
  Sentry.init({
    dsn: env.monitoring.sentryDsn,
    
    // Environment
    environment: env.monitoring.sentryEnvironment,
    
    // Performance Monitoring
    tracesSampleRate: env.isProduction ? 0.1 : 1.0,
    
    // Don't send events in development
    beforeSend(event) {
      if (env.isDevelopment && !process.env.SENTRY_SEND_IN_DEV) {
        console.log('[Sentry Edge] Event captured (not sent in dev):', event);
        return null;
      }
      return event;
    },
  });
}
