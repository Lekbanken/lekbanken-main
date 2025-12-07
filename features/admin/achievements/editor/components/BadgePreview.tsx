'use client';

import { AchievementAssetSize, AchievementIconConfig } from "../../types";
import { BadgePreviewEnhanced } from "./BadgePreviewEnhanced";

type BadgePreviewProps = {
  icon: AchievementIconConfig;
  colors: { base: string; background: string; foreground: string; symbol: string };
  size?: AchievementAssetSize;
};

export function BadgePreview({ icon, colors, size = "md" }: BadgePreviewProps) {
  const pseudoTheme = {
    colors: {
      base: { color: colors.base },
      background: { color: colors.background },
      foreground: { color: colors.foreground },
      symbol: { color: colors.symbol },
    },
  };
  return (
    <div className="flex items-center justify-center">
      <BadgePreviewEnhanced icon={icon} theme={pseudoTheme} size={size} showGlow />
    </div>
  );
}
