/**
 * Licensing smoke test
 *
 * Validates that anonymous (marketing) reads work for:
 * - public.products where status = 'active'
 * - public.product_prices where active = true
 *
 * Optionally validates the Next.js endpoint:
 * - GET /api/public/pricing
 *
 * Env (recommended in .env.local):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Optional env:
 * - SMOKE_BASE_URL (e.g. http://localhost:3000)
 * - SMOKE_CURRENCY (default: SEK)
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SMOKE_BASE_URL = process.env.SMOKE_BASE_URL
const SMOKE_CURRENCY = (process.env.SMOKE_CURRENCY ?? 'SEK').toUpperCase()
const SMOKE_USER_EMAIL = process.env.SMOKE_USER_EMAIL
const SMOKE_USER_PASSWORD = process.env.SMOKE_USER_PASSWORD
const SMOKE_TENANT_ID = process.env.SMOKE_TENANT_ID
const SMOKE_EXPECT_ENTITLEMENTS = (process.env.SMOKE_EXPECT_ENTITLEMENTS ?? 'false').toLowerCase() === 'true'

function mask(value: string, prefix = 12) {
  return value.length <= prefix ? value : `${value.slice(0, prefix)}…`
}

type PricingApiResponse = {
  currency: string
  products: unknown[]
}

function isPricingApiResponse(value: unknown): value is PricingApiResponse {
  if (!value || typeof value !== 'object') return false
  const maybe = value as Record<string, unknown>
  return typeof maybe.currency === 'string' && Array.isArray(maybe.products)
}

async function main() {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (try setting them in .env.local)')
  }

  console.log('🔎 Licensing smoke test')
  console.log('   Supabase URL:', SUPABASE_URL)
  console.log('   Anon key:', mask(ANON_KEY))
  console.log('   Currency:', SMOKE_CURRENCY)
  if (SMOKE_BASE_URL) console.log('   Base URL:', SMOKE_BASE_URL)
  if (SMOKE_USER_EMAIL) console.log('   User email:', SMOKE_USER_EMAIL)
  if (SMOKE_TENANT_ID) console.log('   Tenant id:', SMOKE_TENANT_ID)

  const supabase = createClient(SUPABASE_URL, ANON_KEY)

  console.log('\n1) Anon RLS: products (status=active)')
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, status, product_type, category')
    .eq('status', 'active')
    .order('name', { ascending: true })
    .limit(50)

  if (productsError) {
    console.error('❌ products query error:', productsError)
    process.exitCode = 1
    return
  }

  console.log(`✅ products visible to anon: ${products?.length ?? 0}`)
  ;(products ?? []).slice(0, 5).forEach((p) => console.log(`   - ${p.name} (${p.product_type ?? 'n/a'})`))

  console.log(`\n2) Anon RLS: product_prices (active=true, currency=${SMOKE_CURRENCY})`)
  const { data: prices, error: pricesError } = await supabase
    .from('product_prices')
    .select('id, product_id, amount, currency, interval, interval_count, active, is_default, stripe_price_id')
    .eq('active', true)
    .eq('currency', SMOKE_CURRENCY)
    .order('amount', { ascending: true })
    .limit(100)

  if (pricesError) {
    console.error('❌ product_prices query error:', pricesError)
    process.exitCode = 1
    return
  }

  console.log(`✅ prices visible to anon: ${prices?.length ?? 0}`)
  ;(prices ?? []).slice(0, 5).forEach((pr) =>
    console.log(
      `   - ${(pr.amount / 100).toFixed(0)} ${pr.currency}/${pr.interval}${pr.interval_count ? ` x${pr.interval_count}` : ''} ${pr.is_default ? '(default)' : ''}`
    )
  )

  if ((products?.length ?? 0) > 0 && (prices?.length ?? 0) > 0) {
    const activeProductIds = new Set((products ?? []).map((p) => p.id))
    const pricesWithUnknownProduct = (prices ?? []).filter((pr) => !activeProductIds.has(pr.product_id))

    if (pricesWithUnknownProduct.length > 0) {
      console.log(
        `⚠️  Note: ${pricesWithUnknownProduct.length} price rows point to product_ids not in the first 50 active products (could be fine if you have many products).`
      )
    }
  }

  if (SMOKE_BASE_URL) {
    const trimmed = SMOKE_BASE_URL.replace(/\/$/, '')
    const url = `${trimmed}/api/public/pricing?currency=${encodeURIComponent(SMOKE_CURRENCY)}`

    console.log(`\n3) Next API: GET ${url}`)

    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
      },
    })

    if (!res.ok) {
      console.error(`❌ /api/public/pricing failed: ${res.status} ${res.statusText}`)
      const body = await res.text().catch(() => '')
      if (body) console.error(body.slice(0, 2000))
      process.exitCode = 1
      return
    }

    const json = (await res.json()) as unknown
    if (!isPricingApiResponse(json)) {
      console.error('❌ /api/public/pricing returned unexpected JSON shape')
      process.exitCode = 1
      return
    }

    if (json.currency !== SMOKE_CURRENCY) {
      console.error(`❌ /api/public/pricing returned unexpected currency: ${json.currency}`)
      process.exitCode = 1
      return
    }

    console.log(`✅ /api/public/pricing ok: ${json.products.length} products`)
  } else {
    console.log('\n3) Next API: skipped (set SMOKE_BASE_URL to test /api/public/pricing)')
  }

  if (SMOKE_USER_EMAIL && SMOKE_USER_PASSWORD && SMOKE_TENANT_ID) {
    console.log('\n4) Tenant member RLS: read tenant_product_entitlements (authenticated)')

    const authed = createClient(SUPABASE_URL, ANON_KEY)
    const { data: signIn, error: signInError } = await authed.auth.signInWithPassword({
      email: SMOKE_USER_EMAIL,
      password: SMOKE_USER_PASSWORD,
    })

    if (signInError || !signIn.session) {
      console.error('❌ signInWithPassword failed:', signInError)
      process.exitCode = 1
      return
    }

    const { error: entReadErr, data: ents } = await authed
      .from('tenant_product_entitlements')
      .select('id, tenant_id, product_id, status, valid_to')
      .eq('tenant_id', SMOKE_TENANT_ID)

    if (entReadErr) {
      console.error('❌ tenant_product_entitlements read failed (RLS?):', entReadErr)
      process.exitCode = 1
      return
    }

    const count = ents?.length ?? 0
    if (SMOKE_EXPECT_ENTITLEMENTS && count === 0) {
      console.error('❌ expected at least one entitlement, but got 0')
      process.exitCode = 1
      return
    }

    console.log(`✅ authenticated entitlement read ok: ${count} rows`)
  } else {
    console.log(
      '\n4) Tenant member RLS: skipped (set SMOKE_USER_EMAIL, SMOKE_USER_PASSWORD, SMOKE_TENANT_ID to verify entitlement read as member)'
    )
  }

  console.log('\n✅ Licensing smoke test complete')
}

main().catch((err) => {
  console.error('❌ Licensing smoke test failed:', err)
  process.exitCode = 1
})
