/**
 * Game Authoring Types
 *
 * Canonical source of truth for game content structure.
 * This represents what the game builder/author creates
 * and what gets stored in the database.
 *
 * RELATIONSHIP TO OTHER DOMAINS:
 * - Display: GameDetailData extends GameSummary with mapped content from GameAuthoringData
 * - Play: RunStep/SessionRole are runtime snapshots derived from authored content
 * - DB: DbGame is the snake_case Supabase representation of this data
 *
 * @see lib/game-display/types.ts for display types
 * @see lib/game-display/mappers.ts for DbGame → GameDetailData conversion
 * @see features/play/types.ts for play runtime types
 */

import type {
  // Enums (shared across all domains)
  EnergyLevel,
  PlayMode,
  Environment,
  Difficulty,
  GameStatus,
  // Content types (canonical definitions in game-display, re-used here)
  GameStep,
  GamePhase,
  GameRole,
  GameArtifact,
  GameTrigger,
  GameMaterial,
  GameBoardWidget,
  GameDecision,
} from '@/lib/game-display/types';

// Re-export content types so consumers can import from one place
export type {
  EnergyLevel,
  PlayMode,
  Environment,
  Difficulty,
  GameStatus,
  GameStep,
  GamePhase,
  GameRole,
  GameArtifact,
  GameTrigger,
  GameMaterial,
  GameBoardWidget,
  GameDecision,
};

// =============================================================================
// CANONICAL AUTHORING TYPE
// =============================================================================

/**
 * GameAuthoringData — Unified canonical type for game content.
 *
 * Single source of truth for the game's content structure.
 * The builder produces this shape, the DB stores it (via snake_case mapping),
 * and the display/play domains consume it through their own mappers.
 *
 * All fields optional to support partial authoring (drafts, incremental saves).
 */
export interface GameAuthoringData {
  // ─────────────────────────────────────────────────────────────────────────
  // Identity
  // ─────────────────────────────────────────────────────────────────────────
  id: string;
  name: string;
  gameKey?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Text content
  // ─────────────────────────────────────────────────────────────────────────
  description?: string;
  shortDescription?: string;
  instructions?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Highlights & tips
  // ─────────────────────────────────────────────────────────────────────────
  highlights?: string[];
  leaderTips?: string[];
  outcomes?: string[];

  // ─────────────────────────────────────────────────────────────────────────
  // Classification (enums)
  // ─────────────────────────────────────────────────────────────────────────
  status?: GameStatus;
  playMode?: PlayMode;
  energyLevel?: EnergyLevel;
  environment?: Environment;
  difficulty?: Difficulty;
  category?: string;
  purposeId?: string;
  productId?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // Numeric metadata
  // ─────────────────────────────────────────────────────────────────────────
  durationMin?: number;
  durationMax?: number;
  minPlayers?: number;
  maxPlayers?: number;
  ageMin?: number;
  ageMax?: number;

  // ─────────────────────────────────────────────────────────────────────────
  // Content — Steps & Phases
  // ─────────────────────────────────────────────────────────────────────────
  steps?: GameStep[];
  phases?: GamePhase[];

  // ─────────────────────────────────────────────────────────────────────────
  // Content — Participants
  // ─────────────────────────────────────────────────────────────────────────
  roles?: GameRole[];
  artifacts?: GameArtifact[];
  triggers?: GameTrigger[];
  decisions?: GameDecision[];

  // ─────────────────────────────────────────────────────────────────────────
  // Content — Preparation & Safety
  // ─────────────────────────────────────────────────────────────────────────
  materials?: GameMaterial[];
  safety?: string[];
  accessibility?: string[];
  preparation?: string[];
  requirements?: string[];

  // ─────────────────────────────────────────────────────────────────────────
  // Content — Facilitator
  // ─────────────────────────────────────────────────────────────────────────
  facilitatorTools?: string[];
  boardWidgets?: GameBoardWidget[];

  // ─────────────────────────────────────────────────────────────────────────
  // Media
  // ─────────────────────────────────────────────────────────────────────────
  coverUrl?: string;
  gallery?: string[];

  // ─────────────────────────────────────────────────────────────────────────
  // Schema version (for forward-compatible migrations)
  // ─────────────────────────────────────────────────────────────────────────
  contentSchemaVersion?: number;
}

// =============================================================================
// TYPE MAPPING DOCUMENTATION
// =============================================================================

/**
 * Field mapping: GameAuthoringData ↔ DbGame (snake_case)
 *
 * | GameAuthoringData  | DbGame (DB column)        |
 * |--------------------|---------------------------|
 * | id                 | id                        |
 * | name               | name                      |
 * | gameKey            | game_key                  |
 * | description        | description               |
 * | shortDescription   | short_description         |
 * | instructions       | instructions              |
 * | highlights         | highlights (text[])        |
 * | leaderTips         | leader_tips (text, \n-separated) |
 * | outcomes           | outcomes (text[])          |
 * | status             | status                    |
 * | playMode           | play_mode                 |
 * | energyLevel        | energy_level              |
 * | environment        | location_type             |
 * | difficulty         | difficulty                |
 * | category           | category                  |
 * | durationMin        | time_estimate_min         |
 * | durationMax        | time_estimate_max         |
 * | minPlayers         | min_players               |
 * | maxPlayers         | max_players               |
 * | ageMin             | age_min                   |
 * | ageMax             | age_max                   |
 * | steps              | game_steps (relation)     |
 * | phases             | game_phases (relation)    |
 * | roles              | game_roles (relation)     |
 * | artifacts          | game_artifacts (relation) |
 * | triggers           | game_triggers (relation)  |
 * | materials          | game_materials (relation) |
 * | safety             | game_materials.safety_notes |
 * | accessibility      | accessibility_notes (text, \n-separated) |
 * | preparation        | game_materials.preparation |
 * | requirements       | space_requirements (text, \n-separated) |
 * | facilitatorTools   | game_facilitator_tools (relation) |
 * | boardWidgets       | board_config (jsonb)      |
 * | coverUrl           | game_media[kind=cover]    |
 * | gallery            | game_media[kind!=cover]   |
 * | contentSchemaVersion | game_content_schema_version |
 */

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Validates that an object has minimal required authoring data
 */
export function isValidAuthoringData(
  obj: unknown
): obj is GameAuthoringData {
  if (typeof obj !== 'object' || obj === null) return false;
  const data = obj as Record<string, unknown>;
  return typeof data.id === 'string' && typeof data.name === 'string';
}
