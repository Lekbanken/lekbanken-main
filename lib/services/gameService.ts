/**
 * Game Service
 * 
 * Business logic for game discovery, search, filtering, and pagination.
 * Handles all game-related operations for the Browse domain.
 */

import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/types/supabase'

export type Game = Tables<'games'>

export interface GameFilters {
  search?: string
  category?: string
  energyLevel?: 'low' | 'medium' | 'high'
  ageMin?: number
  ageMax?: number
}

export interface GameQueryOptions extends GameFilters {
  page?: number
  pageSize?: number
}

export interface GameQueryResult {
  games: Game[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Search and filter games with pagination
 */
export async function searchGames(
  options: GameQueryOptions = {}
): Promise<GameQueryResult> {
  const {
    search,
    category,
    energyLevel,
    ageMin,
    ageMax,
    page = 1,
    pageSize = 12,
  } = options

  const offset = (page - 1) * pageSize

  // Start with published games query
  let query = supabase
    .from('games')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  // Add search filter
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  // Add category filter
  if (category) {
    query = query.eq('category', category)
  }

  // Add energy level filter
  if (energyLevel) {
    query = query.eq('energy_level', energyLevel)
  }

  // Add age range filters
  if (ageMin !== undefined) {
    query = query.lte('age_min', ageMin)
  }
  if (ageMax !== undefined) {
    query = query.gte('age_max', ageMax)
  }

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1)

  const { data: games, count, error } = await query

  if (error) {
    console.error('Error searching games:', error)
    throw error
  }

  const total = count ?? 0
  const hasMore = offset + pageSize < total

  return {
    games: games ?? [],
    total,
    page,
    pageSize,
    hasMore,
  }
}

/**
 * Get games for specific tenant with tenant-based filtering
 */
export async function getTenantGames(
  tenantId: string,
  options: GameQueryOptions = {}
): Promise<GameQueryResult> {
  const {
    search,
    energyLevel,
    page = 1,
    pageSize = 12,
  } = options

  const offset = (page - 1) * pageSize

  let query = supabase
    .from('games')
    .select('*', { count: 'exact' })
    .eq('owner_tenant_id', tenantId)
    .order('created_at', { ascending: false })

  // Add search filter
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  // Add energy level filter
  if (energyLevel) {
    query = query.eq('energy_level', energyLevel)
  }

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1)

  const { data: games, count, error } = await query

  if (error) {
    console.error('Error fetching tenant games:', error)
    throw error
  }

  const total = count ?? 0
  const hasMore = offset + pageSize < total

  return {
    games: games ?? [],
    total,
    page,
    pageSize,
    hasMore,
  }
}

/**
 * Get featured/trending games
 */
export async function getFeaturedGames(
  limit: number = 6
): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'published')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching featured games:', error)
    throw error
  }

  return data ?? []
}

/**
 * Get related games (same category, different game)
 */
export async function getRelatedGames(
  gameId: string,
  limit: number = 4
): Promise<Game[]> {
  // First get the current game to find its category
  const { data: currentGame, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()

  if (gameError || !currentGame) {
    console.error('Error fetching current game:', gameError)
    return []
  }

  // Get related games from same category
  if (!currentGame.category) {
    return []
  }

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'published')
    .eq('category', currentGame.category)
    .neq('id', gameId)
    .limit(limit)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching related games:', error)
    return []
  }

  return data ?? []
}
