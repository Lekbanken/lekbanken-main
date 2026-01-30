/**
 * Game Display Mappers
 *
 * Centraliserade mappers som konverterar olika datakällor till GameSummary.
 * UI får ALDRIG konsumera raw data direkt - det måste alltid gå genom en mapper.
 *
 * @see GAMECARD_UNIFIED_IMPLEMENTATION.md för full dokumentation
 */

import type {
  GameSummary,
  GameDetailData,
  EnergyLevel,
  PlayMode,
  Environment,
  GameStep,
  GamePhase,
  GameRole,
  GameArtifact,
  GameTrigger,
  GameMaterial,
  GameMaterialGroup,
  GameArtifactVariant,
  GameBoardWidget,
} from './types';

// =============================================================================
// TYPE DEFINITIONS FÖR DATAKÄLLOR
// =============================================================================

/**
 * Typ för games-tabell från Supabase (med relationer)
 * Denna matchar strukturen från lib/services/games.server.ts
 */
export interface DbGame {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  instructions?: string | null;
  status?: string | null;
  play_mode?: string | null;
  energy_level?: string | null;
  location_type?: string | null;
  difficulty?: string | null;
  category?: string | null;
  time_estimate_min?: number | null;
  time_estimate_max?: number | null;
  min_players?: number | null;
  max_players?: number | null;
  age_min?: number | null;
  age_max?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  // P1 fields
  accessibility_notes?: string | null;
  space_requirements?: string | null;
  leader_tips?: string | null;
  // Relationer
  media?: Array<{
    id?: string;
    kind?: string | null;
    media?: {
      url?: string | null;
      alt_text?: string | null;
    } | null;
  }> | null;
  product?: { name?: string | null } | null;
  main_purpose?: { id?: string | null; name?: string | null } | null;
  translations?: Array<{
    locale?: string | null;
    title?: string | null;
    short_description?: string | null;
    instructions?: unknown;
  }> | null;
  steps?: Array<{
    id?: string | null;
    step_order?: number | null;
    title?: string | null;
    body?: string | null;
    duration_seconds?: number | null;
    display_mode?: string | null;
    leader_script?: string | null;
    participant_prompt?: string | null;
    board_text?: string | null;
    optional?: boolean | null;
    phase_id?: string | null;
    media_ref?: string | null;
  }> | null;
  phases?: Array<{
    id?: string | null;
    name?: string | null;
    phase_type?: string | null;
    phase_order?: number | null;
    duration_seconds?: number | null;
    description?: string | null;
    board_message?: string | null;
    timer_visible?: boolean | null;
    timer_style?: string | null;
    auto_advance?: boolean | null;
  }> | null;
  materials?: Array<{
    id?: string | null;
    items?: string[] | null;
    safety_notes?: string | null;
    preparation?: string | null;
    locale?: string | null;
  }> | null;
  roles?: Array<{
    id?: string | null;
    name?: string | null;
    icon?: string | null;
    color?: string | null;
    role_order?: number | null;
    public_description?: string | null;
    private_instructions?: string | null;
    private_hints?: string | null;
    min_count?: number | null;
    max_count?: number | null;
    assignment_strategy?: string | null;
  }> | null;
  artifacts?: Array<{
    id?: string | null;
    title?: string | null;
    description?: string | null;
    artifact_type?: string | null;
    artifact_order?: number | null;
    tags?: string[] | null;
    variants?: Array<{
      id?: string | null;
      title?: string | null;
      body?: string | null;
      visibility?: string | null;
      visible_to_role_id?: string | null;
      variant_order?: number | null;
      media_ref?: string | null;
    }> | null;
  }> | null;
  triggers?: Array<{
    id?: string | null;
    name?: string | null;
    description?: string | null;
    enabled?: boolean | null;
    condition?: unknown;
    actions?: unknown;
    execute_once?: boolean | null;
    delay_seconds?: number | null;
    sort_order?: number | null;
  }> | null;
  // P1: Board config
  board_config?: {
    id?: string | null;
    show_timer?: boolean | null;
    show_phase_name?: boolean | null;
    show_step_text?: boolean | null;
    show_roles?: boolean | null;
    theme?: string | null;
    layout?: string | null;
  } | null;
  // P1: Facilitator tools
  tools?: Array<{
    id?: string | null;
    tool_type?: string | null;
    name?: string | null;
    config?: unknown;
    sort_order?: number | null;
  }> | null;
}

/**
 * Typ för sökresultat från /api/games/search
 * Används av GamePicker i Planner
 * 
 * Note: API returnerar `name` och `description` direkt på objektet,
 * inte via `translations` array. Vi stödjer båda formaten för bakåtkompatibilitet.
 */
export interface GameSearchResult {
  id: string;
  slug?: string | null;
  // Direct fields from API (primary)
  name?: string | null;
  description?: string | null;
  time_estimate_min?: number | null;
  time_estimate_max?: number | null;
  energy_level?: string | null;
  play_mode?: string | null;
  // Media via game_media relation
  media?: Array<{
    kind?: string | null;
    media?: { url?: string | null } | null;
  }> | null;
  // Legacy: image_url for backwards compatibility
  image_url?: string | null;
  // Legacy: translations array (not used by current API, kept for compatibility)
  translations?: Array<{
    title?: string | null;
    short_description?: string | null;
  }> | null;
}

/**
 * Typ för game-data i PlannerBlock
 * Används av BlockRow i Planner
 */
export interface PlannerBlockGame {
  id: string;
  title: string;
  shortDescription?: string | null;
  coverUrl?: string | null;
  energyLevel?: string | null;
  locationType?: string | null;
  durationMinutes?: number | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Konverterar location_type till Environment enum
 */
function mapLocationType(type?: string | null): Environment | null {
  if (!type) return null;
  if (type === 'indoor') return 'indoor';
  if (type === 'outdoor') return 'outdoor';
  if (type === 'mixed' || type === 'both') return 'both';
  return null;
}

/**
 * Validerar och konverterar energy_level till EnergyLevel enum
 */
function mapEnergyLevel(level?: string | null): EnergyLevel | null {
  if (!level) return null;
  if (level === 'low' || level === 'medium' || level === 'high') {
    return level;
  }
  return null;
}

/**
 * Validerar och konverterar play_mode till PlayMode enum
 */
function mapPlayMode(mode?: string | null): PlayMode | null {
  if (!mode) return null;
  if (mode === 'basic' || mode === 'facilitated' || mode === 'participants') {
    return mode;
  }
  return null;
}

/**
 * Hittar cover-bild från media-array
 */
function findCoverUrl(
  media?: DbGame['media']
): string | null {
  if (!media || media.length === 0) return null;
  const cover = media.find((m) => m.kind === 'cover') ?? media[0];
  return cover?.media?.url ?? null;
}

/**
 * Hittar gallery-bilder från media-array (exkluderar cover)
 */
function findGalleryUrls(media?: DbGame['media']): string[] {
  if (!media || media.length === 0) return [];
  const cover = media.find((m) => m.kind === 'cover') ?? media[0];
  return media
    .filter((m) => m !== cover && m.media?.url)
    .map((m) => m.media!.url!)
    .filter(Boolean);
}

/**
 * Väljer bästa översättning baserat på locale-prioritet
 */
function pickTranslation(
  translations?: DbGame['translations'],
  localeOrder: string[] = ['sv', 'no', 'en']
): NonNullable<DbGame['translations']>[0] | null {
  if (!translations || translations.length === 0) return null;
  for (const locale of localeOrder) {
    const hit = translations.find((t) => t.locale === locale);
    if (hit) return hit;
  }
  return translations[0] ?? null;
}

// =============================================================================
// MAPPERS
// =============================================================================

/**
 * Mapper: Supabase games table → GameSummary
 *
 * Används av:
 * - Browse page
 * - GameDetails related games
 * - Anywhere DbGame is loaded
 *
 * @param dbGame - Game row from Supabase with relations
 * @param options - Optional locale priority
 */
export function mapDbGameToSummary(
  dbGame: DbGame,
  options?: { localeOrder?: string[] }
): GameSummary {
  const translation = pickTranslation(dbGame.translations, options?.localeOrder);

  return {
    id: dbGame.id,
    slug: dbGame.slug ?? undefined,
    title: translation?.title ?? dbGame.name,
    shortDescription:
      translation?.short_description ?? dbGame.description ?? undefined,
    coverUrl: findCoverUrl(dbGame.media),
    durationMin: dbGame.time_estimate_min,
    durationMax: dbGame.time_estimate_max,
    minPlayers: dbGame.min_players,
    maxPlayers: dbGame.max_players,
    ageMin: dbGame.age_min,
    ageMax: dbGame.age_max,
    energyLevel: mapEnergyLevel(dbGame.energy_level),
    environment: mapLocationType(dbGame.location_type),
    playMode: mapPlayMode(dbGame.play_mode),
    purpose: dbGame.main_purpose?.name ?? null,
    product: dbGame.product?.name ?? null,
    status:
      dbGame.status === 'published'
        ? 'published'
        : dbGame.status === 'archived'
          ? 'archived'
          : 'draft',
  };
}

/**
 * Mapper: Supabase games table → GameDetailData
 *
 * Används av:
 * - GameDetails page
 *
 * @param dbGame - Game row from Supabase with full relations
 * @param options - Optional locale priority
 */
export function mapDbGameToDetail(
  dbGame: DbGame,
  options?: { localeOrder?: string[] }
): GameDetailData {
  const summary = mapDbGameToSummary(dbGame, options);
  const translation = pickTranslation(dbGame.translations, options?.localeOrder);

  // Map steps from DB format to GameStep format
  const steps: GameStep[] | undefined = dbGame.steps
    ?.sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))
    .map((s) => ({
      title: s.title ?? '',
      body: s.body ?? undefined,
      durationMinutes: s.duration_seconds
        ? Math.round(Number(s.duration_seconds) / 60)
        : undefined,
      displayMode:
        s.display_mode === 'instant' ||
        s.display_mode === 'typewriter' ||
        s.display_mode === 'dramatic'
          ? s.display_mode
          : undefined,
    }));

  return {
    ...summary,
    description: dbGame.description ?? translation?.short_description ?? undefined,
    gallery: findGalleryUrls(dbGame.media),
    steps: steps?.length ? steps : undefined,
    meta: {
      gameKey: dbGame.slug ?? dbGame.id,
      updatedAt: dbGame.updated_at ?? undefined,
      createdAt: dbGame.created_at ?? undefined,
    },
  };
}

/**
 * Mapper: Search result → GameSummary
 *
 * Används av:
 * - GamePicker (Planner)
 *
 * @param result - Search result from /api/games/search
 * 
 * Note: Handles both direct fields (name, description) from current API
 * and legacy translations array format.
 */
export function mapSearchResultToSummary(result: GameSearchResult): GameSummary {
  // Support both direct fields (API) and translations array (legacy)
  const translation = result.translations?.[0];
  const title = result.name ?? translation?.title ?? 'Okänd lek';
  const shortDescription = result.description ?? translation?.short_description ?? undefined;
  
  // Get cover image: prefer media relation, fallback to image_url
  const cover = result.media?.find(m => m.kind === 'cover') ?? result.media?.[0];
  const coverUrl = cover?.media?.url ?? result.image_url ?? null;

  return {
    id: result.id,
    slug: result.slug ?? undefined,
    title,
    shortDescription,
    coverUrl,
    durationMin: result.time_estimate_min,
    durationMax: result.time_estimate_max,
    energyLevel: mapEnergyLevel(result.energy_level),
    playMode: mapPlayMode(result.play_mode),
  };
}

/**
 * Mapper: PlannerBlock.game → GameSummary
 *
 * Används av:
 * - BlockRow (Planner)
 *
 * @param blockGame - Game data embedded in PlannerBlock
 */
export function mapPlannerBlockToSummary(
  blockGame: PlannerBlockGame
): GameSummary {
  return {
    id: blockGame.id,
    title: blockGame.title,
    shortDescription: blockGame.shortDescription ?? undefined,
    coverUrl: blockGame.coverUrl ?? null,
    durationMin: blockGame.durationMinutes,
    energyLevel: mapEnergyLevel(blockGame.energyLevel),
    environment: mapLocationType(blockGame.locationType),
  };
}

/**
 * Mapper: Minimal data → GameSummary
 *
 * Används när du bara har id och title, t.ex. för skeletons eller placeholders.
 *
 * @param id - Game ID
 * @param title - Game title
 */
export function createMinimalSummary(id: string, title: string): GameSummary {
  return {
    id,
    title,
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validerar att en GameSummary har minsta nödvändiga data
 * Loggar varning i dev om data saknas
 */
export function validateGameSummary(game: unknown, source?: string): boolean {
  if (typeof game !== 'object' || game === null) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[GameDisplay] Invalid GameSummary from ${source ?? 'unknown'}: not an object`,
        game
      );
    }
    return false;
  }

  const g = game as Record<string, unknown>;

  if (typeof g.id !== 'string' || !g.id) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[GameDisplay] Invalid GameSummary from ${source ?? 'unknown'}: missing id`,
        game
      );
    }
    return false;
  }

  if (typeof g.title !== 'string' || !g.title) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[GameDisplay] Invalid GameSummary from ${source ?? 'unknown'}: missing title`,
        game
      );
    }
    return false;
  }

  return true;
}

// =============================================================================
// HELPER MAPPERS (for preview/full)
// =============================================================================

/**
 * Map DB steps to GameStep[]
 * Sorts by step_order and converts duration_seconds to durationMinutes
 */
export function mapSteps(steps?: DbGame['steps']): GameStep[] {
  if (!steps || steps.length === 0) return [];
  
  return steps
    .sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))
    .map((s) => ({
      id: s.id ?? undefined,
      title: s.title ?? '',
      body: s.body ?? undefined,
      durationMinutes: s.duration_seconds
        ? Math.round(Number(s.duration_seconds) / 60)
        : undefined,
      durationSeconds: s.duration_seconds ?? undefined,
      displayMode:
        s.display_mode === 'instant' ||
        s.display_mode === 'typewriter' ||
        s.display_mode === 'dramatic'
          ? s.display_mode
          : undefined,
      leaderScript: s.leader_script ?? undefined,
      participantPrompt: s.participant_prompt ?? undefined,
      boardText: s.board_text ?? undefined,
      optional: s.optional ?? undefined,
      phaseId: s.phase_id ?? undefined,
      mediaRef: s.media_ref ?? undefined,
    }));
}

/**
 * Map DB phases to GamePhase[]
 * Sorts by phase_order
 */
export function mapPhases(phases?: DbGame['phases']): GamePhase[] {
  if (!phases || phases.length === 0) return [];
  
  return phases
    .sort((a, b) => (a.phase_order ?? 0) - (b.phase_order ?? 0))
    .map((p) => ({
      id: p.id ?? undefined,
      title: p.name ?? '',
      name: p.name ?? undefined,
      phaseType:
        p.phase_type === 'intro' ||
        p.phase_type === 'round' ||
        p.phase_type === 'finale' ||
        p.phase_type === 'break'
          ? p.phase_type
          : undefined,
      duration: p.duration_seconds
        ? `${Math.round(Number(p.duration_seconds) / 60)} min`
        : '',
      durationSeconds: p.duration_seconds ?? undefined,
      goal: p.description ?? '',
      description: p.description ?? undefined,
      boardMessage: p.board_message ?? undefined,
      timerVisible: p.timer_visible ?? undefined,
      timerStyle:
        p.timer_style === 'countdown' ||
        p.timer_style === 'elapsed' ||
        p.timer_style === 'trafficlight'
          ? p.timer_style
          : undefined,
      autoAdvance: p.auto_advance ?? undefined,
    }));
}

/**
 * Map DB materials to GameMaterialGroup
 * Extracts items, safety_notes, and preparation into structured format
 */
export function mapMaterials(materials?: DbGame['materials']): GameMaterialGroup {
  if (!materials || materials.length === 0) {
    return { items: [] };
  }

  const allItems: GameMaterial[] = [];
  const safetyNotes: string[] = [];
  const preparationNotes: string[] = [];

  for (const m of materials) {
    // Map items array to GameMaterial[]
    if (m.items && m.items.length > 0) {
      for (const item of m.items) {
        allItems.push({ label: item });
      }
    }

    // Collect safety notes
    if (m.safety_notes) {
      safetyNotes.push(m.safety_notes);
    }

    // Collect preparation notes
    if (m.preparation) {
      preparationNotes.push(m.preparation);
    }
  }

  return {
    items: allItems,
    safetyNotes: safetyNotes.length > 0 ? safetyNotes : undefined,
    preparationNotes: preparationNotes.length > 0 ? preparationNotes : undefined,
  };
}

/**
 * Map DB roles to GameRole[]
 * Sorts by role_order
 */
export function mapRoles(roles?: DbGame['roles']): GameRole[] {
  if (!roles || roles.length === 0) return [];
  
  return roles
    .sort((a, b) => (a.role_order ?? 0) - (b.role_order ?? 0))
    .map((r) => ({
      id: r.id ?? undefined,
      name: r.name ?? '',
      icon: r.icon ?? undefined,
      color: r.color ?? undefined,
      minCount: r.min_count ?? undefined,
      maxCount: r.max_count ?? undefined,
      publicNote: r.public_description ?? undefined,
      privateNote: r.private_instructions ?? undefined,
      secrets: r.private_hints ? [r.private_hints] : undefined,
      assignmentStrategy:
        r.assignment_strategy === 'random' ||
        r.assignment_strategy === 'leader_picks' ||
        r.assignment_strategy === 'player_picks'
          ? r.assignment_strategy
          : undefined,
    }));
}

/**
 * Map DB artifacts to GameArtifact[]
 * Sorts by artifact_order, includes variants
 */
export function mapArtifacts(artifacts?: DbGame['artifacts']): GameArtifact[] {
  if (!artifacts || artifacts.length === 0) return [];
  
  return artifacts
    .sort((a, b) => (a.artifact_order ?? 0) - (b.artifact_order ?? 0))
    .map((a) => ({
      id: a.id ?? undefined,
      title: a.title ?? '',
      description: a.description ?? undefined,
      type: a.artifact_type ?? undefined,
      tags: a.tags ?? undefined,
      variants: a.variants
        ?.sort((v1, v2) => (v1.variant_order ?? 0) - (v2.variant_order ?? 0))
        .map((v): GameArtifactVariant => ({
          title: v.title ?? undefined,
          body: v.body ?? undefined,
          visibility:
            v.visibility === 'public' ||
            v.visibility === 'leader_only' ||
            v.visibility === 'role_private'
              ? v.visibility
              : undefined,
          visibleToRoleId: v.visible_to_role_id ?? undefined,
          mediaRef: v.media_ref ?? undefined,
        })),
    }));
}

/**
 * Map DB triggers to GameTrigger[]
 * Sorts by sort_order
 */
export function mapTriggers(triggers?: DbGame['triggers']): GameTrigger[] {
  if (!triggers || triggers.length === 0) return [];
  
  return triggers
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((t) => ({
      id: t.id ?? undefined,
      name: t.name ?? undefined,
      title: t.name ?? '',
      description: t.description ?? undefined,
      condition: t.condition as string | object,
      effect: t.description ?? '',
      actions: t.actions as object[] | undefined,
      enabled: t.enabled ?? undefined,
      executeOnce: t.execute_once ?? undefined,
      delaySeconds: t.delay_seconds ?? undefined,
    }));
}

/**
 * Map DB board_config to GameBoardWidget[] (summary)
 * Creates widget descriptions based on enabled features
 */
export function mapBoardConfigToWidgets(
  config: NonNullable<DbGame['board_config']>
): GameBoardWidget[] {
  const widgets: GameBoardWidget[] = [];
  
  if (config.show_timer) {
    widgets.push({ title: 'Timer', detail: 'Visar nedräkning för varje fas' });
  }
  if (config.show_phase_name) {
    widgets.push({ title: 'Fasnamn', detail: 'Visar aktuell fas på tavlan' });
  }
  if (config.show_step_text) {
    widgets.push({ title: 'Stegtext', detail: 'Visar instruktioner för deltagare' });
  }
  if (config.show_roles) {
    widgets.push({ title: 'Roller', detail: 'Visar aktiva roller på tavlan' });
  }
  if (config.theme) {
    widgets.push({ title: 'Tema', detail: config.theme });
  }
  
  return widgets;
}

// =============================================================================
// PREVIEW/FULL MAPPERS
// =============================================================================

/**
 * Mapper: Supabase games table → GameDetailData (Preview)
 *
 * Used for initial page load - includes basic display data
 * but excludes heavy relations like roles, artifacts, triggers.
 *
 * @param dbGame - Game row from Supabase with preview relations
 * @param options - Optional locale priority
 */
export function mapDbGameToDetailPreview(
  dbGame: DbGame,
  options?: { localeOrder?: string[] }
): GameDetailData {
  const summary = mapDbGameToSummary(dbGame, options);
  const translation = pickTranslation(dbGame.translations, options?.localeOrder);
  const materialGroup = mapMaterials(dbGame.materials);

  const steps = mapSteps(dbGame.steps);
  const phases = mapPhases(dbGame.phases);

  return {
    ...summary,
    // subtitle shows main purpose (human-readable game category)
    subtitle: dbGame.main_purpose?.name ?? undefined,
    description: dbGame.description ?? translation?.short_description ?? undefined,
    gallery: findGalleryUrls(dbGame.media),
    steps: steps.length > 0 ? steps : undefined,
    phases: phases.length > 0 ? phases : undefined,
    materials: materialGroup.items.length > 0 ? materialGroup.items : undefined,
    safety: materialGroup.safetyNotes,
    preparation: materialGroup.preparationNotes,
    // P1 fields
    accessibility: dbGame.accessibility_notes 
      ? dbGame.accessibility_notes.split('\n').filter(Boolean) 
      : undefined,
    requirements: dbGame.space_requirements
      ? dbGame.space_requirements.split('\n').filter(Boolean)
      : undefined,
    // Board config (summary only - full details lazy-loaded)
    boardWidgets: dbGame.board_config ? mapBoardConfigToWidgets(dbGame.board_config) : undefined,
    // Facilitator tools
    facilitatorTools: dbGame.tools?.map(t => t.name ?? t.tool_type ?? 'Tool').filter(Boolean),
    meta: {
      gameKey: dbGame.slug ?? dbGame.id,
      updatedAt: dbGame.updated_at ?? undefined,
      createdAt: dbGame.created_at ?? undefined,
    },
  };
}

/**
 * Mapper: Supabase games table → GameDetailData (Full)
 *
 * Used for run mode - includes all relations including
 * roles, artifacts (with variants), and triggers.
 *
 * @param dbGame - Game row from Supabase with full relations
 * @param options - Optional locale priority
 */
export function mapDbGameToDetailFull(
  dbGame: DbGame,
  options?: { localeOrder?: string[] }
): GameDetailData {
  // Start with preview data
  const preview = mapDbGameToDetailPreview(dbGame, options);

  // Add full relations
  const roles = mapRoles(dbGame.roles);
  const artifacts = mapArtifacts(dbGame.artifacts);
  const triggers = mapTriggers(dbGame.triggers);

  return {
    ...preview,
    roles: roles.length > 0 ? roles : undefined,
    artifacts: artifacts.length > 0 ? artifacts : undefined,
    triggers: triggers.length > 0 ? triggers : undefined,
  };
}
