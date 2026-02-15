"use client";

// ---------------------------------------------------------------------------
// Avatar Frame Overlay — decorative SVG ring around the avatar circle
//
// Unlocked at level 6 via skill tree header node.
// Each faction has a unique style:
//   void  → constellation (stars + connecting lines)
//   sea   → coral (bubbles + wave arcs)
//   forest → vines (leaf curls + tendrils)
//   sky   → aurora (gradient arcs + light dots)
//
// 0 new keyframes. Pure SVG + CSS transitions.
// ---------------------------------------------------------------------------

export type AvatarFrameStyle =
  | "none"
  | "constellation"
  | "coral"
  | "vines"
  | "aurora";

type AvatarFrameProps = {
  style: AvatarFrameStyle;
  accentColor: string;
  /** Diameter of the parent avatar in px (default 112 = w-28) */
  size?: number;
};

/**
 * Resolve frame style from skill tree cosmetic key.
 */
export function resolveAvatarFrame(
  cosmeticKey: string | null | undefined,
): AvatarFrameStyle {
  switch (cosmeticKey) {
    case "headerFrame:constellation":
      return "constellation";
    case "headerFrame:coral":
      return "coral";
    case "headerFrame:vines":
      return "vines";
    case "headerFrame:aurora":
      return "aurora";
    default:
      return "none";
  }
}

/**
 * Decorative SVG overlay rendered around the avatar circle.
 * Absolutely positioned — place inside the avatar's relative container.
 */
export function AvatarFrame({ style, accentColor, size = 112 }: AvatarFrameProps) {
  if (style === "none") return null;

  // Frame is slightly larger than avatar to create a decorative ring
  const pad = 14;
  const s = size + pad * 2; // total SVG size
  const cx = s / 2;
  const cy = s / 2;
  const r = size / 2 + 2; // just outside the avatar border
  const offset = -pad; // position offset for absolute centering

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      className="absolute pointer-events-none"
      style={{ top: offset, left: offset, zIndex: 20 }}
      aria-hidden
    >
      {style === "constellation" && (
        <ConstellationFrame cx={cx} cy={cy} r={r} color={accentColor} />
      )}
      {style === "coral" && (
        <CoralFrame cx={cx} cy={cy} r={r} color={accentColor} />
      )}
      {style === "vines" && (
        <VinesFrame cx={cx} cy={cy} r={r} color={accentColor} />
      )}
      {style === "aurora" && (
        <AuroraFrame cx={cx} cy={cy} r={r} color={accentColor} />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Frame SVG internals
// ---------------------------------------------------------------------------

type FrameProps = { cx: number; cy: number; r: number; color: string };

/** Void: stars at cardinal + diagonal points, connected by faint lines */
function ConstellationFrame({ cx, cy, r, color }: FrameProps) {
  const stars = 8;
  const pts = Array.from({ length: stars }, (_, i) => {
    const a = (i / stars) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });

  return (
    <g>
      {/* Connecting lines */}
      {pts.map((p, i) => {
        const next = pts[(i + 1) % pts.length];
        return (
          <line
            key={`l${i}`}
            x1={p.x}
            y1={p.y}
            x2={next.x}
            y2={next.y}
            stroke={color}
            strokeWidth={0.8}
            opacity={0.2}
          />
        );
      })}
      {/* Cross-connections (every other) */}
      {pts
        .filter((_, i) => i % 2 === 0)
        .map((p, i) => {
          const opp = pts[(i * 2 + 3) % pts.length];
          return (
            <line
              key={`c${i}`}
              x1={p.x}
              y1={p.y}
              x2={opp.x}
              y2={opp.y}
              stroke={color}
              strokeWidth={0.5}
              opacity={0.1}
            />
          );
        })}
      {/* Star dots */}
      {pts.map((p, i) => (
        <g key={`s${i}`}>
          <circle cx={p.x} cy={p.y} r={i % 2 === 0 ? 3 : 2} fill={color} opacity={0.7} />
          <circle cx={p.x} cy={p.y} r={i % 2 === 0 ? 5 : 3.5} fill={color} opacity={0.15} />
        </g>
      ))}
      {/* Faint circle arc */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1} opacity={0.12} strokeDasharray="4 8" />
    </g>
  );
}

/** Sea: bubbles floating around + subtle wave arcs */
function CoralFrame({ cx, cy, r, color }: FrameProps) {
  const bubbles = [
    { a: -0.3, d: 4, s: 4.5 },
    { a: 0.5, d: 6, s: 3 },
    { a: 1.2, d: 3, s: 5 },
    { a: 2.0, d: 5, s: 3.5 },
    { a: 2.8, d: 4, s: 4 },
    { a: 3.6, d: 7, s: 2.5 },
    { a: 4.2, d: 3, s: 3.5 },
    { a: 5.0, d: 6, s: 4 },
    { a: 5.8, d: 5, s: 3 },
  ];

  return (
    <g>
      {/* Wave arcs */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((startA, i) => {
        const endA = startA + Math.PI / 3;
        const r2 = r + 2;
        const x1 = cx + Math.cos(startA) * r2;
        const y1 = cy + Math.sin(startA) * r2;
        const x2 = cx + Math.cos(endA) * r2;
        const y2 = cy + Math.sin(endA) * r2;
        return (
          <path
            key={`w${i}`}
            d={`M ${x1} ${y1} A ${r2} ${r2} 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={0.25}
            strokeLinecap="round"
          />
        );
      })}
      {/* Bubbles */}
      {bubbles.map((b, i) => {
        const bx = cx + Math.cos(b.a) * (r + b.d);
        const by = cy + Math.sin(b.a) * (r + b.d);
        return (
          <g key={`b${i}`}>
            <circle cx={bx} cy={by} r={b.s} fill="none" stroke={color} strokeWidth={0.8} opacity={0.3} />
            <circle cx={bx - b.s * 0.3} cy={by - b.s * 0.3} r={b.s * 0.2} fill={color} opacity={0.2} />
          </g>
        );
      })}
    </g>
  );
}

/** Forest: vine tendrils curling outward from the circle */
function VinesFrame({ cx, cy, r, color }: FrameProps) {
  const tendrils = 6;

  return (
    <g>
      {/* Base organic ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1.5} opacity={0.15} />
      {/* Vine tendrils */}
      {Array.from({ length: tendrils }, (_, i) => {
        const a = (i / tendrils) * Math.PI * 2 - Math.PI / 2;
        const x1 = cx + Math.cos(a) * r;
        const y1 = cy + Math.sin(a) * r;
        const len = 10 + (i % 3) * 4;
        const curl = i % 2 === 0 ? 1 : -1;
        const x2 = cx + Math.cos(a) * (r + len);
        const y2 = cy + Math.sin(a) * (r + len);
        // Control point for the curl
        const cpx = cx + Math.cos(a + 0.3 * curl) * (r + len * 0.7);
        const cpy = cy + Math.sin(a + 0.3 * curl) * (r + len * 0.7);

        return (
          <g key={`v${i}`}>
            <path
              d={`M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`}
              fill="none"
              stroke={color}
              strokeWidth={1.2}
              opacity={0.35}
              strokeLinecap="round"
            />
            {/* Leaf at end */}
            <ellipse
              cx={x2}
              cy={y2}
              rx={3}
              ry={1.5}
              fill={color}
              opacity={0.25}
              transform={`rotate(${(a * 180) / Math.PI + 45} ${x2} ${y2})`}
            />
          </g>
        );
      })}
      {/* Small dots along ring */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <circle
            key={`d${i}`}
            cx={cx + Math.cos(a) * r}
            cy={cy + Math.sin(a) * r}
            r={1.5}
            fill={color}
            opacity={i % 3 === 0 ? 0.4 : 0.15}
          />
        );
      })}
    </g>
  );
}

/** Sky: gradient arcs + light dots suggesting aurora borealis */
function AuroraFrame({ cx, cy, r, color }: FrameProps) {
  const arcs = [
    { startA: -1.8, sweep: 1.2, offset: 0, width: 3 },
    { startA: 0.2, sweep: 0.8, offset: 3, width: 2 },
    { startA: 1.5, sweep: 1.4, offset: -2, width: 2.5 },
    { startA: 3.2, sweep: 1.0, offset: 4, width: 2 },
    { startA: 4.6, sweep: 0.9, offset: 1, width: 3 },
  ];

  return (
    <g>
      {/* Aurora arcs */}
      {arcs.map((arc, i) => {
        const r2 = r + arc.offset;
        const x1 = cx + Math.cos(arc.startA) * r2;
        const y1 = cy + Math.sin(arc.startA) * r2;
        const endA = arc.startA + arc.sweep;
        const x2 = cx + Math.cos(endA) * r2;
        const y2 = cy + Math.sin(endA) * r2;
        return (
          <path
            key={`a${i}`}
            d={`M ${x1} ${y1} A ${r2} ${r2} 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth={arc.width}
            opacity={0.15 + (i % 3) * 0.08}
            strokeLinecap="round"
          />
        );
      })}
      {/* Light dots */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        const jitter = (i % 3 - 1) * 3;
        return (
          <circle
            key={`ld${i}`}
            cx={cx + Math.cos(a) * (r + jitter)}
            cy={cy + Math.sin(a) * (r + jitter)}
            r={i % 3 === 0 ? 2.5 : 1.5}
            fill={color}
            opacity={0.2 + (i % 4) * 0.05}
          />
        );
      })}
    </g>
  );
}
