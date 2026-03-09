/**
 * Game Authoring Module
 *
 * Canonical type definitions for game content structure.
 * Single source of truth for what the builder produces.
 *
 * USAGE:
 * ```ts
 * import { type GameAuthoringData, isValidAuthoringData } from '@/lib/game-authoring';
 * ```
 *
 * @see lib/game-display/ for display types and mappers
 * @see features/play/types.ts for play runtime types
 */

export type { GameAuthoringData } from './types';
export { isValidAuthoringData } from './types';

// Re-exported content sub-types (canonical definitions from game-display)
export type {
  GameStep,
  GamePhase,
  GameRole,
  GameArtifact,
  GameTrigger,
  GameMaterial,
  GameBoardWidget,
  GameDecision,
  EnergyLevel,
  PlayMode,
  Environment,
  Difficulty,
  GameStatus,
} from './types';
