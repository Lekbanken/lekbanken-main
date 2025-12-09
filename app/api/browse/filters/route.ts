import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { getAllowedProductIds } from '@/app/api/games/utils'

type Purpose = { id: string; name?: string | null; type?: string | null; parent_id?: string | null }
type ProductPurposeRow = { product_id: string; purpose: Purpose | null }

type CachedFilters = {
  products: { id: string; name: string | null; product_key?: string | null; category?: string | null; status?: string | null }[]
  purposes: Purpose[]
  subPurposes: Purpose[]
  metadata: { allowedProducts: string[] }
}

const CACHE_TTL_MS = 1000 * 60 * 5
const filterCache = new Map<string, { expires: number; value: CachedFilters }>()

function cacheKey(tenantId: string | null) {
  return tenantId || 'public'
}

function getCachedFilters(key: string) {
  const entry = filterCache.get(key)
  if (!entry) return null
  if (entry.expires < Date.now()) {
    filterCache.delete(key)
    return null
  }
  return entry.value
}

function setCachedFilters(key: string, value: CachedFilters) {
  filterCache.set(key, { expires: Date.now() + CACHE_TTL_MS, value })
}

export async function GET(request: Request) {
  const supabase = await createServerRlsClient()
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')

  const cacheId = cacheKey(tenantId)
  const cached = getCachedFilters(cacheId)
  if (cached) {
    return NextResponse.json(cached)
  }

  const { allowedProductIds } = await getAllowedProductIds(supabase, tenantId)

  if (tenantId && allowedProductIds.length === 0) {
    const payload = { products: [], purposes: [], subPurposes: [], metadata: { allowedProducts: allowedProductIds } }
    setCachedFilters(cacheId, payload)
    return NextResponse.json(payload)
  }

  let productQuery = supabase
    .from('products')
    .select('id,name,product_key,category,status')
    .eq('status', 'active')
  if (allowedProductIds.length > 0) {
    productQuery = productQuery.in('id', allowedProductIds)
  }

  const { data: products, error: prodErr } = await productQuery
  if (prodErr) {
    console.error('[api/browse/filters] fetch error', prodErr)
    return NextResponse.json({ error: 'Failed to load filters' }, { status: 500 })
  }

  const productIdsForPurposes = allowedProductIds.length > 0 ? allowedProductIds : (products ?? []).map((p) => p.id)

  let productPurposeRows: ProductPurposeRow[] | null = []
  if (productIdsForPurposes.length > 0) {
    const { data, error: ppErr } = await supabase
      .from('product_purposes')
      .select('product_id, purpose:purposes(*)')
      .in('product_id', productIdsForPurposes)

    if (ppErr) {
      console.error('[api/browse/filters] fetch error', ppErr)
      return NextResponse.json({ error: 'Failed to load filters' }, { status: 500 })
    }

    productPurposeRows = data as ProductPurposeRow[] | null
  }

  const mainPurposesMap = new Map<string, Purpose>()
  const subPurposesMap = new Map<string, Purpose>()

  for (const row of productPurposeRows ?? []) {
    const purpose = row.purpose
    if (!purpose?.id) continue
    if (purpose.type === 'main') {
      mainPurposesMap.set(purpose.id, purpose)
    } else if (purpose.type === 'sub') {
      subPurposesMap.set(purpose.id, purpose)
    }
  }

  // Filter sub-purposes to those whose parent is in main set when available
  const mainIds = new Set(mainPurposesMap.keys())
  const filteredSubPurposes = Array.from(subPurposesMap.values()).filter((p) => !p.parent_id || mainIds.has(p.parent_id))
  const payload: CachedFilters = {
    products: products ?? [],
    purposes: Array.from(mainPurposesMap.values()),
    subPurposes: filteredSubPurposes,
    metadata: {
      allowedProducts: allowedProductIds,
    },
  }

  setCachedFilters(cacheId, payload)
  return NextResponse.json(payload)
}
