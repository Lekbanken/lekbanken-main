/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables at module load time.
 * Throws clear errors if critical vars are missing, preventing silent failures in production.
 * 
 * IMPORTANT: This module runs in both server and browser contexts.
 * - Browser: Only NEXT_PUBLIC_* vars are available (baked in at build time via direct references)
 * - Server: All process.env vars are available
 */

// Determine if we're running in browser
const isBrowser = typeof window !== 'undefined';

/**
 * Validate environment-specific requirements.
 * Only runs on server-side
 */
function validateEnvironment() {
  // Skip validation in browser
  if (isBrowser) return;

  // Allow CI/build pipelines to explicitly skip validation.
  // This is useful for build-only checks where runtime secrets are not available.
  if (process.env.SKIP_ENV_VALIDATION === 'true' || process.env.SKIP_ENV_VALIDATION === '1') {
    return;
  }
  
  const nodeEnv = process.env.NODE_ENV;
  
  // Validate required NEXT_PUBLIC vars on server
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      `❌ Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL\n` +
      `   Please add it to your .env.local file.\n` +
      `   See .env.local.example for reference.`
    );
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      `❌ Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY\n` +
      `   Please add it to your .env.local file.\n` +
      `   See .env.local.example for reference.`
    );
  }
  
  // In production, ensure all production-critical vars are set
  if (nodeEnv === 'production') {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set - some admin features will be disabled');
    }
    
    if (!process.env.STRIPE_TEST_SECRET_KEY && !process.env.STRIPE_LIVE_SECRET_KEY) {
      console.warn('⚠️  No Stripe keys configured - billing features will be disabled');
    }
  }
}

/**
 * Centralized environment configuration.
 * All environment variables are validated at module load time.
 * 
 * IMPORTANT: NEXT_PUBLIC_* vars must be directly referenced (not via process.env[key])
 * for Next.js to inline them at build time.
 */
export const env = {
  // Node environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Supabase (Required) - Direct references for browser compatibility
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Server-only
  },
  
  // Stripe (Optional - enabled via feature flag)
  stripe: {
    enabled: process.env.STRIPE_ENABLED === 'true',
    testSecretKey: process.env.STRIPE_TEST_SECRET_KEY,
    testPublishableKey: process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY,
    liveSecretKey: process.env.STRIPE_LIVE_SECRET_KEY,
    livePublishableKey: process.env.NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY,
    testWebhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET,
    liveWebhookSecret: process.env.STRIPE_LIVE_WEBHOOK_SECRET,
    useLiveKeys: process.env.STRIPE_USE_LIVE_KEYS === 'true',
  },
  
  // Security
  security: {
    tenantCookieSecret: process.env.TENANT_COOKIE_SECRET || 'dev-secret-change-in-production',
    jwtSecret: process.env.JWT_SECRET,
    mfaEnforceSystemAdmin: process.env.MFA_ENFORCE_SYSTEM_ADMIN === 'true',
  },
  
  // Auth (Optional)
  auth: {
    testEmail: process.env.AUTH_TEST_EMAIL,
    testPassword: process.env.AUTH_TEST_PASSWORD,
    redirectUrl: process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL,
  },
  
  // Feature Flags
  features: {
    stripeEnabled: process.env.STRIPE_ENABLED === 'true',
    ai: process.env.FEATURE_AI === 'true',
    aiSuggestions: process.env.FEATURE_AI_SUGGESTIONS === 'true',
    participantsDomain: process.env.FEATURE_PARTICIPANTS === 'true',
    /** Signals primitives (lobby/play UIs, API). Default on in dev, off in prod until piloted. */
    signals: process.env.FEATURE_SIGNALS === 'true' || (process.env.NODE_ENV === 'development'),
    /** Time Bank primitives. Default on in dev, off in prod until piloted. */
    timeBank: process.env.FEATURE_TIME_BANK === 'true' || (process.env.NODE_ENV === 'development'),
    /** Session Cockpit: Unified host shell for Lobby + Director Mode. */
    sessionCockpit: process.env.FEATURE_SESSION_COCKPIT === 'true' || (process.env.NODE_ENV === 'development'),
    /** Director Mode as drawer overlay instead of fullscreen switch. */
    directorModeDrawer: process.env.FEATURE_DIRECTOR_MODE_DRAWER === 'true' || (process.env.NODE_ENV === 'development'),
    /** Leader Script: Host-only instructions per step. */
    leaderScript: process.env.FEATURE_LEADER_SCRIPT === 'true' || (process.env.NODE_ENV === 'development'),
    /** Event logging and live event feed. */
    eventLogging: process.env.FEATURE_EVENT_LOGGING === 'true' || (process.env.NODE_ENV === 'development'),
    /** Trigger kill switch: Emergency disable all triggers. */
    triggerKillSwitch: process.env.FEATURE_TRIGGER_KILL_SWITCH === 'true' || (process.env.NODE_ENV === 'development'),
  },
} as const;

// Run validation on module load (server-side only)
validateEnvironment();

// Log successful initialization in development (server-side only)
// Guarded to avoid noisy logs during HMR / dev server reloads.
const globalForEnv = globalThis as unknown as { __lekbanken_env_validated_logged?: boolean };
if (env.isDevelopment && !isBrowser && !globalForEnv.__lekbanken_env_validated_logged) {
  console.log('✅ Environment variables validated successfully');
  globalForEnv.__lekbanken_env_validated_logged = true;
}

// Helper to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof env.features): boolean {
  return env.features[feature];
}

// Helper to get Stripe keys based on environment
export function getStripeKeys() {
  if (!env.stripe.enabled) {
    throw new Error('Stripe is not enabled. Set STRIPE_ENABLED=true in .env.local');
  }
  
  const useLive = env.isProduction || env.stripe.useLiveKeys;
  
  return {
    secretKey: useLive 
      ? env.stripe.liveSecretKey || (() => { throw new Error('STRIPE_LIVE_SECRET_KEY not set'); })()
      : env.stripe.testSecretKey || (() => { throw new Error('STRIPE_TEST_SECRET_KEY not set'); })(),
    publishableKey: useLive
      ? env.stripe.livePublishableKey || (() => { throw new Error('NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY not set'); })()
      : env.stripe.testPublishableKey || (() => { throw new Error('NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY not set'); })(),
    webhookSecret: useLive
      ? env.stripe.liveWebhookSecret
      : env.stripe.testWebhookSecret,
  };
}
