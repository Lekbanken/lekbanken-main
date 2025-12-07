import {
  AchievementAssetType,
  AchievementIconConfig,
  AchievementLayerStackItem,
  AchievementAssetSize,
} from "./types";

const defaultColors = {
  base: "#8661ff",
  background: "#00c7b0",
  foreground: "#ffd166",
  symbol: "#ffffff",
} as const;

export function normalizeIconConfig(icon?: Partial<AchievementIconConfig>): AchievementIconConfig {
  const legacy = icon?.layers ?? {};

  const base: AchievementLayerStackItem | null =
    icon?.base ??
    (legacy.base ? { id: legacy.base } : null);

  const symbol: AchievementLayerStackItem | null =
    icon?.symbol ??
    (legacy.symbol ? { id: legacy.symbol } : null);

  const backgrounds: AchievementLayerStackItem[] =
    icon?.backgrounds ??
    (legacy.background ? [{ id: legacy.background }] : []);

  const foregrounds: AchievementLayerStackItem[] =
    icon?.foregrounds ??
    (legacy.foreground ? [{ id: legacy.foreground }] : []);

  return {
    mode: icon?.mode ?? "theme",
    themeId: icon?.themeId ?? null,
    size: icon?.size ?? "lg",
    base,
    symbol,
    backgrounds,
    foregrounds,
    layers: icon?.layers, // keep legacy for serialization if needed
    customColors: icon?.customColors ?? {},
  };
}

export function getDefaultColor(layer: AchievementAssetType) {
  return defaultColors[layer];
}

export function getEffectiveColor(
  layer: AchievementAssetType,
  icon: AchievementIconConfig,
  theme?: { colors: Record<AchievementAssetType, { color: string }> },
  itemOverride?: AchievementLayerStackItem | null,
): string {
  if (icon.mode === "custom") {
    if (itemOverride?.color) return itemOverride.color;
    const custom = icon.customColors?.[layer];
    if (custom) return custom;
  }
  const themed = theme?.colors?.[layer]?.color;
  if (themed) return themed;
  return getDefaultColor(layer);
}

export function ensureLayerOrder(items: AchievementLayerStackItem[] = []): AchievementLayerStackItem[] {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function normalizeSize(size?: AchievementAssetSize): AchievementAssetSize {
  return size ?? "lg";
}
