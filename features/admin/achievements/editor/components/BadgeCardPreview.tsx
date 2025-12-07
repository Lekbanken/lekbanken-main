'use client';

import { CurrencyDollarIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { BadgePreviewEnhanced } from './BadgePreviewEnhanced';
import { AchievementIconConfig, AchievementAssetType } from '../../types';

type BadgeCardPreviewProps = {
  icon: AchievementIconConfig;
  theme?: { colors: Record<AchievementAssetType, { color: string }> };
  metadata: {
    name: string;
    subtitle?: string;
    description: string;
    points: number;
    category?: string;
    rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    unlockCondition?: string;
  };
  showAsRing?: boolean;
  // Background colors
  circleBackground?: string;
  cardBackground?: string;
  textColor?: 'dark' | 'gray' | 'light';
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

// Text color classes based on selection
const TEXT_COLORS = {
  dark: {
    title: 'text-gray-900',
    subtitle: 'text-gray-700',
    description: 'text-gray-600',
    muted: 'text-gray-500',
  },
  gray: {
    title: 'text-gray-600',
    subtitle: 'text-gray-500',
    description: 'text-gray-400',
    muted: 'text-gray-400',
  },
  light: {
    title: 'text-white',
    subtitle: 'text-gray-200',
    description: 'text-gray-300',
    muted: 'text-gray-400',
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
  circleBackground = '#1F2937',
  cardBackground = '#FFFFFF',
  textColor = 'dark',
}: BadgeCardPreviewProps) {
  const rarity = metadata.rarity || 'common';
  const rarityConfig = RARITY_CONFIG[rarity];
  const colors = TEXT_COLORS[textColor];

  // Check if circle background is transparent
  const isCircleTransparent = circleBackground === 'transparent' || circleBackground === '';

  if (showAsRing) {
    // Simple ring/circle view - only circle has background, not the whole area
    return (
      <div className="flex items-center justify-center rounded-2xl p-8 bg-[repeating-conic-gradient(#e5e7eb_0_90deg,#f3f4f6_90deg_180deg)] bg-[length:20px_20px]">
        <div className="relative">
          {/* Circle background */}
          <div
            className="rounded-full p-4 transition-colors"
            style={{ 
              backgroundColor: isCircleTransparent ? 'transparent' : circleBackground,
            }}
          >
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
      </div>
    );
  }

  // Card view with metadata
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 transition-all duration-300"
      style={{ backgroundColor: cardBackground }}
    >
      {/* Rarity ribbon */}
      {rarity !== 'common' && (
        <div className={`absolute -right-8 top-3 rotate-45 px-8 py-0.5 text-[10px] font-bold uppercase ${rarityConfig.bg} ${rarityConfig.color}`}>
          {rarityConfig.label}
        </div>
      )}

      {/* Main content */}
      <div className="flex gap-4">
        {/* Badge preview with circle background */}
        <div className="flex-shrink-0">
          <div 
            className="relative rounded-full p-2"
            style={{ backgroundColor: isCircleTransparent ? 'transparent' : circleBackground }}
          >
            <BadgePreviewEnhanced icon={icon} theme={theme} size="md" showGlow={false} />
            {rarity === 'legendary' && (
              <SparklesIcon className="absolute -top-1 -right-1 h-5 w-5 text-amber-400 animate-pulse" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className={`font-bold truncate text-lg leading-tight ${colors.title}`}>
            {metadata.name || 'Namnlös utmärkelse'}
          </h3>
          
          {metadata.subtitle && (
            <p className={`text-sm ${colors.subtitle}`}>
              {metadata.subtitle}
            </p>
          )}
          
          <p className={`text-sm line-clamp-2 ${colors.description}`}>
            {metadata.description || 'Ingen beskrivning'}
          </p>

          {/* Points */}
          <div className="flex items-center gap-1 text-sm pt-1">
            <CurrencyDollarIcon className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-amber-600">{metadata.points}</span>
            <span className={`text-xs ${colors.muted}`}>coins</span>
          </div>
        </div>
      </div>
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
    <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
      <button
        type="button"
        onClick={() => onChange('ring')}
        className={`
          px-2 py-1 rounded-md text-xs font-medium transition-all
          ${mode === 'ring' 
            ? 'bg-background shadow text-foreground' 
            : 'text-muted-foreground hover:text-foreground'
          }
        `}
      >
        Bara Utmärkelsen
      </button>
      <button
        type="button"
        onClick={() => onChange('card')}
        className={`
          px-2 py-1 rounded-md text-xs font-medium transition-all
          ${mode === 'card' 
            ? 'bg-background shadow text-foreground' 
            : 'text-muted-foreground hover:text-foreground'
          }
        `}
      >
        Hela Kortet
      </button>
    </div>
  );
}
