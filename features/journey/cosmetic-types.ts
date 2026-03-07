// Journey v2.0 — Cosmetic type definitions
// Discriminated union types for render configs, loadout, and catalog items.

// ---------------------------------------------------------------------------
// Core slot type — matches cosmetics.category in DB
// ---------------------------------------------------------------------------

export type CosmeticSlot =
  | 'avatar_frame'
  | 'scene_background'
  | 'particles'
  | 'xp_bar'
  | 'section_divider'
  | 'title';

export const COSMETIC_SLOTS: readonly CosmeticSlot[] = [
  'avatar_frame',
  'scene_background',
  'particles',
  'xp_bar',
  'section_divider',
  'title',
] as const;

// ---------------------------------------------------------------------------
// Rarity
// ---------------------------------------------------------------------------

export type CosmeticRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// ---------------------------------------------------------------------------
// Unlock types
// ---------------------------------------------------------------------------

export type UnlockType = 'level' | 'achievement' | 'shop' | 'event' | 'manual';

// ---------------------------------------------------------------------------
// Render types — discriminated union per category
// ---------------------------------------------------------------------------

export type SvgFrameConfig = {
  renderType: 'svg_frame';
  variant: string;
  glowColor?: string;
};

export type CssBackgroundConfig = {
  renderType: 'css_background';
  className: string;
  keyframes?: string;
};

export type CssParticlesConfig = {
  renderType: 'css_particles';
  className: string;
  count?: number;
};

export type XpSkinConfig = {
  renderType: 'xp_skin';
  skin: string;
  colorMode?: string;
};

export type CssDividerConfig = {
  renderType: 'css_divider';
  variant: string;
  className?: string;
};

export type TitleConfig = {
  renderType: 'title';
  label: string;
};

export type RenderConfig =
  | SvgFrameConfig
  | CssBackgroundConfig
  | CssParticlesConfig
  | XpSkinConfig
  | CssDividerConfig
  | TitleConfig;

// ---------------------------------------------------------------------------
// Active loadout — partial record, one render config per slot
// ---------------------------------------------------------------------------

export type ActiveLoadout = Partial<Record<CosmeticSlot, RenderConfig>>;

// ---------------------------------------------------------------------------
// Catalog item — represents a row from cosmetics table
// ---------------------------------------------------------------------------

export type CosmeticItem = {
  id: string;
  key: string;
  category: CosmeticSlot;
  factionId: string | null;
  rarity: CosmeticRarity;
  nameKey: string;
  descriptionKey: string;
  renderType: string;
  renderConfig: RenderConfig;
  sortOrder: number;
  isActive: boolean;
};

// ---------------------------------------------------------------------------
// Unlock rule — represents a row from cosmetic_unlock_rules
// ---------------------------------------------------------------------------

export type CosmeticUnlockRule = {
  id: string;
  cosmeticId: string;
  unlockType: UnlockType;
  unlockConfig: Record<string, unknown>;
  priority: number;
};

// ---------------------------------------------------------------------------
// User cosmetic ownership — represents a row from user_cosmetics
// ---------------------------------------------------------------------------

export type UserCosmetic = {
  id: string;
  userId: string;
  cosmeticId: string;
  unlockType: UnlockType;
  unlockedAt: string;
};

// ---------------------------------------------------------------------------
// Recent unlock — for notification display
// ---------------------------------------------------------------------------

export type RecentUnlock = {
  cosmeticId: string;
  key: string;
  nameKey: string;
  category: CosmeticSlot;
  rarity: CosmeticRarity;
  unlockedAt: string;
};
