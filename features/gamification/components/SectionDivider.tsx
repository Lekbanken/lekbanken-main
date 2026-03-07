"use client";

import type { CssDividerConfig } from "@/features/journey/cosmetic-types";

/**
 * SectionDivider — themed separator between journey sections.
 * Styles: line (default), glow, ornament, nebula, tide, roots, breeze.
 * Uses faction CSS var --journey-accent for auto-theming.
 */

type DividerStyle = "line" | "glow" | "ornament" | "nebula" | "tide" | "roots" | "breeze";

export function SectionDivider({
  label,
  variant = "line",
  loadoutConfig,
}: {
  label?: string;
  variant?: DividerStyle;
  /** v2.0 loadout config — when present, overrides variant */
  loadoutConfig?: CssDividerConfig | null;
}) {
  const resolvedVariant: DividerStyle =
    loadoutConfig?.variant ? (loadoutConfig.variant as DividerStyle) : variant;
  const accent = "var(--journey-accent, #8661ff)";

  // ── Glow: energy pulse center node ──
  if (resolvedVariant === "glow") {
    return (
      <div className="relative flex items-center gap-3 my-6">
        <div className="flex-1 relative h-px">
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(90deg, transparent, ${accent} / 0.25)` }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent, ${accent} / 0.15)`,
              filter: "blur(3px)",
              height: 3,
              top: -1,
            }}
          />
        </div>

        {/* Center energy pulse */}
        <div className="relative flex items-center justify-center w-8 h-8">
          <div
            className="absolute w-4 h-4 rounded-full sd-glow-pulse"
            style={{
              backgroundColor: accent,
              boxShadow: `0 0 8px ${accent} / 0.5, 0 0 16px ${accent} / 0.18`,
            }}
          />
          <div
            className="absolute w-6 h-6 rounded-full sd-glow-ring"
            style={{ border: `1px solid ${accent} / 0.3` }}
          />
          {label && (
            <span
              className="absolute -top-5 whitespace-nowrap text-[10px] uppercase tracking-[0.2em] font-semibold text-[var(--journey-accent)]/60"
            >
              {label}
            </span>
          )}
        </div>

        <div className="flex-1 relative h-px">
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(90deg, ${accent} / 0.25, transparent)` }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, ${accent} / 0.15, transparent)`,
              filter: "blur(3px)",
              height: 3,
              top: -1,
            }}
          />
        </div>

        <style jsx>{`
          @keyframes sd-glow-pulse {
            0%, 100% { transform: scale(0.8); opacity: 0.6; }
            50% { transform: scale(1); opacity: 1; }
          }
          @keyframes sd-glow-ring {
            0%, 100% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(1.3); opacity: 0.8; }
          }
          .sd-glow-pulse { animation: sd-glow-pulse 2s ease-in-out infinite; }
          .sd-glow-ring { animation: sd-glow-ring 2s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .sd-glow-pulse, .sd-glow-ring { animation: none !important; }
          }
        `}</style>
      </div>
    );
  }

  // ── Ornament: diamond SVGs + decorative dots ──
  if (resolvedVariant === "ornament") {
    return (
      <div className="flex items-center gap-2 my-6">
        <div className="flex-1 flex items-center">
          <div
            className="flex-1 h-px"
            style={{ background: `linear-gradient(90deg, transparent, var(--journey-accent, #8661ff)30)` }}
          />
          <div className="flex items-center gap-1 px-1">
            <div className="w-1 h-1 rounded-full bg-[var(--journey-accent)]/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--journey-accent)]/60" />
          </div>
        </div>

        <div className="flex items-center gap-2 px-2">
          <svg width="16" height="8" viewBox="0 0 16 8" className="opacity-50">
            <path d="M0 4 L4 0 L8 4 L4 8 Z" fill="var(--journey-accent, #8661ff)" />
          </svg>
          {label && (
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold px-1 text-[var(--journey-accent)]">
              {label}
            </span>
          )}
          <svg width="16" height="8" viewBox="0 0 16 8" className="opacity-50">
            <path d="M8 4 L12 0 L16 4 L12 8 Z" fill="var(--journey-accent, #8661ff)" />
          </svg>
        </div>

        <div className="flex-1 flex items-center">
          <div className="flex items-center gap-1 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--journey-accent)]/60" />
            <div className="w-1 h-1 rounded-full bg-[var(--journey-accent)]/40" />
          </div>
          <div
            className="flex-1 h-px"
            style={{ background: `linear-gradient(90deg, var(--journey-accent, #8661ff)30, transparent)` }}
          />
        </div>
      </div>
    );
  }

  // ── Nebula: void faction cloud divider ──
  if (resolvedVariant === "nebula") {
    return (
      <div className="relative my-10">
        <div className="relative h-16 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 sd-nebula-breathe" style={{
            backgroundImage: `
              radial-gradient(ellipse 40% 80% at 20% 50%, var(--journey-accent, #8661ff)30, transparent 70%),
              radial-gradient(ellipse 35% 90% at 50% 50%, var(--journey-accent, #8661ff)25, transparent 60%),
              radial-gradient(ellipse 40% 70% at 80% 50%, var(--journey-accent, #8661ff)20, transparent 70%)
            `,
          }} />
          <div className="absolute inset-x-0 top-1/2 h-px" style={{
            backgroundImage: `linear-gradient(90deg, transparent 5%, var(--journey-accent, #8661ff)40 25%, var(--journey-accent, #8661ff)60 50%, var(--journey-accent, #8661ff)40 75%, transparent 95%)`,
            boxShadow: `0 0 8px var(--journey-accent, #8661ff)30`,
          }} />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute rounded-full sd-nebula-star" style={{
              width: 2, height: 2,
              left: `${10 + i * 11}%`,
              top: `${30 + (i % 3) * 20}%`,
              backgroundColor: "var(--journey-accent, #8661ff)",
              boxShadow: `0 0 4px var(--journey-accent, #8661ff)80`,
              animationDuration: `${3 + (i % 2)}s`,
              animationDelay: `${i * 0.4}s`,
            }} />
          ))}
          {label && (
            <div className="relative z-10 px-6">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[var(--journey-accent)]" style={{
                textShadow: `0 0 15px var(--journey-accent, #8661ff)50`,
              }}>{label}</span>
            </div>
          )}
        </div>
        <style jsx>{`
          @keyframes sd-nebula-breathe { 0%, 100% { opacity: 0.7; transform: scaleX(1); } 50% { opacity: 1; transform: scaleX(1.02); } }
          @keyframes sd-nebula-star { 0%, 100% { opacity: 0.2; transform: translateY(0); } 50% { opacity: 0.8; transform: translateY(-3px); } }
          .sd-nebula-breathe { animation: sd-nebula-breathe 8s ease-in-out infinite; }
          .sd-nebula-star { animation: sd-nebula-star 3s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .sd-nebula-breathe, .sd-nebula-star { animation: none !important; } }
        `}</style>
      </div>
    );
  }

  // ── Tide: sea faction flowing wave ──
  if (resolvedVariant === "tide") {
    return (
      <div className="relative my-10">
        <div className="relative h-12 flex items-center justify-center overflow-hidden">
          <svg className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-[200%] sd-tide-flow" height="24" preserveAspectRatio="none">
            <path d="M0 12 Q 30 4, 60 12 T 120 12 T 180 12 T 240 12 T 300 12 T 360 12 T 420 12 T 480 12 T 540 12 T 600 12 T 660 12 T 720 12 T 780 12 T 840 12"
              fill="none" stroke="var(--journey-accent, #8661ff)" strokeWidth="1.5" opacity="0.4" />
            <path d="M0 12 Q 40 2, 80 12 T 160 12 T 240 12 T 320 12 T 400 12 T 480 12 T 560 12 T 640 12 T 720 12 T 800 12"
              fill="none" stroke="var(--journey-accent, #8661ff)" strokeWidth="1" opacity="0.25" strokeDasharray="4 6" />
          </svg>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`foam-${i}`} className="absolute rounded-full sd-tide-foam" style={{
              width: 2 + (i % 2), height: 2 + (i % 2),
              top: "50%", left: `${10 + i * 15}%`,
              transform: "translateY(-50%)",
              backgroundColor: "var(--journey-accent, #8661ff)",
              opacity: 0.3,
              animationDuration: "3s",
              animationDelay: `${i * 0.5}s`,
            }} />
          ))}
          {label && (
            <span className="relative z-10 text-[10px] uppercase tracking-[0.2em] font-semibold px-3 py-1 rounded-full bg-black/40 text-[var(--journey-accent)]" style={{
              textShadow: `0 0 8px var(--journey-accent, #8661ff)40`,
            }}>{label}</span>
          )}
        </div>
        <style jsx>{`
          @keyframes sd-tide-flow { 0% { transform: translateX(0) translateY(-50%); } 100% { transform: translateX(-50%) translateY(-50%); } }
          @keyframes sd-tide-foam { 0%, 100% { opacity: 0.15; transform: translateY(-50%) scale(0.8); } 50% { opacity: 0.5; transform: translateY(calc(-50% - 3px)) scale(1.3); } }
          .sd-tide-flow { animation: sd-tide-flow 6s linear infinite; }
          .sd-tide-foam { animation: sd-tide-foam 3s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .sd-tide-flow, .sd-tide-foam { animation: none !important; } }
        `}</style>
      </div>
    );
  }

  // ── Roots: forest faction intertwining roots ──
  if (resolvedVariant === "roots") {
    return (
      <div className="relative my-8" style={{ height: 40 }}>
        <svg className="absolute inset-0" width="100%" height="40" viewBox="0 0 800 40" preserveAspectRatio="none">
          <path d="M0,20 C60,12 120,28 200,18 C280,8 340,30 420,20 C500,10 560,28 640,16 C720,24 760,18 800,20"
            fill="none" stroke="var(--journey-accent, #8661ff)" strokeWidth="2.5" opacity="0.27"
            className="sd-root-grow" />
          <path d="M0,24 C80,30 140,14 220,22 C300,30 360,12 440,24 C520,32 580,14 660,22 C740,16 780,26 800,22"
            fill="none" stroke="var(--journey-accent, #8661ff)" strokeWidth="1.5" opacity="0.19"
            className="sd-root-grow-2" />
          {[80, 200, 340, 480, 620, 720].map((x, i) => (
            <path key={`offshoot-${i}`}
              d={i % 2 === 0
                ? `M${x},20 C${x + 5},10 ${x + 15},5 ${x + 20},8`
                : `M${x},22 C${x + 5},30 ${x + 15},35 ${x + 20},32`}
              fill="none" stroke="var(--journey-accent, #8661ff)" strokeWidth="1" opacity="0.22"
              className="sd-root-grow" />
          ))}
        </svg>
        {[
          { x: "15%", y: "45%" }, { x: "35%", y: "40%" },
          { x: "55%", y: "50%" }, { x: "75%", y: "42%" }, { x: "90%", y: "48%" },
        ].map((pos, i) => (
          <div key={`knot-${i}`} className="absolute sd-root-knot" style={{
            left: pos.x, top: pos.y,
            width: 5, height: 5, borderRadius: "50%",
            backgroundColor: "var(--journey-accent, #8661ff)",
            opacity: 0.3,
            boxShadow: `0 0 6px var(--journey-accent, #8661ff)30`,
            transform: "translate(-50%, -50%)",
            animationDelay: `${i * 0.9}s`,
          }} />
        ))}
        {label && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold px-3 py-0.5 rounded-full bg-black/60 text-[var(--journey-accent)]/80">{label}</span>
          </div>
        )}
        <style jsx>{`
          @keyframes sd-root-grow { 0% { stroke-dasharray: 2000; stroke-dashoffset: 2000; opacity: 0; } 10% { opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 1; } }
          @keyframes sd-root-knot-pulse { 0%, 100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.3; } 50% { transform: translate(-50%, -50%) scale(1.4); opacity: 0.7; } }
          .sd-root-grow { animation: sd-root-grow 2s ease-out forwards; }
          .sd-root-grow-2 { animation: sd-root-grow 2.5s ease-out forwards 0.3s; }
          .sd-root-knot { animation: sd-root-knot-pulse 4s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .sd-root-grow, .sd-root-grow-2, .sd-root-knot { animation: none !important; } }
        `}</style>
      </div>
    );
  }

  // ── Breeze: desert faction wind streaks ──
  if (resolvedVariant === "breeze") {
    return (
      <div className="relative my-8" style={{ height: 36 }}>
        <svg className="absolute inset-0" width="100%" height="36" viewBox="0 0 800 36" preserveAspectRatio="none">
          <path d="M0,18 C80,12 160,24 240,18 C320,12 400,24 480,18 C560,12 640,24 720,18 C760,14 800,18 800,18"
            fill="none" stroke="var(--journey-accent, #8661ff)" strokeWidth="1.5" opacity="0.25"
            className="sd-breeze-flow" />
          <path d="M0,20 C100,26 200,14 300,20 C400,26 500,14 600,20 C700,26 770,18 800,20"
            fill="none" stroke="var(--journey-accent, #8661ff)" strokeWidth="1" opacity="0.16"
            className="sd-breeze-flow-2" />
          <path d="M100,16 C200,13 300,19 400,16" fill="none" stroke="var(--journey-accent, #8661ff)" strokeWidth="0.5" opacity="0.1" />
          <path d="M400,20 C500,23 600,17 700,20" fill="none" stroke="var(--journey-accent, #8661ff)" strokeWidth="0.5" opacity="0.1" />
        </svg>
        {[
          { x: "10%", y: "30%" }, { x: "25%", y: "55%" }, { x: "42%", y: "35%" },
          { x: "58%", y: "60%" }, { x: "73%", y: "40%" }, { x: "88%", y: "50%" },
        ].map((pos, i) => (
          <div key={`wind-${i}`} className="absolute sd-breeze-particle" style={{
            left: pos.x, top: pos.y,
            width: 3 + (i % 2), height: 1.5, borderRadius: "50%",
            backgroundColor: "var(--journey-accent, #8661ff)",
            opacity: 0.3,
            boxShadow: `0 0 4px var(--journey-accent, #8661ff)30`,
            transform: "translate(-50%, -50%)",
            animationDuration: `${3 + i * 0.5}s`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
        {label && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold px-3 py-0.5 rounded-full bg-black/60 text-[var(--journey-accent)]/80">{label}</span>
          </div>
        )}
        <style jsx>{`
          @keyframes sd-breeze-flow { 0% { stroke-dasharray: 12 8; stroke-dashoffset: 0; } 50% { stroke-dasharray: 16 6; stroke-dashoffset: -20; } 100% { stroke-dasharray: 12 8; stroke-dashoffset: -40; } }
          @keyframes sd-breeze-particle { 0%, 100% { transform: translate(-50%, -50%) translateX(0); opacity: 0.3; } 50% { transform: translate(-50%, -50%) translateX(15px); opacity: 0.7; } }
          .sd-breeze-flow { animation: sd-breeze-flow 6s ease-in-out infinite; }
          .sd-breeze-flow-2 { animation: sd-breeze-flow 8s ease-in-out infinite 1s; }
          .sd-breeze-particle { animation: sd-breeze-particle 3s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .sd-breeze-flow, .sd-breeze-flow-2, .sd-breeze-particle { animation: none !important; } }
        `}</style>
      </div>
    );
  }

  // ── Line (default): simple gradient line ──
  if (label) {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--journey-accent)]/30 to-transparent" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
          {label}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--journey-accent)]/30 to-transparent" />
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--journey-accent)]/20 to-transparent" />
    </div>
  );
}
