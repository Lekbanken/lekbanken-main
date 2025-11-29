/**
 * Games Queries
 *
 * Database queries for the Games Domain.
 * Handles CRUD operations for games, filtering, and relationships.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Game = Database['public']['Tables']['games']['Row']
type GameInsert = Database['public']['Tables']['games']['Insert']
type GameUpdate = Database['public']['Tables']['games']['Update']
type Media = Database['public']['Tables']['media']['Row']
type GameSecondaryPurpose = Database['public']['Tables']['game_secondary_purposes']['Row']

/**
 * Get a single game with all relationships
 */
export async function getGameById(
  supabase: SupabaseClient<Database>,
  gameId: string
) {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      product:products(*),
      main_purpose:purposes!main_purpose_id(*),
      secondary_purposes:game_secondary_purposes(
        purpose:purposes(*)
      ),
      media:media(*)
    `)
    .eq('id', gameId)
    .single()

  if (error) throw error
  return data
}

/**
 * Get all games for a tenant with filtering options
 */
export async function getGamesForTenant(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options?: {
    status?: 'draft' | 'published'
    productId?: string
    mainPurposeId?: string
    limit?: number
    offset?: number
    search?: string
  }
) {
  let query = supabase
    .from('games')
    .select(`
      *,
      product:products(*),
      main_purpose:purposes!main_purpose_id(*),
      secondary_purposes:game_secondary_purposes(
        purpose:purposes(*)
      ),
      media:media(*)
    `)
    .eq('owner_tenant_id', tenantId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.productId) {
    query = query.eq('product_id', options.productId)
  }

  if (options?.mainPurposeId) {
    query = query.eq('main_purpose_id', options.mainPurposeId)
  }

  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`)
  }

  if (options?.limit) {
    const start = options.offset || 0
    query = query.range(start, start + options.limit - 1)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get published games (global games) with filtering
 */
export async function getPublishedGames(
  supabase: SupabaseClient<Database>,
  options?: {
    productId?: string
    mainPurposeId?: string
    limit?: number
    offset?: number
    search?: string
  }
) {
  let query = supabase
    .from('games')
    .select(`
      *,
      product:products(*),
      main_purpose:purposes!main_purpose_id(*),
      secondary_purposes:game_secondary_purposes(
        purpose:purposes(*)
      ),
      media:media(*)
    `)
    .eq('status', 'published')
    .is('owner_tenant_id', null) // Only global games

  if (options?.productId) {
    query = query.eq('product_id', options.productId)
  }

  if (options?.mainPurposeId) {
    query = query.eq('main_purpose_id', options.mainPurposeId)
  }

  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`)
  }

  if (options?.limit) {
    const start = options.offset || 0
    query = query.range(start, start + options.limit - 1)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Search games across all accessible games
 */
export async function searchGames(
  supabase: SupabaseClient<Database>,
  searchTerm: string,
  options?: {
    tenantId?: string
    limit?: number
  }
) {
  let query = supabase
    .from('games')
    .select(`
      *,
      product:products(*),
      main_purpose:purposes!main_purpose_id(*)
    `)
    .ilike('name', `%${searchTerm}%`)

  if (options?.tenantId) {
    query = query.or(`owner_tenant_id.eq.${options.tenantId},owner_tenant_id.is.null`)
  } else {
    query = query.is('owner_tenant_id', null) // Only global games
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Create a new game
 */
export async function createGame(
  supabase: SupabaseClient<Database>,
  game: GameInsert
): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .insert(game)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a game
 */
export async function updateGame(
  supabase: SupabaseClient<Database>,
  gameId: string,
  updates: GameUpdate
): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .update(updates)
    .eq('id', gameId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Publish a game (change status from draft to published)
 */
export async function publishGame(
  supabase: SupabaseClient<Database>,
  gameId: string
): Promise<Game> {
  return updateGame(supabase, gameId, { status: 'published' })
}

/**
 * Delete a game
 */
export async function deleteGame(
  supabase: SupabaseClient<Database>,
  gameId: string
): Promise<void> {
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId)

  if (error) throw error
}

/**
 * Add secondary purpose to a game
 */
export async function addSecondaryPurpose(
  supabase: SupabaseClient<Database>,
  gameId: string,
  purposeId: string
): Promise<GameSecondaryPurpose> {
  const { data, error } = await supabase
    .from('game_secondary_purposes')
    .insert({ game_id: gameId, purpose_id: purposeId })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove secondary purpose from a game
 */
export async function removeSecondaryPurpose(
  supabase: SupabaseClient<Database>,
  gameId: string,
  purposeId: string
): Promise<void> {
  const { error } = await supabase
    .from('game_secondary_purposes')
    .delete()
    .eq('game_id', gameId)
    .eq('purpose_id', purposeId)

  if (error) throw error
}

/**
 * Get all secondary purposes for a game
 */
export async function getGameSecondaryPurposes(
  supabase: SupabaseClient<Database>,
  gameId: string
) {
  const { data, error } = await supabase
    .from('game_secondary_purposes')
    .select(`
      *,
      purpose:purposes(*)
    `)
    .eq('game_id', gameId)

  if (error) throw error
  return data || []
}

/**
 * Upload/create media for a game
 */
export async function createGameMedia(
  supabase: SupabaseClient<Database>,
  media: Database['public']['Tables']['media']['Insert']
) {
  const { data, error } = await supabase
    .from('media')
    .insert(media)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get media for a game
 */
export async function getGameMedia(
  supabase: SupabaseClient<Database>,
  gameId: string
): Promise<Media[]> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('game_id', gameId)

  if (error) throw error
  return data || []
}

/**
 * Delete media
 */
export async function deleteMedia(
  supabase: SupabaseClient<Database>,
  mediaId: string
): Promise<void> {
  const { error } = await supabase
    .from('media')
    .delete()
    .eq('id', mediaId)

  if (error) throw error
}

/**
 * Filter games by multiple criteria
 */
export async function filterGames(
  supabase: SupabaseClient<Database>,
  filters: {
    tenantId?: string
    productId?: string
    mainPurposeId?: string
    energyLevel?: string
    minTimeEstimate?: number
    maxTimeEstimate?: number
    minPlayers?: number
    maxPlayers?: number
    ageMin?: number
    ageMax?: number
    status?: 'draft' | 'published'
  },
  options?: {
    limit?: number
    offset?: number
    sortBy?: 'newest' | 'popular' | 'name'
  }
) {
  let query = supabase
    .from('games')
    .select(`
      *,
      product:products(*),
      main_purpose:purposes!main_purpose_id(*)
    `)

  // Filter by tenant or published (global)
  if (filters.tenantId) {
    query = query.or(`owner_tenant_id.eq.${filters.tenantId},owner_tenant_id.is.null`)
  } else {
    query = query.is('owner_tenant_id', null)
  }

  if (filters.productId) {
    query = query.eq('product_id', filters.productId)
  }

  if (filters.mainPurposeId) {
    query = query.eq('main_purpose_id', filters.mainPurposeId)
  }

  if (filters.energyLevel) {
    query = query.eq('energy_level', filters.energyLevel)
  }

  if (filters.minTimeEstimate !== undefined) {
    query = query.gte('time_estimate_min', filters.minTimeEstimate)
  }

  if (filters.maxTimeEstimate !== undefined) {
    query = query.lte('time_estimate_min', filters.maxTimeEstimate)
  }

  if (filters.minPlayers !== undefined) {
    query = query.gte('min_players', filters.minPlayers)
  }

  if (filters.maxPlayers !== undefined) {
    query = query.lte('max_players', filters.maxPlayers)
  }

  if (filters.ageMin !== undefined) {
    query = query.lte('age_min', filters.ageMin)
  }

  if (filters.ageMax !== undefined) {
    query = query.gte('age_max', filters.ageMax)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  } else {
    query = query.eq('status', 'published') // Default to published only
  }

  // Sorting
  if (options?.sortBy === 'popular') {
    query = query.order('created_at', { ascending: false })
  } else if (options?.sortBy === 'name') {
    query = query.order('name', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  // Pagination
  if (options?.limit) {
    const start = options.offset || 0
    query = query.range(start, start + options.limit - 1)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}
