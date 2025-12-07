'use client';

import { useState } from 'react';

type PreviewBackgroundPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

// Predefined backgrounds for circle
const CIRCLE_BACKGROUNDS = [
  { color: 'transparent', label: 'Transparent' },
  { color: '#1F2937', label: 'Mörk grå' },
  { color: '#000000', label: 'Svart' },
  { color: '#FFFFFF', label: 'Vit' },
  { color: '#F3F4F6', label: 'Ljus grå' },
  { color: '#8661FF', label: 'Lila' },
  { color: '#059669', label: 'Grön' },
];

// Predefined backgrounds for card
const CARD_BACKGROUNDS = [
  { color: '#FFFFFF', label: 'Vit' },
  { color: '#F3F4F6', label: 'Ljus grå' },
  { color: '#1F2937', label: 'Mörk grå' },
  { color: '#000000', label: 'Svart' },
  { color: '#8661FF', label: 'Lila' },
  { color: '#059669', label: 'Grön' },
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
        {CIRCLE_BACKGROUNDS.map((bg) => (
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
              ${bg.color === 'transparent' ? 'bg-[repeating-conic-gradient(#d1d5db_0_90deg,#e5e7eb_90deg_180deg)] bg-[length:8px_8px]' : ''}
            `}
            style={bg.color !== 'transparent' ? { backgroundColor: bg.color } : undefined}
          >
            <span className="sr-only">{bg.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Extended picker for circle background (includes transparent option)
 */
type CircleBackgroundPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function CircleBackgroundPicker({ value, onChange }: CircleBackgroundPickerProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Cirkelbakgrund:</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {CIRCLE_BACKGROUNDS.map((bg) => (
          <button
            key={bg.color}
            type="button"
            onClick={() => onChange(bg.color)}
            title={bg.label}
            className={`
              w-7 h-7 rounded-lg border-2 transition-all
              ${value === bg.color 
                ? 'border-primary ring-2 ring-primary/20' 
                : 'border-border/50 hover:border-border'
              }
              ${bg.color === 'transparent' ? 'bg-[repeating-conic-gradient(#d1d5db_0_90deg,#e5e7eb_90deg_180deg)] bg-[length:8px_8px]' : ''}
            `}
            style={bg.color !== 'transparent' ? { backgroundColor: bg.color } : undefined}
          >
            <span className="sr-only">{bg.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Extended picker for card background with text color option
 */
type CardBackgroundPickerProps = {
  cardBackground: string;
  onCardBackgroundChange: (color: string) => void;
  textColor: 'dark' | 'gray' | 'light';
  onTextColorChange: (color: 'dark' | 'gray' | 'light') => void;
};

export function CardBackgroundPicker({ 
  cardBackground, 
  onCardBackgroundChange,
  textColor,
  onTextColorChange,
}: CardBackgroundPickerProps) {
  const isLightBackground = ['#FFFFFF', '#F3F4F6'].includes(cardBackground);

  return (
    <div className="space-y-3">
      {/* Card Background */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Kortbakgrund:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CARD_BACKGROUNDS.map((bg) => (
            <button
              key={bg.color}
              type="button"
              onClick={() => onCardBackgroundChange(bg.color)}
              title={bg.label}
              className={`
                w-7 h-7 rounded-lg border-2 transition-all
                ${cardBackground === bg.color 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'border-border/50 hover:border-border'
                }
              `}
              style={{ backgroundColor: bg.color }}
            >
              <span className="sr-only">{bg.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Text Color - only show if non-light background */}
      {!isLightBackground && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Textfärg:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTextColorChange('dark')}
              className={`
                px-2.5 py-1 rounded-md text-xs font-medium border transition-all
                ${textColor === 'dark' 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border text-muted-foreground hover:border-primary/50'
                }
              `}
            >
              Mörk
            </button>
            <button
              type="button"
              onClick={() => onTextColorChange('gray')}
              className={`
                px-2.5 py-1 rounded-md text-xs font-medium border transition-all
                ${textColor === 'gray' 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border text-muted-foreground hover:border-primary/50'
                }
              `}
            >
              Grå
            </button>
            <button
              type="button"
              onClick={() => onTextColorChange('light')}
              className={`
                px-2.5 py-1 rounded-md text-xs font-medium border transition-all
                ${textColor === 'light' 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border text-muted-foreground hover:border-primary/50'
                }
              `}
            >
              Ljus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Extended version with custom color option (legacy)
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
  const isCustom = !CIRCLE_BACKGROUNDS.some(bg => bg.color === value);

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Cirkelbakgrund:</span>
      
      <div className="flex items-center gap-1.5 flex-wrap">
        {CIRCLE_BACKGROUNDS.map((bg) => (
          <button
            key={bg.color}
            type="button"
            onClick={() => onChange(bg.color)}
            title={bg.label}
            className={`
              w-7 h-7 rounded-lg border-2 transition-all
              ${value === bg.color 
                ? 'border-primary ring-2 ring-primary/20' 
                : 'border-border/50 hover:border-border'
              }
              ${bg.color === 'transparent' ? 'bg-[repeating-conic-gradient(#d1d5db_0_90deg,#e5e7eb_90deg_180deg)] bg-[length:8px_8px]' : ''}
            `}
            style={bg.color !== 'transparent' ? { backgroundColor: bg.color } : undefined}
          >
            <span className="sr-only">{bg.label}</span>
          </button>
        ))}

        {showCustom && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className={`
                w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center text-xs
                ${isCustom 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'border-border/50 hover:border-border bg-muted/50'
                }
              `}
              style={isCustom ? { backgroundColor: value } : undefined}
              title="Egen färg"
            >
              {!isCustom && '+'}
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
