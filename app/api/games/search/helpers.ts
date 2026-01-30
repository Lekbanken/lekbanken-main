import { z } from 'zod'

export const energyLevels = ['low', 'medium', 'high'] as const
export const locationTypes = ['indoor', 'outdoor', 'both'] as const
export const playModes = ['basic', 'facilitated', 'participants'] as const
export const supportedLocales = ['sv', 'en', 'no'] as const
export type SupportedLocale = typeof supportedLocales[number]
export const defaultLocale: SupportedLocale = 'sv'

// =============================================================================
// GAME SUMMARY SELECT - Lean payload for Browse/Planner
// =============================================================================
// This replaces `select('*')` with explicit fields needed by GameCard.
// Reduces payload from ~15-50 KB to ~1-2 KB per game.
//
// Fields mapped by mapDbGameToSummary():
// - id, game_key (→ slug), name, description (→ title, shortDescription)
// - time_estimate_min, duration_max (→ durationMin, durationMax)
// - min_players, max_players, age_min, age_max
// - energy_level, location_type, play_mode, status
// - media[kind=cover].url (→ coverUrl)
// - product.name, main_purpose.name (→ product, purpose labels)
// - translations (locale-specific title/short_description)
// =============================================================================
export const GAME_SUMMARY_SELECT = `
  id,
  game_key,
  name,
  description,
  short_description,
  time_estimate_min,
  duration_max,
  min_players,
  max_players,
  age_min,
  age_max,
  energy_level,
  location_type,
  play_mode,
  difficulty,
  status,
  popularity_score,
  rating_average,
  rating_count,
  created_at,
  is_demo_content,
  product_id,
  main_purpose_id,
  media:game_media!left(
    kind,
    media:media!left(url)
  ),
  product:products!product_id(id, name, product_key),
  main_purpose:purposes!main_purpose_id(id, name),
  translations:game_translations!left(
    locale,
    title,
    short_description
  )
` as const

export const searchSchema = z.object({
  search: z.string().trim().max(200).optional(),
  tenantId: z.string().uuid().optional().nullable(),
  products: z.array(z.string().uuid()).optional(),
  mainPurposes: z.array(z.string().uuid()).optional(),
  subPurposes: z.array(z.string().uuid()).optional(),
  groupSizes: z.array(z.enum(['small', 'medium', 'large'] as const)).optional(),
  energyLevels: z.array(z.enum(energyLevels)).optional(),
  environment: z.enum(locationTypes).optional(),
  minPlayers: z.number().int().positive().optional(),
  maxPlayers: z.number().int().positive().optional(),
  minTime: z.number().int().positive().optional(),
  maxTime: z.number().int().positive().optional(),
  minAge: z.number().int().positive().optional(),
  maxAge: z.number().int().positive().optional(),
  showLiked: z.boolean().optional(),
  // Super filters (PR2)
  playMode: z.enum(playModes).optional(),
  categories: z.array(z.string()).optional(),
  sort: z.enum(['relevance', 'newest', 'popular', 'name', 'duration', 'rating']).optional(),
  page: z.number().int().min(1).default(1),
  // GUARDRAIL: Max 48 per page to prevent "fetch all" scenarios
  pageSize: z.number().int().min(1).max(48).default(24),
  status: z.enum(['published', 'draft', 'all']).optional(),
  // Locale for translated content (defaults to 'sv')
  locale: z.enum(supportedLocales).optional(),
})

export type SearchInput = z.infer<typeof searchSchema>

export function normalizeEnvironment(env?: SearchInput['environment']) {
  if (env === undefined) return undefined
  if (env === 'both') return null
  return env
}

export function buildGroupSizeOr(groupSizes: string[]) {
  if (!groupSizes.length) return null
  const clauses: string[] = []

  if (groupSizes.includes('small')) {
    clauses.push('and(min_players.lte.6)')
  }

  if (groupSizes.includes('medium')) {
    clauses.push('and(min_players.gte.6,max_players.lte.14)')
  }

  if (groupSizes.includes('large')) {
    clauses.push('and(min_players.gte.15)')
  }

  return clauses.length ? clauses.join(',') : null
}

export function computeHasMore(total: number, page: number, pageSize: number) {
  return page * pageSize < total
}

// =============================================================================
// STABLE SORT - Consistent ordering for pagination
// =============================================================================
// Uses (popularity_score, created_at, id) for stable keyset.
// All sort modes end with this tiebreaker to ensure deterministic results.
// =============================================================================
export type SortMode = 'relevance' | 'newest' | 'popular' | 'name' | 'duration' | 'rating'

export function applySortOrder<T extends { order: (col: string, opts: { ascending: boolean; nullsFirst?: boolean }) => T }>(
  query: T,
  sort: SortMode = 'relevance'
): T {
  switch (sort) {
    case 'name':
      return query
        .order('name', { ascending: true })
        .order('popularity_score', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    case 'duration':
      return query
        .order('time_estimate_min', { ascending: true, nullsFirst: true })
        .order('popularity_score', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    case 'popular':
      return query
        .order('popularity_score', { ascending: false })
        .order('rating_count', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    case 'rating':
      return query
        .order('rating_average', { ascending: false })
        .order('rating_count', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    case 'newest':
      return query
        .order('created_at', { ascending: false })
        .order('popularity_score', { ascending: false })
        .order('id', { ascending: false })
    case 'relevance':
    default:
      // Default: popularity → recency → id (matches index)
      return query
        .order('popularity_score', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
  }
}

// =============================================================================
// TRANSLATION HELPERS
// =============================================================================

/**
 * Translation row from game_translations join
 */
export interface GameTranslationRow {
  locale: string | null;
  title: string | null;
  short_description: string | null;
}

/**
 * Pick best translation for locale with fallback chain.
 * Priority: exact locale → 'sv' (default) → first available → null
 */
export function pickTranslationForLocale(
  translations: GameTranslationRow[] | null | undefined,
  locale: SupportedLocale = defaultLocale
): GameTranslationRow | null {
  if (!translations || translations.length === 0) return null;
  
  // Try exact locale match
  const exact = translations.find(t => t.locale === locale);
  if (exact) return exact;
  
  // Fallback to Swedish (default locale)
  if (locale !== 'sv') {
    const sv = translations.find(t => t.locale === 'sv');
    if (sv) return sv;
  }
  
  // Return first available translation
  return translations[0] ?? null;
}

/**
 * Apply translated fields to game data with fallback to base fields.
 * This ensures UI always shows something, even if no translation exists.
 */
export function applyTranslation<T extends { 
  name?: string | null; 
  description?: string | null;
  short_description?: string | null;
  translations?: GameTranslationRow[] | null;
}>(
  game: T,
  locale: SupportedLocale = defaultLocale
): T & { _translatedTitle?: string; _translatedShortDescription?: string } {
  const translation = pickTranslationForLocale(game.translations, locale);
  
  return {
    ...game,
    // Add computed translated fields (mapper will use these)
    _translatedTitle: translation?.title ?? game.name ?? undefined,
    _translatedShortDescription: translation?.short_description ?? game.short_description ?? game.description ?? undefined,
  };
}
