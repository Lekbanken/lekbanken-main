'use client';

import { TrophyIcon, CurrencyDollarIcon, StarIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { BadgePreviewEnhanced } from './BadgePreviewEnhanced';
import { AchievementIconConfig, AchievementAssetType } from '../../types';

type BadgeCardPreviewProps = {
  icon: AchievementIconConfig;
  theme?: { colors: Record<AchievementAssetType, { color: string }> };
  metadata: {
    name: string;
    description: string;
    points: number;
    category?: string;
    rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    unlockCondition?: string;
  };
  showAsRing?: boolean;
  backgroundColor?: string;
};

const RARITY_CONFIG = {
  common: {
    label: 'Vanlig',
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    glow: '',
  },
  uncommon: {
    label: 'Ovanlig',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-300',
    glow: '',
  },
  rare: {
    label: 'Sällsynt',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    glow: 'shadow-blue-200',
  },
  epic: {
    label: 'Episk',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-400',
    glow: 'shadow-purple-300',
  },
  legendary: {
    label: 'Legendarisk',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    glow: 'shadow-amber-300 animate-pulse',
  },
};

/**
 * Shows badge preview as a card (like in user profile) with full metadata.
 * Alternative view mode to the ring preview.
 */
export function BadgeCardPreview({
  icon,
  theme,
  metadata,
  showAsRing = false,
  backgroundColor = '#1F2937',
}: BadgeCardPreviewProps) {
  const rarity = metadata.rarity || 'common';
  const rarityConfig = RARITY_CONFIG[rarity];

  if (showAsRing) {
    // Simple ring/circle view (like original preview)
    return (
      <div
        className="flex items-center justify-center rounded-2xl p-8 transition-colors"
        style={{ backgroundColor }}
      >
        <div className="relative">
          {/* Glow effect for higher rarities */}
          {rarity !== 'common' && rarity !== 'uncommon' && (
            <div
              className={`absolute inset-0 rounded-full blur-xl opacity-30 ${rarityConfig.glow}`}
              style={{
                background: rarity === 'legendary' 
                  ? 'radial-gradient(circle, #F59E0B 0%, transparent 70%)'
                  : rarity === 'epic'
                  ? 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)'
                  : 'radial-gradient(circle, #3B82F6 0%, transparent 70%)',
              }}
            />
          )}
          <BadgePreviewEnhanced icon={icon} theme={theme} size="lg" showGlow={false} />
        </div>
      </div>
    );
  }

  // Card view with metadata
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300
        ${rarityConfig.border} ${rarityConfig.bg}
        hover:shadow-lg ${rarityConfig.glow}
      `}
    >
      {/* Rarity ribbon */}
      {rarity !== 'common' && (
        <div className={`absolute -right-8 top-3 rotate-45 px-8 py-0.5 text-[10px] font-bold uppercase ${rarityConfig.bg} ${rarityConfig.color}`}>
          {rarityConfig.label}
        </div>
      )}

      {/* Main content */}
      <div className="flex gap-4">
        {/* Badge preview */}
        <div className="flex-shrink-0">
          <div className="relative">
            <BadgePreviewEnhanced icon={icon} theme={theme} size="md" showGlow={false} />
            {rarity === 'legendary' && (
              <SparklesIcon className="absolute -top-1 -right-1 h-5 w-5 text-amber-400 animate-pulse" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <h3 className="font-bold text-foreground truncate text-lg leading-tight">
            {metadata.name || 'Namnlös badge'}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {metadata.description || 'Ingen beskrivning'}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-3 pt-1">
            {/* Points */}
            <div className="flex items-center gap-1 text-sm">
              <CurrencyDollarIcon className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-amber-600">{metadata.points}</span>
              <span className="text-xs text-muted-foreground">coins</span>
            </div>

            {/* Category */}
            {metadata.category && (
              <div className="flex items-center gap-1 text-sm">
                <TrophyIcon className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{metadata.category}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unlock condition */}
      {metadata.unlockCondition && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <StarIcon className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Uppnås:</span>
            {metadata.unlockCondition}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Preview mode toggle component
 */
type PreviewModeToggleProps = {
  mode: 'ring' | 'card';
  onChange: (mode: 'ring' | 'card') => void;
};

export function PreviewModeToggle({ mode, onChange }: PreviewModeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
      <button
        type="button"
        onClick={() => onChange('ring')}
        className={`
          px-3 py-1.5 rounded-md text-sm font-medium transition-all
          ${mode === 'ring' 
            ? 'bg-background shadow text-foreground' 
            : 'text-muted-foreground hover:text-foreground'
          }
        `}
      >
        🔵 Ring
      </button>
      <button
        type="button"
        onClick={() => onChange('card')}
        className={`
          px-3 py-1.5 rounded-md text-sm font-medium transition-all
          ${mode === 'card' 
            ? 'bg-background shadow text-foreground' 
            : 'text-muted-foreground hover:text-foreground'
          }
        `}
      >
        🃏 Kort
      </button>
    </div>
  );
}
