'use client';

import { useLogo, useTypography, useColors } from '../../store/sandbox-store';
import { getFontFamily } from '../../tokens/fonts';
import { SparklesIcon } from '@heroicons/react/24/solid';

const logoSizes = {
  sm: { icon: 24, text: 16 },
  md: { icon: 32, text: 20 },
  lg: { icon: 48, text: 28 },
  xl: { icon: 64, text: 36 },
};

export function LogoLockup() {
  const { logoLayout, logoCase, logoSize, logoLetterSpacing } = useLogo();
  const { fontPrimary } = useTypography();
  const { accentHue } = useColors();
  
  const fontFamily = getFontFamily(fontPrimary);
  const sizes = logoSizes[logoSize];
  
  // Transform text based on logoCase
  const brandName = 'Lekbanken';
  const displayName =
    logoCase === 'uppercase'
      ? brandName.toUpperCase()
      : logoCase === 'lowercase'
      ? brandName.toLowerCase()
      : brandName;

  const isVertical = logoLayout === 'icon-top';
  const showIcon = logoLayout !== 'text-only';
  const showText = logoLayout !== 'icon-only';

  return (
    <div className="space-y-6">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Logo Lockup
      </div>

      {/* Main preview */}
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
        <div
          className={`flex items-center ${
            isVertical ? 'flex-col gap-2' : 'flex-row gap-3'
          }`}
        >
          {showIcon && (
            <SparklesIcon
              style={{
                width: sizes.icon,
                height: sizes.icon,
                color: `hsl(${accentHue}, 70%, 50%)`,
              }}
            />
          )}
          {showText && (
            <span
              style={{
                fontFamily,
                fontSize: sizes.text,
                letterSpacing: `${logoLetterSpacing}em`,
              }}
              className="font-semibold text-foreground"
            >
              {displayName}
            </span>
          )}
        </div>
      </div>

      {/* All sizes preview */}
      <div className="space-y-4 border-t border-border pt-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          All Sizes
        </div>
        <div className="flex flex-wrap items-end gap-8">
          {(Object.keys(logoSizes) as Array<keyof typeof logoSizes>).map((size) => {
            const s = logoSizes[size];
            return (
              <div key={size} className="flex flex-col items-center gap-2">
                <div
                  className={`flex items-center ${
                    isVertical ? 'flex-col gap-1' : 'flex-row gap-2'
                  }`}
                >
                  {showIcon && (
                    <SparklesIcon
                      style={{
                        width: s.icon,
                        height: s.icon,
                        color: `hsl(${accentHue}, 70%, 50%)`,
                      }}
                    />
                  )}
                  {showText && (
                    <span
                      style={{
                        fontFamily,
                        fontSize: s.text,
                        letterSpacing: `${logoLetterSpacing}em`,
                      }}
                      className="font-semibold text-foreground"
                    >
                      {displayName}
                    </span>
                  )}
                </div>
                <span className="text-[10px] uppercase text-muted-foreground">{size}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lockup variations */}
      <div className="space-y-4 border-t border-border pt-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Variations
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(['icon-left', 'icon-top', 'icon-only', 'text-only'] as const).map((layout) => {
            const isV = layout === 'icon-top';
            const hasIcon = layout !== 'text-only';
            const hasText = layout !== 'icon-only';
            const s = logoSizes.md;

            return (
              <div
                key={layout}
                className={`flex items-center justify-center rounded-lg border p-6 transition-colors ${
                  logoLayout === layout
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/30'
                }`}
              >
                <div
                  className={`flex items-center ${
                    isV ? 'flex-col gap-1' : 'flex-row gap-2'
                  }`}
                >
                  {hasIcon && (
                    <SparklesIcon
                      style={{
                        width: s.icon,
                        height: s.icon,
                        color: `hsl(${accentHue}, 70%, 50%)`,
                      }}
                    />
                  )}
                  {hasText && (
                    <span
                      style={{
                        fontFamily,
                        fontSize: s.text,
                        letterSpacing: `${logoLetterSpacing}em`,
                      }}
                      className="font-semibold text-foreground"
                    >
                      {displayName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
