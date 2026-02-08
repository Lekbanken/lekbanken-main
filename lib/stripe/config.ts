/**
 * Central Stripe Client Configuration
 * 
 * Handles test/live key switching based on environment
 * and provides defensive error handling.
 * 
 * Uses lazy initialization to allow build-time static analysis
 * without requiring env vars at build time.
 */

import Stripe from 'stripe'

// ============================================================================
// ENV HELPERS (lazy - no throws at module load)
// ============================================================================

function getOptionalEnv(key: string): string | undefined {
  return process.env[key]
}

function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please ensure it's set in your .env.local file.`
    )
  }
  return value
}

// ============================================================================
// LAZY KEY RESOLUTION
// ============================================================================

function getUseLiveKeys(): boolean {
  return getOptionalEnv('STRIPE_USE_LIVE_KEYS') === 'true'
}

function getSecretKey(): string {
  const useLive = getUseLiveKeys()
  return useLive && getOptionalEnv('STRIPE_LIVE_SECRET_KEY')
    ? getRequiredEnv('STRIPE_LIVE_SECRET_KEY')
    : getRequiredEnv('STRIPE_TEST_SECRET_KEY')
}

function getPublishableKey(): string {
  const useLive = getUseLiveKeys()
  return useLive && getOptionalEnv('NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY')
    ? getRequiredEnv('NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY')
    : getRequiredEnv('NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY')
}

function getWebhookSecret(): string {
  const useLive = getUseLiveKeys()
  return useLive && getOptionalEnv('STRIPE_LIVE_WEBHOOK_SECRET')
    ? getRequiredEnv('STRIPE_LIVE_WEBHOOK_SECRET')
    : getRequiredEnv('STRIPE_TEST_WEBHOOK_SECRET')
}

// ============================================================================
// LAZY STRIPE CLIENT (singleton pattern)
// ============================================================================

let _stripeInstance: Stripe | null = null
let _validated = false

function validateKeys(secretKey: string, publishableKey: string): void {
  if (_validated) return
  
  if (!secretKey.startsWith('sk_')) {
    throw new Error('Invalid STRIPE_SECRET_KEY format. Must start with sk_')
  }
  
  if (!publishableKey.startsWith('pk_')) {
    throw new Error('Invalid STRIPE_PUBLISHABLE_KEY format. Must start with pk_')
  }
  
  const expectedKeyPrefix = getUseLiveKeys() ? 'live' : 'test'
  if (!secretKey.includes(expectedKeyPrefix)) {
    console.warn(
      `⚠️  WARNING: Using ${getUseLiveKeys() ? 'LIVE' : 'TEST'} keys but secret key doesn't match expected pattern.`
    )
  }
  
  _validated = true
}

function getStripeClient(): Stripe {
  if (!_stripeInstance) {
    const secretKey = getSecretKey()
    const publishableKey = getPublishableKey()
    
    validateKeys(secretKey, publishableKey)
    
    _stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
      typescript: true,
      maxNetworkRetries: 3,
      timeout: 30000,
      appInfo: {
        name: 'Lekbanken',
        version: '1.0.0',
        url: 'https://lekbanken.no',
      },
    })
    
    // Log on first init in dev
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Stripe Configuration:', {
        mode: getUseLiveKeys() ? 'live' : 'test',
        publishableKey: publishableKey.substring(0, 20) + '...',
        hasSecretKey: true,
        hasWebhookSecret: !!getOptionalEnv('STRIPE_TEST_WEBHOOK_SECRET') || !!getOptionalEnv('STRIPE_LIVE_WEBHOOK_SECRET'),
      })
    }
  }
  return _stripeInstance
}

/**
 * Lazy-loaded Stripe client via Proxy.
 * All method calls are forwarded to the real client on first access.
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripeClient()
    const value = client[prop as keyof Stripe]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

// ============================================================================
// LAZY EXPORTS (getters)
// ============================================================================

/**
 * Publishable key for client-side usage.
 * Safe to expose in browser. Lazy-loaded.
 */
export function getStripePublishableKey(): string {
  return getPublishableKey()
}

/** @deprecated Use getStripePublishableKey() instead */
export const stripePublishableKey = new Proxy({} as { value: string }, {
  get(_target, prop) {
    if (prop === 'toString' || prop === 'valueOf' || prop === Symbol.toPrimitive) {
      return () => getPublishableKey()
    }
    return getPublishableKey()
  },
}) as unknown as string

/**
 * Webhook secret for signature verification.
 * NEVER expose this to client! Lazy-loaded.
 */
export function getStripeWebhookSecret(): string {
  return getWebhookSecret()
}

/** @deprecated Use getStripeWebhookSecret() instead */
export const stripeWebhookSecret = new Proxy({} as { value: string }, {
  get(_target, prop) {
    if (prop === 'toString' || prop === 'valueOf' || prop === Symbol.toPrimitive) {
      return () => getWebhookSecret()
    }
    return getWebhookSecret()
  },
}) as unknown as string

/**
 * Indicates which key set is being used.
 */
export const stripeConfig = {
  get useLiveKeys() { return getUseLiveKeys() },
  get isDevelopment() { return process.env.NODE_ENV === 'development' },
  get isProduction() { return process.env.NODE_ENV === 'production' },
  get mode() { return getUseLiveKeys() ? 'live' as const : 'test' as const },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if Stripe is properly configured and available.
 * Use this before making Stripe API calls in conditional flows.
 */
export function isStripeConfigured(): boolean {
  try {
    // Check if keys are available without throwing
    const hasSecret = !!getOptionalEnv('STRIPE_TEST_SECRET_KEY') || !!getOptionalEnv('STRIPE_LIVE_SECRET_KEY')
    const hasPublishable = !!getOptionalEnv('NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY') || !!getOptionalEnv('NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY')
    const hasWebhook = !!getOptionalEnv('STRIPE_TEST_WEBHOOK_SECRET') || !!getOptionalEnv('STRIPE_LIVE_WEBHOOK_SECRET')
    return hasSecret && hasPublishable && hasWebhook
  } catch {
    return false
  }
}

/**
 * Converts amount from major units (e.g., USD) to minor units (cents).
 * Stripe requires amounts in smallest currency unit.
 * 
 * @example
 * toStripeAmount(99.50, 'USD') // => 9950
 * toStripeAmount(100, 'JPY') // => 100 (no decimal)
 */
export function toStripeAmount(amount: number, currency: string): number {
  // Zero-decimal currencies (JPY, KRW, etc.)
  const zeroDecimalCurrencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']
  
  const upperCurrency = currency.toUpperCase()
  if (zeroDecimalCurrencies.includes(upperCurrency)) {
    return Math.round(amount)
  }
  
  // Standard currencies with 2 decimals
  return Math.round(amount * 100)
}

/**
 * Converts amount from Stripe minor units (cents) to major units.
 * 
 * @example
 * fromStripeAmount(9950, 'USD') // => 99.50
 * fromStripeAmount(100, 'JPY') // => 100
 */
export function fromStripeAmount(amount: number, currency: string): number {
  const zeroDecimalCurrencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']
  
  const upperCurrency = currency.toUpperCase()
  if (zeroDecimalCurrencies.includes(upperCurrency)) {
    return amount
  }
  
  return amount / 100
}

/**
 * Type guard to check if error is from Stripe.
 */
export function isStripeError(error: unknown): error is Stripe.errors.StripeError {
  return error instanceof Error && 'type' in error && 'code' in error
}

/**
 * Extract useful error message from Stripe error.
 */
export function getStripeErrorMessage(error: unknown): string {
  if (isStripeError(error)) {
    return error.message || 'An unknown Stripe error occurred'
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  
  return 'An unknown error occurred'
}
