'use client';

type BadgePreviewEnhancedProps = {
  layers: { base?: string; background?: string; foreground?: string; symbol?: string };
  colors: { base: string; background: string; foreground: string; symbol: string };
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
};

const sizeConfig = {
  sm: { container: 'h-16 w-16', icon: 'text-lg' },
  md: { container: 'h-24 w-24', icon: 'text-2xl' },
  lg: { container: 'h-40 w-40', icon: 'text-4xl' },
};

// Layer icon mapping
const layerIcons: Record<string, string> = {
  // Base shapes
  'base-shield': '🛡️',
  'base-circle': '⭕',
  'base-ribbon': '🎀',
  // Background decorations
  'bg-wings': '🦋',
  'bg-laurel': '🌿',
  // Foreground decorations
  'fg-stars': '⭐',
  'fg-crown': '👑',
  // Symbols
  'sym-heart': '❤️',
  'sym-lightning': '⚡',
  'sym-book': '📖',
  'sym-dice': '🎲',
};

export function BadgePreviewEnhanced({ layers, colors, size = 'md', showGlow = true }: BadgePreviewEnhancedProps) {
  const config = sizeConfig[size];
  
  return (
    <div className={`relative ${config.container}`}>
      {/* Ambient glow */}
      {showGlow && (
        <div 
          className="absolute inset-0 rounded-full opacity-30 blur-xl pointer-events-none"
          style={{ 
            background: `radial-gradient(circle, ${colors.base}60, transparent 70%)` 
          }}
        />
      )}

      {/* Badge Container */}
      <div 
        className="relative flex h-full w-full items-center justify-center rounded-full shadow-lg"
        style={{ 
          background: `linear-gradient(135deg, ${colors.base}, ${colors.base}cc)`,
          boxShadow: `0 4px 20px ${colors.base}40`
        }}
      >
        {/* Inner ring */}
        <div 
          className="absolute inset-1 rounded-full opacity-30"
          style={{ 
            border: `2px solid ${colors.foreground}`,
          }}
        />

        {/* Background decoration layer */}
        {layers.background && (
          <div 
            className="absolute inset-0 flex items-center justify-center opacity-40"
            style={{ color: colors.background }}
          >
            <span className={`${config.icon} filter drop-shadow-sm`}>
              {layerIcons[layers.background] || '✨'}
            </span>
          </div>
        )}

        {/* Symbol layer (center) */}
        <div 
          className="relative z-10 flex items-center justify-center"
          style={{ color: colors.symbol }}
        >
          <span className={`${config.icon} filter drop-shadow-md`}>
            {layers.symbol ? layerIcons[layers.symbol] || '🏆' : '🏆'}
          </span>
        </div>

        {/* Foreground decoration layer */}
        {layers.foreground && (
          <div 
            className="absolute -top-1 left-1/2 -translate-x-1/2"
            style={{ color: colors.foreground }}
          >
            <span className="text-sm filter drop-shadow-sm">
              {layerIcons[layers.foreground] || '✨'}
            </span>
          </div>
        )}
      </div>

      {/* Layer info tooltip on hover - shown in larger sizes */}
      {size === 'lg' && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {layers.base && <span className="px-1.5 py-0.5 rounded bg-muted/50">{layers.base}</span>}
            {layers.symbol && <span className="px-1.5 py-0.5 rounded bg-muted/50">{layers.symbol}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
