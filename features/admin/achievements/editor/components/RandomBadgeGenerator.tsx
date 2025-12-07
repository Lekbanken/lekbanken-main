'use client';

import { useCallback } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { getAssetsByType } from '../../assets';
import { AchievementIconConfig, AchievementAssetType } from '../../types';

// Standard Lekbanken palette for random selection
const RANDOM_COLORS = [
  '#F1C232', // Guld
  '#B4B4B4', // Silver  
  '#CD7F32', // Brons
  '#8661FF', // Lila
  '#00C7B0', // Turkos
  '#FFD166', // Gul
  '#F59E0B', // Orange
  '#EF4444', // Röd
  '#3B82F6', // Blå
  '#10B981', // Grön
];

/**
 * Pick a random item from an array
 */
function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pick N random items from an array (without duplicates)
 */
function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/**
 * Pick a random color from the Lekbanken palette
 */
export function getRandomColor(): string {
  return pickRandom(RANDOM_COLORS) || '#F1C232';
}

/**
 * Get a random asset ID for a given layer type
 */
export function getRandomAssetId(type: AchievementAssetType): string | undefined {
  const assets = getAssetsByType(type);
  return pickRandom(assets)?.id;
}

/**
 * Generate a completely random badge configuration
 */
export function generateRandomBadge(): AchievementIconConfig {
  const baseAssets = getAssetsByType('base');
  const bgAssets = getAssetsByType('background');
  const fgAssets = getAssetsByType('foreground');
  const symbolAssets = getAssetsByType('symbol');

  // Always have a base
  const base = pickRandom(baseAssets);
  
  // Pick 0-2 background layers
  const bgCount = Math.floor(Math.random() * 3);
  const backgrounds = pickRandomN(bgAssets, bgCount);
  
  // Pick 0-2 foreground layers
  const fgCount = Math.floor(Math.random() * 3);
  const foregrounds = pickRandomN(fgAssets, fgCount);
  
  // Always have a symbol
  const symbol = pickRandom(symbolAssets);

  return {
    mode: 'custom',
    base: base ? { id: base.id, color: getRandomColor() } : undefined,
    backgrounds: backgrounds.map(bg => ({ id: bg.id, color: getRandomColor() })),
    foregrounds: foregrounds.map(fg => ({ id: fg.id, color: getRandomColor() })),
    symbol: symbol ? { id: symbol.id, color: getRandomColor() } : undefined,
  };
}

/**
 * Randomize just one layer type while keeping the rest
 */
export function randomizeLayer(
  current: AchievementIconConfig,
  layerType: AchievementAssetType
): AchievementIconConfig {
  switch (layerType) {
    case 'base': {
      const newBase = getRandomAssetId('base');
      return {
        ...current,
        base: newBase ? { id: newBase, color: getRandomColor() } : current.base,
      };
    }
    case 'background': {
      const bgAssets = getAssetsByType('background');
      const bgCount = Math.floor(Math.random() * 3);
      const backgrounds = pickRandomN(bgAssets, bgCount);
      return {
        ...current,
        backgrounds: backgrounds.map(bg => ({ id: bg.id, color: getRandomColor() })),
      };
    }
    case 'foreground': {
      const fgAssets = getAssetsByType('foreground');
      const fgCount = Math.floor(Math.random() * 3);
      const foregrounds = pickRandomN(fgAssets, fgCount);
      return {
        ...current,
        foregrounds: foregrounds.map(fg => ({ id: fg.id, color: getRandomColor() })),
      };
    }
    case 'symbol': {
      const newSymbol = getRandomAssetId('symbol');
      return {
        ...current,
        symbol: newSymbol ? { id: newSymbol, color: getRandomColor() } : current.symbol,
      };
    }
    default:
      return current;
  }
}

/**
 * Randomize only the colors while keeping the same assets
 */
export function randomizeColors(current: AchievementIconConfig): AchievementIconConfig {
  return {
    ...current,
    base: current.base ? { ...current.base, color: getRandomColor() } : undefined,
    backgrounds: current.backgrounds?.map(bg => ({ ...bg, color: getRandomColor() })),
    foregrounds: current.foregrounds?.map(fg => ({ ...fg, color: getRandomColor() })),
    symbol: current.symbol ? { ...current.symbol, color: getRandomColor() } : undefined,
  };
}

/**
 * Hook for random badge generation with callbacks
 */
export function useRandomBadge(
  current: AchievementIconConfig,
  onChange: (config: AchievementIconConfig) => void
) {
  const handleRandomizeAll = useCallback(() => {
    onChange(generateRandomBadge());
  }, [onChange]);

  const handleRandomizeLayer = useCallback(
    (layerType: AchievementAssetType) => {
      onChange(randomizeLayer(current, layerType));
    },
    [current, onChange]
  );

  const handleRandomizeColors = useCallback(() => {
    onChange(randomizeColors(current));
  }, [current, onChange]);

  return {
    randomizeAll: handleRandomizeAll,
    randomizeLayer: handleRandomizeLayer,
    randomizeColors: handleRandomizeColors,
  };
}

/**
 * Randomize button component for use in the editor
 */
type RandomizeButtonProps = {
  onClick: () => void;
  label?: string;
  small?: boolean;
};

export function RandomizeButton({ onClick, label = 'Slumpa', small = false }: RandomizeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-lg border border-border
        bg-muted/50 hover:bg-muted transition-colors
        ${small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
      `}
      title={label}
    >
      <ArrowPathIcon className={small ? 'h-3 w-3' : 'h-4 w-4'} />
      {label}
    </button>
  );
}

/**
 * Toolbar with all randomize options
 */
type RandomToolbarProps = {
  current: AchievementIconConfig;
  onChange: (config: AchievementIconConfig) => void;
};

export function RandomToolbar({ current, onChange }: RandomToolbarProps) {
  const { randomizeAll, randomizeColors } = useRandomBadge(current, onChange);

  return (
    <div className="flex flex-wrap gap-2">
      <RandomizeButton onClick={randomizeAll} label="Slumpa allt" />
      <RandomizeButton onClick={randomizeColors} label="Slumpa färger" small />
    </div>
  );
}
