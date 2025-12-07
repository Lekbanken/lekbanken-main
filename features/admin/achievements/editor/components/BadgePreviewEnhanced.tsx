'use client';

import { AchievementAssetSize, AchievementAssetType, AchievementIconConfig } from "../../types";
import { resolveAssetUrl } from "../../assets";
import Image from "next/image";

type BadgePreviewEnhancedProps = {
  icon: AchievementIconConfig;
  colors: { base: string; background: string; foreground: string; symbol: string };
  size?: AchievementAssetSize;
  showGlow?: boolean;
};

const sizeConfig: Record<AchievementAssetSize, { container: string; image: number }> = {
  sm: { container: "h-16 w-16", image: 56 },
  md: { container: "h-24 w-24", image: 88 },
  lg: { container: "h-40 w-40", image: 140 },
};

const layerOrder: AchievementAssetType[] = ["background", "base", "foreground", "symbol"];

export function BadgePreviewEnhanced({ icon, colors, size = "md", showGlow = true }: BadgePreviewEnhancedProps) {
  const config = sizeConfig[size];

  return (
    <div className={`relative ${config.container}`}>
      {showGlow && (
        <div
          className="absolute inset-0 rounded-full opacity-30 blur-xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${colors.base}60, transparent 70%)` }}
        />
      )}

      <div className="relative flex h-full w-full items-center justify-center rounded-full shadow-lg bg-black/10 overflow-hidden">
        {layerOrder.map((layer) => {
          const assetId = icon.layers[layer];
          const url = resolveAssetUrl(assetId, size);
          if (!url) return null;

          const tint =
            layer === "base"
              ? colors.base
              : layer === "background"
              ? colors.background
              : layer === "foreground"
              ? colors.foreground
              : colors.symbol;

          return (
            <div key={layer} className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative"
                style={{
                  width: config.image,
                  height: config.image,
                  maskImage: `url(${url})`,
                  WebkitMaskImage: `url(${url})`,
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskPosition: "center",
                  backgroundColor: tint,
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.25))",
                }}
              >
                <Image
                  src={url}
                  alt={assetId || layer}
                  width={config.image}
                  height={config.image}
                  className="opacity-0"
                  priority={size === "lg"}
                  unoptimized
                />
              </div>
            </div>
          );
        })}
      </div>

      {size === "lg" && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {icon.layers.base && <span className="px-1.5 py-0.5 rounded bg-muted/50">{icon.layers.base}</span>}
            {icon.layers.symbol && <span className="px-1.5 py-0.5 rounded bg-muted/50">{icon.layers.symbol}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
