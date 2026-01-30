import 'server-only'

import { createServerRlsClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/supabase'

export type GameRow = Tables<'games'>
type ProductRow = Tables<'products'>
type PurposeRow = Tables<'purposes'>

type GameTranslation = {
  game_id: string
  locale: string
  title: string
  short_description: string
  instructions: unknown
  materials: string[] | null
}

type GameMedia = {
  id: string
  game_id: string
  media_id: string
  tenant_id: string | null
  kind: 'cover' | 'gallery'
  position: number
  alt_text: string | null
  created_at: string
  media?: Tables<'media'> | null
}

export type GameWithRelations = GameRow & {
  translations?: GameTranslation[]
  media?: GameMedia[]
  product?: ProductRow | null
  main_purpose?: PurposeRow | null
  steps?: Array<{
    id: string
    title: string | null
    body: string | null
    duration_seconds: number | null
    step_order: number
  }>
  materials?: Array<{
    items: string[] | null
    safety_notes: string | null
    preparation: string | null
    locale: string | null
  }>
}

/**
 * Get game with basic relations
 *
 * @deprecated Use getGameByIdPreview or getGameByIdFull instead.
 * This function will be removed in Sprint 2.
 *
 * @param gameId - The UUID of the game
 */
export async function getGameById(gameId: string): Promise<GameWithRelations | null> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('games')
    .select(
      `
        *,
        product:products(*),
        main_purpose:purposes!main_purpose_id(*),
        translations:game_translations(*),
        media:game_media(*, media:media(*)),
        steps:game_steps(*),
        materials:game_materials(*)
      `
    )
    .eq('id', gameId)
    .single()

  if (error) {
    console.error('[games.server] getGameById error', error)
    return null
  }

  return data as unknown as GameWithRelations
}

export async function getRelatedGames(
  game: GameRow,
  limit: number = 4
): Promise<GameRow[]> {
  try {
    const supabase = await createServerRlsClient()

    // Find games with the same purpose or product, excluding the current game
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .neq('id', game.id)
      .eq('status', 'published')
      .or(
        `main_purpose_id.eq.${game.main_purpose_id ?? '00000000-0000-0000-0000-000000000000'},product_id.eq.${game.product_id ?? '00000000-0000-0000-0000-000000000000'}`
      )
      .limit(limit)

    if (error) {
      console.warn('[games.server] getRelatedGames query error', error)
      return []
    }

    return data as GameRow[]
  } catch (error) {
    console.error('[games.server] getRelatedGames error', error)
    return []
  }
}

// =============================================================================
// PREVIEW/FULL GAME DATA QUERIES (Phase 0 - GameDetails plan)
// =============================================================================

/**
 * DB types for extended game relations (preview + full)
 */
type GameStep = {
  id: string
  game_id: string
  locale: string | null
  phase_id: string | null
  step_order: number
  title: string | null
  body: string | null
  duration_seconds: number | null
  leader_script: string | null
  participant_prompt: string | null
  board_text: string | null
  media_ref: string | null
  optional: boolean | null
  conditional: string | null
  display_mode: string | null
}

type GamePhase = {
  id: string
  game_id: string
  locale: string | null
  name: string
  phase_type: string | null
  phase_order: number
  duration_seconds: number | null
  timer_visible: boolean | null
  timer_style: string | null
  description: string | null
  board_message: string | null
  auto_advance: boolean | null
}

type GameMaterialRow = {
  id: string
  game_id: string
  locale: string | null
  items: string[] | null
  safety_notes: string | null
  preparation: string | null
}

type GameRole = {
  id: string
  game_id: string
  locale: string | null
  name: string
  icon: string | null
  color: string | null
  role_order: number
  public_description: string | null
  private_instructions: string
  private_hints: string | null
  min_count: number | null
  max_count: number | null
  assignment_strategy: string | null
  scaling_rules: unknown | null
  conflicts_with: string[] | null
}

type GameArtifact = {
  id: string
  game_id: string
  locale: string | null
  title: string
  description: string | null
  artifact_type: string | null
  artifact_order: number
  tags: string[] | null
  metadata: unknown | null
  variants?: GameArtifactVariant[]
}

type GameArtifactVariant = {
  id: string
  artifact_id: string
  visibility: string | null
  visible_to_role_id: string | null
  title: string | null
  body: string | null
  media_ref: string | null
  variant_order: number
  metadata: unknown | null
}

type GameTrigger = {
  id: string
  game_id: string
  name: string
  description: string | null
  enabled: boolean | null
  condition: unknown
  actions: unknown
  execute_once: boolean | null
  delay_seconds: number | null
  sort_order: number
}

/**
 * Preview game data - lightweight for initial page load
 * Includes: translations, media, steps, materials, phases, product, main_purpose
 */
export type GamePreviewData = GameRow & {
  translations?: GameTranslation[]
  media?: GameMedia[]
  product?: ProductRow | null
  main_purpose?: PurposeRow | null
  steps?: GameStep[]
  materials?: GameMaterialRow[]
  phases?: GamePhase[]
}

/**
 * Full game data - complete for facilitator/participants mode
 * Includes everything from preview + roles, artifacts (with variants), triggers
 */
export type GameFullData = GamePreviewData & {
  roles?: GameRole[]
  artifacts?: GameArtifact[]
  triggers?: GameTrigger[]
}

/**
 * Get preview game data - optimized for initial page load
 *
 * Includes: translations, media, steps, materials, phases, product, main_purpose
 * Excludes: roles, artifacts, triggers (loaded lazily)
 *
 * @param gameId - The UUID of the game
 */
export async function getGameByIdPreview(gameId: string): Promise<GamePreviewData | null> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('games')
    .select(
      `
        *,
        product:products(*),
        main_purpose:purposes!main_purpose_id(*),
        translations:game_translations(*),
        media:game_media(*, media:media(*)),
        steps:game_steps(*),
        materials:game_materials(*),
        phases:game_phases(*),
        board_config:game_board_config(*),
        tools:game_tools(*)
      `
    )
    .eq('id', gameId)
    .single()

  if (error) {
    console.error('[games.server] getGameByIdPreview error', error)
    return null
  }

  // Sort steps and phases by order
  const result = data as unknown as GamePreviewData
  if (result.steps) {
    result.steps = result.steps.sort((a, b) => a.step_order - b.step_order)
  }
  if (result.phases) {
    result.phases = result.phases.sort((a, b) => a.phase_order - b.phase_order)
  }

  return result
}

/**
 * Get full game data - complete for run mode
 *
 * Includes everything from preview + roles, artifacts (with variants), triggers
 *
 * @param gameId - The UUID of the game
 */
export async function getGameByIdFull(gameId: string): Promise<GameFullData | null> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('games')
    .select(
      `
        *,
        product:products(*),
        main_purpose:purposes!main_purpose_id(*),
        translations:game_translations(*),
        media:game_media(*, media:media(*)),
        steps:game_steps(*),
        materials:game_materials(*),
        phases:game_phases(*),
        roles:game_roles(*),
        artifacts:game_artifacts(*, variants:game_artifact_variants(*)),
        triggers:game_triggers(*)
      `
    )
    .eq('id', gameId)
    .single()

  if (error) {
    console.error('[games.server] getGameByIdFull error', error)
    return null
  }

  // Sort all ordered collections
  const result = data as unknown as GameFullData
  if (result.steps) {
    result.steps = result.steps.sort((a, b) => a.step_order - b.step_order)
  }
  if (result.phases) {
    result.phases = result.phases.sort((a, b) => a.phase_order - b.phase_order)
  }
  if (result.roles) {
    result.roles = result.roles.sort((a, b) => a.role_order - b.role_order)
  }
  if (result.artifacts) {
    result.artifacts = result.artifacts.sort((a, b) => a.artifact_order - b.artifact_order)
    // Also sort variants within each artifact
    result.artifacts.forEach(artifact => {
      if (artifact.variants) {
        artifact.variants = artifact.variants.sort((a, b) => a.variant_order - b.variant_order)
      }
    })
  }
  if (result.triggers) {
    result.triggers = result.triggers.sort((a, b) => a.sort_order - b.sort_order)
  }

  return result
}

// =============================================================================
// LAZY LOAD QUERIES (for roles, artifacts, triggers)
// =============================================================================

/**
 * Get roles for a game (lazy load)
 */
export async function getGameRoles(gameId: string): Promise<GameRole[]> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('game_roles')
    .select('*')
    .eq('game_id', gameId)
    .order('role_order', { ascending: true })

  if (error) {
    console.error('[games.server] getGameRoles error', error)
    return []
  }

  return data as GameRole[]
}

/**
 * Get artifacts with variants for a game (lazy load)
 */
export async function getGameArtifacts(gameId: string): Promise<GameArtifact[]> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('game_artifacts')
    .select('*, variants:game_artifact_variants(*)')
    .eq('game_id', gameId)
    .order('artifact_order', { ascending: true })

  if (error) {
    console.error('[games.server] getGameArtifacts error', error)
    return []
  }

  // Sort variants within each artifact
  const artifacts = data as GameArtifact[]
  artifacts.forEach(artifact => {
    if (artifact.variants) {
      artifact.variants = artifact.variants.sort((a, b) => a.variant_order - b.variant_order)
    }
  })

  return artifacts
}

/**
 * Get triggers for a game (lazy load)
 */
export async function getGameTriggers(gameId: string): Promise<GameTrigger[]> {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('game_triggers')
    .select('*')
    .eq('game_id', gameId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[games.server] getGameTriggers error', error)
    return []
  }

  return data as GameTrigger[]
}
