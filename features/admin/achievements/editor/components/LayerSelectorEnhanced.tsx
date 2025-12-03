'use client';

import { CheckIcon } from "@heroicons/react/24/outline";
import { AchievementLayer, AchievementLayerType } from "../../types";

type LayerSelectorEnhancedProps = {
  title: string;
  description: string;
  type: AchievementLayerType;
  layers: AchievementLayer[];
  selectedId?: string;
  onSelect: (type: AchievementLayerType, id: string) => void;
};

// Icon mapping for layer thumbnails
const layerIcons: Record<string, string> = {
  'base-shield': '🛡️',
  'base-circle': '⭕',
  'base-ribbon': '🎀',
  'bg-wings': '🦋',
  'bg-laurel': '🌿',
  'fg-stars': '⭐',
  'fg-crown': '👑',
  'sym-heart': '❤️',
  'sym-lightning': '⚡',
  'sym-book': '📖',
  'sym-dice': '🎲',
};

// Category colors
const categoryColors: Record<AchievementLayerType, string> = {
  base: 'from-purple-500/20 to-purple-600/10',
  background: 'from-teal-500/20 to-teal-600/10',
  foreground: 'from-amber-500/20 to-amber-600/10',
  symbol: 'from-rose-500/20 to-rose-600/10',
};

export function LayerSelectorEnhanced({ 
  title, 
  description,
  type, 
  layers, 
  selectedId, 
  onSelect 
}: LayerSelectorEnhancedProps) {
  const options = layers.filter((layer) => layer.type === type);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {/* None option */}
        <button
          type="button"
          onClick={() => onSelect(type, '')}
          className={`
            group relative flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-200
            ${!selectedId
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-border/60 bg-muted/30 hover:border-primary/40 hover:shadow-md'
            }
          `}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
            ∅
          </span>
          <span className={`text-sm font-medium truncate ${!selectedId ? 'text-primary' : 'text-foreground'}`}>
            None
          </span>
          {!selectedId && (
            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
              <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} />
            </div>
          )}
        </button>

        {options.map((layer) => {
          const isActive = selectedId === layer.id;
          const icon = layerIcons[layer.id] || '✨';
          
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => onSelect(type, layer.id)}
              className={`
                group relative flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-200
                ${isActive
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border/60 bg-muted/30 hover:border-primary/40 hover:shadow-md'
                }
              `}
            >
              {/* Thumbnail */}
              <span 
                className={`
                  flex h-8 w-8 items-center justify-center rounded-lg text-lg
                  bg-gradient-to-br ${categoryColors[type]}
                  transition-transform group-hover:scale-110
                `}
              >
                {icon}
              </span>
              
              {/* Label */}
              <span className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                {layer.name}
              </span>

              {/* Selection indicator */}
              {isActive && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                  <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
