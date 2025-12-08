/**
 * Plans Queries
 *
 * Database queries for the Planner Domain.
 * Handles CRUD operations for plans and plan-game relationships.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Plan = Database['public']['Tables']['plans']['Row']
type PlanInsert = Database['public']['Tables']['plans']['Insert']
type PlanUpdate = Database['public']['Tables']['plans']['Update']
type PlanGame = Database['public']['Tables']['plan_games']['Row']

/**
 * Get a single plan with all games
 */
export async function getPlanById(
  supabase: SupabaseClient<Database>,
  planId: string
) {
  const { data, error } = await supabase
    .from('plans')
    .select(`
      *,
      owner_user:users!owner_user_id(*),
      owner_tenant:tenants!owner_tenant_id(*),
      plan_games(
        position,
        game:games(
          *,
          product:products(*),
          main_purpose:purposes!main_purpose_id(*),
          media:media(*)
        )
      )
    `)
    .eq('id', planId)
    .single()

  if (error) throw error

  // Sort games by position
  if (data.plan_games) {
    data.plan_games.sort((a, b) => a.position - b.position)
  }

  return data
}

/**
 * Get all plans for a user
 */
export async function getPlansForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  options?: {
    visibility?: 'private' | 'tenant' | 'public'
    limit?: number
    offset?: number
  }
) {
  let query = supabase
    .from('plans')
    .select(`
      *,
      owner_user:users!owner_user_id(*),
      owner_tenant:tenants!owner_tenant_id(*),
      plan_games(
        position,
        game:games(id, name, time_estimate_min)
      )
    `)
    .eq('owner_user_id', userId)

  if (options?.visibility) {
    query = query.eq('visibility', options.visibility)
  }

  if (options?.limit) {
    const start = options.offset || 0
    query = query.range(start, start + options.limit - 1)
  }

  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get plans shared within a tenant
 */
export async function getTenantPlans(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  options?: {
    limit?: number
    offset?: number
  }
) {
  let query = supabase
    .from('plans')
    .select(`
      *,
      owner_user:users!owner_user_id(*),
      plan_games(
        position,
        game:games(id, name, time_estimate_min)
      )
    `)
    .eq('owner_tenant_id', tenantId)
    .in('visibility', ['tenant', 'public'])

  if (options?.limit) {
    const start = options.offset || 0
    query = query.range(start, start + options.limit - 1)
  }

  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get public plans
 */
export async function getPublicPlans(
  supabase: SupabaseClient<Database>,
  options?: {
    limit?: number
    offset?: number
  }
) {
  let query = supabase
    .from('plans')
    .select(`
      *,
      owner_user:users!owner_user_id(*),
      plan_games(
        position,
        game:games(id, name, time_estimate_min)
      )
    `)
    .eq('visibility', 'public')

  if (options?.limit) {
    const start = options.offset || 0
    query = query.range(start, start + options.limit - 1)
  }

  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Create a new plan
 */
export async function createPlan(
  supabase: SupabaseClient<Database>,
  plan: PlanInsert,
  gameIds?: string[]
): Promise<Plan> {
  // Create plan
  const { data: newPlan, error: planError } = await supabase
    .from('plans')
    .insert(plan)
    .select()
    .single()

  if (planError) throw planError

  // Add games if provided
  if (gameIds && gameIds.length > 0) {
    const planGames = gameIds.map((gameId, index) => ({
      plan_id: newPlan.id,
      game_id: gameId,
      position: index,
    }))

    const { error: gamesError } = await supabase
      .from('plan_games')
      .insert(planGames)

    if (gamesError) throw gamesError
  }

  return newPlan
}

/**
 * Update a plan
 */
export async function updatePlan(
  supabase: SupabaseClient<Database>,
  planId: string,
  updates: PlanUpdate
): Promise<Plan> {
  const { data, error } = await supabase
    .from('plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a plan
 */
export async function deletePlan(
  supabase: SupabaseClient<Database>,
  planId: string
): Promise<void> {
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId)

  if (error) throw error
}

/**
 * Add a game to a plan at a specific position
 */
export async function addGameToPlan(
  supabase: SupabaseClient<Database>,
  planId: string,
  gameId: string,
  position: number
): Promise<PlanGame> {
  const { data, error } = await supabase
    .from('plan_games')
    .insert({
      plan_id: planId,
      game_id: gameId,
      position,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove a game from a plan
 */
export async function removeGameFromPlan(
  supabase: SupabaseClient<Database>,
  planId: string,
  gameId: string
): Promise<void> {
  const { error } = await supabase
    .from('plan_games')
    .delete()
    .eq('plan_id', planId)
    .eq('game_id', gameId)

  if (error) throw error
}

/**
 * Reorder games in a plan - replace all plan_games entries
 */
export async function updatePlanGames(
  supabase: SupabaseClient<Database>,
  planId: string,
  gameIds: string[]
): Promise<void> {
  // Remove existing games
  const { error: deleteError } = await supabase
    .from('plan_games')
    .delete()
    .eq('plan_id', planId)

  if (deleteError) throw deleteError

  // Add new games with positions
  if (gameIds.length > 0) {
    const planGames = gameIds.map((gameId, index) => ({
      plan_id: planId,
      game_id: gameId,
      position: index,
    }))

    const { error: insertError } = await supabase
      .from('plan_games')
      .insert(planGames)

    if (insertError) throw insertError
  }

  // Calculate total time
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('time_estimate_min')
    .in('id', gameIds)

  if (gamesError) throw gamesError

  const totalTime = games?.reduce((sum, game) => sum + (game.time_estimate_min || 0), 0) || 0

  // Update plan with total time
  const { error: updateError } = await supabase
    .from('plans')
    .update({ total_time_minutes: totalTime })
    .eq('id', planId)

  if (updateError) throw updateError
}

/**
 * Get games in a plan (sorted by position)
 */
export async function getPlanGames(
  supabase: SupabaseClient<Database>,
  planId: string
) {
  const { data, error } = await supabase
    .from('plan_games')
    .select(`
      position,
      game:games(
        *,
        product:products(*),
        main_purpose:purposes!main_purpose_id(*),
        media:media(*)
      )
    `)
    .eq('plan_id', planId)
    .order('position', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Calculate total time for a plan based on its games
 */
export async function calculatePlanTime(
  supabase: SupabaseClient<Database>,
  planId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('plan_games')
    .select(`
      game:games(time_estimate_min)
    `)
    .eq('plan_id', planId)

  if (error) throw error

  const totalTime = data?.reduce((sum, item) => {
    const game = item.game as Record<string, unknown> | null
    return sum + (typeof game?.time_estimate_min === 'number' ? game.time_estimate_min : 0)
  }, 0) || 0

  return totalTime
}

/**
 * Duplicate a plan (copy all games)
 */
export async function duplicatePlan(
  supabase: SupabaseClient<Database>,
  planId: string,
  newName: string,
  newOwnerUserId?: string
): Promise<Plan> {
  // Get original plan
  const originalPlan = await getPlanById(supabase, planId)

  // Create new plan
  const newPlan = await createPlan(supabase, {
    name: newName,
    description: originalPlan.description,
    owner_user_id: newOwnerUserId || originalPlan.owner_user_id,
    owner_tenant_id: originalPlan.owner_tenant_id,
    visibility: 'private', // New plans are always private
  })

  // Copy games
  const gameIds = originalPlan.plan_games?.map((pg) => pg.game?.id).filter(Boolean) || []
  if (gameIds.length > 0) {
    await updatePlanGames(supabase, newPlan.id, gameIds as string[])
  }

  return newPlan
}

/**
 * Search plans by name
 */
export async function searchPlans(
  supabase: SupabaseClient<Database>,
  searchTerm: string,
  options?: {
    tenantId?: string
    limit?: number
  }
) {
  let query = supabase
    .from('plans')
    .select(`
      *,
      owner_user:users!owner_user_id(*)
    `)
    .ilike('name', `%${searchTerm}%`)

  if (options?.tenantId) {
    query = query.or(
      `owner_tenant_id.eq.${options.tenantId},visibility.eq.public`
    )
  } else {
    query = query.eq('visibility', 'public')
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}
