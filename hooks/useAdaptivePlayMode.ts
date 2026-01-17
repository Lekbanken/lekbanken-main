/**
 * useAdaptivePlayMode Hook
 *
 * Provides play mode configuration and feature flags for adaptive UI rendering.
 * Determines which components and features should be shown based on the game's play_mode.
 */

import { useMemo } from 'react';
import type { PlayMode } from '@/features/admin/games/v2/types';
import { PLAY_MODE_UI, type PlayModeUIConfig, type PlayModeFeature } from '@/lib/play-modes';

export interface AdaptivePlayModeResult {
  /** The resolved play mode (defaults to 'basic' if null) */
  mode: PlayMode;
  /** Full UI configuration for the mode */
  config: PlayModeUIConfig;

  // Quick boolean checks for view switching
  isSimple: boolean;
  isFacilitated: boolean;
  isParticipant: boolean;

  // Feature flags
  hasPhases: boolean;
  hasTeams: boolean;
  hasBoard: boolean;
  hasArtifacts: boolean;
  hasClues: boolean;
  hasRoles: boolean;
  hasScoring: boolean;
  hasTriggers: boolean;

  // Utility function
  hasFeature: (feature: PlayModeFeature) => boolean;
}

export function useAdaptivePlayMode(playMode: PlayMode | null | undefined): AdaptivePlayModeResult {
  return useMemo(() => {
    const mode = playMode ?? 'basic';
    const config = PLAY_MODE_UI[mode];

    const hasFeature = (feature: PlayModeFeature): boolean => {
      return config.features.includes(feature);
    };

    return {
      mode,
      config,

      // View switches
      isSimple: mode === 'basic',
      isFacilitated: mode === 'facilitated',
      isParticipant: mode === 'participants',

      // Feature flags (cached)
      hasPhases: mode !== 'basic',
      hasTeams: mode === 'participants',
      hasBoard: mode !== 'basic',
      hasArtifacts: mode === 'participants',
      hasClues: mode === 'participants',
      hasRoles: mode === 'participants',
      hasScoring: mode === 'participants',
      hasTriggers: mode === 'participants',

      // Utility
      hasFeature,
    };
  }, [playMode]);
}
