// Avatar Builder Types

export type AvatarCategory = 'body' | 'face' | 'hair' | 'accessories' | 'outfit'

export const AVATAR_CATEGORIES: AvatarCategory[] = ['body', 'face', 'hair', 'accessories', 'outfit']

// Layer rendering order (bottom to top)
export const LAYER_ORDER: AvatarCategory[] = ['body', 'outfit', 'face', 'hair', 'accessories']

export interface AvatarPart {
  id: string
  category: AvatarCategory
  name: string
  svg: string // inline SVG string (single layer)
  defaultColorToken?: string
  supportsColor: boolean
  thumbnailSvg?: string // optional, else derive from svg
}

export interface Palette {
  token: string
  label: string
  hex: string
}

export interface LayerConfig {
  partId: string
  color: string
}

export interface AvatarConfig {
  version: number
  layers: {
    body: LayerConfig
    face: LayerConfig
    hair: LayerConfig
    accessories: LayerConfig
    outfit: LayerConfig
  }
}

export interface AvatarBuilderState {
  config: AvatarConfig
  activeCategory: AvatarCategory
  isDirty: boolean
  isSaved: boolean
}

// Default empty config
export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  version: 1,
  layers: {
    body: { partId: 'body_01', color: 'body_tone_3' },
    face: { partId: 'face_01', color: 'face_default' },
    hair: { partId: 'hair_01', color: 'hair_brown' },
    accessories: { partId: 'acc_none', color: 'acc_gold' },
    outfit: { partId: 'outfit_01', color: 'outfit_primary' },
  },
}

// LocalStorage keys
export const STORAGE_KEY_CONFIG = 'sandbox.avatar_config_v1'
export const STORAGE_KEY_PREVIEW = 'sandbox.avatar_preview_png'
