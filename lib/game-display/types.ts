/**
 * Game Display Types
 *
 * Detta är det ENDA kontraktet för speldata i UI.
 * Alla GameCard-varianter och GameDetails MÅSTE konsumera dessa typer.
 *
 * @see GAMECARD_UNIFIED_IMPLEMENTATION.md för full dokumentation
 */

// =============================================================================
// ENUMS
// =============================================================================

export type EnergyLevel = 'low' | 'medium' | 'high';

export type PlayMode = 'basic' | 'facilitated' | 'participants';

export type Environment = 'indoor' | 'outdoor' | 'both';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameStatus = 'draft' | 'published' | 'archived';

// =============================================================================
// GAME SUMMARY - För cards och listor
// =============================================================================

/**
 * GameSummary - Används av ALLA GameCard-varianter
 *
 * Detta är det ENDA kontraktet som cards får konsumera.
 * UI får ALDRIG konsumera raw DB-data direkt.
 *
 * Fält är optional för att stödja partial data scenarios,
 * men `id` och `title` bör alltid finnas.
 */
export interface GameSummary {
  // ─────────────────────────────────────────────────────────────────────────
  // Identifikation (required)
  // ─────────────────────────────────────────────────────────────────────────
  id: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Identifikation (optional)
  // ─────────────────────────────────────────────────────────────────────────
  slug?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Primär text
  // ─────────────────────────────────────────────────────────────────────────
  title: string;
  shortDescription?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Media
  // ─────────────────────────────────────────────────────────────────────────
  coverUrl?: string | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Metadata (numerisk)
  // ─────────────────────────────────────────────────────────────────────────
  durationMin?: number | null;
  durationMax?: number | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  ageMin?: number | null;
  ageMax?: number | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Metadata (enum)
  // ─────────────────────────────────────────────────────────────────────────
  energyLevel?: EnergyLevel | null;
  environment?: Environment | null;
  difficulty?: Difficulty | null;
  playMode?: PlayMode | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Kategorisering
  // ─────────────────────────────────────────────────────────────────────────
  categories?: string[];
  tags?: string[];
  purpose?: string | null;
  product?: string | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Statistik
  // ─────────────────────────────────────────────────────────────────────────
  rating?: number | null;
  ratingCount?: number | null;
  playCount?: number | null;

  // ─────────────────────────────────────────────────────────────────────────
  // Användar-state
  // ─────────────────────────────────────────────────────────────────────────
  isFavorite?: boolean;
  isLocked?: boolean;
  isOwned?: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // Status
  // ─────────────────────────────────────────────────────────────────────────
  status?: GameStatus;
}

// =============================================================================
// GAME DETAIL DATA - För detaljsidan
// =============================================================================

/**
 * GameStep - Ett steg i spelinstruktionerna
 */
export interface GameStep {
  id?: string;
  title: string;
  body?: string;
  duration?: string;
  durationMinutes?: number;
  durationSeconds?: number;
  leaderScript?: string;
  participantPrompt?: string;
  boardText?: string;
  displayMode?: 'instant' | 'typewriter' | 'dramatic';
  optional?: boolean;
  phaseId?: string;
  mediaRef?: string;
}

/**
 * GamePhase - En fas i ett faciliterat spel
 */
export interface GamePhase {
  id?: string;
  title: string;
  name?: string;
  phaseType?: 'intro' | 'round' | 'finale' | 'break';
  duration: string;
  durationSeconds?: number;
  goal: string;
  description?: string;
  facilitator?: string;
  outputs?: string[];
  board?: string;
  boardMessage?: string;
  timerVisible?: boolean;
  timerStyle?: 'countdown' | 'elapsed' | 'trafficlight';
  autoAdvance?: boolean;
}

/**
 * GameRole - En roll i ett deltagarspel
 */
export interface GameRole {
  id?: string;
  name: string;
  icon?: string;
  color?: string;
  count?: string;
  minCount?: number;
  maxCount?: number;
  publicNote?: string;
  privateNote?: string;
  secrets?: string[];
  assignmentStrategy?: 'random' | 'leader_picks' | 'player_picks';
}

/**
 * GameArtifact - En artefakt/rekvisita
 */
export interface GameArtifact {
  id?: string;
  title: string;
  description?: string;
  type?: string;
  use?: string;
  access?: string;
  tags?: string[];
  variants?: GameArtifactVariant[];
}

/**
 * GameTrigger - En trigger/händelse
 */
export interface GameTrigger {
  id?: string;
  name?: string;
  title: string;
  description?: string;
  condition: string | object;
  effect: string;
  actions?: object[];
  enabled?: boolean;
  executeOnce?: boolean;
  delaySeconds?: number;
}

/**
 * GameDecision - En omröstning/beslut
 */
export interface GameDecision {
  title: string;
  prompt: string;
  options: string[];
  resolution?: string;
}

/**
 * GameMaterial - Material som behövs
 */
export interface GameMaterial {
  label: string;
  detail?: string;
  quantity?: string;
  /** Icon name for the material type */
  icon?: string;
}

/**
 * GameMaterialGroup - Grupperat material med metadata
 * Används för att visa materials + safety/preparation derivat
 */
export interface GameMaterialGroup {
  items: GameMaterial[];
  /** Safety notes extracted from materials */
  safetyNotes?: string[];
  /** Preparation notes extracted from materials */
  preparationNotes?: string[];
}

/**
 * GameArtifactVariant - En variant av en artefakt
 */
export interface GameArtifactVariant {
  title?: string;
  body?: string;
  visibility?: 'public' | 'leader_only' | 'role_private';
  visibleToRoleId?: string;
  mediaRef?: string;
}

/**
 * GameBoardWidget - Widget på publik tavla
 */
export interface GameBoardWidget {
  title: string;
  detail?: string;
}

/**
 * GameMetadata - Metadata om spelet
 */
export interface GameMetadata {
  gameKey?: string;
  version?: string;
  updatedAt?: string;
  createdAt?: string;
  owner?: string;
  locale?: string;
}

/**
 * GameDetailData - Utökar GameSummary med detaljerad info
 *
 * Används ENDAST av GameDetails-sidan.
 * Innehåller all information för preview och run-mode.
 */
export interface GameDetailData extends GameSummary {
  // ─────────────────────────────────────────────────────────────────────────
  // Utökad text
  // ─────────────────────────────────────────────────────────────────────────
  description?: string;
  subtitle?: string;
  highlights?: string[];

  // ─────────────────────────────────────────────────────────────────────────
  // Media (utökat)
  // ─────────────────────────────────────────────────────────────────────────
  gallery?: string[];

  // ─────────────────────────────────────────────────────────────────────────
  // Innehåll - Förberedelser
  // ─────────────────────────────────────────────────────────────────────────
  materials?: GameMaterial[];
  preparation?: string[];
  requirements?: string[];
  downloads?: string[];

  // ─────────────────────────────────────────────────────────────────────────
  // Innehåll - Resultat & Säkerhet
  // ─────────────────────────────────────────────────────────────────────────
  outcomes?: string[];
  safety?: string[];
  accessibility?: string[];

  // ─────────────────────────────────────────────────────────────────────────
  // Innehåll - Variationer
  // ─────────────────────────────────────────────────────────────────────────
  variants?: string[];
  reflections?: string[];

  // ─────────────────────────────────────────────────────────────────────────
  // Steg & Faser
  // ─────────────────────────────────────────────────────────────────────────
  steps?: GameStep[];
  phases?: GamePhase[];
  checkpoints?: string[];

  // ─────────────────────────────────────────────────────────────────────────
  // Deltagare (för participants mode)
  // ─────────────────────────────────────────────────────────────────────────
  roles?: GameRole[];
  artifacts?: GameArtifact[];
  triggers?: GameTrigger[];
  decisions?: GameDecision[];

  // ─────────────────────────────────────────────────────────────────────────
  // Facilitator
  // ─────────────────────────────────────────────────────────────────────────
  facilitatorTools?: string[];
  hostActions?: string[];
  boardWidgets?: GameBoardWidget[];

  // ─────────────────────────────────────────────────────────────────────────
  // Metadata
  // ─────────────────────────────────────────────────────────────────────────
  meta?: GameMetadata;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Typeguard för att verifiera att ett objekt är en giltig GameSummary
 */
export function isValidGameSummary(obj: unknown): obj is GameSummary {
  if (typeof obj !== 'object' || obj === null) return false;
  const game = obj as Record<string, unknown>;
  return typeof game.id === 'string' && typeof game.title === 'string';
}

/**
 * Typeguard för att verifiera att ett objekt har participants-mode data
 */
export function hasParticipantsData(
  game: GameSummary | GameDetailData
): game is GameDetailData & { roles: GameRole[] } {
  return (
    'roles' in game &&
    Array.isArray((game as GameDetailData).roles) &&
    (game as GameDetailData).roles!.length > 0
  );
}

/**
 * Typeguard för att verifiera att ett objekt har facilitated-mode data
 */
export function hasFacilitatedData(
  game: GameSummary | GameDetailData
): game is GameDetailData & { phases: GamePhase[] } {
  return (
    'phases' in game &&
    Array.isArray((game as GameDetailData).phases) &&
    (game as GameDetailData).phases!.length > 0
  );
}
