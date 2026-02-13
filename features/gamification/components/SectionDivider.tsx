/**
 * SectionDivider — themed separator between journey sections.
 * Three styles: line (default), glow (energy pulse), ornament (diamond SVGs).
 * Uses faction CSS var --journey-accent for auto-theming.
 */

type DividerStyle = "line" | "glow" | "ornament";

export function SectionDivider({
  label,
  variant = "line",
}: {
  label?: string;
  variant?: DividerStyle;
}) {
  const accent = "var(--journey-accent, #8661ff)";

  // ── Glow: energy pulse center node ──
  if (variant === "glow") {
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
  if (variant === "ornament") {
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
