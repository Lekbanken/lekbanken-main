import {
  AchievementAsset,
  AchievementAssetSize,
  AchievementAssetType,
} from "./types";

type AssetSeed = {
  id: string;
  label: string;
  type: AchievementAssetType;
  tags?: string[];
  sortOrder?: number;
};

const SUPABASE_PUBLIC_BUCKET_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/custom_utmarkelser`
  : undefined;

export const assetBasePaths: Record<AchievementAssetSize, string> = {
  sm:
    process.env.NEXT_PUBLIC_ACHIEVEMENTS_ASSET_BASE_SM ||
    (SUPABASE_PUBLIC_BUCKET_BASE
      ? `${SUPABASE_PUBLIC_BUCKET_BASE}/sm`
      : "/achievements/utmarkelser/sm"),
  md:
    process.env.NEXT_PUBLIC_ACHIEVEMENTS_ASSET_BASE_MD ||
    (SUPABASE_PUBLIC_BUCKET_BASE
      ? `${SUPABASE_PUBLIC_BUCKET_BASE}/md`
      : "/achievements/utmarkelser/md"),
  lg:
    process.env.NEXT_PUBLIC_ACHIEVEMENTS_ASSET_BASE_LG ||
    (SUPABASE_PUBLIC_BUCKET_BASE
      ? `${SUPABASE_PUBLIC_BUCKET_BASE}/lg`
      : "/achievements/utmarkelser/lg"),
};

const seeds: AssetSeed[] = [
  // Base shapes
  { id: "base_circle", label: "Circle", type: "base", tags: ["round"], sortOrder: 10 },
  { id: "base_diamond", label: "Diamond", type: "base", tags: ["angular"], sortOrder: 20 },
  { id: "base_hexagon", label: "Hexagon", type: "base", tags: ["angular"], sortOrder: 30 },
  { id: "base_laurel_ring1", label: "Laurel Ring 1", type: "base", tags: ["laurel"], sortOrder: 40 },
  { id: "base_laurel_ring2", label: "Laurel Ring 2", type: "base", tags: ["laurel"], sortOrder: 50 },
  { id: "base_pentagon", label: "Pentagon", type: "base", tags: ["angular"], sortOrder: 60 },
  { id: "base_shield", label: "Shield", type: "base", tags: ["shield"], sortOrder: 70 },

  // Background decorations
  { id: "bg_spikes_1", label: "Spikes 1", type: "background", tags: ["spikes"], sortOrder: 110 },
  { id: "bg_spikes_2", label: "Spikes 2", type: "background", tags: ["spikes"], sortOrder: 120 },
  { id: "bg_spikes_3", label: "Spikes 3", type: "background", tags: ["spikes"], sortOrder: 130 },
  { id: "bg_spikes_4", label: "Spikes 4", type: "background", tags: ["spikes"], sortOrder: 140 },
  { id: "bg_spikes_5", label: "Spikes 5", type: "background", tags: ["spikes"], sortOrder: 150 },
  { id: "bg_wings_1", label: "Wings 1", type: "background", tags: ["wings"], sortOrder: 160 },
  { id: "bg_wings_2", label: "Wings 2", type: "background", tags: ["wings"], sortOrder: 170 },
  { id: "bg_wings_3", label: "Wings 3", type: "background", tags: ["wings"], sortOrder: 180 },
  { id: "bg_wings_4", label: "Wings 4", type: "background", tags: ["wings"], sortOrder: 190 },

  // Foreground decorations
  { id: "fg_king_crown_1", label: "King Crown 1", type: "foreground", tags: ["crown"], sortOrder: 210 },
  { id: "fg_king_crown_2", label: "King Crown 2", type: "foreground", tags: ["crown"], sortOrder: 220 },
  { id: "fg_queen_crown_1", label: "Queen Crown 1", type: "foreground", tags: ["crown"], sortOrder: 230 },
  { id: "fg_queen_crown_2", label: "Queen Crown 2", type: "foreground", tags: ["crown"], sortOrder: 240 },
  { id: "fg_ribbon_1", label: "Ribbon 1", type: "foreground", tags: ["ribbon"], sortOrder: 250 },
  { id: "fg_ribbon_2", label: "Ribbon 2", type: "foreground", tags: ["ribbon"], sortOrder: 260 },
  { id: "fg_stars_1-1", label: "Stars 1-1", type: "foreground", tags: ["stars"], sortOrder: 270 },
  { id: "fg_stars_1", label: "Stars 1", type: "foreground", tags: ["stars"], sortOrder: 280 },
  { id: "fg_stars_2", label: "Stars 2", type: "foreground", tags: ["stars"], sortOrder: 290 },
  { id: "fg_stars_3", label: "Stars 3", type: "foreground", tags: ["stars"], sortOrder: 300 },
  { id: "fg_stars_4", label: "Stars 4", type: "foreground", tags: ["stars"], sortOrder: 310 },

  // Symbols
  { id: "ic_arrow_up", label: "Arrow Up", type: "symbol", tags: ["growth"], sortOrder: 410 },
  { id: "ic_book", label: "Book", type: "symbol", tags: ["learning"], sortOrder: 420 },
  { id: "ic_checkmark", label: "Checkmark", type: "symbol", tags: ["complete"], sortOrder: 430 },
  { id: "ic_chest", label: "Chest", type: "symbol", tags: ["reward"], sortOrder: 440 },
  { id: "ic_communicate", label: "Communicate", type: "symbol", tags: ["team"], sortOrder: 450 },
  { id: "ic_crown", label: "Crown", type: "symbol", tags: ["premium"], sortOrder: 460 },
  { id: "ic_deal", label: "Deal", type: "symbol", tags: ["agreement"], sortOrder: 470 },
  { id: "ic_dice", label: "Dice", type: "symbol", tags: ["chance"], sortOrder: 480 },
  { id: "ic_dobblestar", label: "Double Star", type: "symbol", tags: ["stars"], sortOrder: 490 },
  { id: "ic_ember", label: "Ember", type: "symbol", tags: ["fire"], sortOrder: 500 },
  { id: "ic_flash", label: "Flash", type: "symbol", tags: ["speed"], sortOrder: 510 },
  { id: "ic_football", label: "Football", type: "symbol", tags: ["sport"], sortOrder: 520 },
  { id: "ic_heart", label: "Heart", type: "symbol", tags: ["love"], sortOrder: 530 },
  { id: "ic_lvlup", label: "Level Up", type: "symbol", tags: ["progress"], sortOrder: 540 },
  { id: "ic_medalj", label: "Medalj", type: "symbol", tags: ["medal"], sortOrder: 550 },
  { id: "ic_pokal", label: "Pokal", type: "symbol", tags: ["trophy"], sortOrder: 560 },
  { id: "ic_signal", label: "Signal", type: "symbol", tags: ["signal"], sortOrder: 570 },
  { id: "ic_singlestar", label: "Single Star", type: "symbol", tags: ["star"], sortOrder: 580 },
  { id: "ic_team", label: "Team", type: "symbol", tags: ["team"], sortOrder: 590 },
  { id: "ic_tourch", label: "Torch", type: "symbol", tags: ["torch"], sortOrder: 600 },
];

function buildSizes(id: string): Record<AchievementAssetSize, string> {
  return {
    sm: `${assetBasePaths.sm}/${id}.png`,
    md: `${assetBasePaths.md}/${id}.png`,
    lg: `${assetBasePaths.lg}/${id}.png`,
  };
}

export const achievementAssets: AchievementAsset[] = seeds
  .map((seed) => ({
    ...seed,
    sizes: buildSizes(seed.id),
  }))
  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

const achievementAssetMap: Record<string, AchievementAsset> = Object.fromEntries(
  achievementAssets.map((asset) => [asset.id, asset]),
);

export function getAssetById(id?: string | null): AchievementAsset | undefined {
  if (!id) return undefined;
  return achievementAssetMap[id];
}

export function getAssetsByType(type: AchievementAssetType): AchievementAsset[] {
  return achievementAssets.filter((asset) => asset.type === type);
}

export function resolveAssetUrl(
  id: string | undefined,
  size: AchievementAssetSize = "lg",
  fallbackOrder: AchievementAssetSize[] = ["lg", "md", "sm"],
): string | undefined {
  if (!id) return undefined;
  const asset = getAssetById(id);
  if (!asset) return undefined;

  const preferred = asset.sizes[size];
  if (preferred) return preferred;

  const fallback = fallbackOrder
    .map((s) => asset.sizes[s])
    .find(Boolean);

  return fallback;
}
