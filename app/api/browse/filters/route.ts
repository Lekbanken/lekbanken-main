import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { getAllowedProductIds } from '@/app/api/games/utils'
import { DEMO_TENANT_ID } from '@/lib/auth/ephemeral-users'

type Purpose = { id: string; name?: string | null; type?: string | null; parent_id?: string | null }
type ProductPurposeRow = { product_id: string; purpose: Purpose | null }

type CachedFilters = {
  products: { id: string; name: string | null; product_key?: string | null; category?: string | null; status?: string | null }[]
  purposes: Purpose[]
  subPurposes: Purpose[]
  metadata: { allowedProducts: string[]; isDemoMode?: boolean }
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')

  const userId = user?.id ?? null
  
  // Detect demo mode
  const isDemoMode = tenantId === DEMO_TENANT_ID || user?.user_metadata?.is_demo_user === true
  
  // For demo users: return purposes from demo content games only
  if (isDemoMode) {
    const cacheId = 'demo-filters'
    const cached = getCachedFilters(cacheId)
    if (cached) {
      return NextResponse.json(cached)
    }
    
    // Get purposes from games marked as demo content
    const { data: demoGames, error: demoErr } = await supabase
      .from('games')
      .select('main_purpose_id, product_id')
      .eq('status', 'published')
      .eq('is_demo_content', true)
    
    if (demoErr) {
      console.error('[api/browse/filters] demo games error', demoErr)
      return NextResponse.json({ error: 'Failed to load demo filters' }, { status: 500 })
    }
    
    const demoPurposeIds = new Set<string>()
    const demoProductIds = new Set<string>()
    
    for (const game of demoGames ?? []) {
      if (game.main_purpose_id) demoPurposeIds.add(game.main_purpose_id)
      if (game.product_id) demoProductIds.add(game.product_id)
    }
    
    // Fetch purpose details
    let purposes: Purpose[] = []
    if (demoPurposeIds.size > 0) {
      const { data: purposeData } = await supabase
        .from('purposes')
        .select('id, name, type, parent_id')
        .in('id', Array.from(demoPurposeIds))
      purposes = (purposeData ?? []) as Purpose[]
    }
    
    // Fetch product details (for display, not filtering)
    let products: { id: string; name: string | null }[] = []
    if (demoProductIds.size > 0) {
      const { data: productData } = await supabase
        .from('products')
        .select('id, name')
        .in('id', Array.from(demoProductIds))
      products = (productData ?? []) as { id: string; name: string | null }[]
    }
    
    const payload: CachedFilters = {
      products,
      purposes: purposes.filter(p => p.type === 'main'),
      subPurposes: purposes.filter(p => p.type === 'sub'),
      metadata: { allowedProducts: Array.from(demoProductIds), isDemoMode: true },
    }
    
    setCachedFilters(cacheId, payload)
    return NextResponse.json(payload)
  }

  // IMPORTANT: tenant-scoped filters depend on seat assignments (user-specific).
  // Cache by (tenantId,userId) to avoid leaking filter availability across users.
  const cacheId = tenantId ? `${tenantId}:${userId ?? 'anon'}` : cacheKey(null)
  const cached = getCachedFilters(cacheId)
  if (cached) {
    return NextResponse.json(cached)
  }

  const { allowedProductIds } = await getAllowedProductIds(supabase, tenantId, userId)

  if (tenantId && allowedProductIds.length === 0) {
    const payload = { products: [], purposes: [], subPurposes: [], metadata: { allowedProducts: allowedProductIds } }
    setCachedFilters(cacheId, payload)
    return NextResponse.json(payload)
  }

  // STRATEGY: Extract filter options from the games the user can actually access
  // This ensures filters always correlate with available content
  // IMPORTANT: Must mirror the same access logic as /api/games/search
  
  // 1. Get products user has access to
  let productQuery = supabase
    .from('products')
    .select('id,name,product_key,category,status')
    .eq('status', 'active')
  if (allowedProductIds.length > 0) {
    productQuery = productQuery.in('id', allowedProductIds)
  }

  const { data: products, error: prodErr } = await productQuery
  if (prodErr) {
    console.error('[api/browse/filters] product fetch error', prodErr)
    return NextResponse.json({ error: 'Failed to load filters' }, { status: 500 })
  }

  // 2. Get all published games the user can access and extract their purpose IDs
  // This must mirror the exact same access logic as /api/games/search
  let gamesQuery = supabase
    .from('games')
    .select('id, main_purpose_id, product_id, owner_tenant_id')
    .eq('status', 'published')
  
  // Apply owner_tenant_id filter (same logic as games search)
  if (tenantId) {
    // Tenant users see: their tenant's games + global games (owner_tenant_id IS NULL)
    gamesQuery = gamesQuery.or(`owner_tenant_id.eq.${tenantId},owner_tenant_id.is.null`)
  } else {
    // Public/anonymous users: only global games
    gamesQuery = gamesQuery.is('owner_tenant_id', null)
  }
  
  // Apply product filter if user has specific entitlements
  if (allowedProductIds.length > 0) {
    gamesQuery = gamesQuery.in('product_id', allowedProductIds)
  }
  
  const { data: accessibleGames, error: gamesErr } = await gamesQuery
  if (gamesErr) {
    console.error('[api/browse/filters] games fetch error', gamesErr)
  }
  
  // 3. Collect unique purpose IDs from accessible games
  const purposeIdsFromGames = new Set<string>()
  const productIdsFromGames = new Set<string>()
  
  for (const game of accessibleGames ?? []) {
    if (game.main_purpose_id) purposeIdsFromGames.add(game.main_purpose_id)
    if (game.product_id) productIdsFromGames.add(game.product_id)
  }
  
  // 4. Fetch purpose details for purposes actually used by accessible games
  let mainPurposes: Purpose[] = []
  let subPurposes: Purpose[] = []
  
  if (purposeIdsFromGames.size > 0) {
    const { data: purposeData, error: purposeErr } = await supabase
      .from('purposes')
      .select('id, name, type, parent_id')
      .in('id', Array.from(purposeIdsFromGames))
    
    if (purposeErr) {
      console.error('[api/browse/filters] purpose fetch error', purposeErr)
    } else {
      mainPurposes = (purposeData ?? []).filter(p => p.type === 'main') as Purpose[]
      subPurposes = (purposeData ?? []).filter(p => p.type === 'sub') as Purpose[]
    }
  }
  
  // 5. Also try product_purposes as fallback for additional purposes
  const productIdsForPurposes = allowedProductIds.length > 0 ? allowedProductIds : (products ?? []).map((p) => p.id)

  if (productIdsForPurposes.length > 0) {
    const { data: productPurposeRows, error: ppErr } = await supabase
      .from('product_purposes')
      .select('product_id, purpose:purposes(*)')
      .in('product_id', productIdsForPurposes)

    if (!ppErr && productPurposeRows) {
      for (const row of productPurposeRows as ProductPurposeRow[]) {
        const purpose = row.purpose
        if (!purpose?.id) continue
        if (purpose.type === 'main' && !mainPurposes.find(p => p.id === purpose.id)) {
          mainPurposes.push(purpose)
        } else if (purpose.type === 'sub' && !subPurposes.find(p => p.id === purpose.id)) {
          subPurposes.push(purpose)
        }
      }
    }
  }

  // Filter sub-purposes to those whose parent is in main set when available
  const mainIds = new Set(mainPurposes.map(p => p.id))
  const filteredSubPurposes = subPurposes.filter((p) => !p.parent_id || mainIds.has(p.parent_id))
  
  // Only include products that have at least one game
  const filteredProducts = (products ?? []).filter(p => productIdsFromGames.has(p.id))
  
  const payload: CachedFilters = {
    products: filteredProducts.length > 0 ? filteredProducts : (products ?? []),
    purposes: mainPurposes,
    subPurposes: filteredSubPurposes,
    metadata: {
      allowedProducts: allowedProductIds,
    },
  }

  setCachedFilters(cacheId, payload)
  return NextResponse.json(payload)
}
