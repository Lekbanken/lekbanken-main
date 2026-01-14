'use client';

import { themes } from "@/features/admin/achievements/data";
import { resolveAssetUrl } from "@/features/admin/achievements/assets";
import { getEffectiveColor, normalizeIconConfig, normalizeSize } from "@/features/admin/achievements/icon-utils";
import type { AchievementAssetSize, AchievementAssetType, AchievementIconConfig, AchievementLayerStackItem } from "@/features/admin/achievements/types";

type BadgeIconProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  iconConfig: AchievementIconConfig | Record<string, any> | null | undefined;
  size?: AchievementAssetSize;
  showGlow?: boolean;
  isLocked?: boolean;
  className?: string;
};

const sizeConfig: Record<AchievementAssetSize, { container: string; image: number }> = {
  sm: { container: "h-12 w-12", image: 44 },
  md: { container: "h-16 w-16", image: 60 },
  lg: { container: "h-24 w-24", image: 88 },
};

function TintedLayer({ src, color, size }: { src: string; color: string; size: number }) {
  const maskStyles = {
    maskImage: `url(${src})`,
    WebkitMaskImage: `url(${src})`,
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
  } as const;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="relative"
        style={{ width: size, height: size, isolation: "isolate" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="block h-full w-full"
          style={{
            filter: "grayscale(1) brightness(1.05) contrast(1.05)",
            mixBlendMode: "normal",
            opacity: 0.95,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: color,
            mixBlendMode: "multiply",
            opacity: 0.85,
            ...maskStyles,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            mixBlendMode: "screen",
            opacity: 0.12,
            ...maskStyles,
          }}
        />
      </div>
    </div>
  );
}

export function BadgeIcon({ 
  iconConfig, 
  size = "md", 
  showGlow = false, 
  isLocked = false,
  className = ""
}: BadgeIconProps) {
  const icon = normalizeIconConfig(iconConfig ?? undefined);
  const normalizedSize = normalizeSize(size);
  const config = sizeConfig[normalizedSize];

  // Get theme colors
  const theme = icon.themeId ? themes.find(t => t.id === icon.themeId) : themes[0];
  const themeColors = theme ? { colors: theme.colors as Record<AchievementAssetType, { color: string }> } : undefined;

  const renderStack = (items: AchievementLayerStackItem[] = [], colorType: "background" | "foreground") =>
    items.map((item, idx) => {
      const url = resolveAssetUrl(item.id, normalizedSize);
      if (!url) return null;
      const tint = getEffectiveColor(colorType, icon, themeColors, item);
      return <TintedLayer key={`${item.id}-${idx}`} src={url} color={tint} size={config.image} />;
    });

  const baseUrl = icon.base?.id ? resolveAssetUrl(icon.base.id, normalizedSize) : undefined;
  const symbolUrl = icon.symbol?.id ? resolveAssetUrl(icon.symbol.id, normalizedSize) : undefined;
  const baseTint = getEffectiveColor("base", icon, themeColors, icon.base ?? undefined);
  const symbolTint = getEffectiveColor("symbol", icon, themeColors, icon.symbol ?? undefined);

  // Fallback if no icon config
  if (!icon.base?.id && !icon.symbol?.id) {
    return (
      <div className={`${config.container} flex items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 ${className}`}>
        <span className="text-2xl">🏆</span>
      </div>
    );
  }

  return (
    <div className={`relative ${config.container} ${className} ${isLocked ? 'grayscale opacity-50' : ''}`}>
      {showGlow && !isLocked && (
        <div
          className="absolute inset-0 rounded-full opacity-30 blur-xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${baseTint}60, transparent 70%)` }}
        />
      )}

      <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
        {renderStack(icon.backgrounds, "background")}

        {baseUrl && <TintedLayer src={baseUrl} color={baseTint} size={config.image} />}

        {renderStack(icon.foregrounds, "foreground")}

        {symbolUrl && <TintedLayer src={symbolUrl} color={symbolTint} size={config.image} />}
      </div>
    </div>
  );
}
