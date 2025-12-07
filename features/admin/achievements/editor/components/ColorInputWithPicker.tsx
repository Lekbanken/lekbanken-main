'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { EyeDropperIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

type ColorInputWithPickerProps = {
  label: string;
  description?: string;
  value: string;
  onChange: (color: string) => void;
  layerPreviewSrc?: string;
  layerName?: string;
  /** Compact mode for smaller color buttons */
  compact?: boolean;
};

// Lekbanken's standard palette - compact version without emojis
const LEKBANKEN_PALETTE = [
  { color: '#F1C232', label: 'Guld', category: 'medal' },
  { color: '#B4B4B4', label: 'Silver', category: 'medal' },
  { color: '#CD7F32', label: 'Brons', category: 'medal' },
  { color: '#8661FF', label: 'Lila', category: 'brand' },
  { color: '#00C7B0', label: 'Turkos', category: 'brand' },
  { color: '#FFD166', label: 'Gul', category: 'brand' },
  { color: '#F59E0B', label: 'Orange', category: 'brand' },
  { color: '#EF4444', label: 'Röd', category: 'accent' },
  { color: '#3B82F6', label: 'Blå', category: 'accent' },
  { color: '#10B981', label: 'Grön', category: 'accent' },
  { color: '#FFFFFF', label: 'Vit', category: 'neutral' },
  { color: '#1F2937', label: 'Mörk', category: 'neutral' },
];

/**
 * Color input with hex editing, color picker, and palette.
 * Shows layer preview image if provided.
 * 
 * Compact mode shows just small round color buttons.
 */
export function ColorInputWithPicker({
  label,
  description,
  value,
  onChange,
  layerPreviewSrc,
  layerName,
  compact = false,
}: ColorInputWithPickerProps) {
  const [hexInput, setHexInput] = useState(value);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Sync hex input with value
  useEffect(() => {
    setHexInput(value);
  }, [value]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setHexInput(hex);
    
    // Validate and update if valid hex
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  const handleHexBlur = () => {
    // Ensure # prefix
    let hex = hexInput;
    if (!hex.startsWith('#')) hex = '#' + hex;
    
    // Validate
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex);
      setHexInput(hex);
    } else {
      // Reset to current value if invalid
      setHexInput(value);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value.toUpperCase();
    onChange(newColor);
    setHexInput(newColor);
  };

  const handlePaletteClick = (color: string) => {
    onChange(color);
    setHexInput(color);
  };

  // Open native color picker directly
  const openNativeColorPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    colorInputRef.current?.click();
  };

  // Compact mode: just small round color buttons in a row
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">{label}</p>
          <input
            type="text"
            value={hexInput}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            className="w-20 text-xs font-mono bg-muted/50 rounded px-2 py-1 text-center uppercase"
            placeholder="#FFFFFF"
          />
        </div>
        
        <div className="flex items-center gap-1.5 flex-wrap">
          {LEKBANKEN_PALETTE.map((p) => (
            <button
              key={p.color}
              type="button"
              onClick={() => handlePaletteClick(p.color)}
              title={p.label}
              className={`
                h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center
                ${value === p.color 
                  ? 'border-primary scale-110 shadow-md ring-2 ring-primary/20' 
                  : 'border-border/50 hover:border-border hover:scale-110'
                }
              `}
              style={{ backgroundColor: p.color }}
            >
              {value === p.color && (
                <CheckIcon className={`h-3 w-3 ${p.color === '#FFFFFF' || p.color === '#FFD166' ? 'text-gray-800' : 'text-white'}`} />
              )}
            </button>
          ))}
          
          {/* Custom color picker */}
          <div className="relative">
            <input
              ref={colorInputRef}
              type="color"
              value={value}
              onChange={handleColorPickerChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-6 h-6"
            />
            <button
              type="button"
              onClick={openNativeColorPicker}
              title="Välj egen färg"
              className={`
                h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/50 
                hover:border-primary transition-all flex items-center justify-center
                bg-gradient-conic from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500
              `}
              style={{
                background: 'conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ef4444)'
              }}
            >
              <EyeDropperIcon className="h-3 w-3 text-white drop-shadow-md" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main row with layer preview, label, and color controls */}
      <div className="flex items-center gap-3 rounded-xl border-2 border-border px-3 py-2 bg-background">
        {/* Layer preview image */}
        {layerPreviewSrc && (
          <div className="flex-shrink-0">
            <Image
              src={layerPreviewSrc}
              alt={layerName || label}
              width={32}
              height={32}
              className="rounded"
              unoptimized
            />
          </div>
        )}

        {/* Label and name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {layerName || label}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Color swatch with native picker, and hex input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              ref={colorInputRef}
              type="color"
              value={value}
              onChange={handleColorPickerChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7"
            />
            <div
              className="h-7 w-7 rounded-lg border border-border shadow-inner cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
              style={{ backgroundColor: value }}
              onClick={openNativeColorPicker}
              title="Klicka för att välja egen färg"
            />
          </div>
          <input
            type="text"
            value={hexInput}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            className="w-20 text-xs font-mono bg-muted/50 rounded px-2 py-1 text-center uppercase"
            placeholder="#FFFFFF"
          />
        </div>
      </div>

      {/* Color palette - always visible */}
      <div className="flex items-center gap-1.5 flex-wrap pl-1">
        {LEKBANKEN_PALETTE.map((p) => (
          <button
            key={p.color}
            type="button"
            onClick={() => handlePaletteClick(p.color)}
            title={p.label}
            className={`
              h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center
              ${value === p.color 
                ? 'border-primary scale-110 shadow-md ring-2 ring-primary/20' 
                : 'border-border/50 hover:border-border hover:scale-110'
              }
            `}
            style={{ backgroundColor: p.color }}
          >
            {value === p.color && (
              <CheckIcon className={`h-3 w-3 ${p.color === '#FFFFFF' || p.color === '#FFD166' ? 'text-gray-800' : 'text-white'}`} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
