/**
 * Color Palette Utilities
 *
 * Extracted from Journey sandbox for production use.
 * Used by XP-bar skins, skill tree cosmetics, and color mode system.
 *
 * Pure functions — no React, no side effects.
 */

// ---------------------------------------------------------------------------
// Core converters
// ---------------------------------------------------------------------------

/** Parse a hex color (#rrggbb) to HSL */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 50 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/** Convert HSL values to hex (#rrggbb) */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ---------------------------------------------------------------------------
// Manipulators
// ---------------------------------------------------------------------------

/** Lighten a hex color by `amount` (0–1). Softens saturation slightly. */
export function lightenColor(hex: string, amount: number): string {
  const hsl = hexToHSL(hex);
  const newL = hsl.l + (100 - hsl.l) * amount;
  const newS = hsl.s * (1 - amount * 0.3);
  return hslToHex(hsl.h, newS, newL);
}

/** Darken a hex color by `amount` (0–1). */
export function darkenColor(hex: string, amount: number): string {
  const hsl = hexToHSL(hex);
  const newL = hsl.l * (1 - amount);
  return hslToHex(hsl.h, hsl.s, newL);
}

/** Get the complementary color (180° rotation). */
export function complementary(hex: string): string {
  const hsl = hexToHSL(hex);
  return hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l);
}

/** Create an alpha-transparency version: "rgba(r,g,b, alpha)" */
export function withAlpha(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// Color Modes (cosmetic palettes)
// ---------------------------------------------------------------------------

export type ColorMode =
  | "accent"
  | "duo"
  | "rainbow"
  | "fire"
  | "ice"
  | "toxic"
  | "sunset"
  | "galaxy";

/** All available color modes (for UI selectors). */
export const COLOR_MODES: ColorMode[] = [
  "accent",
  "duo",
  "rainbow",
  "fire",
  "ice",
  "toxic",
  "sunset",
  "galaxy",
];

const COLOR_PALETTES: Record<ColorMode, (accent: string) => string[]> = {
  accent: (a) => [a, a, a, a],
  duo: (a) => {
    const comp = complementary(a);
    return [a, comp, a, comp];
  },
  rainbow: () => [
    "#ff3366",
    "#ff9933",
    "#ffdd33",
    "#33ff99",
    "#3399ff",
    "#9933ff",
    "#ff3366",
  ],
  fire: () => ["#ff2200", "#ff6600", "#ffaa00", "#ffdd44", "#ff6600"],
  ice: () => ["#00ccff", "#0088ff", "#66ddff", "#aaeeff", "#0066cc", "#00ccff"],
  toxic: () => [
    "#39ff14",
    "#00ff88",
    "#88ff00",
    "#ccff00",
    "#00ff44",
    "#39ff14",
  ],
  sunset: () => [
    "#ff6b6b",
    "#ee5a24",
    "#f0932b",
    "#ffbe76",
    "#ff7979",
    "#e056fd",
  ],
  galaxy: () => [
    "#9b59b6",
    "#3498db",
    "#e056fd",
    "#48dbfb",
    "#a29bfe",
    "#fd79a8",
    "#9b59b6",
  ],
};

/** Get the color array for a given color mode + accent. */
export function getColorPalette(mode: ColorMode, accent: string): string[] {
  return COLOR_PALETTES[mode](accent);
}

/** Build a CSS linear-gradient string from a palette. */
export function paletteGradient(
  mode: ColorMode,
  accent: string,
  angle = 90,
): string {
  if (mode === "accent") return accent;
  const colors = getColorPalette(mode, accent);
  return `linear-gradient(${angle}deg, ${colors.join(", ")})`;
}

/** Build a CSS conic-gradient from a palette. */
export function paletteConicGradient(
  mode: ColorMode,
  accent: string,
  from = 0,
): string {
  if (mode === "accent")
    return `conic-gradient(from ${from}deg, ${accent}30, ${accent}, ${accent}30)`;
  const colors = getColorPalette(mode, accent);
  const stops = colors
    .map(
      (c, i) =>
        `${c} ${Math.round((i / (colors.length - 1)) * 100)}%`,
    )
    .join(", ");
  return `conic-gradient(from ${from}deg, ${stops})`;
}
