/**
 * Game Display Module
 *
 * Centraliserad modul för all speldata-visning i Lekbanken.
 *
 * ANVÄNDNING:
 * ```ts
 * import {
 *   type GameSummary,
 *   formatDuration,
 *   formatEnergyLevel,
 *   mapDbGameToSummary,
 * } from '@/lib/game-display';
 * ```
 *
 * REGLER:
 * 1. ALL speldata-visning MÅSTE använda GameSummary eller GameDetailData
 * 2. ALL formatering MÅSTE använda formatters från denna modul
 * 3. ALL data-konvertering MÅSTE gå genom mappers från denna modul
 * 4. UI får ALDRIG definiera egna energyConfig, playModeConfig, etc.
 *
 * @see GAMECARD_UNIFIED_IMPLEMENTATION.md för full dokumentation
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Enums
  EnergyLevel,
  PlayMode,
  Environment,
  Difficulty,
  GameStatus,
  // Main types
  GameSummary,
  GameDetailData,
  // Sub-types
  GameStep,
  GamePhase,
  GameRole,
  GameArtifact,
  GameTrigger,
  GameDecision,
  GameMaterial,
  GameBoardWidget,
  GameMetadata,
} from './types';

// Type guards
export {
  isValidGameSummary,
  hasParticipantsData,
  hasFacilitatedData,
} from './types';

// =============================================================================
// FORMATTERS
// =============================================================================

export {
  // Duration
  formatDuration,
  formatDurationShort,
  // Players
  formatPlayers,
  formatPlayersShort,
  // Age
  formatAge,
  formatAgeShort,
  // Energy Level
  formatEnergyLevel,
  // Play Mode
  formatPlayMode,
  // Environment
  formatEnvironment,
  // Difficulty
  formatDifficulty,
  // Rating
  formatRating,
  formatRatingWithCount,
  // Play Count
  formatPlayCount,
  // Status
  formatStatus,
} from './formatters';

// Formatter return types (for consumers that need them)
export type {
  EnergyLevelFormat,
  PlayModeFormat,
  EnvironmentFormat,
  DifficultyFormat,
  StatusFormat,
} from './formatters';

// =============================================================================
// MAPPERS
// =============================================================================

export {
  // Main mappers
  mapDbGameToSummary,
  mapDbGameToDetail,
  mapSearchResultToSummary,
  mapPlannerBlockToSummary,
  createMinimalSummary,
  // Validation
  validateGameSummary,
} from './mappers';

// Mapper input types (for consumers that need them)
export type {
  DbGame,
  GameSearchResult,
  PlannerBlockGame,
} from './mappers';
