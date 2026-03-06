/**
 * Step 4 — Loadout Rendering Verification
 *
 * Validates that each component's resolution logic correctly:
 * 1. Falls back to v1.0 when loadout is empty/null
 * 2. Overrides with loadout config when present
 * 3. Handles cross-faction mix scenarios
 * 4. Propagates divider config to all instances
 * 5. Produces no regressions for users without cosmetics
 */
import { describe, it, expect } from "vitest";
import {
  resolveAvatarFrame,
  type AvatarFrameStyle,
} from "@/features/gamification/components/AvatarFrame";
import {
  resolveXPBarSkin,
  resolveXPBarColorMode,
  type XPBarSkin,
} from "@/features/gamification/components/XPProgressBar";
import type { ColorMode } from "@/lib/palette";
import type {
  SvgFrameConfig,
  CssBackgroundConfig,
  CssParticlesConfig,
  XpSkinConfig,
  CssDividerConfig,
  ActiveLoadout,
  RenderConfig,
} from "@/features/journey/cosmetic-types";

// ---------------------------------------------------------------------------
// Helper: simulate GamificationPage type-narrowing logic
// ---------------------------------------------------------------------------

function narrowLoadout(loadout: ActiveLoadout) {
  const frameConfig =
    loadout.avatar_frame?.renderType === "svg_frame"
      ? (loadout.avatar_frame as SvgFrameConfig)
      : null;
  const backgroundConfig =
    loadout.scene_background?.renderType === "css_background"
      ? (loadout.scene_background as CssBackgroundConfig)
      : null;
  const particlesConfig =
    loadout.particles?.renderType === "css_particles"
      ? (loadout.particles as CssParticlesConfig)
      : null;
  const xpConfig =
    loadout.xp_bar?.renderType === "xp_skin"
      ? (loadout.xp_bar as XpSkinConfig)
      : null;
  const dividerConfig =
    loadout.section_divider?.renderType === "css_divider"
      ? (loadout.section_divider as CssDividerConfig)
      : null;
  return { frameConfig, backgroundConfig, particlesConfig, xpConfig, dividerConfig };
}

// Simulate component resolution logic (mirrors actual component code)
function resolveAvatarFrameFromConfig(
  config: SvgFrameConfig | null,
  fallbackStyle: AvatarFrameStyle,
  fallbackAccent: string,
) {
  const resolvedStyle: AvatarFrameStyle = config
    ? ((config.variant as AvatarFrameStyle) || "none")
    : fallbackStyle;
  const resolvedAccent = config?.glowColor ?? fallbackAccent;
  return { resolvedStyle, resolvedAccent };
}

function resolveXPBarFromConfig(
  config: XpSkinConfig | null,
  fallbackSkin: XPBarSkin,
  fallbackColorMode: ColorMode,
) {
  const resolvedSkin: XPBarSkin = config
    ? resolveXPBarSkin(`xpBarSkin:${config.skin}`)
    : fallbackSkin;
  const resolvedColorMode: ColorMode = config?.colorMode
    ? (config.colorMode as ColorMode)
    : fallbackColorMode;
  return { resolvedSkin, resolvedColorMode };
}

function resolveParticlesFromConfig(
  config: CssParticlesConfig | null,
  fallbackCount: number,
) {
  const resolvedCount = config?.count ?? fallbackCount;
  const extraClassName = config?.className ?? null;
  return { resolvedCount, extraClassName };
}

function resolveDividerFromConfig(
  config: CssDividerConfig | null,
  fallbackVariant: "line" | "glow" | "ornament",
) {
  const resolvedVariant = config?.variant
    ? (config.variant as "line" | "glow" | "ornament")
    : fallbackVariant;
  return { resolvedVariant };
}

function resolveBackgroundFromConfig(config: CssBackgroundConfig | null) {
  return { extraClassName: config?.className ?? null };
}

// ---------------------------------------------------------------------------
// 1) Empty loadout / fallback
// ---------------------------------------------------------------------------

describe("Step 4 — Empty loadout fallback", () => {
  const emptyLoadout: ActiveLoadout = {};

  it("type-narrows all slots to null when loadout is empty", () => {
    const result = narrowLoadout(emptyLoadout);
    expect(result.frameConfig).toBeNull();
    expect(result.backgroundConfig).toBeNull();
    expect(result.particlesConfig).toBeNull();
    expect(result.xpConfig).toBeNull();
    expect(result.dividerConfig).toBeNull();
  });

  it("AvatarFrame falls back to v1.0 style when config is null", () => {
    const { resolvedStyle, resolvedAccent } = resolveAvatarFrameFromConfig(
      null,
      "constellation",
      "#7c3aed",
    );
    expect(resolvedStyle).toBe("constellation");
    expect(resolvedAccent).toBe("#7c3aed");
  });

  it("XPProgressBar falls back to v1.0 skin+colorMode when config is null", () => {
    const { resolvedSkin, resolvedColorMode } = resolveXPBarFromConfig(
      null,
      "energy",
      "galaxy",
    );
    expect(resolvedSkin).toBe("energy");
    expect(resolvedColorMode).toBe("galaxy");
  });

  it("ParticleField falls back to default count=16 when config is null", () => {
    const { resolvedCount, extraClassName } = resolveParticlesFromConfig(null, 16);
    expect(resolvedCount).toBe(16);
    expect(extraClassName).toBeNull();
  });

  it("JourneyScene adds no extra className when config is null", () => {
    const { extraClassName } = resolveBackgroundFromConfig(null);
    expect(extraClassName).toBeNull();
  });

  it("SectionDivider falls back to prop variant when config is null", () => {
    expect(resolveDividerFromConfig(null, "glow").resolvedVariant).toBe("glow");
    expect(resolveDividerFromConfig(null, "ornament").resolvedVariant).toBe("ornament");
    expect(resolveDividerFromConfig(null, "line").resolvedVariant).toBe("line");
  });
});

// ---------------------------------------------------------------------------
// 2) Per-slot rendering
// ---------------------------------------------------------------------------

describe("Step 4 — Per-slot rendering with equipped cosmetics", () => {
  it("AvatarFrame: loadout overrides style and glowColor", () => {
    const config: SvgFrameConfig = {
      renderType: "svg_frame",
      variant: "coral",
      glowColor: "rgba(14, 165, 233, 0.4)",
    };
    const { resolvedStyle, resolvedAccent } = resolveAvatarFrameFromConfig(
      config,
      "constellation",  // v1.0 fallback
      "#7c3aed",         // v1.0 accent
    );
    expect(resolvedStyle).toBe("coral");
    expect(resolvedAccent).toBe("rgba(14, 165, 233, 0.4)");
  });

  it("AvatarFrame: loadout with missing glowColor falls back to accentColor", () => {
    const config: SvgFrameConfig = {
      renderType: "svg_frame",
      variant: "vines",
    };
    const { resolvedStyle, resolvedAccent } = resolveAvatarFrameFromConfig(
      config,
      "none",
      "#10b981",
    );
    expect(resolvedStyle).toBe("vines");
    expect(resolvedAccent).toBe("#10b981"); // prop fallback
  });

  it("XPProgressBar: loadout overrides skin via resolver", () => {
    const config: XpSkinConfig = {
      renderType: "xp_skin",
      skin: "warp",
      colorMode: "galaxy",
    };
    const { resolvedSkin, resolvedColorMode } = resolveXPBarFromConfig(
      config,
      "shimmer",
      "accent",
    );
    expect(resolvedSkin).toBe("energy"); // warp maps to energy
    expect(resolvedColorMode).toBe("galaxy");
  });

  it("XPProgressBar: loadout with known skins resolves correctly", () => {
    const skins = [
      { input: "clean", expected: "clean" },
      { input: "shimmer", expected: "shimmer" },
      { input: "energy", expected: "energy" },
      { input: "warp", expected: "energy" },
      { input: "current", expected: "energy" },
      { input: "growth", expected: "energy" },
      { input: "rainbow", expected: "energy" },
    ] as const;

    for (const { input, expected } of skins) {
      const config: XpSkinConfig = { renderType: "xp_skin", skin: input };
      const { resolvedSkin } = resolveXPBarFromConfig(config, "shimmer", "accent");
      expect(resolvedSkin).toBe(expected);
    }
  });

  it("XPProgressBar: loadout with unknown skin falls back to shimmer", () => {
    const config: XpSkinConfig = { renderType: "xp_skin", skin: "unknown_future_skin" };
    const { resolvedSkin } = resolveXPBarFromConfig(config, "energy", "galaxy");
    expect(resolvedSkin).toBe("shimmer"); // safe fallback
  });

  it("XPProgressBar: loadout without colorMode keeps prop fallback", () => {
    const config: XpSkinConfig = { renderType: "xp_skin", skin: "energy" };
    const { resolvedColorMode } = resolveXPBarFromConfig(config, "shimmer", "ice");
    expect(resolvedColorMode).toBe("ice"); // prop fallback since config.colorMode is undefined
  });

  it("ParticleField: loadout overrides count and adds className", () => {
    const config: CssParticlesConfig = {
      renderType: "css_particles",
      className: "particle-void-stars",
      count: 24,
    };
    const { resolvedCount, extraClassName } = resolveParticlesFromConfig(config, 16);
    expect(resolvedCount).toBe(24);
    expect(extraClassName).toBe("particle-void-stars");
  });

  it("ParticleField: loadout without count keeps default", () => {
    const config: CssParticlesConfig = {
      renderType: "css_particles",
      className: "particle-forest-leaves",
    };
    const { resolvedCount, extraClassName } = resolveParticlesFromConfig(config, 16);
    expect(resolvedCount).toBe(16); // falls back to prop default
    expect(extraClassName).toBe("particle-forest-leaves");
  });

  it("JourneyScene: loadout adds className", () => {
    const config: CssBackgroundConfig = {
      renderType: "css_background",
      className: "bg-effect-stars",
      keyframes: "stars-float",
    };
    const { extraClassName } = resolveBackgroundFromConfig(config);
    expect(extraClassName).toBe("bg-effect-stars");
  });

  it("SectionDivider: loadout overrides variant", () => {
    const config: CssDividerConfig = {
      renderType: "css_divider",
      variant: "ornament",
    };
    const { resolvedVariant } = resolveDividerFromConfig(config, "glow");
    expect(resolvedVariant).toBe("ornament");
  });
});

// ---------------------------------------------------------------------------
// 3) Cross-faction mix
// ---------------------------------------------------------------------------

describe("Step 4 — Cross-faction loadout mix", () => {
  it("each slot resolves independently from different factions", () => {
    const mixedLoadout: ActiveLoadout = {
      avatar_frame: {
        renderType: "svg_frame",
        variant: "constellation",       // Void frame
        glowColor: "rgba(124, 58, 237, 0.4)",
      },
      scene_background: {
        renderType: "css_background",
        className: "bg-forest-canopy",  // Forest background
      },
      particles: {
        renderType: "css_particles",
        className: "particle-sea-bubbles", // Sea particles
        count: 20,
      },
      xp_bar: {
        renderType: "xp_skin",
        skin: "rainbow",               // Desert xp bar
        colorMode: "rainbow",
      },
      section_divider: {
        renderType: "css_divider",
        variant: "glow",               // Any divider style
      },
    };

    const narrowed = narrowLoadout(mixedLoadout);

    // All slots should be non-null
    expect(narrowed.frameConfig).not.toBeNull();
    expect(narrowed.backgroundConfig).not.toBeNull();
    expect(narrowed.particlesConfig).not.toBeNull();
    expect(narrowed.xpConfig).not.toBeNull();
    expect(narrowed.dividerConfig).not.toBeNull();

    // Each slot renders its own faction's cosmetic
    const frame = resolveAvatarFrameFromConfig(narrowed.frameConfig!, "none", "#000");
    expect(frame.resolvedStyle).toBe("constellation");

    const bg = resolveBackgroundFromConfig(narrowed.backgroundConfig!);
    expect(bg.extraClassName).toBe("bg-forest-canopy");

    const particles = resolveParticlesFromConfig(narrowed.particlesConfig!, 16);
    expect(particles.extraClassName).toBe("particle-sea-bubbles");
    expect(particles.resolvedCount).toBe(20);

    const xp = resolveXPBarFromConfig(narrowed.xpConfig!, "shimmer", "accent");
    expect(xp.resolvedSkin).toBe("energy"); // rainbow → energy
    expect(xp.resolvedColorMode).toBe("rainbow");

    const divider = resolveDividerFromConfig(narrowed.dividerConfig!, "line");
    expect(divider.resolvedVariant).toBe("glow");
  });
});

// ---------------------------------------------------------------------------
// 4) Divider propagation — all 3 instances receive same config
// ---------------------------------------------------------------------------

describe("Step 4 — Divider propagation", () => {
  it("same config applied to all instances overrides each variant", () => {
    const config: CssDividerConfig = {
      renderType: "css_divider",
      variant: "ornament",
    };

    // GamificationPage passes the same dividerConfig to all 3 SectionDividers
    // Instance 1: variant="glow"
    const d1 = resolveDividerFromConfig(config, "glow");
    // Instance 2: variant="ornament"
    const d2 = resolveDividerFromConfig(config, "ornament");
    // Instance 3: variant="glow" (with label)
    const d3 = resolveDividerFromConfig(config, "glow");

    // All should use the loadout variant, not the prop variant
    expect(d1.resolvedVariant).toBe("ornament");
    expect(d2.resolvedVariant).toBe("ornament");
    expect(d3.resolvedVariant).toBe("ornament");
  });

  it("null config preserves individual prop variants (v1.0 rhythm)", () => {
    const d1 = resolveDividerFromConfig(null, "glow");
    const d2 = resolveDividerFromConfig(null, "ornament");
    const d3 = resolveDividerFromConfig(null, "glow");

    expect(d1.resolvedVariant).toBe("glow");
    expect(d2.resolvedVariant).toBe("ornament");
    expect(d3.resolvedVariant).toBe("glow");
  });
});

// ---------------------------------------------------------------------------
// 5) No-regression — v1.0 resolver functions still work
// ---------------------------------------------------------------------------

describe("Step 4 — v1.0 resolver no-regression", () => {
  it("resolveAvatarFrame handles all known cosmetic keys", () => {
    expect(resolveAvatarFrame("headerFrame:constellation")).toBe("constellation");
    expect(resolveAvatarFrame("headerFrame:coral")).toBe("coral");
    expect(resolveAvatarFrame("headerFrame:vines")).toBe("vines");
    expect(resolveAvatarFrame("headerFrame:aurora")).toBe("aurora");
    expect(resolveAvatarFrame(null)).toBe("none");
    expect(resolveAvatarFrame(undefined)).toBe("none");
    expect(resolveAvatarFrame("unknown")).toBe("none");
  });

  it("resolveXPBarSkin handles all known cosmetic keys", () => {
    expect(resolveXPBarSkin("xpBarSkin:warp")).toBe("energy");
    expect(resolveXPBarSkin("xpBarSkin:current")).toBe("energy");
    expect(resolveXPBarSkin("xpBarSkin:growth")).toBe("energy");
    expect(resolveXPBarSkin("xpBarSkin:rainbow")).toBe("energy");
    expect(resolveXPBarSkin("xpBarSkin:clean")).toBe("clean");
    expect(resolveXPBarSkin("xpBarSkin:shimmer")).toBe("shimmer");
    expect(resolveXPBarSkin("xpBarSkin:energy")).toBe("energy");
    expect(resolveXPBarSkin(null)).toBe("shimmer");
    expect(resolveXPBarSkin(undefined)).toBe("shimmer");
  });

  it("resolveXPBarColorMode handles all known cosmetic keys", () => {
    expect(resolveXPBarColorMode("xpBarSkin:warp")).toBe("galaxy");
    expect(resolveXPBarColorMode("xpBarSkin:current")).toBe("ice");
    expect(resolveXPBarColorMode("xpBarSkin:growth")).toBe("toxic");
    expect(resolveXPBarColorMode("xpBarSkin:rainbow")).toBe("rainbow");
    expect(resolveXPBarColorMode(null)).toBe("accent");
    expect(resolveXPBarColorMode(undefined)).toBe("accent");
  });

  it("type-narrowing ignores wrong renderType", () => {
    // If someone puts a css_background config in the avatar_frame slot
    const badLoadout: ActiveLoadout = {
      avatar_frame: {
        renderType: "css_background",
        className: "wrong-type",
      } as unknown as RenderConfig,
    };
    const narrowed = narrowLoadout(badLoadout);
    // Should be filtered out — renderType doesn't match svg_frame
    expect(narrowed.frameConfig).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 6) Mock payload check — empty cosmetics in mock data
// ---------------------------------------------------------------------------

describe("Step 4 — Mock payload compatibility", () => {
  it("mock fallback payload has valid empty cosmetics", async () => {
    // Import the mock to verify its shape
    const { fetchGamificationSnapshotMock } = await import(
      "@/features/gamification/api"
    );
    const payload = await fetchGamificationSnapshotMock();
    expect(payload.cosmetics).toBeDefined();
    expect(payload.cosmetics.loadout).toEqual({});
    expect(payload.cosmetics.unlockedCount).toBe(0);
    expect(payload.cosmetics.recentUnlocks).toEqual([]);
  });
});
