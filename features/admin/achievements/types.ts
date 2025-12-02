export type AchievementLayerType = "base" | "background" | "foreground" | "symbol";

export type AchievementLayer = {
  id: string;
  type: AchievementLayerType;
  name: string;
  asset: string;
  tintable?: boolean;
};

export type AchievementTheme = {
  id: string;
  name: string;
  baseColor: string;
  backgroundColor: string;
  foregroundColor: string;
  symbolColor: string;
};

export type AchievementItem = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  rewardCoins?: number;
  themeId?: string;
  customColors?: {
    base: string;
    background: string;
    foreground: string;
    symbol: string;
  };
  status?: "draft" | "published";
  version?: number;
  availableForOrgs?: string[];
  layers: {
    base?: string;
    background?: string;
    foreground?: string;
    symbol?: string;
  };
  profileFrameSync?: boolean;
  publishedRoles?: string[];
};

export type AchievementFilters = {
  search: string;
  theme: string | "all";
  sort: "recent" | "name";
};
