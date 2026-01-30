'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { GameDetailData } from '@/lib/game-display';
import type { GameDetailMode, SectionVisibility } from './config';
import { getSectionConfig } from './config';

// =============================================================================
// TYPES
// =============================================================================

/**
 * GameDetail context value
 *
 * Minimal context - page.tsx controls everything.
 * Components can access game data and mode without prop drilling.
 */
export interface GameDetailContextValue {
  /** The game data */
  game: GameDetailData;
  /** Current display mode */
  mode: GameDetailMode;
  /** Whether the game is locked (requires purchase/subscription) */
  isLocked: boolean;
  /** Section visibility config (computed from mode + playMode) */
  config: SectionVisibility;
}

// =============================================================================
// CONTEXT
// =============================================================================

const GameDetailContext = createContext<GameDetailContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

export interface GameDetailProviderProps {
  children: ReactNode;
  game: GameDetailData;
  mode?: GameDetailMode;
  isLocked?: boolean;
}

/**
 * GameDetailProvider - Provides game data and mode to child components
 *
 * Usage:
 * ```tsx
 * <GameDetailProvider game={game} mode="preview" isLocked={false}>
 *   <GameDetailHeader />
 *   <GameDetailAbout />
 *   ...
 * </GameDetailProvider>
 * ```
 */
export function GameDetailProvider({
  children,
  game,
  mode = 'preview',
  isLocked = false,
}: GameDetailProviderProps) {
  // Compute section config based on mode and playMode
  const config = getSectionConfig(mode, game.playMode);

  const value: GameDetailContextValue = {
    game,
    mode,
    isLocked,
    config,
  };

  return (
    <GameDetailContext.Provider value={value}>
      {children}
    </GameDetailContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * useGameDetail - Access game detail context
 *
 * @throws Error if used outside GameDetailProvider
 */
export function useGameDetail(): GameDetailContextValue {
  const context = useContext(GameDetailContext);
  if (!context) {
    throw new Error('useGameDetail must be used within a GameDetailProvider');
  }
  return context;
}

/**
 * useGameDetailMode - Get current mode
 *
 * Convenience hook for components that only need mode
 */
export function useGameDetailMode(): GameDetailMode {
  return useGameDetail().mode;
}

/**
 * useGameDetailConfig - Get section visibility config
 *
 * Convenience hook for conditional rendering
 */
export function useGameDetailConfig(): SectionVisibility {
  return useGameDetail().config;
}

/**
 * useIsLocked - Check if game is locked
 *
 * Used for showing locked placeholders
 */
export function useIsLocked(): boolean {
  return useGameDetail().isLocked;
}
