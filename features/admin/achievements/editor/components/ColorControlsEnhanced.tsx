'use client';

import { SwatchIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui";

type ColorControlsEnhancedProps = {
  value: { base: string; background: string; foreground: string; symbol: string };
  onChange: (value: Partial<{ base: string; background: string; foreground: string; symbol: string }>) => void;
  hasCustomColors?: boolean;
};

const colorLabels: Record<keyof ColorControlsEnhancedProps['value'], { label: string; description: string }> = {
  base: { label: 'Base', description: 'Primary badge color' },
  background: { label: 'Background', description: 'Back decoration tint' },
  foreground: { label: 'Foreground', description: 'Front decoration tint' },
  symbol: { label: 'Symbol', description: 'Center icon color' },
};

export function ColorControlsEnhanced({ value, onChange, hasCustomColors }: ColorControlsEnhancedProps) {
  const handleChange = (key: keyof typeof value, color: string) => {
    onChange({ [key]: color });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <SwatchIcon className="h-4 w-4 text-primary" />
          Color Controls
        </h3>
        {hasCustomColors && (
          <Badge variant="warning" size="sm" className="gap-1">
            <SparklesIcon className="h-3 w-3" />
            Custom
          </Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Fine-tune colors for each layer. Editing colors will override the theme preset.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(colorLabels) as Array<keyof typeof colorLabels>).map((key) => {
          const config = colorLabels[key];
          return (
            <label 
              key={key} 
              className="group relative flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 transition-all hover:border-primary/40 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {/* Color swatch */}
                <div 
                  className="relative h-8 w-8 rounded-lg shadow-sm ring-1 ring-black/10 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: value[key] }}
                >
                  {/* Picker overlay */}
                  <input
                    type="color"
                    value={value[key]}
                    onChange={(event) => handleChange(key, event.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">{config.label}</span>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </div>
              
              {/* Hex value */}
              <span className="text-xs font-mono text-muted-foreground uppercase">
                {value[key]}
              </span>
            </label>
          );
        })}
      </div>

      {/* Quick swatches */}
      <div className="pt-2 border-t border-border/30">
        <p className="text-xs text-muted-foreground mb-2">Lekbanken Palette</p>
        <div className="flex gap-2">
          {[
            { color: '#8661ff', label: 'Primary' },
            { color: '#00c7b0', label: 'Accent' },
            { color: '#ffd166', label: 'Warm' },
            { color: '#22c55e', label: 'Success' },
            { color: '#f97316', label: 'Orange' },
            { color: '#1f2937', label: 'Dark' },
          ].map((swatch) => (
            <button
              key={swatch.color}
              onClick={() => handleChange('base', swatch.color)}
              className="group relative"
              title={swatch.label}
            >
              <div 
                className="h-6 w-6 rounded-full shadow-sm ring-1 ring-black/10 transition-all hover:scale-110 hover:ring-2 hover:ring-primary/50"
                style={{ backgroundColor: swatch.color }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
