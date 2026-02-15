// Avatar Builder v2 — PNG-based parts registry
import type { AvatarPart, AvatarCategory, ColorPreset } from './types'

const BASE_PATH = '/avatars/avatar-builder'

// =============================================================================
// COLOR PRESETS (CSS filter-based tinting for PNG layers)
// =============================================================================

/**
 * Hair color presets.
 * Uses sepia + hue-rotate + saturate + brightness to achieve different hair shades.
 */
const HAIR_COLORS: ColorPreset[] = [
  { id: 'hair_none',      name: 'Original',   swatch: '#6B4423', filter: 'none' },
  { id: 'hair_black',     name: 'Svart',      swatch: '#1A1A1A', filter: 'brightness(0.2) saturate(0)' },
  { id: 'hair_dark',      name: 'Mörkbrun',   swatch: '#3B2417', filter: 'brightness(0.4) saturate(0.8) sepia(0.3)' },
  { id: 'hair_brown',     name: 'Brun',       swatch: '#6B4423', filter: 'brightness(0.7) saturate(1.1) sepia(0.2)' },
  { id: 'hair_light',     name: 'Ljusbrun',   swatch: '#A67B5B', filter: 'brightness(1.0) saturate(0.9) sepia(0.15)' },
  { id: 'hair_blonde',    name: 'Blond',      swatch: '#E6C87A', filter: 'brightness(1.3) saturate(0.7) sepia(0.3) hue-rotate(-10deg)' },
  { id: 'hair_platinum',  name: 'Platina',    swatch: '#F0E6C8', filter: 'brightness(1.5) saturate(0.3) sepia(0.1)' },
  { id: 'hair_red',       name: 'Röd',        swatch: '#A52A2A', filter: 'brightness(0.8) sepia(0.8) hue-rotate(-30deg) saturate(2.5)' },
  { id: 'hair_ginger',    name: 'Rödbrun',    swatch: '#D35400', filter: 'brightness(0.9) sepia(0.7) hue-rotate(-15deg) saturate(2.0)' },
  { id: 'hair_gray',      name: 'Grå',        swatch: '#808080', filter: 'brightness(1.1) saturate(0) grayscale(1)' },
  { id: 'hair_white',     name: 'Vit',        swatch: '#E8E8E8', filter: 'brightness(1.6) saturate(0) grayscale(1)' },
  { id: 'hair_blue',      name: 'Blå',        swatch: '#4A90D9', filter: 'brightness(0.9) sepia(1) hue-rotate(180deg) saturate(2)' },
  { id: 'hair_pink',      name: 'Rosa',       swatch: '#E84393', filter: 'brightness(1.0) sepia(1) hue-rotate(300deg) saturate(2)' },
  { id: 'hair_purple',    name: 'Lila',       swatch: '#9333EA', filter: 'brightness(0.8) sepia(1) hue-rotate(230deg) saturate(2.5)' },
]

/**
 * Glasses frame color presets.
 */
const GLASSES_COLORS: ColorPreset[] = [
  { id: 'gl_none',     name: 'Original',  swatch: '#1A1A1A', filter: 'none' },
  { id: 'gl_black',    name: 'Svart',     swatch: '#1A1A1A', filter: 'brightness(0.2) saturate(0)' },
  { id: 'gl_brown',    name: 'Brun',      swatch: '#5C3317', filter: 'brightness(0.5) sepia(0.6) saturate(1.5)' },
  { id: 'gl_gold',     name: 'Guld',      swatch: '#FFD700', filter: 'brightness(1.2) sepia(0.8) hue-rotate(-10deg) saturate(2)' },
  { id: 'gl_silver',   name: 'Silver',    swatch: '#C0C0C0', filter: 'brightness(1.3) saturate(0) grayscale(1)' },
  { id: 'gl_blue',     name: 'Blå',       swatch: '#4A90D9', filter: 'brightness(0.9) sepia(1) hue-rotate(180deg) saturate(2)' },
  { id: 'gl_red',      name: 'Röd',       swatch: '#E74C3C', filter: 'brightness(0.8) sepia(1) hue-rotate(-30deg) saturate(3)' },
  { id: 'gl_pink',     name: 'Rosa',      swatch: '#E84393', filter: 'brightness(1.0) sepia(1) hue-rotate(300deg) saturate(2)' },
]

// =============================================================================
// FACE (base head shapes — always visible)
// =============================================================================

const FACE_PARTS: AvatarPart[] = [
  { id: 'face_1', category: 'face', name: 'Ansikte 1', src: `${BASE_PATH}/face_1.png` },
  { id: 'face_2', category: 'face', name: 'Ansikte 2', src: `${BASE_PATH}/face_2.png` },
  { id: 'face_3', category: 'face', name: 'Ansikte 3', src: `${BASE_PATH}/face_3.png` },
  { id: 'face_4', category: 'face', name: 'Ansikte 4', src: `${BASE_PATH}/face_4.png` },
]

// =============================================================================
// EYES
// =============================================================================

const EYES_PARTS: AvatarPart[] = [
  { id: 'eyes_1', category: 'eyes', name: 'Ögon 1', src: `${BASE_PATH}/eyes_1.png` },
  { id: 'eyes_2', category: 'eyes', name: 'Ögon 2', src: `${BASE_PATH}/eyes_2.png` },
  { id: 'eyes_3', category: 'eyes', name: 'Ögon 3', src: `${BASE_PATH}/eyes_3.png` },
  { id: 'eyes_4', category: 'eyes', name: 'Ögon 4', src: `${BASE_PATH}/eyes_4.png` },
  { id: 'eyes_5', category: 'eyes', name: 'Ögon 5', src: `${BASE_PATH}/eyes_5.png` },
]

// =============================================================================
// NOSE
// =============================================================================

const NOSE_PARTS: AvatarPart[] = [
  { id: 'nose_1', category: 'nose', name: 'Näsa 1', src: `${BASE_PATH}/nose_1.png` },
  { id: 'nose_2', category: 'nose', name: 'Näsa 2', src: `${BASE_PATH}/nose_2.png` },
  { id: 'nose_3', category: 'nose', name: 'Näsa 3', src: `${BASE_PATH}/nose_3.png` },
  { id: 'nose_4', category: 'nose', name: 'Näsa 4', src: `${BASE_PATH}/nose_4.png` },
]

// =============================================================================
// MOUTH
// =============================================================================

const MOUTH_PARTS: AvatarPart[] = [
  { id: 'mouth_1', category: 'mouth', name: 'Mun 1', src: `${BASE_PATH}/mouth_1.png` },
  { id: 'mouth_2', category: 'mouth', name: 'Mun 2', src: `${BASE_PATH}/mouth_2.png` },
  { id: 'mouth_3', category: 'mouth', name: 'Mun 3', src: `${BASE_PATH}/mouth_3.png` },
  { id: 'mouth_4', category: 'mouth', name: 'Mun 4', src: `${BASE_PATH}/mouth_4.png` },
]

// =============================================================================
// HAIR
// =============================================================================

const HAIR_PARTS: AvatarPart[] = [
  { id: 'hair_1', category: 'hair', name: 'Frisyr 1', src: `${BASE_PATH}/hair_1.png` },
  { id: 'hair_2', category: 'hair', name: 'Frisyr 2', src: `${BASE_PATH}/hair_2.png` },
  { id: 'hair_3', category: 'hair', name: 'Frisyr 3', src: `${BASE_PATH}/hair_3.png` },
  { id: 'hair_4', category: 'hair', name: 'Frisyr 4', src: `${BASE_PATH}/hair_4.png` },
  { id: 'hair_5', category: 'hair', name: 'Frisyr 5', src: `${BASE_PATH}/hair_5.png` },
]

// =============================================================================
// GLASSES (optional — null partId = no glasses)
// =============================================================================

const GLASSES_PARTS: AvatarPart[] = [
  { id: 'glasses_1', category: 'glasses', name: 'Glasögon 1', src: `${BASE_PATH}/glasses_1.png` },
  { id: 'glasses_2', category: 'glasses', name: 'Glasögon 2', src: `${BASE_PATH}/glasses_2.png` },
  { id: 'glasses_3', category: 'glasses', name: 'Glasögon 3', src: `${BASE_PATH}/glasses_3.png` },
  { id: 'glasses_4', category: 'glasses', name: 'Glasögon 4', src: `${BASE_PATH}/glasses_4.png` },
]

// =============================================================================
// COMBINED REGISTRY
// =============================================================================

export const AVATAR_PARTS: Record<AvatarCategory, AvatarPart[]> = {
  face: FACE_PARTS,
  eyes: EYES_PARTS,
  nose: NOSE_PARTS,
  mouth: MOUTH_PARTS,
  hair: HAIR_PARTS,
  glasses: GLASSES_PARTS,
}

/** Get a specific part by category + id */
export function getPartById(category: AvatarCategory, partId: string): AvatarPart | undefined {
  return AVATAR_PARTS[category].find((p) => p.id === partId)
}

/** Get all parts as a flat array */
export function getAllParts(): AvatarPart[] {
  return Object.values(AVATAR_PARTS).flat()
}

/** Categories that allow "none" (no selection) */
export const OPTIONAL_CATEGORIES: AvatarCategory[] = ['glasses', 'hair']

// =============================================================================
// COLOR PRESETS REGISTRY
// =============================================================================

/** Color presets per category (only for colorable categories) */
export const COLOR_PRESETS: Partial<Record<AvatarCategory, ColorPreset[]>> = {
  hair: HAIR_COLORS,
  glasses: GLASSES_COLORS,
}

/** Get a color preset by category + id */
export function getColorPreset(category: AvatarCategory, colorId: string): ColorPreset | undefined {
  return COLOR_PRESETS[category]?.find((c) => c.id === colorId)
}

/** Get the CSS filter string for a layer */
export function getLayerFilter(category: AvatarCategory, colorId: string | null | undefined): string {
  if (!colorId) return 'none'
  const preset = getColorPreset(category, colorId)
  return preset?.filter ?? 'none'
}

/** Get the tint hex color for a layer (for mix-blend-mode coloring) */
export function getLayerTint(category: AvatarCategory, colorId: string | null | undefined): string | null {
  if (!colorId) return null
  const preset = getColorPreset(category, colorId)
  return preset?.tint ?? null
}
