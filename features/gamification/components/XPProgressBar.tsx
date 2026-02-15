"use client";

import { paletteGradient } from "@/lib/palette";
import type { ColorMode } from "@/lib/palette";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type XPBarSkin = "clean" | "shimmer" | "energy";

type XPProgressBarProps = {
  /** 0–100 percent filled */
  percent: number;
  /** Current XP value (display) */
  currentXp: number;
  /** XP needed for next level (display) */
  nextLevelXp: number;
  /** Current user level */
  level: number;
  /** Faction accent color (hex) */
  accentColor: string;
  /** Glow color (rgba string) */
  glowColor?: string;
  /** Visual skin variant */
  skin?: XPBarSkin;
  /** Color mode for gradient fills */
  colorMode?: ColorMode;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * XP Progress Bar with skin variants.
 *
 * Skins:
 *  - **clean**: solid fill + glass highlight. 0 keyframes.
 *  - **shimmer**: traveling light band. Uses existing `xp-shimmer` keyframe.
 *  - **energy**: plasma flow lines + edge spark + bright wave. Uses `xp-shimmer` + 1 new keyframe (`xp-energy-flow`).
 *
 * Keyframe budget: +1 max (`xp-energy-flow`). `xp-shimmer` already counted.
 */
export function XPProgressBar({
  percent,
  currentXp,
  nextLevelXp,
  level,
  accentColor,
  glowColor,
  skin = "shimmer",
  colorMode = "accent",
}: XPProgressBarProps) {
  const fillBg =
    colorMode === "accent"
      ? accentColor
      : paletteGradient(colorMode, accentColor, 90);

  const fillStyle: React.CSSProperties = {
    width: `${percent}%`,
    ...(colorMode === "accent"
      ? { backgroundColor: accentColor }
      : { backgroundImage: fillBg }),
    boxShadow:
      skin === "energy"
        ? `0 0 14px ${accentColor}50, 0 0 28px ${glowColor ?? accentColor + "18"}, inset 0 0 6px rgba(255,255,255,0.08)`
        : `0 0 20px ${glowColor ?? "transparent"}, 0 0 8px ${accentColor}`,
  };

  return (
    <div className="mx-auto max-w-sm">
      {/* Labels */}
      <div className="flex justify-between text-xs text-white/60 mb-1">
        <span>{currentXp.toLocaleString("sv-SE")} XP</span>
        <span>{nextLevelXp.toLocaleString("sv-SE")} XP</span>
      </div>

      {/* Track */}
      <div
        className="relative h-4 overflow-hidden rounded-full"
        style={{
          backgroundColor: `${accentColor}15`,
          boxShadow:
            skin === "energy" ? "inset 0 2px 4px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {/* Energy: track texture */}
        {skin === "energy" && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 20px, ${accentColor}08 20px, ${accentColor}08 21px)`,
            }}
            aria-hidden
          />
        )}

        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={fillStyle}
        >
          {/* ── Clean: glass highlight only ── */}
          {skin === "clean" && (
            <div
              className="absolute inset-x-0 top-0 h-1/2"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)",
              }}
              aria-hidden
            />
          )}

          {/* ── Shimmer: glass + traveling light ── */}
          {skin === "shimmer" && (
            <>
              <div
                className="absolute inset-x-0 top-0 h-1/2"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)",
                }}
                aria-hidden
              />
              <div
                className="absolute inset-0 xp-shimmer-layer"
                style={{
                  backgroundImage:
                    "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
                  backgroundSize: "300% 100%",
                  animation: "xp-shimmer 2.5s ease-in-out infinite",
                }}
                aria-hidden
              />
            </>
          )}

          {/* ── Energy: plasma lines + wave + edge spark ── */}
          {skin === "energy" && (
            <>
              {/* Plasma flow lines */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `repeating-linear-gradient(110deg,
                    transparent, transparent 6px,
                    rgba(255,255,255,0.08) 6px, rgba(255,255,255,0.08) 7px,
                    transparent 7px, transparent 12px,
                    rgba(255,255,255,0.12) 12px, rgba(255,255,255,0.12) 13px)`,
                  animation: "xp-energy-flow 1s linear infinite",
                }}
                aria-hidden
              />
              {/* Bright wave */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                  backgroundSize: "40% 100%",
                  animation: "xp-shimmer 2s ease-in-out infinite",
                }}
                aria-hidden
              />
              {/* Core glow */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.15) 100%)",
                }}
                aria-hidden
              />
              {/* Leading edge spark */}
              <div
                className="absolute right-0 top-0 bottom-0 w-4"
                style={{
                  background:
                    "radial-gradient(circle at right, rgba(255,255,255,0.6) 0%, transparent 70%)",
                  animation: "xp-shimmer 0.8s ease-in-out infinite",
                }}
                aria-hidden
              />
            </>
          )}
        </div>

        {/* Global shimmer overlay (clean gets none, shimmer/energy handled above) */}
      </div>

      {/* Level labels */}
      <div className="flex justify-between text-[10px] text-white/40 mt-1">
        <span>Level {level}</span>
        <span>Level {level + 1}</span>
      </div>

      {/* Keyframes — scoped styles */}
      <style jsx>{`
        @keyframes xp-energy-flow {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 24px 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .xp-shimmer-layer,
          [style*="xp-shimmer"],
          [style*="xp-energy-flow"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skin resolver — auto-select skin from skill tree cosmetic key
// ---------------------------------------------------------------------------

/**
 * Resolve XP bar skin from the user's unlocked skill tree cosmetic.
 * If the user has an xpBarSkin cosmetic unlocked, map it to a visual tier.
 * Falls back to "shimmer" (default for all users).
 */
export function resolveXPBarSkin(cosmeticKey: string | null | undefined): XPBarSkin {
  if (!cosmeticKey) return "shimmer";

  // Faction-specific skins map to "energy" tier
  switch (cosmeticKey) {
    case "xpBarSkin:warp":
    case "xpBarSkin:current":
    case "xpBarSkin:growth":
    case "xpBarSkin:rainbow":
      return "energy";
    case "xpBarSkin:clean":
      return "clean";
    case "xpBarSkin:shimmer":
      return "shimmer";
    case "xpBarSkin:energy":
      return "energy";
    default:
      return "shimmer";
  }
}

/**
 * Resolve color mode from the faction's XP bar cosmetic key.
 * Each faction unlocks a unique color mode for the energy skin.
 */
export function resolveXPBarColorMode(cosmeticKey: string | null | undefined): ColorMode {
  switch (cosmeticKey) {
    case "xpBarSkin:warp":
      return "galaxy";
    case "xpBarSkin:current":
      return "ice";
    case "xpBarSkin:growth":
      return "toxic";
    case "xpBarSkin:rainbow":
      return "rainbow";
    default:
      return "accent";
  }
}
