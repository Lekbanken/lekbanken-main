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
    step_order?: number | null;
    title?: string | null;
    body?: string | null;
    duration_seconds?: number | null;
    display_mode?: string | null;
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
