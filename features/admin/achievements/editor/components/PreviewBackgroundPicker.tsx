'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';

type PreviewBackgroundPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

// Predefined backgrounds for circle - with labels for button style
const CIRCLE_BACKGROUNDS = [
  { color: 'transparent', labelKey: 'backgrounds.transparent' },
  { color: '#1F2937', labelKey: 'backgrounds.dark' },
  { color: '#000000', labelKey: 'backgrounds.black' },
  { color: '#FFFFFF', labelKey: 'backgrounds.white' },
  { color: '#F3F4F6', labelKey: 'backgrounds.light' },
];

// Predefined backgrounds for card - with labels for button style
const CARD_BACKGROUNDS = [
  { color: '#FFFFFF', labelKey: 'backgrounds.white' },
  { color: '#F3F4F6', labelKey: 'backgrounds.light' },
  { color: '#1F2937', labelKey: 'backgrounds.dark' },
  { color: '#000000', labelKey: 'backgrounds.black' },
];

// Text color presets
const TEXT_COLOR_PRESETS = [
  { color: '#1F2937', labelKey: 'backgrounds.dark' },
  { color: '#6B7280', labelKey: 'backgrounds.gray' },
  { color: '#FFFFFF', labelKey: 'backgrounds.light' },
];

/**
 * Simple picker for preview background color
 * Helps users see how their badge looks on different backgrounds
 */
export function PreviewBackgroundPicker({ value, onChange }: PreviewBackgroundPickerProps) {
  const t = useTranslations('admin.achievements.editor');
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{t('backgrounds.label')}:</span>
      <div className="flex gap-1">
        {CIRCLE_BACKGROUNDS.map((bg) => (
          <button
            key={bg.color}
            type="button"
            onClick={() => onChange(bg.color)}
            title={t(bg.labelKey)}
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
            <span className="sr-only">{t(bg.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Extended picker for circle background (includes transparent option)
 * Uses button style with labels like text color picker
 */
type CircleBackgroundPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function CircleBackgroundPicker({ value, onChange }: CircleBackgroundPickerProps) {
  const t = useTranslations('admin.achievements.editor');
  const inputRef = useRef<HTMLInputElement>(null);
  const isCustom = !CIRCLE_BACKGROUNDS.some(bg => bg.color === value);

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{t('backgrounds.circleBackground')}:</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {CIRCLE_BACKGROUNDS.map((bg) => (
          <button
            key={bg.color}
            type="button"
            onClick={() => onChange(bg.color)}
            title={t(bg.labelKey)}
            className={`
              px-2.5 py-1 rounded-md text-xs font-medium border-2 transition-all
              ${value === bg.color 
                ? 'border-primary bg-primary/10 text-primary' 
                : 'border-border text-muted-foreground hover:border-primary/50'
              }
            `}
          >
            {t(bg.labelKey)}
          </button>
        ))}
        
        {/* Custom color picker */}
        <div className="relative">
          <input
            ref={inputRef}
            type="color"
            value={isCustom && value !== 'transparent' ? value : '#808080'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title={t('backgrounds.selectCustomColor')}
            className={`
              px-2.5 py-1 rounded-md text-xs font-medium border-2 transition-all flex items-center gap-1
              ${isCustom && value !== 'transparent'
                ? 'border-primary bg-primary/10 text-primary' 
                : 'border-dashed border-muted-foreground/50 hover:border-primary text-muted-foreground'
              }
            `}
          >
            {isCustom && value !== 'transparent' ? (
              <>
                <span 
                  className="w-3 h-3 rounded-full border border-border/50"
                  style={{ backgroundColor: value }}
                />
                {t('backgrounds.custom')}
              </>
            ) : (
              t('backgrounds.customEllipsis')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Extended picker for card background with text color option
 * Uses button style with labels (same as text color picker)
 */
type CardBackgroundPickerProps = {
  cardBackground: string;
  onCardBackgroundChange: (color: string) => void;
  textColor: string;
  onTextColorChange: (color: string) => void;
};

export function CardBackgroundPicker({ 
  cardBackground, 
  onCardBackgroundChange,
  textColor,
  onTextColorChange,
}: CardBackgroundPickerProps) {
  const t = useTranslations('admin.achievements.editor');
  const bgInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  
  const isCustomBg = !CARD_BACKGROUNDS.some(bg => bg.color === cardBackground);
  const isCustomText = !TEXT_COLOR_PRESETS.some(tc => tc.color === textColor);

  return (
    <div className="space-y-3">
      {/* Card Background - button style with labels */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">{t('cardBackground')}:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CARD_BACKGROUNDS.map((bg) => (
            <button
              key={bg.color}
              type="button"
              onClick={() => onCardBackgroundChange(bg.color)}
              title={t(bg.labelKey)}
              className={`
                px-2.5 py-1 rounded-md text-xs font-medium border-2 transition-all
                ${cardBackground === bg.color 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border text-muted-foreground hover:border-primary/50'
                }
              `}
            >
              {t(bg.labelKey)}
            </button>
          ))}
          
          {/* Custom color picker for background */}
          <div className="relative">
            <input
              ref={bgInputRef}
              type="color"
              value={isCustomBg ? cardBackground : '#808080'}
              onChange={(e) => onCardBackgroundChange(e.target.value.toUpperCase())}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => bgInputRef.current?.click()}
              title={t('selectCustomColor')}
              className={`
                px-2.5 py-1 rounded-md text-xs font-medium border-2 transition-all flex items-center gap-1
                ${isCustomBg 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-dashed border-muted-foreground/50 hover:border-primary text-muted-foreground'
                }
              `}
            >
              {isCustomBg ? (
                <>
                  <span 
                    className="w-3 h-3 rounded-full border border-border/50"
                    style={{ backgroundColor: cardBackground }}
                  />
                  {t('custom')}
                </>
              ) : (
                t('customEllipsis')
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Text Color - button style with labels */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">{t('textColor')}:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {TEXT_COLOR_PRESETS.map((tc) => (
            <button
              key={tc.color}
              type="button"
              onClick={() => onTextColorChange(tc.color)}
              title={t(tc.labelKey)}
              className={`
                px-2.5 py-1 rounded-md text-xs font-medium border-2 transition-all
                ${textColor === tc.color 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border text-muted-foreground hover:border-primary/50'
                }
              `}
            >
              {t(tc.labelKey)}
            </button>
          ))}
          
          {/* Custom text color picker */}
          <div className="relative">
            <input
              ref={textInputRef}
              type="color"
              value={isCustomText ? textColor : '#808080'}
              onChange={(e) => onTextColorChange(e.target.value.toUpperCase())}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => textInputRef.current?.click()}
              title={t('selectCustomTextColor')}
              className={`
                px-2.5 py-1 rounded-md text-xs font-medium border-2 transition-all flex items-center gap-1
                ${isCustomText 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-dashed border-muted-foreground/50 hover:border-primary text-muted-foreground'
                }
              `}
            >
              {isCustomText ? (
                <>
                  <span 
                    className="w-3 h-3 rounded-full border border-border/50"
                    style={{ backgroundColor: textColor }}
                  />
                  {t('custom')}
                </>
              ) : (
                t('customEllipsis')
              )}
            </button>
          </div>
        </div>
      </div>
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
  const t = useTranslations('admin.achievements.editor');
  const [showPicker, setShowPicker] = useState(false);
  const isCustom = !CIRCLE_BACKGROUNDS.some(bg => bg.color === value);

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{t('circleBackground')}:</span>
      
      <div className="flex items-center gap-1.5 flex-wrap">
        {CIRCLE_BACKGROUNDS.map((bg) => (
          <button
            key={bg.color}
            type="button"
            onClick={() => onChange(bg.color)}
            title={t(bg.labelKey)}
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
            <span className="sr-only">{t(bg.labelKey)}</span>
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
              title={t('customColor')}
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
