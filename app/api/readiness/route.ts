import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { apiHandler } from '@/lib/api/route-handler'

export const dynamic = 'force-dynamic'

/**
 * Readiness check — verifies all critical dependencies are functional.
 * Restricted to system_admin to prevent information leakage.
 * For public binary health signal, use /api/health.
 */
export const GET = apiHandler({
  auth: 'system_admin',
  handler: async () => {
    const checks: Record<string, 'ok' | 'error'> = {}
    let allOk = true

    // Database connectivity
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !supabaseKey) throw new Error('Missing env')
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { error } = await supabase.from('tenants').select('id').limit(1)
      checks.database = error ? 'error' : 'ok'
    } catch {
      checks.database = 'error'
    }

    // Stripe configuration
    try {
      const hasStripeKey = !!(
        process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY
      )
      const hasWebhookSecret = !!(
        process.env.STRIPE_LIVE_WEBHOOK_SECRET || process.env.STRIPE_TEST_WEBHOOK_SECRET
      )
      checks.stripe = hasStripeKey && hasWebhookSecret ? 'ok' : 'error'
    } catch {
      checks.stripe = 'error'
    }

    // Auth configuration
    checks.auth = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
      ? 'ok'
      : 'error'

    // Encryption
    checks.encryption = !!(
      process.env.TENANT_COOKIE_SECRET &&
      process.env.JWT_SECRET
    )
      ? 'ok'
      : 'error'

    // Rate limiter (always ok — in-memory, no external dependency)
    checks.rateLimiter = 'ok'

    if (Object.values(checks).some((v) => v === 'error')) {
      allOk = false
    }

    // Deployment identity — safe to expose behind system_admin auth.
    // Enables V7/V8 verification: confirm which infrastructure a deployment is connected to.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const environment = {
      deployTarget: process.env.DEPLOY_TARGET || 'development',
      appEnv: process.env.APP_ENV || 'local',
      supabaseProjectRef: supabaseUrl.match(/\/\/([^.]+)\./)?.[1] ?? 'unknown',
    }

    return NextResponse.json(
      {
        status: allOk ? 'ready' : 'degraded',
        checks,
        environment,
        timestamp: new Date().toISOString(),
      },
      { status: allOk ? 200 : 503 }
    )
  },
})
