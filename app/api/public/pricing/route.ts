import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PricingProduct = {
  id: string
  name: string
  description?: string | null
  product_key?: string | null
  product_type?: string | null
  category?: string | null
  prices: Array<{
    id: string
    amount: number
    currency: string
    interval: string | null
    interval_count: number | null
    is_default: boolean
  }>
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const currency = (searchParams.get('currency') ?? 'SEK').toUpperCase()

  const supabase = await createServerRlsClient()

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id,name,description,product_key,product_type,category,status')
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (productsError) {
    console.error('[public/pricing] products query error', productsError)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }

  const { data: prices, error: pricesError } = await supabase
    .from('product_prices')
    .select('id,product_id,amount,currency,interval,interval_count,active,is_default')
    .eq('active', true)
    .eq('currency', currency)

  if (pricesError) {
    console.error('[public/pricing] product_prices query error', pricesError)
    return NextResponse.json({ error: 'Failed to load prices' }, { status: 500 })
  }

  const pricesByProductId = new Map<string, PricingProduct['prices']>()
  for (const pr of prices ?? []) {
    if (!pricesByProductId.has(pr.product_id)) pricesByProductId.set(pr.product_id, [])
    pricesByProductId.get(pr.product_id)!.push({
      id: pr.id,
      amount: pr.amount,
      currency: pr.currency,
      interval: pr.interval,
      interval_count: pr.interval_count,
      is_default: Boolean(pr.is_default),
    })
  }

  // Prefer default price first, then cheapest.
  for (const list of pricesByProductId.values()) {
    list.sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
      return a.amount - b.amount
    })
  }

  const resultProducts: PricingProduct[] = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    product_key: (p as any).product_key ?? null,
    product_type: (p as any).product_type ?? null,
    category: (p as any).category ?? null,
    prices: pricesByProductId.get(p.id) ?? [],
  }))

  return NextResponse.json({ currency, products: resultProducts })
}
