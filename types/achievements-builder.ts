export type ThemeId = 'ember' | 'ocean' | 'forest' | 'sunset' | 'onyx' | 'frost'

export type ColorToken =
  | 'gold'
  | 'silver'
  | 'bronze'
  | 'onyx'
  | 'emerald'
  | 'sapphire'
  | 'ruby'
  | 'custom'

export type BaseType = 'circle' | 'shield'

export type DecorationType =
  | 'wings'
  | 'laurels'
  | 'flames'
  | 'ribbon'
  | 'stars'
  | 'crown'

export type SymbolType = 'flame' | 'star' | 'shield' | 'wings' | 'medal' | 'bolt'

export type ColorConfig =
  | { mode: 'token'; token: ColorToken }
  | { mode: 'theme'; from: 'primary' | 'secondary' | 'accent' }
  | { mode: 'custom'; value: string }

export type BaseConfig = {
  type: BaseType
  color: ColorConfig
}

export type DecorationConfig = {
  type: DecorationType
  color: ColorConfig
  position?: 'back' | 'front'
  count?: number
}

export type SymbolConfig = {
  type: SymbolType
  color: ColorConfig
}

export type ProfileFrameConfig = {
  enabled: boolean
  baseColor?: ColorConfig
  decorations?: DecorationConfig[]
}

export type ThemePreset = {
  id: ThemeId
  label: string
  colors: {
    primary: string
    secondary: string
    accent: string
    text: string
    border: string
    background: string
  }
}

export type AchievementState = {
  theme: ThemeId
  base: BaseConfig
  backDecorations: DecorationConfig[]
  frontDecorations: DecorationConfig[]
  symbol: SymbolConfig
  profileFrame?: ProfileFrameConfig
}

export type PurchasableKind = 'skin' | 'badge-pack' | 'frame' | 'symbol-pack'
export type PurchasableItem = {
  id: string
  kind: PurchasableKind
  name: string
  priceCoins?: number
  priceFiat?: number
  tags?: string[]
  includes?: {
    themes?: ThemeId[]
    bases?: BaseType[]
    decorations?: DecorationType[]
    symbols?: SymbolType[]
  }
}

export type SendTargetScope = 'org' | 'global'

export type PermissionContext = {
  isOrgAdmin: boolean
  isSystemAdmin: boolean
  isGameAdmin: boolean
}

export type AchievementExport = {
  version: '1.0.0'
  state: AchievementState
  metadata?: {
    createdBy: string
    name?: string
    description?: string
    rarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'limited'
  }
}
