'use client';

import type { AchievementAssetSize, AchievementIconConfig, AchievementLayerStackItem, AchievementAssetType } from "../../types";
import { resolveAssetUrl } from "../../assets";
import { TintedLayerImage } from "./TintedLayerImage";
import { getEffectiveColor, normalizeSize } from "../../icon-utils";

type BadgePreviewEnhancedProps = {
  icon: AchievementIconConfig;
  theme?: { colors: Record<AchievementAssetType, { color: string }> };
  size?: AchievementAssetSize;
  showGlow?: boolean;
};

const sizeConfig: Record<AchievementAssetSize, { container: string; image: number }> = {
  sm: { container: "h-16 w-16", image: 56 },
  md: { container: "h-24 w-24", image: 88 },
  lg: { container: "h-40 w-40", image: 140 },
};

export function BadgePreviewEnhanced({ icon, theme, size = "md", showGlow = true }: BadgePreviewEnhancedProps) {
  const normalizedSize = normalizeSize(size);
  const config = sizeConfig[normalizedSize];

  const renderStack = (items: AchievementLayerStackItem[] = [], colorType: "background" | "foreground") =>
    items.map((item, idx) => {
      const url = resolveAssetUrl(item.id, normalizedSize);
      if (!url) return null;
      const tint = getEffectiveColor(colorType, icon, theme, item);
      return (
        <div key={`${item.id}-${idx}`} className="absolute inset-0 flex items-center justify-center">
          <TintedLayerImage src={url} alt={item.id} color={tint} size={config.image} />
        </div>
      );
    });

  const baseUrl = icon.base?.id ? resolveAssetUrl(icon.base.id, normalizedSize) : undefined;
  const symbolUrl = icon.symbol?.id ? resolveAssetUrl(icon.symbol.id, normalizedSize) : undefined;
  const baseTint = getEffectiveColor("base", icon, theme, icon.base ?? undefined);
  const symbolTint = getEffectiveColor("symbol", icon, theme, icon.symbol ?? undefined);

  return (
    <div className={`relative ${config.container}`}>
      {showGlow && (
        <div
          className="absolute inset-0 rounded-full opacity-30 blur-xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${baseTint}60, transparent 70%)` }}
        />
      )}

      <div className="relative flex h-full w-full items-center justify-center rounded-full shadow-lg bg-black/10 overflow-hidden">
        {renderStack(icon.backgrounds, "background")}

        {baseUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <TintedLayerImage src={baseUrl} alt={icon.base?.id ?? "base"} color={baseTint} size={config.image} />
          </div>
        )}

        {renderStack(icon.foregrounds, "foreground")}

        {symbolUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <TintedLayerImage src={symbolUrl} alt={icon.symbol?.id ?? "symbol"} color={symbolTint} size={config.image} />
          </div>
        )}
      </div>

      {normalizedSize === "lg" && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {icon.base?.id && <span className="px-1.5 py-0.5 rounded bg-muted/50">{icon.base.id}</span>}
            {icon.symbol?.id && <span className="px-1.5 py-0.5 rounded bg-muted/50">{icon.symbol.id}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
