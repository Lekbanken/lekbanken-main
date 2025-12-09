'use client';

import { useColors } from '../../store/sandbox-store';
import { generateAccentPalette } from '../../tokens/colors';

export function ColorPalettePreview() {
  const { accentHue, colorScheme } = useColors();
  const palette = generateAccentPalette(accentHue);

  return (
    <div className="space-y-6">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Accent Palette
      </div>

      {/* Full palette */}
      <div className="grid grid-cols-11 gap-1">
        {Object.entries(palette).map(([shade, color]) => (
          <div key={shade} className="text-center">
            <div
              className="mb-2 aspect-square w-full rounded-md"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-muted-foreground">{shade}</span>
          </div>
        ))}
      </div>

      {/* Primary and complementary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Primary</div>
          <div
            className="h-20 rounded-md"
            style={{ backgroundColor: `hsl(${accentHue}, 70%, 50%)` }}
          />
          <div className="mt-2 font-mono text-xs text-muted-foreground">
            hsl({accentHue}, 70%, 50%)
          </div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Complementary</div>
          <div
            className="h-20 rounded-md"
            style={{ backgroundColor: `hsl(${(accentHue + 180) % 360}, 70%, 50%)` }}
          />
          <div className="mt-2 font-mono text-xs text-muted-foreground">
            hsl({(accentHue + 180) % 360}, 70%, 50%)
          </div>
        </div>
      </div>

      {/* Semantic colors */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Semantic Colors
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { name: 'Success', hue: 142 },
            { name: 'Warning', hue: 38 },
            { name: 'Error', hue: 0 },
            { name: 'Info', hue: 200 },
          ].map((semantic) => (
            <div key={semantic.name} className="text-center">
              <div
                className="mb-2 h-12 rounded-md"
                style={{ backgroundColor: `hsl(${semantic.hue}, 70%, 50%)` }}
              />
              <span className="text-xs text-muted-foreground">{semantic.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Light/Dark surfaces */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Surface Levels ({colorScheme})
        </div>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((level) => {
            const lightness = colorScheme === 'light' ? 100 - level * 3 : 8 + level * 4;
            return (
              <div key={level} className="flex-1 text-center">
                <div
                  className="mb-2 h-16 rounded-md border border-border"
                  style={{ backgroundColor: `hsl(0, 0%, ${lightness}%)` }}
                />
                <span className="text-[10px] text-muted-foreground">L{level}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
