'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { SwatchIcon } from '@heroicons/react/24/outline';

type ColorInputWithPickerProps = {
  label: string;
  description?: string;
  value: string;
  onChange: (color: string) => void;
  layerPreviewSrc?: string;
  layerName?: string;
};

// Lekbanken's standard palette with clear labels
const LEKBANKEN_PALETTE = [
  { color: '#F1C232', label: '🥇 Guld', category: 'medal' },
  { color: '#B4B4B4', label: '🥈 Silver', category: 'medal' },
  { color: '#CD7F32', label: '🥉 Brons', category: 'medal' },
  { color: '#8661FF', label: '💜 Lila', category: 'brand' },
  { color: '#00C7B0', label: '💚 Turkos', category: 'brand' },
  { color: '#FFD166', label: '🧡 Gul', category: 'brand' },
  { color: '#F59E0B', label: '🔶 Orange', category: 'brand' },
  { color: '#EF4444', label: '❤️ Röd', category: 'accent' },
  { color: '#3B82F6', label: '💙 Blå', category: 'accent' },
  { color: '#10B981', label: '💚 Grön', category: 'accent' },
  { color: '#FFFFFF', label: '⬜ Vit', category: 'neutral' },
  { color: '#1F2937', label: '⬛ Mörk', category: 'neutral' },
];

/**
 * Color input with hex editing, color picker, and palette.
 * Shows layer preview image if provided.
 */
export function ColorInputWithPicker({
  label,
  description,
  value,
  onChange,
  layerPreviewSrc,
  layerName,
}: ColorInputWithPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const pickerRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Sync hex input with value
  useEffect(() => {
    setHexInput(value);
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <div ref={pickerRef} className="relative">
      {/* Main trigger row */}
      <div
        className={`
          flex items-center gap-3 rounded-xl border-2 px-3 py-2 cursor-pointer
          transition-all duration-200
          ${isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'}
          bg-background
        `}
        onClick={() => setIsOpen(!isOpen)}
      >
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

        {/* Color swatch and hex */}
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-lg border border-border shadow-inner"
            style={{ backgroundColor: value }}
          />
          <input
            type="text"
            value={hexInput}
            onChange={handleHexChange}
            onBlur={handleHexBlur}
            onClick={(e) => e.stopPropagation()}
            className="w-20 text-xs font-mono bg-muted/50 rounded px-2 py-1 text-center uppercase"
            placeholder="#FFFFFF"
          />
        </div>
      </div>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-background shadow-lg p-4 space-y-4">
          {/* Native color picker */}
          <div className="flex items-center gap-3">
            <input
              ref={colorInputRef}
              type="color"
              value={value}
              onChange={handleColorPickerChange}
              className="h-10 w-10 rounded-lg cursor-pointer border-0 p-0"
            />
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">Välj valfri färg</p>
              <p className="text-[10px] text-muted-foreground">Klicka för att öppna färgväljaren</p>
            </div>
          </div>

          {/* Lekbanken Palette */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <SwatchIcon className="h-3.5 w-3.5 text-primary" />
              Lekbankens Standardfärger
            </p>
            
            {/* Medals row */}
            <div className="flex gap-1.5">
              {LEKBANKEN_PALETTE.filter(p => p.category === 'medal').map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => handlePaletteClick(p.color)}
                  title={p.label}
                  className={`
                    flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all
                    ${value === p.color 
                      ? 'border-primary bg-primary/5 scale-105' 
                      : 'border-transparent hover:border-border hover:bg-muted/50'
                    }
                  `}
                >
                  <div
                    className="h-6 w-6 rounded-full border border-border/50 shadow-sm"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-[10px] text-muted-foreground">{p.label.split(' ')[1]}</span>
                </button>
              ))}
            </div>

            {/* Other colors grid */}
            <div className="grid grid-cols-6 gap-1.5">
              {LEKBANKEN_PALETTE.filter(p => p.category !== 'medal').map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => handlePaletteClick(p.color)}
                  title={p.label}
                  className={`
                    aspect-square rounded-lg border-2 transition-all
                    ${value === p.color 
                      ? 'border-primary scale-110 shadow-md' 
                      : 'border-transparent hover:border-border hover:scale-105'
                    }
                  `}
                  style={{ backgroundColor: p.color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
