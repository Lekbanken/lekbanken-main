// Avatar Builder v2 Types — PNG-based layered avatar system

export type AvatarCategory = 'face' | 'eyes' | 'nose' | 'mouth' | 'hair' | 'glasses'

export const AVATAR_CATEGORIES: AvatarCategory[] = [
  'face',
  'eyes',
  'nose',
  'mouth',
  'hair',
  'glasses',
]

// Layer rendering order (bottom to top)
export const LAYER_ORDER: AvatarCategory[] = [
  'face',
  'eyes',
  'nose',
  'mouth',
  'hair',
  'glasses',
]

// Category metadata for UI
export const CATEGORY_META: Record<AvatarCategory, { label: string }> = {
  face: { label: 'Ansikte' },
  eyes: { label: 'Ögon' },
  nose: { label: 'Näsa' },
  mouth: { label: 'Mun' },
  hair: { label: 'Hår' },
  glasses: { label: 'Glasögon' },
}

export interface AvatarPart {
  id: string
  category: AvatarCategory
  name: string
  src: string // path relative to public/
}

/**
 * A color preset that tints a PNG layer via CSS filters.
 * `filter` is a CSS filter string applied to the <img>.
 * `canvasOps` describes how to replicate the effect on a <canvas> for export.
 */
export interface ColorPreset {
  id: string
  name: string
  swatch: string  // hex color used for the UI swatch
  filter: string  // CSS filter value (applied to <img>)
  tint?: string   // hex color for mix-blend-mode tinting (skin tones)
}

export interface LayerConfig {
  partId: string | null  // null = none (hidden layer)
  colorId?: string | null // reference to a ColorPreset id
}

export interface AvatarConfig {
  version: number
  layers: Record<AvatarCategory, LayerConfig>
}

/** Categories that support color tinting */
export const COLORABLE_CATEGORIES: AvatarCategory[] = ['hair', 'glasses']

/**
 * Categories that inherit their color from another category.
 * Key = child category, Value = parent category to inherit color from.
 */
export const LINKED_COLOR_CATEGORIES: Partial<Record<AvatarCategory, AvatarCategory>> = {}

/** Resolve which category to use for color lookup (follows linked parent) */
export function getColorLookupCategory(category: AvatarCategory): AvatarCategory {
  return LINKED_COLOR_CATEGORIES[category] ?? category
}

// Default config
export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  version: 2,
  layers: {
    face: { partId: 'face_1', colorId: null },
    eyes: { partId: 'eyes_1' },
    nose: { partId: 'nose_1' },
    mouth: { partId: 'mouth_1' },
    hair: { partId: 'hair_1', colorId: null },
    glasses: { partId: null, colorId: null },
  },
}

// LocalStorage keys
export const STORAGE_KEY_CONFIG = 'sandbox.avatar_config_v2'
export const STORAGE_KEY_PREVIEW = 'sandbox.avatar_preview_png_v2'
