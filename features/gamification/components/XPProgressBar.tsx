"use client";

import { paletteGradient, getColorPalette, paletteAnimatedBg } from "@/lib/palette";
import type { ColorMode } from "@/lib/palette";
import type { XpSkinConfig } from "@/features/journey/cosmetic-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type XPBarSkin = "clean" | "shimmer" | "energy" | "segmented" | "warp" | "current" | "growth" | "rainbow";

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
  /** v2.0 loadout config — when present, overrides skin + colorMode */
  loadoutConfig?: XpSkinConfig | null;
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
  loadoutConfig,
}: XPProgressBarProps) {
  // v2.0 loadout override
  const resolvedSkin: XPBarSkin = loadoutConfig
    ? resolveXPBarSkin(`xpBarSkin:${loadoutConfig.skin}`)
    : skin;
  const resolvedColorMode: ColorMode = loadoutConfig?.colorMode
    ? (loadoutConfig.colorMode as ColorMode)
    : colorMode;
  const fillBg =
    resolvedColorMode === "accent"
      ? accentColor
      : paletteGradient(resolvedColorMode, accentColor, 90);

  const fillStyle: React.CSSProperties = {
    width: `${percent}%`,
    ...(resolvedColorMode === "accent"
      ? { backgroundColor: accentColor }
      : { backgroundImage: fillBg }),
    boxShadow:
      resolvedSkin === "energy" || resolvedSkin === "warp"
        ? `0 0 14px ${accentColor}50, 0 0 28px ${glowColor ?? accentColor + "18"}, inset 0 0 6px rgba(255,255,255,0.08)`
        : `0 0 20px ${glowColor ?? "transparent"}, 0 0 8px ${accentColor}`,
  };

  const palette = getColorPalette(resolvedColorMode, accentColor);
  const segments = 12;
  const filledSegments = Math.floor((percent / 100) * segments);
  const partialFill = ((percent / 100) * segments) - filledSegments;

  return (
    <div className="mx-auto max-w-sm">
      {/* Labels */}
      <div className="flex justify-between text-xs text-white/60 mb-1">
        <span>{currentXp.toLocaleString("sv-SE")} XP</span>
        <span>{nextLevelXp.toLocaleString("sv-SE")} XP</span>
      </div>

      {/* Track */}
      {resolvedSkin === "segmented" ? (
        /* ═══ Segmented — individual glowing cells ═══ */
        <div className="relative">
          <div className="flex gap-0.5">
            {[...Array(segments)].map((_, i) => {
              const isFilled = i < filledSegments;
              const isPartial = i === filledSegments;
              const isLeading = i === filledSegments - 1;
              return (
                <div key={i} className="flex-1 h-4 rounded-sm overflow-hidden relative"
                  style={{
                    backgroundColor: `${palette[0]}10`,
                    border: `1px solid ${isFilled ? `${palette[i % palette.length]}40` : `${palette[0]}10`}`,
                    transition: "all 0.3s ease",
                    transitionDelay: `${i * 30}ms`,
                  }}>
                  <div className="absolute inset-y-0 left-0 rounded-sm transition-all duration-500"
                    style={{
                      width: isFilled ? "100%" : (isPartial ? `${partialFill * 100}%` : "0%"),
                      ...(isFilled ? paletteAnimatedBg(resolvedColorMode, accentColor, 180 + i * 30) : { backgroundColor: palette[i % palette.length] }),
                      boxShadow: isFilled ? `0 0 12px ${palette[i % palette.length]}50, inset 0 1px 0 rgba(255,255,255,0.3)` : "none",
                      transitionDelay: `${i * 30}ms`,
                    }} />
                  {isFilled && (
                    <div className="absolute inset-x-0 top-0 h-1/3 rounded-t-sm"
                      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)" }} />
                  )}
                  {isLeading && (
                    <div className="absolute right-0 inset-y-0 w-2"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6))",
                        animation: "xp-seg-leading 1.5s ease-in-out infinite",
                      }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
      <div
        className="relative h-4 overflow-hidden rounded-full"
        style={{
          backgroundColor: `${accentColor}15`,
          boxShadow:
            resolvedSkin === "energy" ? "inset 0 2px 4px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {/* Energy: track texture */}
        {resolvedSkin === "energy" && (
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
          {resolvedSkin === "clean" && (
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
          {resolvedSkin === "shimmer" && (
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
          {resolvedSkin === "energy" && (
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

          {/* ── Warp: hyperspace speed streaks ── */}
          {resolvedSkin === "warp" && (
            <>
              <div className="absolute inset-0" style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.2) 100%)",
              }} aria-hidden />
              <div className="absolute inset-0" style={{
                backgroundImage: `repeating-linear-gradient(0deg,
                  transparent 0px, transparent 2px,
                  rgba(255,255,255,0.25) 2px, rgba(255,255,255,0.25) 3px,
                  transparent 3px, transparent 7px)`,
                animation: "xp-warp-streak-1 0.4s linear infinite",
              }} aria-hidden />
              <div className="absolute inset-0" style={{
                backgroundImage: `repeating-linear-gradient(0deg,
                  transparent 0px, transparent 4px,
                  rgba(255,255,255,0.12) 4px, rgba(255,255,255,0.12) 6px,
                  transparent 6px, transparent 14px)`,
                animation: "xp-warp-streak-2 0.7s linear infinite",
              }} aria-hidden />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(0deg, transparent 20%, rgba(255,255,255,0.15) 50%, transparent 80%)",
                animation: "xp-warp-pulse 1.5s ease-in-out infinite",
              }} aria-hidden />
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`warp-star-${i}`} className="absolute" aria-hidden style={{
                  top: `${10 + (i * 11) % 80}%`,
                  left: `${(i * 17) % 100}%`,
                  width: 2,
                  height: `${6 + (i % 3) * 4}px`,
                  background: `linear-gradient(180deg, transparent, rgba(255,255,255,${0.4 + (i % 3) * 0.15}), transparent)`,
                  borderRadius: 1,
                  animation: `xp-warp-star ${0.3 + (i % 4) * 0.15}s linear infinite`,
                  animationDelay: `${i * 0.08}s`,
                }} />
              ))}
              <div className="absolute right-0 top-0 bottom-0 w-6" style={{
                background: `radial-gradient(ellipse at right center, rgba(255,255,255,0.7) 0%, ${palette[0]}40 40%, transparent 80%)`,
                animation: "xp-warp-flare 0.6s ease-in-out infinite",
              }} aria-hidden />
            </>
          )}

          {/* ── Current: ocean wave flow ── */}
          {resolvedSkin === "current" && (
            <>
              <div className="absolute inset-x-0 top-0 h-1/2" style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)",
              }} aria-hidden />
              <div className="absolute inset-0" style={{
                backgroundImage: `repeating-linear-gradient(0deg,
                  transparent 0px, transparent 3px,
                  rgba(255,255,255,0.12) 3px, rgba(255,255,255,0.12) 4px,
                  transparent 4px, transparent 9px)`,
                animation: "xp-current-wave-1 2s ease-in-out infinite",
              }} aria-hidden />
              <div className="absolute inset-0" style={{
                backgroundImage: `repeating-linear-gradient(0deg,
                  transparent 0px, transparent 5px,
                  rgba(255,255,255,0.08) 5px, rgba(255,255,255,0.08) 6px,
                  transparent 6px, transparent 12px)`,
                animation: "xp-current-wave-2 3s ease-in-out infinite 0.5s",
              }} aria-hidden />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.15) 45%, transparent 55%, rgba(255,255,255,0.1) 70%, transparent 85%)",
                backgroundSize: "250% 100%",
                animation: "xp-current-caustic 4s ease-in-out infinite",
              }} aria-hidden />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.15) 100%)",
              }} aria-hidden />
              <div className="absolute right-0 top-0 bottom-0 w-5" style={{
                background: `radial-gradient(ellipse at right center, rgba(255,255,255,0.5) 0%, ${palette[0]}30 50%, transparent 80%)`,
                animation: "xp-current-foam 1.5s ease-in-out infinite",
              }} aria-hidden />
            </>
          )}

          {/* ── Growth: organic vine/moss spreading ── */}
          {resolvedSkin === "growth" && (
            <>
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(ellipse 8px 6px at 20% 50%, rgba(255,255,255,0.12) 0%, transparent 70%),
                  radial-gradient(ellipse 6px 8px at 50% 30%, rgba(255,255,255,0.08) 0%, transparent 70%),
                  radial-gradient(ellipse 10px 5px at 80% 60%, rgba(255,255,255,0.1) 0%, transparent 70%)`,
                animation: "xp-growth-dapple 6s ease-in-out infinite",
              }} aria-hidden />
              <svg className="absolute inset-0" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 300 20" aria-hidden>
                <path d="M0,10 C20,4 40,16 60,10 C80,4 100,16 120,10 C140,4 160,16 180,10 C200,4 220,16 240,10 C260,4 280,16 300,10"
                  fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"
                  style={{ animation: "xp-growth-vine 8s ease-out forwards" }} />
                <path d="M0,14 C25,8 50,18 75,12 C100,6 125,17 150,11 C175,5 200,16 225,10 C250,4 275,15 300,10"
                  fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"
                  style={{ animation: "xp-growth-vine 10s ease-out forwards 1s" }} />
                {[30, 90, 150, 210, 270].map((x, i) => (
                  <ellipse key={`xp-leaf-${i}`}
                    cx={x} cy={10 + (i % 2 === 0 ? -4 : 4)}
                    rx="4" ry="2.5"
                    fill={`rgba(255,255,255,${0.08 + (i % 3) * 0.04})`}
                    transform={`rotate(${i % 2 === 0 ? 25 : -25}, ${x}, ${10 + (i % 2 === 0 ? -4 : 4)})`}
                    style={{ animation: `xp-growth-leaf-sway ${3 + i * 0.5}s ease-in-out infinite ${i * 0.4}s` }} />
                ))}
              </svg>
              <div className="absolute inset-0" style={{
                background: `linear-gradient(90deg, ${palette[0]}15 0%, transparent 30%, transparent 70%, ${palette[0]}10 100%)`,
              }} aria-hidden />
              <div className="absolute inset-x-0 top-0 h-1/3" style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)",
              }} aria-hidden />
              <div className="absolute right-0 top-0 bottom-0 w-4" style={{
                background: `radial-gradient(ellipse at right center, ${palette[0]}50 0%, ${palette[0]}20 50%, transparent 100%)`,
                animation: "xp-growth-pulse 2s ease-in-out infinite",
              }} aria-hidden />
            </>
          )}

          {/* ── Rainbow: prismatic shimmer ── */}
          {resolvedSkin === "rainbow" && (
            <>
              <div className="absolute inset-0" style={{
                background: `linear-gradient(90deg, 
                  ${palette[0]}40 0%, 
                  ${palette[Math.min(1, palette.length - 1)]}35 20%, 
                  ${palette[Math.min(2, palette.length - 1)]}30 40%, 
                  ${palette[0]}35 60%, 
                  ${palette[Math.min(1, palette.length - 1)]}40 80%, 
                  ${palette[Math.min(2, palette.length - 1)]}35 100%)`,
                backgroundSize: "200% 100%",
                animation: "xp-rainbow-shift 4s linear infinite",
              }} aria-hidden />
              <div className="absolute inset-x-0 top-0 h-1/2" style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)",
              }} aria-hidden />
              <div className="absolute top-0 bottom-0" style={{
                width: 20,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                animation: "xp-rainbow-sparkle 3s ease-in-out infinite",
              }} aria-hidden />
              <div className="absolute right-0 top-0 bottom-0 w-6" style={{
                background: `radial-gradient(ellipse at right center, rgba(255,255,255,0.5) 0%, ${palette[0]}30 50%, transparent 100%)`,
                animation: "xp-rainbow-edge 2s ease-in-out infinite",
              }} aria-hidden />
            </>
          )}
        </div>

        {/* Global shimmer overlay (clean gets none, shimmer/energy handled above) */}
      </div>
      )}

      {/* Level labels */}
      <div className="flex justify-between text-[10px] text-white/40 mt-1">
        <span>Level {level}</span>
        <span>Level {level + 1}</span>
      </div>

      {/* Keyframes — scoped styles */}
      <style jsx>{`
        @keyframes xp-energy-flow {
          0% { background-position: 0 0; }
          100% { background-position: 24px 0; }
        }
        @keyframes xp-seg-leading {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes xp-warp-streak-1 { 0% { transform: translateX(-13px); } 100% { transform: translateX(0); } }
        @keyframes xp-warp-streak-2 { 0% { transform: translateX(-14px); } 100% { transform: translateX(0); } }
        @keyframes xp-warp-pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.8; } }
        @keyframes xp-warp-star { 0% { transform: translateX(-20px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateX(20px); opacity: 0; } }
        @keyframes xp-warp-flare { 0%,100% { opacity: 0.5; transform: scaleY(0.8); } 50% { opacity: 1; transform: scaleY(1.1); } }
        @keyframes xp-current-wave-1 { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-8px); } }
        @keyframes xp-current-wave-2 { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(6px); } }
        @keyframes xp-current-caustic { 0% { background-position: 200% 0; } 100% { background-position: -100% 0; } }
        @keyframes xp-current-foam { 0%, 100% { opacity: 0.4; transform: scaleX(0.8); } 50% { opacity: 0.8; transform: scaleX(1.2); } }
        @keyframes xp-growth-dapple { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes xp-growth-vine { 0% { stroke-dasharray: 600; stroke-dashoffset: 600; } 100% { stroke-dashoffset: 0; } }
        @keyframes xp-growth-leaf-sway {
          0%, 100% { transform: rotate(25deg) scale(1); opacity: 0.08; }
          50% { transform: rotate(15deg) scale(1.2); opacity: 0.16; }
        }
        @keyframes xp-growth-pulse { 0%, 100% { opacity: 0.4; transform: scaleX(0.8); } 50% { opacity: 0.9; transform: scaleX(1.3); } }
        @keyframes xp-rainbow-shift { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }
        @keyframes xp-rainbow-sparkle {
          0% { left: -20px; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { left: calc(100% + 20px); opacity: 0; }
        }
        @keyframes xp-rainbow-edge { 0%, 100% { opacity: 0.4; transform: scaleX(0.8); } 50% { opacity: 0.9; transform: scaleX(1.2); } }
        @keyframes color-shift-flow {
          0% { background-position: 0% 82%; }
          50% { background-position: 100% 19%; }
          100% { background-position: 0% 82%; }
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

  switch (cosmeticKey) {
    case "xpBarSkin:warp":
      return "warp";
    case "xpBarSkin:current":
      return "current";
    case "xpBarSkin:growth":
      return "growth";
    case "xpBarSkin:rainbow":
      return "rainbow";
    case "xpBarSkin:segmented":
      return "segmented";
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
