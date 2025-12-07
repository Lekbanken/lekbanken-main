'use client';

import { AchievementAssetSize, AchievementIconConfig } from "../../types";
import { BadgePreviewEnhanced } from "./BadgePreviewEnhanced";

type BadgePreviewProps = {
  icon: AchievementIconConfig;
  colors: { base: string; background: string; foreground: string; symbol: string };
  size?: AchievementAssetSize;
};

export function BadgePreview({ icon, colors, size = "md" }: BadgePreviewProps) {
  return (
    <div className="flex items-center justify-center">
      <BadgePreviewEnhanced icon={icon} colors={colors} size={size} showGlow />
    </div>
  );
}
