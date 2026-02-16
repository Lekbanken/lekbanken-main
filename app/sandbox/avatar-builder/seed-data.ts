// Avatar Builder v2 — PNG-based parts registry
import type { AvatarPart, AvatarCategory, ColorPreset } from './types'

const BASE_PATH = '/avatars/avatar-builder'

// =============================================================================
// COLOR PRESETS (CSS filter-based tinting for PNG layers)
// =============================================================================

// Color presets removed in v2.1 — hair and glasses use their original PNG colors.

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

/** Color presets per category (currently empty — colors removed in v2.1) */
export const COLOR_PRESETS: Partial<Record<AvatarCategory, ColorPreset[]>> = {}

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
