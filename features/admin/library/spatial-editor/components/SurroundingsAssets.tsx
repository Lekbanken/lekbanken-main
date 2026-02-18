// =============================================================================
// Surroundings SVG Renderers – landscape, game, indoor, helper assets
// =============================================================================
// All assets render at world coords (wx, wy) via a <g> group.
// Designed to match the existing RenderObject pattern in SpatialCanvas.
// =============================================================================

import React from 'react';

interface AssetProps {
  wx: number;
  wy: number;
  color: string;
  variant?: string;
  number?: number;
  rotation?: number;
}

// ---------------------------------------------------------------------------
// Landmarks & Terrain
// ---------------------------------------------------------------------------

export function TreeAsset({ wx, wy, color, variant }: AssetProps) {
  const isConifer = variant === 'conifer';
  if (isConifer) {
    // Triangle conifer
    return (
      <>
        <rect x={wx - 2} y={wy + 4} width={4} height={10} fill="#92400e" rx={1} />
        <polygon points={`${wx},${wy - 16} ${wx - 10},${wy + 4} ${wx + 10},${wy + 4}`} fill={color} />
        <polygon points={`${wx},${wy - 10} ${wx - 8},${wy} ${wx + 8},${wy}`} fill={color} opacity={0.8} />
      </>
    );
  }
  // Deciduous round canopy
  return (
    <>
      <rect x={wx - 2} y={wy + 4} width={4} height={12} fill="#92400e" rx={1} />
      <circle cx={wx} cy={wy - 4} r={12} fill={color} />
      <circle cx={wx - 6} cy={wy - 1} r={8} fill={color} opacity={0.8} />
      <circle cx={wx + 6} cy={wy - 1} r={8} fill={color} opacity={0.8} />
    </>
  );
}

export function BushAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <ellipse cx={wx} cy={wy} rx={12} ry={8} fill={color} />
      <ellipse cx={wx - 5} cy={wy + 2} rx={7} ry={5} fill={color} opacity={0.7} />
      <ellipse cx={wx + 5} cy={wy + 2} rx={7} ry={5} fill={color} opacity={0.7} />
    </>
  );
}

export function HouseAsset({ wx, wy, color, variant }: AssetProps) {
  const w = variant === 'large' ? 36 : variant === 'medium' ? 28 : 20;
  const h = variant === 'large' ? 28 : variant === 'medium' ? 22 : 16;
  return (
    <>
      <rect x={wx - w / 2} y={wy - h / 2 + 4} width={w} height={h - 4} fill={color} rx={1} />
      <polygon points={`${wx - w / 2 - 3},${wy - h / 2 + 4} ${wx},${wy - h / 2 - 8} ${wx + w / 2 + 3},${wy - h / 2 + 4}`} fill="#b45309" />
      <rect x={wx - 3} y={wy + 2} width={6} height={h / 2 - 2} fill="#78716c" />
    </>
  );
}

export function BuildingAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <rect x={wx - 16} y={wy - 18} width={32} height={36} fill={color} rx={2} />
      <rect x={wx - 12} y={wy - 12} width={8} height={8} fill="#bfdbfe" rx={1} />
      <rect x={wx + 4} y={wy - 12} width={8} height={8} fill="#bfdbfe" rx={1} />
      <rect x={wx - 12} y={wy} width={8} height={8} fill="#bfdbfe" rx={1} />
      <rect x={wx + 4} y={wy} width={8} height={8} fill="#bfdbfe" rx={1} />
      <rect x={wx - 4} y={wy + 8} width={8} height={10} fill="#78716c" rx={1} />
    </>
  );
}

export function PathSegmentAsset({ wx, wy, color }: AssetProps) {
  return (
    <rect x={wx - 20} y={wy - 4} width={40} height={8} fill={color} rx={3} opacity={0.7} />
  );
}

export function BridgeAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <rect x={wx - 18} y={wy - 3} width={36} height={6} fill={color} rx={1} />
      <rect x={wx - 20} y={wy - 6} width={4} height={12} fill={color} rx={1} />
      <rect x={wx + 16} y={wy - 6} width={4} height={12} fill={color} rx={1} />
      <path d={`M${wx - 16},${wy - 3} Q${wx},${wy - 10} ${wx + 16},${wy - 3}`} fill="none" stroke={color} strokeWidth={2} />
    </>
  );
}

export function WaterAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <ellipse cx={wx} cy={wy} rx={18} ry={10} fill={color} opacity={0.5} />
      <path d={`M${wx - 10},${wy - 2} Q${wx - 5},${wy - 5} ${wx},${wy - 2} Q${wx + 5},${wy + 1} ${wx + 10},${wy - 2}`} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.6} />
    </>
  );
}

export function HillAsset({ wx, wy, color }: AssetProps) {
  return (
    <ellipse cx={wx} cy={wy + 4} rx={20} ry={12} fill={color} opacity={0.6} />
  );
}

export function BenchAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <rect x={wx - 12} y={wy - 2} width={24} height={4} fill={color} rx={1} />
      <rect x={wx - 10} y={wy + 2} width={2} height={6} fill={color} />
      <rect x={wx + 8} y={wy + 2} width={2} height={6} fill={color} />
      <rect x={wx - 12} y={wy - 6} width={24} height={2} fill={color} rx={1} opacity={0.7} />
    </>
  );
}

export function FenceAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <rect x={wx - 20} y={wy - 1} width={40} height={2} fill={color} />
      <rect x={wx - 18} y={wy - 8} width={2} height={14} fill={color} />
      <rect x={wx - 8} y={wy - 8} width={2} height={14} fill={color} />
      <rect x={wx + 2} y={wy - 8} width={2} height={14} fill={color} />
      <rect x={wx + 12} y={wy - 8} width={2} height={14} fill={color} />
      <rect x={wx - 20} y={wy - 5} width={40} height={2} fill={color} opacity={0.7} />
    </>
  );
}

export function PlaygroundAsset({ wx, wy, color }: AssetProps) {
  // Slide / rutschkana icon
  return (
    <>
      {/* Slide surface (curved) */}
      <path
        d={`M${wx - 6},${wy - 14} Q${wx - 4},${wy} ${wx + 8},${wy + 10}`}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* Ladder (left side) */}
      <line x1={wx - 6} y1={wy - 14} x2={wx - 6} y2={wy + 10} stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Ladder rungs */}
      <line x1={wx - 9} y1={wy - 8} x2={wx - 3} y2={wy - 8} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <line x1={wx - 9} y1={wy - 2} x2={wx - 3} y2={wy - 2} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <line x1={wx - 9} y1={wy + 4} x2={wx - 3} y2={wy + 4} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {/* Support leg for slide end */}
      <line x1={wx + 8} y1={wy + 10} x2={wx + 8} y2={wy + 14} stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Ground line */}
      <line x1={wx - 10} y1={wy + 14} x2={wx + 12} y2={wy + 14} stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Game Objects
// ---------------------------------------------------------------------------

export function FlagStartAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <rect x={wx - 1} y={wy - 14} width={2} height={28} fill="#78716c" rx={1} />
      <polygon points={`${wx + 1},${wy - 14} ${wx + 16},${wy - 8} ${wx + 1},${wy - 2}`} fill={color} />
    </>
  );
}

export function TrophyAsset({ wx, wy, color }: AssetProps) {
  // Checkered flag pattern symbolizing finish line / goal
  const sz = 7; // square size
  const cols = 3;
  const rows = 3;
  const fx = wx + 1; // flag top-left x (right of pole)
  const fy = wy - 14; // flag top-left y
  return (
    <>
      {/* Pole */}
      <rect x={wx - 1} y={wy - 14} width={2} height={28} fill="#78716c" rx={1} />
      {/* Checkered flag squares */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const isDark = (r + c) % 2 === 0;
          return (
            <rect
              key={`${r}-${c}`}
              x={fx + c * sz}
              y={fy + r * sz}
              width={sz}
              height={sz}
              fill={isDark ? color : '#ffffff'}
              stroke={color}
              strokeWidth={0.5}
            />
          );
        }),
      )}
    </>
  );
}

export function XMarkAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <line x1={wx - 12} y1={wy - 12} x2={wx + 12} y2={wy + 12} stroke={color} strokeWidth={4} strokeLinecap="round" />
      <line x1={wx + 12} y1={wy - 12} x2={wx - 12} y2={wy + 12} stroke={color} strokeWidth={4} strokeLinecap="round" />
    </>
  );
}

export function TreasureAsset({ wx, wy, color }: AssetProps) {
  // Improved treasure chest with lid, body, latch, and banding
  return (
    <>
      {/* Chest body */}
      <rect x={wx - 13} y={wy - 2} width={26} height={14} fill={color} rx={2} />
      {/* Chest lid (arched top) */}
      <path
        d={`M${wx - 13},${wy - 2} L${wx - 13},${wy - 6} Q${wx},${wy - 14} ${wx + 13},${wy - 6} L${wx + 13},${wy - 2} Z`}
        fill={color}
        opacity={0.85}
      />
      {/* Metal bands */}
      <rect x={wx - 13} y={wy - 2} width={26} height={2} fill="#92400e" opacity={0.5} />
      <rect x={wx - 2} y={wy - 10} width={4} height={22} fill="#92400e" opacity={0.3} rx={1} />
      {/* Latch / keyhole */}
      <circle cx={wx} cy={wy + 2} r={3} fill="#fbbf24" stroke="#92400e" strokeWidth={1.5} />
      <rect x={wx - 0.8} y={wy + 2} width={1.6} height={3} fill="#92400e" rx={0.5} />
    </>
  );
}

export function KeyAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <circle cx={wx - 6} cy={wy - 4} r={6} fill="none" stroke={color} strokeWidth={2.5} />
      <line x1={wx} y1={wy - 4} x2={wx + 12} y2={wy - 4} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={wx + 8} y1={wy - 4} x2={wx + 8} y2={wy + 2} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <line x1={wx + 12} y1={wy - 4} x2={wx + 12} y2={wy + 2} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </>
  );
}

export function ClueAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <rect x={wx - 8} y={wy - 10} width={16} height={20} fill="#fefce8" rx={2} stroke={color} strokeWidth={1.5} />
      <line x1={wx - 4} y1={wy - 5} x2={wx + 4} y2={wy - 5} stroke={color} strokeWidth={1} opacity={0.5} />
      <line x1={wx - 4} y1={wy - 1} x2={wx + 4} y2={wy - 1} stroke={color} strokeWidth={1} opacity={0.5} />
      <line x1={wx - 4} y1={wy + 3} x2={wx + 2} y2={wy + 3} stroke={color} strokeWidth={1} opacity={0.5} />
      <text x={wx} y={wy + 1} textAnchor="middle" fontSize={14} fontWeight="bold" fill={color} pointerEvents="none">?</text>
    </>
  );
}

export function DangerAsset({ wx, wy, color }: AssetProps) {
  const s = 16;
  return (
    <>
      <polygon points={`${wx},${wy - s} ${wx - s * 0.9},${wy + s * 0.6} ${wx + s * 0.9},${wy + s * 0.6}`} fill={color} />
      <text x={wx} y={wy + 5} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#fff" pointerEvents="none">!</text>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function CompassAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <circle cx={wx} cy={wy} r={14} fill="none" stroke={color} strokeWidth={1.5} />
      <polygon points={`${wx},${wy - 12} ${wx - 3},${wy} ${wx},${wy - 4} ${wx + 3},${wy}`} fill={color} />
      <polygon points={`${wx},${wy + 12} ${wx - 3},${wy} ${wx},${wy + 4} ${wx + 3},${wy}`} fill={color} opacity={0.4} />
      <text x={wx} y={wy - 16} textAnchor="middle" fontSize={8} fontWeight="bold" fill={color} pointerEvents="none">N</text>
    </>
  );
}

export function NumBadgeAsset({ wx, wy, color, number }: AssetProps) {
  const n = number ?? 1;
  return (
    <>
      <circle cx={wx} cy={wy} r={12} fill={color} />
      <text x={wx} y={wy + 4.5} textAnchor="middle" fontSize={n > 9 ? 11 : 13} fontWeight="bold" fill="#fff" pointerEvents="none">{n}</text>
    </>
  );
}

// ---------------------------------------------------------------------------
// Indoor
// ---------------------------------------------------------------------------

export function TableAsset({ wx, wy, color }: AssetProps) {
  return (
    <rect x={wx - 16} y={wy - 10} width={32} height={20} fill={color} rx={2} stroke="#78716c" strokeWidth={1} />
  );
}

export function ChairAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <rect x={wx - 6} y={wy - 2} width={12} height={10} fill={color} rx={1} />
      <rect x={wx - 6} y={wy - 10} width={12} height={4} fill={color} rx={1} opacity={0.7} />
    </>
  );
}

export function WhiteboardAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <rect x={wx - 20} y={wy - 12} width={40} height={24} fill={color} rx={2} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={wx - 14} y1={wy - 4} x2={wx + 10} y2={wy - 4} stroke="#94a3b8" strokeWidth={1} opacity={0.4} />
      <line x1={wx - 14} y1={wy} x2={wx + 6} y2={wy} stroke="#94a3b8" strokeWidth={1} opacity={0.4} />
    </>
  );
}

export function DoorAsset({ wx, wy, color }: AssetProps) {
  return (
    <>
      <rect x={wx - 8} y={wy - 14} width={16} height={28} fill={color} rx={2} />
      <circle cx={wx + 4} cy={wy + 2} r={2} fill="#d4d4d8" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Lookup by type
// ---------------------------------------------------------------------------

export const SURROUNDINGS_RENDERERS: Record<
  string,
  React.FC<AssetProps>
> = {
  tree: TreeAsset,
  bush: BushAsset,
  house: HouseAsset,
  building: BuildingAsset,
  'path-segment': PathSegmentAsset,
  bridge: BridgeAsset,
  water: WaterAsset,
  hill: HillAsset,
  bench: BenchAsset,
  fence: FenceAsset,
  playground: PlaygroundAsset,
  'flag-start': FlagStartAsset,
  trophy: TrophyAsset,
  'x-mark': XMarkAsset,
  treasure: TreasureAsset,
  key: KeyAsset,
  clue: ClueAsset,
  danger: DangerAsset,
  compass: CompassAsset,
  'num-badge': NumBadgeAsset,
  table: TableAsset,
  chair: ChairAsset,
  whiteboard: WhiteboardAsset,
  door: DoorAsset,
};
