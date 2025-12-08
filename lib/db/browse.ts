/**
 * Browse Queries
 *
 * Database queries for the Browse Domain (game discovery, search, filtering).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type BrowseSearchLog = Database['public']['Tables']['browse_search_logs']['Row']

/**
 * Search games across all public games
 */
export async function searchPublicGames(
  supabase: SupabaseClient<Database>,
  options?: {
    query?: string
    productId?: string
    mainPurposeId?: string
    energyLevel?: string
    minTimeMin?: number
    maxTimeMin?: number
    minPlayers?: number
    maxPlayers?: number
    minAge?: number
    maxAge?: number
    sort?: 'newest' | 'popular' | 'name'
    limit?: number
    offset?: number
  }
) {
  let query = supabase.from('games').select(
    `*,
    product:products(*),
    main_purpose:purposes!main_purpose_id(*),
    secondary_purposes:game_secondary_purposes(purpose:purposes(*)),
    media:media(*)`,
    { count: 'exact' }
  )

  // Only published games
  query = query.eq('status', 'published')

  // Full text search
  if (options?.query) {
    query = query.or(
      `name.ilike.%${options.query}%,description.ilike.%${options.query}%,instructions.ilike.%${options.query}%`
    )
  }

  // Filters
  if (options?.productId) {
    query = query.eq('product_id', options.productId)
  }

  if (options?.mainPurposeId) {
    query = query.eq('main_purpose_id', options.mainPurposeId)
  }

  if (options?.energyLevel) {
    query = query.eq('energy_level', options.energyLevel)
  }

  if (options?.minTimeMin !== undefined) {
    query = query.gte('time_estimate_min', options.minTimeMin)
  }

  if (options?.maxTimeMin !== undefined) {
    query = query.lte('time_estimate_min', options.maxTimeMin)
  }

  if (options?.minPlayers !== undefined) {
    query = query.gte('min_players', options.minPlayers)
  }

  if (options?.maxPlayers !== undefined) {
    query = query.lte('max_players', options.maxPlayers)
  }

  if (options?.minAge !== undefined) {
    query = query.gte('min_age', options.minAge)
  }

  if (options?.maxAge !== undefined) {
    query = query.lte('max_age', options.maxAge)
  }

  // Sorting
  if (options?.sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else if (options?.sort === 'popular') {
    // Would need a popularity/view count in schema
    query = query.order('created_at', { ascending: false })
  } else if (options?.sort === 'name') {
    query = query.order('name', { ascending: true })
  } else {
    // Default: newest first
    query = query.order('created_at', { ascending: false })
  }

  // Pagination
  const limit = Math.min(options?.limit || 50, 100)
  const offset = options?.offset || 0

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) throw error

  return {
    games: data || [],
    total: count || 0,
    limit,
    offset,
  }
}

/**
 * Get featured/trending games
 */
export async function getFeaturedGames(
  supabase: SupabaseClient<Database>,
  limit: number = 10
) {
  const { data, error } = await supabase
    .from('games')
    .select(
      `*,
      product:products(*),
      main_purpose:purposes!main_purpose_id(*),
      secondary_purposes:game_secondary_purposes(purpose:purposes(*)),
      media:media(*)`
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Get games by product
 */
export async function getGamesByProduct(
  supabase: SupabaseClient<Database>,
  productId: string,
  options?: {
    limit?: number
    offset?: number
  }
) {
  let query = supabase.from('games').select(
    `*,
    product:products(*),
    main_purpose:purposes!main_purpose_id(*),
    secondary_purposes:game_secondary_purposes(purpose:purposes(*)),
    media:media(*)`,
    { count: 'exact' }
  )

  query = query.eq('product_id', productId).eq('status', 'published')

  const limit = Math.min(options?.limit || 50, 100)
  const offset = options?.offset || 0

  query = query.order('name', { ascending: true }).range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) throw error

  return {
    games: data || [],
    total: count || 0,
    limit,
    offset,
  }
}

/**
 * Get games by purpose
 */
export async function getGamesByPurpose(
  supabase: SupabaseClient<Database>,
  purposeId: string,
  options?: {
    limit?: number
    offset?: number
  }
) {
  let query = supabase.from('games').select(
    `*,
    product:products(*),
    main_purpose:purposes!main_purpose_id(*),
    secondary_purposes:game_secondary_purposes(purpose:purposes(*)),
    media:media(*)`,
    { count: 'exact' }
  )

  query = query
    .or(
      `main_purpose_id.eq.${purposeId},game_secondary_purposes.purpose_id.eq.${purposeId}`
    )
    .eq('status', 'published')

  const limit = Math.min(options?.limit || 50, 100)
  const offset = options?.offset || 0

  query = query.order('name', { ascending: true }).range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) throw error

  return {
    games: data || [],
    total: count || 0,
    limit,
    offset,
  }
}

/**
 * Log search query for analytics
 */
export async function logSearch(
  supabase: SupabaseClient<Database>,
  searchTerm: string,
  userId?: string,
  tenantId?: string,
  resultsCount?: number,
  resultIds?: string[]
): Promise<BrowseSearchLog | null> {
  const { data, error } = await supabase
    .from('browse_search_logs')
    .insert([
      {
        search_term: searchTerm,
        user_id: userId || null,
        tenant_id: tenantId || null,
        results_count: resultsCount || 0,
        result_ids: resultIds || [],
      },
    ])
    .select()
    .single()

  if (error) {
    console.error('Error logging search:', error)
    return null
  }

  return data
}

/**
 * Get search suggestions based on popular searches
 */
export async function getSearchSuggestions(
  supabase: SupabaseClient<Database>,
  limit: number = 10
) {
  const { data, error } = await supabase
    .from('browse_search_logs')
    .select('search_term')
    .order('created_at', { ascending: false })
    .limit(limit * 3)

  if (error) throw error

  // Get unique search terms and return top ones
  const uniqueTerms = Array.from(
    new Set((data || []).map((item) => (item.search_term ? item.search_term : '')))
  )
  return uniqueTerms.filter((term) => term.length > 0).slice(0, limit)
}

/**
 * Get trending searches
 */
export async function getTrendingSearches(
  supabase: SupabaseClient<Database>,
  hoursBack: number = 24,
  limit: number = 10
) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('browse_search_logs')
    .select('search_term, results_count')
    .gte('created_at', since)

  if (error) throw error

  // Group by search term and count occurrences
  const grouped = (data || []).reduce(
    (acc, item) => {
      const key = item.search_term || ''
      if (!key) return acc
      if (!acc[key]) {
        acc[key] = { term: key, count: 0, totalResults: 0 }
      }
      acc[key].count += 1
      acc[key].totalResults += (item.results_count as number) || 0
      return acc
    },
    {} as Record<string, { term: string; count: number; totalResults: number }>
  )

  // Sort by frequency and return top
  return Object.values(grouped)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Get games with filters (advanced browse)
 */
export async function getFilteredGames(
  supabase: SupabaseClient<Database>,
  filters: {
    products?: string[]
    purposes?: string[]
    energyLevels?: string[]
    ageRange?: { min?: number; max?: number }
    playerRange?: { min?: number; max?: number }
    timeRange?: { min?: number; max?: number }
  },
  options?: {
    sort?: 'newest' | 'popular' | 'name'
    limit?: number
    offset?: number
  }
) {
  let query = supabase.from('games').select(
    `*,
    product:products(*),
    main_purpose:purposes!main_purpose_id(*),
    secondary_purposes:game_secondary_purposes(purpose:purposes(*)),
    media:media(*)`,
    { count: 'exact' }
  )

  query = query.eq('status', 'published')

  // Product filter
  if (filters.products && filters.products.length > 0) {
    query = query.in('product_id', filters.products)
  }

  // Energy level filter
  if (filters.energyLevels && filters.energyLevels.length > 0) {
    query = query.in('energy_level', filters.energyLevels)
  }

  // Age range
  if (filters.ageRange?.min !== undefined) {
    query = query.gte('min_age', filters.ageRange.min)
  }
  if (filters.ageRange?.max !== undefined) {
    query = query.lte('max_age', filters.ageRange.max)
  }

  // Player range
  if (filters.playerRange?.min !== undefined) {
    query = query.gte('min_players', filters.playerRange.min)
  }
  if (filters.playerRange?.max !== undefined) {
    query = query.lte('max_players', filters.playerRange.max)
  }

  // Time range
  if (filters.timeRange?.min !== undefined) {
    query = query.gte('time_estimate_min', filters.timeRange.min)
  }
  if (filters.timeRange?.max !== undefined) {
    query = query.lte('time_estimate_min', filters.timeRange.max)
  }

  // Sorting
  if (options?.sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else if (options?.sort === 'name') {
    query = query.order('name', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  // Pagination
  const limit = Math.min(options?.limit || 50, 100)
  const offset = options?.offset || 0

  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query

  if (error) throw error

  // Purpose filtering (requires client-side filtering since it's a relationship)
  let filtered = data || []
  if (filters.purposes && filters.purposes.length > 0) {
    filtered = filtered.filter((game) => {
      const secondaryPurposeIds = (game.secondary_purposes as unknown[])
        .map((sp) => {
          const spObj = sp as Record<string, unknown>
          const purpose = spObj.purpose as Record<string, unknown>
          return purpose?.id
        })
        .filter((id): id is string => typeof id === 'string')

      return (
        filters.purposes!.includes(game.main_purpose_id as string) ||
        secondaryPurposeIds.some((id) => filters.purposes!.includes(id))
      )
    })
  }

  return {
    games: filtered,
    total: filtered.length,
    limit,
    offset,
  }
}
