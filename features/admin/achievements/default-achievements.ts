/**
 * Default Achievements — Lekbanken's starter set
 *
 * These are real, production-ready achievements designed for Lekbanken.
 * They use the existing badge builder assets (base shapes, symbols, decorations)
 * and theme colors from the builder palette.
 *
 * Usage:
 *   - Import and use as initial data when setting up a new tenant
 *   - Use as reference/starting point in admin UI
 *   - Can be modified or extended per organization
 *
 * Each achievement has:
 *   - Meaningful title & description in Norwegian
 *   - Proper icon config using real assets
 *   - Suggested reward coins
 *   - Category and tags for filtering
 */

import type { AchievementItem } from './types'

// ---------------------------------------------------------------------------
// Color palettes (from badge builder themes)
// ---------------------------------------------------------------------------
const COLORS = {
  gold: '#f5a623',
  ember: '#f97316',
  ocean: '#0ea5e9',
  forest: '#16a34a',
  sunset: '#ec4899',
  onyx: '#111827',
  frost: '#38bdf8',
  purple: '#8b5cf6',
  red: '#ef4444',
  teal: '#14b8a6',
}

// ---------------------------------------------------------------------------
// Default achievements
// ---------------------------------------------------------------------------

export const DEFAULT_ACHIEVEMENTS: AchievementItem[] = [
  // =================== ONBOARDING / GETTING STARTED ===================
  {
    id: 'default-first-step',
    title: 'Første steget',
    subtitle: 'Velkommen til Lekbanken',
    description: 'Gjennfør din første aktivitet. Alle reiser begynner med et enkelt steg.',
    rewardCoins: 25,
    status: 'published',
    category: 'achievement',
    tags: ['onboarding', 'starter'],
    icon: {
      mode: 'custom',
      base: { id: 'base_circle', color: COLORS.forest },
      symbol: { id: 'ic_checkmark', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [],
    },
  },
  {
    id: 'default-profile-complete',
    title: 'Identitet',
    subtitle: 'Fyll ut profilen din',
    description: 'Legg til avatar og visningsnavn i profilen din. Vis hvem du er!',
    rewardCoins: 15,
    status: 'published',
    category: 'social',
    tags: ['onboarding', 'profil'],
    icon: {
      mode: 'custom',
      base: { id: 'base_circle', color: COLORS.ocean },
      symbol: { id: 'ic_heart', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [],
    },
  },

  // =================== GAMES & ACTIVITIES ===================
  {
    id: 'default-first-game',
    title: 'Lekstart',
    subtitle: 'Spill ditt første spill',
    description: 'Delta i din første lek eller aktivitet. Eventyret begynner!',
    rewardCoins: 50,
    status: 'published',
    category: 'games',
    tags: ['spill', 'starter'],
    icon: {
      mode: 'custom',
      base: { id: 'base_circle', color: COLORS.ember },
      symbol: { id: 'ic_dice', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [{ id: 'fg_stars_1', color: COLORS.gold }],
    },
  },
  {
    id: 'default-10-games',
    title: 'Lekentusiast',
    subtitle: 'Spill 10 aktiviteter',
    description: 'Gjennfør 10 spill eller aktiviteter. Du er virkelig i gang nå!',
    rewardCoins: 100,
    status: 'published',
    category: 'games',
    tags: ['spill', 'milestone'],
    icon: {
      mode: 'custom',
      base: { id: 'base_hexagon', color: COLORS.ember },
      symbol: { id: 'ic_dice', color: '#ffffff' },
      backgrounds: [{ id: 'bg_spikes_2', color: COLORS.gold }],
      foregrounds: [{ id: 'fg_stars_2', color: COLORS.gold }],
    },
  },
  {
    id: 'default-50-games',
    title: 'Lekveteran',
    subtitle: 'Spill 50 aktiviteter',
    description: 'Halvt hundre aktiviteter! Du er en sann lekentusiast.',
    rewardCoins: 250,
    status: 'published',
    category: 'games',
    tags: ['spill', 'milestone'],
    icon: {
      mode: 'custom',
      base: { id: 'base_shield', color: COLORS.ember },
      symbol: { id: 'ic_dice', color: '#ffffff' },
      backgrounds: [{ id: 'bg_spikes_4', color: COLORS.gold }],
      foregrounds: [{ id: 'fg_king_crown_1', color: COLORS.gold }],
    },
  },
  {
    id: 'default-perfect-score',
    title: 'Feilfri',
    subtitle: 'Perfekt poengsum',
    description: 'Oppnå maks poeng i en aktivitet. Flawless!',
    rewardCoins: 150,
    status: 'published',
    category: 'achievement',
    tags: ['spill', 'perfekt'],
    icon: {
      mode: 'custom',
      base: { id: 'base_diamond', color: COLORS.gold },
      symbol: { id: 'ic_singlestar', color: '#ffffff' },
      backgrounds: [{ id: 'bg_spikes_1', color: COLORS.ember }],
      foregrounds: [{ id: 'fg_queen_crown_1', color: '#ffffff' }],
    },
  },

  // =================== STREAKS ===================
  {
    id: 'default-streak-3',
    title: 'På gang',
    subtitle: '3 dager på rad',
    description: 'Vær aktiv 3 dager på rad. Konsistens er nøkkelen!',
    rewardCoins: 30,
    status: 'published',
    category: 'achievement',
    tags: ['streak', 'konsistens'],
    icon: {
      mode: 'custom',
      base: { id: 'base_circle', color: COLORS.sunset },
      symbol: { id: 'ic_ember', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [],
    },
  },
  {
    id: 'default-streak-7',
    title: 'Ukesmester',
    subtitle: '7 dager på rad',
    description: 'En hel uke med daglig aktivitet. Imponerende dedikasjon!',
    rewardCoins: 75,
    status: 'published',
    category: 'achievement',
    tags: ['streak', 'konsistens'],
    icon: {
      mode: 'custom',
      base: { id: 'base_hexagon', color: COLORS.sunset },
      symbol: { id: 'ic_ember', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [{ id: 'fg_stars_1', color: COLORS.gold }],
    },
  },
  {
    id: 'default-streak-30',
    title: 'Månedsmaraton',
    subtitle: '30 dager på rad',
    description: 'En hel måned uten å miste en dag. Du er ustoppelig!',
    rewardCoins: 500,
    status: 'published',
    category: 'achievement',
    tags: ['streak', 'konsistens', 'premium'],
    icon: {
      mode: 'custom',
      base: { id: 'base_shield', color: COLORS.sunset },
      symbol: { id: 'ic_ember', color: '#ffffff' },
      backgrounds: [{ id: 'bg_spikes_3', color: COLORS.red }],
      foregrounds: [{ id: 'fg_king_crown_2', color: COLORS.gold }],
    },
  },

  // =================== LEARNING / COURSES ===================
  {
    id: 'default-first-course',
    title: 'Kunnskapstørst',
    subtitle: 'Fullfør din første kurs',
    description: 'Gjennfør en hel kurs fra start til slutt. Læring er en superkraft!',
    rewardCoins: 100,
    status: 'published',
    category: 'learning',
    tags: ['kurs', 'læring'],
    icon: {
      mode: 'custom',
      base: { id: 'base_circle', color: COLORS.ocean },
      symbol: { id: 'ic_book', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [{ id: 'fg_stars_1', color: COLORS.frost }],
    },
  },
  {
    id: 'default-3-courses',
    title: 'Læringsreise',
    subtitle: 'Fullfør 3 kurs',
    description: 'Tre fullførte kurs. Du bygger en solid kunnskapsbase!',
    rewardCoins: 200,
    status: 'published',
    category: 'learning',
    tags: ['kurs', 'læring', 'milestone'],
    icon: {
      mode: 'custom',
      base: { id: 'base_hexagon', color: COLORS.ocean },
      symbol: { id: 'ic_book', color: '#ffffff' },
      backgrounds: [{ id: 'bg_wings_1', color: COLORS.frost }],
      foregrounds: [{ id: 'fg_ribbon_1', color: COLORS.gold }],
    },
  },

  // =================== SOCIAL / TEAMWORK ===================
  {
    id: 'default-first-session',
    title: 'Øktleder',
    subtitle: 'Led din første økt',
    description: 'Planlegg og gjennfør en økt med deltakere. Du er en leder!',
    rewardCoins: 75,
    status: 'published',
    category: 'social',
    tags: ['økt', 'leder'],
    icon: {
      mode: 'custom',
      base: { id: 'base_circle', color: COLORS.purple },
      symbol: { id: 'ic_communicate', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [],
    },
  },
  {
    id: 'default-team-player',
    title: 'Lagspiller',
    subtitle: 'Delta i en gruppesesjon',
    description: 'Bli med i en fellesøkt med andre. Sammen er vi sterkere!',
    rewardCoins: 50,
    status: 'published',
    category: 'social',
    tags: ['team', 'sosialt'],
    icon: {
      mode: 'custom',
      base: { id: 'base_circle', color: COLORS.teal },
      symbol: { id: 'ic_team', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [],
    },
  },
  {
    id: 'default-10-sessions',
    title: 'Erfaren leder',
    subtitle: 'Led 10 økter',
    description: 'Gjennfør 10 økter som leder. Du gjør en forskjell!',
    rewardCoins: 200,
    status: 'published',
    category: 'social',
    tags: ['økt', 'leder', 'milestone'],
    icon: {
      mode: 'custom',
      base: { id: 'base_shield', color: COLORS.purple },
      symbol: { id: 'ic_communicate', color: '#ffffff' },
      backgrounds: [{ id: 'bg_wings_2', color: COLORS.purple }],
      foregrounds: [{ id: 'fg_stars_3', color: COLORS.gold }],
    },
  },

  // =================== ECONOMY / SHOP ===================
  {
    id: 'default-first-purchase',
    title: 'Shopaholic',
    subtitle: 'Første butikkjøp',
    description: 'Bruk DiceCoin i butikken for første gang. Vel fortjent!',
    rewardCoins: 25,
    status: 'published',
    category: 'special',
    tags: ['butikk', 'økonomi'],
    icon: {
      mode: 'custom',
      base: { id: 'base_circle', color: COLORS.gold },
      symbol: { id: 'ic_chest', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [],
    },
  },
  {
    id: 'default-coin-collector-500',
    title: 'Myntesamler',
    subtitle: 'Samle 500 DiceCoin totalt',
    description: 'Du har samlet et lite skattkammer av DiceCoin!',
    rewardCoins: 50,
    status: 'published',
    category: 'achievement',
    tags: ['økonomi', 'milestone'],
    icon: {
      mode: 'custom',
      base: { id: 'base_hexagon', color: COLORS.gold },
      symbol: { id: 'ic_chest', color: '#ffffff' },
      backgrounds: [{ id: 'bg_spikes_1', color: COLORS.ember }],
      foregrounds: [],
    },
  },

  // =================== LEVEL-UP / PROGRESSION ===================
  {
    id: 'default-level-5',
    title: 'Stigende stjerne',
    subtitle: 'Nå level 5',
    description: 'Du har nådd level 5. Reisen har bare begynt!',
    rewardCoins: 100,
    status: 'published',
    category: 'achievement',
    tags: ['level', 'progresjon'],
    icon: {
      mode: 'custom',
      base: { id: 'base_circle', color: COLORS.purple },
      symbol: { id: 'ic_lvlup', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [{ id: 'fg_stars_1', color: COLORS.gold }],
    },
  },
  {
    id: 'default-level-10',
    title: 'Mester',
    subtitle: 'Nå level 10',
    description: 'Level 10! Du har virkelig mestret Lekbanken.',
    rewardCoins: 300,
    status: 'published',
    category: 'achievement',
    tags: ['level', 'progresjon', 'premium'],
    icon: {
      mode: 'custom',
      base: { id: 'base_shield', color: COLORS.purple },
      symbol: { id: 'ic_lvlup', color: '#ffffff' },
      backgrounds: [{ id: 'bg_spikes_2', color: COLORS.purple }],
      foregrounds: [{ id: 'fg_king_crown_1', color: COLORS.gold }],
    },
  },

  // =================== SPECIAL / EVENTS ===================
  {
    id: 'default-speed-demon',
    title: 'Lynrask',
    subtitle: 'Fullfør en aktivitet på under 1 minutt',
    description: 'Raskere enn lynet! Du fullførte en aktivitet på rekordtid.',
    rewardCoins: 75,
    status: 'published',
    category: 'special',
    tags: ['speed', 'spesielt'],
    icon: {
      mode: 'custom',
      base: { id: 'base_diamond', color: COLORS.frost },
      symbol: { id: 'ic_flash', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [],
    },
  },
  {
    id: 'default-explorer',
    title: 'Utforsker',
    subtitle: 'Prøv 5 forskjellige leker',
    description: 'Prøv minst 5 ulike typer aktiviteter. Variasjon er livets krydder!',
    rewardCoins: 100,
    status: 'published',
    category: 'games',
    tags: ['variasjon', 'utforsking'],
    icon: {
      mode: 'custom',
      base: { id: 'base_pentagon', color: COLORS.teal },
      symbol: { id: 'ic_tourch', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [{ id: 'fg_ribbon_2', color: COLORS.gold }],
    },
  },
  {
    id: 'default-champion',
    title: 'Champion',
    subtitle: 'Vinn en turnering',
    description: 'Bli kåret til vinner i en organisert konkurranse. Trofeet er ditt!',
    rewardCoins: 500,
    status: 'published',
    category: 'event',
    tags: ['turnering', 'vinner', 'premium'],
    icon: {
      mode: 'custom',
      base: { id: 'base_shield', color: COLORS.onyx },
      symbol: { id: 'ic_pokal', color: COLORS.gold },
      backgrounds: [{ id: 'bg_spikes_5', color: COLORS.gold }],
      foregrounds: [{ id: 'fg_king_crown_2', color: COLORS.gold }, { id: 'fg_stars_4', color: COLORS.gold }],
    },
  },
  {
    id: 'default-helper',
    title: 'Hjelper',
    subtitle: 'Hjelp en kollega med en aktivitet',
    description: 'Del din kunnskap med en kollega. Du gjør arbeidsplassen bedre!',
    rewardCoins: 50,
    status: 'published',
    category: 'social',
    tags: ['hjelp', 'sosialt'],
    icon: {
      mode: 'custom',
      base: { id: 'base_circle', color: COLORS.forest },
      symbol: { id: 'ic_deal', color: '#ffffff' },
      backgrounds: [],
      foregrounds: [],
    },
  },
  {
    id: 'default-signal-booster',
    title: 'Inspiratør',
    subtitle: 'Inspirer en kollega til å prøve Lekbanken',
    description: 'Spred gleden! Få noen nye med på laget.',
    rewardCoins: 100,
    status: 'published',
    category: 'social',
    tags: ['sosialt', 'recruit'],
    icon: {
      mode: 'custom',
      base: { id: 'base_hexagon', color: COLORS.sunset },
      symbol: { id: 'ic_signal', color: '#ffffff' },
      backgrounds: [{ id: 'bg_wings_3', color: COLORS.sunset }],
      foregrounds: [],
    },
  },
]

/**
 * Group achievements by category for admin UI
 */
export function getDefaultAchievementsByCategory(): Record<string, AchievementItem[]> {
  const groups: Record<string, AchievementItem[]> = {}
  for (const achievement of DEFAULT_ACHIEVEMENTS) {
    const cat = achievement.category || 'other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(achievement)
  }
  return groups
}

/**
 * Categories with Norwegian labels (for admin UI display)
 */
export const ACHIEVEMENT_CATEGORY_LABELS: Record<string, string> = {
  games: 'Spill & Aktiviteter',
  achievement: 'Prestasjoner',
  learning: 'Læring & Kurs',
  social: 'Sosialt & Teamwork',
  event: 'Arrangementer',
  special: 'Spesielt',
}
