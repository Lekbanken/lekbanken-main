import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

/**
 * GET /api/public/categories
 *
 * Returns public categories with aggregated product/game counts
 * and optional bundle pricing info.
 *
 * Query params:
 *   currency  – price currency for bundle lookup (default: SEK)
 */

export const revalidate = 300 // 5 min ISR cache

// ─────────────────────────────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────────────────────────────

type BundlePrice = {
  amount: number
  currency: string
  interval: string
  billing_model: string | null
}

type PublicCategory = {
  slug: string
  name: string
  description_short: string | null
  icon_key: string | null
  sort_order: number
  bundle_product_id: string | null
  product_count: number
  game_count: number
  bundle_price_yearly: BundlePrice | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const currency = (searchParams.get('currency') ?? 'SEK').toUpperCase()

  const supabase = await createServerRlsClient()

  // 1. Fetch public categories (RLS: is_public = true)
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id,slug,name,description_short,icon_key,sort_order,bundle_product_id')
    .eq('is_public', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (catError) {
    console.error('[public/categories] categories query error', catError)
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
  }

  if (!categories || categories.length === 0) {
    return NextResponse.json({ currency, categories: [] })
  }

  const slugs = categories.map((c) => c.slug)

  // 2. Count products per category (only active + marketing-visible)
  const { data: productRows, error: pcError } = await supabase
    .from('products')
    .select('category_slug')
    .in('category_slug', slugs)
    .eq('status', 'active')
    .eq('is_marketing_visible', true)
    .eq('is_bundle', false)

  if (pcError) {
    console.error('[public/categories] product count query error', pcError)
    // Non-fatal: continue with 0 counts
  }

  // Count products per slug
  const productCountMap = new Map<string, number>()
  for (const row of productRows ?? []) {
    if (row.category_slug) {
      productCountMap.set(row.category_slug, (productCountMap.get(row.category_slug) ?? 0) + 1)
    }
  }

  // 3. Count games per category via products
  //    games.product_id → products.category_slug
  //    We need product IDs first, then count games per product
  const { data: productsForGames, error: pfgError } = await supabase
    .from('products')
    .select('id,category_slug')
    .in('category_slug', slugs)
    .eq('status', 'active')
    .eq('is_marketing_visible', true)
    .eq('is_bundle', false)

  const gameCountMap = new Map<string, number>()

  if (!pfgError && productsForGames && productsForGames.length > 0) {
    const productIds = productsForGames.map((p) => p.id)

    const { data: gameCounts, error: gcError } = await supabase
      .from('games')
      .select('product_id')
      .in('product_id', productIds)
      .eq('status', 'published')

    if (!gcError && gameCounts) {
      // Map product_id back to category_slug
      const productToSlug = new Map(productsForGames.map((p) => [p.id, p.category_slug]))
      for (const g of gameCounts) {
        if (g.product_id) {
          const slug = productToSlug.get(g.product_id)
          if (slug) {
            gameCountMap.set(slug, (gameCountMap.get(slug) ?? 0) + 1)
          }
        }
      }
    }
  }

  // 4. Resolve bundle prices (yearly prices for each bundle_product_id)
  const bundleProductIds = categories
    .map((c) => c.bundle_product_id)
    .filter((id): id is string => id !== null)

  const bundlePriceMap = new Map<string, BundlePrice>()

  if (bundleProductIds.length > 0) {
    const { data: bundlePrices, error: bpError } = await supabase
      .from('product_prices')
      .select('product_id,amount,currency,interval,billing_model,is_default')
      .in('product_id', bundleProductIds)
      .eq('active', true)
      .eq('currency', currency)
      .eq('interval', 'year')

    if (!bpError && bundlePrices) {
      // Pick best price per bundle: is_default first, then cheapest
      for (const bp of bundlePrices) {
        const existing = bundlePriceMap.get(bp.product_id)
        if (
          !existing ||
          (bp.is_default && !existing) ||
          bp.amount < existing.amount
        ) {
          bundlePriceMap.set(bp.product_id, {
            amount: bp.amount,
            currency: bp.currency,
            interval: bp.interval,
            billing_model: bp.billing_model,
          })
        }
      }
    }
  }

  // 5. Assemble response
  const result: PublicCategory[] = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    description_short: c.description_short,
    icon_key: c.icon_key,
    sort_order: c.sort_order,
    bundle_product_id: c.bundle_product_id,
    product_count: productCountMap.get(c.slug) ?? 0,
    game_count: gameCountMap.get(c.slug) ?? 0,
    bundle_price_yearly: c.bundle_product_id
      ? bundlePriceMap.get(c.bundle_product_id) ?? null
      : null,
  }))

  return NextResponse.json({ currency, categories: result })
}
