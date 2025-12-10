// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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
    
    // Capture unhandled rejections
    integrations: [
      Sentry.extraErrorDataIntegration(),
    ],
    
    // Add request context
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
