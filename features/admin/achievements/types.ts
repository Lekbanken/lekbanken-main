export type AchievementAssetType = "base" | "background" | "foreground" | "symbol";
export type AchievementAssetSize = "sm" | "md" | "lg";

export type AchievementAsset = {
  id: string;
  type: AchievementAssetType;
  label: string;
  sizes: Record<AchievementAssetSize, string>;
  tags?: string[];
  sortOrder?: number;
};

export type AchievementColorMode = "theme" | "custom";

export type LayerColorConfig = {
  color: string;
  highlight?: string;
  shadow?: string;
};

export type AchievementTheme = {
  id: string;
  name: string;
  description?: string;
  colors: Record<AchievementAssetType, LayerColorConfig>;
};

export type AchievementIconConfig = {
  mode: AchievementColorMode;
  themeId?: string | null;
  size?: AchievementAssetSize;
  layers: {
    base?: string;
    background?: string;
    foreground?: string;
    symbol?: string;
  };
  customColors?: Partial<Record<AchievementAssetType, string>>;
};

export type ProfileFrameSyncConfig = {
  enabled: boolean;
  durationDays?: number | null;
  useBase?: boolean;
  useBackground?: boolean;
  useForeground?: boolean;
  useSymbol?: boolean;
};

export type AchievementItem = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  rewardCoins?: number;
  status?: "draft" | "published";
  version?: number;
  availableForOrgs?: string[];
  icon: AchievementIconConfig;
  profileFrameSync?: ProfileFrameSyncConfig;
  publishedRoles?: string[];
};

export type AchievementFilters = {
  search: string;
  theme: string | "all";
  sort: "recent" | "name";
};
