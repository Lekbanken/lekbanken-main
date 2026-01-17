/**
 * Play Mode UI Configuration
 *
 * Extends the admin PLAY_MODE_META with UI-specific properties
 * for consistent styling and feature detection across play views.
 */

import {
  PuzzlePieceIcon,
  UsersIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import type { PlayMode } from '@/features/admin/games/v2/types';

// ============================================================================
// TYPES
// ============================================================================

export interface PlayModeUIConfig {
  key: PlayMode;
  label: string;
  labelShort: string;
  description: string;
  color: 'emerald' | 'blue' | 'purple';
  bgClass: string;
  textClass: string;
  borderClass: string;
  ringClass: string;
  icon: typeof PuzzlePieceIcon;
  features: PlayModeFeature[];
  uiComponents: string[];
}

export type PlayModeFeature =
  | 'instructions'
  | 'materials'
  | 'timer'
  | 'phases'
  | 'board'
  | 'participants'
  | 'roles'
  | 'teams'
  | 'artifacts'
  | 'clues'
  | 'scoring'
  | 'triggers';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const PLAY_MODE_UI: Record<PlayMode, PlayModeUIConfig> = {
  basic: {
    key: 'basic',
    label: 'Enkel lek',
    labelShort: 'Enkel',
    description: 'Traditionella lekar med steg och material. Ingen digital interaktion.',
    color: 'emerald',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-500/30',
    ringClass: 'ring-emerald-500/20',
    icon: PuzzlePieceIcon,
    features: ['instructions', 'materials', 'timer'],
    uiComponents: [
      'SimplePlayHeader',
      'InstructionsCard',
      'MaterialsChecklist',
      'OptionalTimer',
      'CompleteButton',
    ],
  },
  facilitated: {
    key: 'facilitated',
    label: 'Ledd aktivitet',
    labelShort: 'Ledd',
    description: 'Lekar med faser, timer och eventuellt en publik tavla.',
    color: 'blue',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-500/30',
    ringClass: 'ring-blue-500/20',
    icon: UsersIcon,
    features: ['instructions', 'materials', 'phases', 'timer', 'board', 'participants'],
    uiComponents: [
      'FacilitatedPlayHeader',
      'PhaseIndicator',
      'CurrentInstructionCard',
      'ParticipantCounter',
      'PhaseNavigation',
      'BoardToggle',
    ],
  },
  participants: {
    key: 'participants',
    label: 'Deltagarlek',
    labelShort: 'Deltagare',
    description: 'Fullständiga interaktiva lekar med roller, artifacts och triggers.',
    color: 'purple',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-600 dark:text-purple-400',
    borderClass: 'border-purple-500/30',
    ringClass: 'ring-purple-500/20',
    icon: SparklesIcon,
    features: [
      'instructions',
      'materials',
      'phases',
      'roles',
      'teams',
      'artifacts',
      'clues',
      'board',
      'scoring',
      'triggers',
    ],
    uiComponents: [
      'ParticipantPlayHeader',
      'TeamScoreboard',
      'ProgressTracker',
      'ClueDispenser',
      'TeamManagement',
      'ArtifactPanel',
      'BoardController',
    ],
  },
} as const;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get UI config for a play mode, with fallback to 'basic'
 */
export function getPlayModeUI(mode: PlayMode | null | undefined): PlayModeUIConfig {
  return PLAY_MODE_UI[mode ?? 'basic'];
}

/**
 * Check if a play mode supports a specific feature
 */
export function playModeHasFeature(
  mode: PlayMode | null | undefined,
  feature: PlayModeFeature
): boolean {
  const config = getPlayModeUI(mode);
  return config.features.includes(feature);
}

/**
 * Get all play modes as an array for iteration
 */
export function getAllPlayModes(): PlayModeUIConfig[] {
  return Object.values(PLAY_MODE_UI);
}
