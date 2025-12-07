'use client';

import { useState } from 'react';

type PreviewBackgroundPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

// Predefined backgrounds for preview
const PREVIEW_BACKGROUNDS = [
  { color: '#1F2937', label: 'Mörk grå', icon: '🌙' },
  { color: '#FFFFFF', label: 'Vit', icon: '☀️' },
  { color: '#000000', label: 'Svart', icon: '⬛' },
  { color: '#F3F4F6', label: 'Ljus grå', icon: '⬜' },
  { color: '#8661FF', label: 'Lila (app)', icon: '💜' },
  { color: '#059669', label: 'Grön (spel)', icon: '💚' },
];

/**
 * Simple picker for preview background color
 * Helps users see how their badge looks on different backgrounds
 */
export function PreviewBackgroundPicker({ value, onChange }: PreviewBackgroundPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Bakgrund:</span>
      <div className="flex gap-1">
        {PREVIEW_BACKGROUNDS.map((bg) => (
          <button
            key={bg.color}
            type="button"
            onClick={() => onChange(bg.color)}
            title={bg.label}
            className={`
              w-6 h-6 rounded-md border-2 transition-all text-xs
              ${value === bg.color 
                ? 'border-primary scale-110 shadow-md' 
                : 'border-border hover:border-primary/50 hover:scale-105'
              }
            `}
            style={{ backgroundColor: bg.color }}
          >
            <span className="sr-only">{bg.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Extended version with custom color option
 */
type PreviewBackgroundPickerExtendedProps = {
  value: string;
  onChange: (color: string) => void;
  showCustom?: boolean;
};

export function PreviewBackgroundPickerExtended({ 
  value, 
  onChange, 
  showCustom = true 
}: PreviewBackgroundPickerExtendedProps) {
  const [showPicker, setShowPicker] = useState(false);
  const isCustom = !PREVIEW_BACKGROUNDS.some(bg => bg.color === value);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground">Förhandsvisning på:</span>
      
      <div className="flex items-center gap-1.5">
        {PREVIEW_BACKGROUNDS.map((bg) => (
          <button
            key={bg.color}
            type="button"
            onClick={() => onChange(bg.color)}
            title={bg.label}
            className={`
              w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center
              ${value === bg.color 
                ? 'border-primary ring-2 ring-primary/20' 
                : 'border-border/50 hover:border-border'
              }
            `}
            style={{ backgroundColor: bg.color }}
          >
            <span className="text-xs">{bg.icon}</span>
          </button>
        ))}

        {showCustom && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className={`
                w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center
                ${isCustom 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'border-border/50 hover:border-border bg-muted/50'
                }
              `}
              style={isCustom ? { backgroundColor: value } : undefined}
              title="Egen färg"
            >
              {!isCustom && <span className="text-xs">🎨</span>}
            </button>
            
            {showPicker && (
              <div className="absolute top-full mt-2 right-0 z-50 p-2 bg-background rounded-lg border shadow-lg">
                <input
                  type="color"
                  value={isCustom ? value : '#808080'}
                  onChange={(e) => {
                    onChange(e.target.value);
                    setShowPicker(false);
                  }}
                  className="w-24 h-8 rounded cursor-pointer"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
