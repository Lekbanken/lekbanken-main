'use client';

/**
 * Utility hook for checking color contrast accessibility.
 * Returns WCAG contrast ratios and suggestions.
 */

type ContrastResult = {
  ratio: number;
  level: 'fail' | 'AA-large' | 'AA' | 'AAA';
  passes: boolean;
  suggestion?: string;
};

/**
 * Converts hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculates relative luminance of a color
 * Based on WCAG 2.1 formula
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determines WCAG compliance level based on contrast ratio
 */
function getWcagLevel(ratio: number): ContrastResult['level'] {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-large';
  return 'fail';
}

/**
 * Adjusts a color to improve contrast
 */
function adjustColorForContrast(
  foreground: string,
  background: string,
  targetRatio: number = 4.5
): string {
  const bgRgb = hexToRgb(background);
  const fgRgb = hexToRgb(foreground);

  if (!bgRgb || !fgRgb) return foreground;

  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  // Determine if we should darken or lighten
  const shouldDarken = bgLuminance > 0.5;

  let adjustedRgb = { ...fgRgb };
  let steps = 0;
  const maxSteps = 50;

  while (steps < maxSteps) {
    const currentRatio = getContrastRatio(
      `#${adjustedRgb.r.toString(16).padStart(2, '0')}${adjustedRgb.g.toString(16).padStart(2, '0')}${adjustedRgb.b.toString(16).padStart(2, '0')}`,
      background
    );

    if (currentRatio >= targetRatio) break;

    if (shouldDarken) {
      adjustedRgb = {
        r: Math.max(0, adjustedRgb.r - 5),
        g: Math.max(0, adjustedRgb.g - 5),
        b: Math.max(0, adjustedRgb.b - 5),
      };
    } else {
      adjustedRgb = {
        r: Math.min(255, adjustedRgb.r + 5),
        g: Math.min(255, adjustedRgb.g + 5),
        b: Math.min(255, adjustedRgb.b + 5),
      };
    }

    steps++;
  }

  return `#${adjustedRgb.r.toString(16).padStart(2, '0')}${adjustedRgb.g.toString(16).padStart(2, '0')}${adjustedRgb.b.toString(16).padStart(2, '0')}`;
}

export type ContrastCheckResult = {
  symbolOnBase: ContrastResult;
  baseOnBackground: ContrastResult;
  overallAccessible: boolean;
};

/**
 * Checks contrast for badge colors
 */
export function checkBadgeContrast(colors: {
  base: string;
  background: string;
  symbol: string;
}): ContrastCheckResult {
  const symbolOnBaseRatio = getContrastRatio(colors.symbol, colors.base);
  const baseOnBgRatio = getContrastRatio(colors.base, colors.background);

  const symbolOnBaseLevel = getWcagLevel(symbolOnBaseRatio);
  const baseOnBgLevel = getWcagLevel(baseOnBgRatio);

  const symbolOnBase: ContrastResult = {
    ratio: symbolOnBaseRatio,
    level: symbolOnBaseLevel,
    passes: symbolOnBaseLevel !== 'fail',
    suggestion:
      symbolOnBaseLevel === 'fail'
        ? `Symbol color may be hard to see. Try: ${adjustColorForContrast(colors.symbol, colors.base)}`
        : undefined,
  };

  const baseOnBackground: ContrastResult = {
    ratio: baseOnBgRatio,
    level: baseOnBgLevel,
    passes: baseOnBgLevel !== 'fail',
    suggestion:
      baseOnBgLevel === 'fail'
        ? `Base may blend with background. Try adjusting colors.`
        : undefined,
  };

  return {
    symbolOnBase,
    baseOnBackground,
    overallAccessible: symbolOnBase.passes && baseOnBackground.passes,
  };
}

export { getContrastRatio, adjustColorForContrast, hexToRgb };
