'use client';

// =============================================================================
// Sport Field Backgrounds – data-driven registry with computed placement
// =============================================================================
// Uses the SAME pre-rendered PNG court images as the production Coach Diagram.
// Each variant carries its source aspect ratio so we can compute the exact
// letterboxed (contain-fit) placement within the A4 world (1000 × 1414).
//
// This eliminates any risk of lines being mirrored, inverted, or misplaced —
// the image is always rendered at pixel-exact calculated coordinates with
// preserveAspectRatio="none" (we do the math ourselves).
//
// The `contentBox` describes where the actual playing surface sits within the
// world (normalized 0..1). This can be used later for "snap to court" or
// for restricting object placement to the court area.
// =============================================================================

import { WORLD_WIDTH, WORLD_HEIGHT } from '../lib/types';

// ---------------------------------------------------------------------------
// Data-driven sport field registry
// ---------------------------------------------------------------------------

/** Metadata for a sport field background variant */
export interface SportFieldMeta {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Emoji icon for palette */
  emoji: string;
  /** Path to PNG image in /public/ */
  src: string;
  /** Source image native width in px */
  imageWidth: number;
  /** Source image native height in px */
  imageHeight: number;
}

/**
 * All court images are 1000 × 1414 px (portrait, A4-ish aspect ≈ 0.707).
 * They match the editor world dimensions exactly → zero letterboxing.
 */
const IMG_W = 1000;
const IMG_H = 1414;

const SPORT_FIELDS: SportFieldMeta[] = [
  { id: 'football',   label: 'Fotboll',    emoji: '⚽', src: '/court/fotball_v2.webp',   imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'handball',   label: 'Handboll',   emoji: '🤾', src: '/court/handball_v2.webp',  imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'basketball', label: 'Basket',     emoji: '🏀', src: '/court/basket_v2.webp',    imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'hockey',     label: 'Hockey',     emoji: '🏒', src: '/court/hockey_v2.webp',    imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'innebandy',  label: 'Innebandy',  emoji: '🥍', src: '/court/innebandy_v2.webp', imageWidth: IMG_W, imageHeight: IMG_H },
];

// ---------------------------------------------------------------------------
// Map background registry (generic scene backgrounds, same 1000×1414 format)
// ---------------------------------------------------------------------------

const MAP_BACKGROUNDS: SportFieldMeta[] = [
  { id: 'dungeon_dark',        label: 'Fängelsehåla',   emoji: '🏚️', src: '/map-background/dungeon_dark.webp',        imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'dungeon_light',       label: 'Stenborg',       emoji: '🏰', src: '/map-background/dungeon_light.webp',       imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'urbansquare_gray',    label: 'Stadstorg',      emoji: '🏙️', src: '/map-background/urbansquare_gray.webp',    imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'floor_light',         label: 'Trägolv',        emoji: '🪵', src: '/map-background/floor_light.webp',         imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'grass_map',           label: 'Gräsplan',       emoji: '🌿', src: '/map-background/grass_map.webp',           imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'schoolyard_sand',     label: 'Skolgård',       emoji: '🏫', src: '/map-background/schoolyard_sand.webp',     imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'pastell_geographic',  label: 'Pastell',        emoji: '🎨', src: '/map-background/pastell_geographic.webp',  imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'suttle_world',        label: 'Världskarta',    emoji: '🌍', src: '/map-background/suttle_world.webp',        imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'tresure_map',         label: 'Skattkarta',     emoji: '🗺️', src: '/map-background/tresure_map.webp',         imageWidth: IMG_W, imageHeight: IMG_H },
];

const SPORT_FIELD_MAP = new Map([
  ...SPORT_FIELDS.map((f) => [f.id, f] as const),
  ...MAP_BACKGROUNDS.map((f) => [f.id, f] as const),
]);

// ---------------------------------------------------------------------------
// Public registry for the palette UI
// ---------------------------------------------------------------------------

export const SPORT_FIELD_VARIANTS = [
  { id: 'none' as const, label: 'Tom (rutnät)', emoji: '⬜' },
  ...SPORT_FIELDS.map((f) => ({ id: f.id, label: f.label, emoji: f.emoji })),
];

export const MAP_BG_VARIANTS = MAP_BACKGROUNDS.map((f) => ({
  id: f.id,
  label: f.label,
  emoji: f.emoji,
}));

export type SportFieldVariant = (typeof SPORT_FIELD_VARIANTS)[number]['id'];

// ---------------------------------------------------------------------------
// Contain-fit calculation
// ---------------------------------------------------------------------------

/**
 * Compute the exact rectangle where the image should be drawn inside
 * the world so that it's "contain"-fitted (centered, no cropping).
 *
 * Returns {x, y, width, height} in world coordinates.
 */
export function computeContainFit(
  worldW: number,
  worldH: number,
  imgW: number,
  imgH: number,
): { x: number; y: number; width: number; height: number } {
  const worldAspect = worldW / worldH;
  const imgAspect = imgW / imgH;

  let fitW: number;
  let fitH: number;

  if (imgAspect < worldAspect) {
    // Image is taller (narrower) than world → height-limited
    fitH = worldH;
    fitW = worldH * imgAspect;
  } else {
    // Image is wider than world → width-limited
    fitW = worldW;
    fitH = worldW / imgAspect;
  }

  return {
    x: (worldW - fitW) / 2,
    y: (worldH - fitH) / 2,
    width: fitW,
    height: fitH,
  };
}

/**
 * Get the contentBox (normalized 0..1 in world coords) describing where
 * the court image actually sits after contain-fit.
 */
export function getContentBox(variant: string): {
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  const meta = SPORT_FIELD_MAP.get(variant);
  if (!meta) return null;

  const fit = computeContainFit(WORLD_WIDTH, WORLD_HEIGHT, meta.imageWidth, meta.imageHeight);
  return {
    x: fit.x / WORLD_WIDTH,
    y: fit.y / WORLD_HEIGHT,
    w: fit.width / WORLD_WIDTH,
    h: fit.height / WORLD_HEIGHT,
  };
}

// ---------------------------------------------------------------------------
// Renderer – SVG <image> with exact computed placement
// ---------------------------------------------------------------------------

export function SportFieldRenderer({
  variant,
  opacity = 1,
}: {
  variant: string;
  opacity?: number;
}) {
  const meta = SPORT_FIELD_MAP.get(variant);
  if (!meta) return null;

  // Compute exact placement — no preserveAspectRatio guessing needed
  const fit = computeContainFit(WORLD_WIDTH, WORLD_HEIGHT, meta.imageWidth, meta.imageHeight);

  return (
    <image
      href={meta.src}
      x={fit.x}
      y={fit.y}
      width={fit.width}
      height={fit.height}
      preserveAspectRatio="none"
      opacity={opacity}
    />
  );
}
