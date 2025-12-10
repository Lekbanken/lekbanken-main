/**
 * Central Stripe Client Configuration
 * 
 * Handles test/live key switching based on environment
 * and provides defensive error handling.
 */

import Stripe from 'stripe'

// ============================================================================
// ENV VALIDATION
// ============================================================================

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

function getOptionalEnv(key: string): string | undefined {
  return process.env[key]
}

// ============================================================================
// KEY SELECTION LOGIC
// ============================================================================

const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Determines which Stripe keys to use based on environment.
 * 
 * LOGIC:
 * - Development: Use TEST keys
 * - Production: Use LIVE keys
 * - Can be overridden with STRIPE_USE_LIVE_KEYS=true in dev
 */
const useLiveKeys = isProduction || getOptionalEnv('STRIPE_USE_LIVE_KEYS') === 'true'

// Get appropriate keys
const secretKey = useLiveKeys
  ? getRequiredEnv('STRIPE_LIVE_SECRET_KEY')
  : getRequiredEnv('STRIPE_TEST_SECRET_KEY')

const publishableKey = useLiveKeys
  ? getRequiredEnv('NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY')
  : getRequiredEnv('NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY')

const webhookSecret = useLiveKeys
  ? getRequiredEnv('STRIPE_LIVE_WEBHOOK_SECRET')
  : getRequiredEnv('STRIPE_TEST_WEBHOOK_SECRET')

// ============================================================================
// STRIPE CLIENT INITIALIZATION
// ============================================================================

/**
 * Singleton Stripe client instance.
 * Initialized with appropriate test/live keys.
 */
export const stripe = new Stripe(secretKey, {
  apiVersion: '2024-06-20', // Latest supported version by current Stripe package
  typescript: true,
  maxNetworkRetries: 3,
  timeout: 30000, // 30s
  appInfo: {
    name: 'Lekbanken',
    version: '1.0.0',
    url: 'https://lekbanken.no',
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Publishable key for client-side usage.
 * Safe to expose in browser.
 */
export const stripePublishableKey = publishableKey

/**
 * Webhook secret for signature verification.
 * NEVER expose this to client!
 */
export const stripeWebhookSecret = webhookSecret

/**
 * Indicates which key set is being used.
 */
export const stripeConfig = {
  useLiveKeys,
  isDevelopment,
  isProduction,
  mode: useLiveKeys ? 'live' : 'test',
} as const

// ============================================================================
// STARTUP VALIDATION
// ============================================================================

// Log configuration on startup (without exposing secrets)
if (isDevelopment) {
  console.log('🔐 Stripe Configuration:', {
    mode: stripeConfig.mode,
    publishableKey: publishableKey.substring(0, 20) + '...',
    hasSecretKey: !!secretKey,
    hasWebhookSecret: !!webhookSecret,
  })
}

// Validate key format
if (!secretKey.startsWith('sk_')) {
  throw new Error('Invalid STRIPE_SECRET_KEY format. Must start with sk_')
}

if (!publishableKey.startsWith('pk_')) {
  throw new Error('Invalid STRIPE_PUBLISHABLE_KEY format. Must start with pk_')
}

const expectedKeyPrefix = useLiveKeys ? 'live' : 'test'
if (!secretKey.includes(expectedKeyPrefix)) {
  console.warn(
    `⚠️  WARNING: Using ${useLiveKeys ? 'LIVE' : 'TEST'} keys but secret key doesn't match expected pattern.`
  )
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if Stripe is properly configured and available.
 * Use this before making Stripe API calls in conditional flows.
 */
export function isStripeConfigured(): boolean {
  return !!(secretKey && publishableKey && webhookSecret)
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
