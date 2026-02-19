'use client';

// =============================================================================
// SpatialCanvas – SVG canvas with pan/zoom, object rendering & interaction
// =============================================================================
// Now supports:
// - Two-click creation for arrows (click start → click end) and zones
// - Arrow endpoint dragging (Coach Diagram pattern)
// - Invisible enlarged hit targets for easier clicking
// - Snap-to-grid (2% normalized)
// =============================================================================

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useSpatialEditorStore, getActiveContentBox, clampToBox } from '../store/spatial-editor-store';
import {
  screenToWorld,
  worldToNormalized,
  screenDeltaToWorld,
  zoomViewBox,
  normalizedToWorld,
} from '../lib/geometry';
import type { SpatialObjectBase, ViewBox } from '../lib/types';
import { WORLD_WIDTH, WORLD_HEIGHT, snap, SNAP_STEP, PLAYER_MARKER_BY_SPORT, BALL_MARKER_BY_SPORT } from '../lib/types';
import { SportFieldRenderer, computeContainFit, getContentBox } from './SportFieldBackgrounds';
import { SURROUNDINGS_RENDERERS } from './SurroundingsAssets';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HIT_EXPAND = 14; // extra radius for invisible hit targets (world units)
const ARROW_HIT_WIDTH = 18; // invisible stroke width for arrow click targets
const ENDPOINT_HIT_R = 18; // invisible hit radius for arrow endpoint handles
const ENDPOINT_VIS_R = 10; // visible endpoint handle radius
const NUDGE_MULTIPLIER = 5; // Shift + arrow key = 5× step

// ---------------------------------------------------------------------------
// Object renderers (simple SVG shapes per type)
// ---------------------------------------------------------------------------

function RenderObject({
  obj,
  isSelected,
  isHovered,
  onPointerDown,
  onEndpointPointerDown,
  onRotateHandlePointerDown,
  onScaleHandlePointerDown,
  onHoverChange,
}: {
  obj: SpatialObjectBase;
  isSelected: boolean;
  isHovered: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onEndpointPointerDown?: (e: React.PointerEvent, id: string, handle: 'from' | 'to') => void;
  onRotateHandlePointerDown?: (e: React.PointerEvent, id: string) => void;
  onScaleHandlePointerDown?: (e: React.PointerEvent, id: string) => void;
  onHoverChange?: (id: string | null) => void;
}) {
  const { wx, wy } = normalizedToWorld(obj.t.x, obj.t.y);
  const color = (obj.props.color as string) ?? '#3b82f6';
  const rotation = obj.t.rotation ?? 0;
  const scale = obj.t.scale ?? 1;
  const rotateTransform = rotation !== 0 ? `rotate(${rotation}, ${wx}, ${wy})` : undefined;
  const scaleTransform = scale !== 1 ? `translate(${wx}, ${wy}) scale(${scale}) translate(${-wx}, ${-wy})` : undefined;
  // Combine transforms: scale first, then rotate
  const combinedTransform = [scaleTransform, rotateTransform].filter(Boolean).join(' ') || undefined;

  // Hover glow (subtle blue ring, shown before selection)
  const hoverRing = (!isSelected && isHovered) ? (
    <circle
      cx={wx}
      cy={wy}
      r={30}
      fill="none"
      stroke="#93c5fd"
      strokeWidth={2}
      strokeOpacity={0.6}
      pointerEvents="none"
    />
  ) : null;

  const selectionRing = isSelected ? (
    <circle
      cx={wx}
      cy={wy}
      r={28}
      fill="none"
      stroke="#2563eb"
      strokeWidth={2.5}
      strokeDasharray="6 3"
      data-selection-ring
    />
  ) : null;

  // Rotation handle: small circle above the object, connected by a line
  // Fixed offset — does NOT scale with object size
  const HANDLE_OFFSET = 42;
  const rotationHandle = isSelected && obj.type !== 'arrow' ? (
    <g data-selection-ring pointerEvents="all">
      {/* Connecting line from selection ring to handle */}
      <line
        x1={wx} y1={wy - 28}
        x2={wx} y2={wy - HANDLE_OFFSET}
        stroke="#2563eb"
        strokeWidth={1.5}
        strokeOpacity={0.5}
        pointerEvents="none"
      />
      {/* Invisible hit target for the rotation handle */}
      <circle
        cx={wx} cy={wy - HANDLE_OFFSET}
        r={12}
        fill="transparent"
        style={{ cursor: 'grab' }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onRotateHandlePointerDown?.(e, obj.id);
        }}
      />
      {/* Visible rotation handle */}
      <circle
        cx={wx} cy={wy - HANDLE_OFFSET}
        r={6}
        fill="#2563eb"
        fillOpacity={0.2}
        stroke="#2563eb"
        strokeWidth={2}
        pointerEvents="none"
      />
      {/* Rotation icon (tiny arc) */}
      <path
        d={`M ${wx - 3} ${wy - HANDLE_OFFSET - 3} A 4 4 0 1 1 ${wx + 3} ${wy - HANDLE_OFFSET - 3}`}
        fill="none"
        stroke="#2563eb"
        strokeWidth={1.5}
        strokeLinecap="round"
        pointerEvents="none"
      />
    </g>
  ) : null;

  // Scale handle: small diamond/square at 45° down-right, connected by a line
  const SCALE_OFFSET = 42;
  const sdx = SCALE_OFFSET * 0.707; // cos(45°)
  const sdy = SCALE_OFFSET * 0.707; // sin(45°)
  const scaleHandle = isSelected && obj.type !== 'arrow' && obj.type !== 'zone' ? (
    <g data-selection-ring pointerEvents="all">
      {/* Connecting line from selection ring to handle */}
      <line
        x1={wx + 20} y1={wy + 20}
        x2={wx + sdx} y2={wy + sdy}
        stroke="#2563eb"
        strokeWidth={1.5}
        strokeOpacity={0.5}
        pointerEvents="none"
      />
      {/* Invisible hit target */}
      <circle
        cx={wx + sdx} cy={wy + sdy}
        r={12}
        fill="transparent"
        style={{ cursor: 'nwse-resize' }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onScaleHandlePointerDown?.(e, obj.id);
        }}
      />
      {/* Visible scale handle (diamond shape) */}
      <rect
        x={wx + sdx - 5}
        y={wy + sdy - 5}
        width={10}
        height={10}
        rx={2}
        transform={`rotate(45, ${wx + sdx}, ${wy + sdy})`}
        fill="#2563eb"
        fillOpacity={0.2}
        stroke="#2563eb"
        strokeWidth={2}
        pointerEvents="none"
      />
      {/* Scale icon (two small arrows) */}
      <line
        x1={wx + sdx - 3} y1={wy + sdy + 3}
        x2={wx + sdx + 3} y2={wy + sdy - 3}
        stroke="#2563eb"
        strokeWidth={1.5}
        strokeLinecap="round"
        pointerEvents="none"
      />
    </g>
  ) : null;

  const common = {
    onPointerDown: (e: React.PointerEvent) => onPointerDown(e, obj.id),
    onPointerEnter: () => onHoverChange?.(obj.id),
    onPointerLeave: () => onHoverChange?.(null),
    style: { cursor: 'pointer' } as React.CSSProperties,
  };

  switch (obj.type) {
    case 'player': {
      const num = (obj.props.number as number) ?? '';
      const markerImage = obj.props.markerImage as string | undefined;
      const imgSize = 40; // image width/height in world units
      return (
        <g {...common} transform={combinedTransform}>
          {/* Invisible enlarged hit target */}
          <circle cx={wx} cy={wy} r={20 + HIT_EXPAND} fill="transparent" />
          {hoverRing}
          {selectionRing}
          {markerImage ? (
            <>
              <image
                href={markerImage}
                x={wx - imgSize / 2}
                y={wy - imgSize / 2}
                width={imgSize}
                height={imgSize}
                pointerEvents="none"
              />
              {/* Number overlay */}
              <text
                x={wx}
                y={wy + 5}
                textAnchor="middle"
                fontSize={14}
                fontWeight="bold"
                fill="#fff"
                stroke="#000"
                strokeWidth={2.5}
                strokeLinejoin="round"
                paintOrder="stroke"
                pointerEvents="none"
              >
                {num}
              </text>
            </>
          ) : (
            <>
              <circle cx={wx} cy={wy} r={20} fill={color} fillOpacity={0.9} />
              <circle cx={wx} cy={wy} r={20} fill="none" stroke="#fff" strokeWidth={2} />
              <text
                x={wx}
                y={wy + 5}
                textAnchor="middle"
                fontSize={14}
                fontWeight="bold"
                fill="#fff"
                pointerEvents="none"
              >
                {num}
              </text>
            </>
          )}
          {rotationHandle}
          {scaleHandle}
        </g>
      );
    }

    case 'ball': {
      const ballMarker = obj.props.markerImage as string | undefined;
      const ballImgSize = 28;
      return (
        <g {...common} transform={combinedTransform}>
          <circle cx={wx} cy={wy} r={12 + HIT_EXPAND} fill="transparent" />
          {hoverRing}
          {selectionRing}
          {ballMarker ? (
            <image
              href={ballMarker}
              x={wx - ballImgSize / 2}
              y={wy - ballImgSize / 2}
              width={ballImgSize}
              height={ballImgSize}
              pointerEvents="none"
            />
          ) : (
            <>
              <circle cx={wx} cy={wy} r={12} fill={color} fillOpacity={0.85} />
              <circle cx={wx} cy={wy} r={12} fill="none" stroke="#fff" strokeWidth={1.5} />
            </>
          )}
          {rotationHandle}
          {scaleHandle}
        </g>
      );
    }

    case 'cone': {
      const s = 18;
      const points = `${wx},${wy - s} ${wx - s * 0.7},${wy + s * 0.6} ${wx + s * 0.7},${wy + s * 0.6}`;
      return (
        <g {...common} transform={combinedTransform}>
          <circle cx={wx} cy={wy} r={s + HIT_EXPAND} fill="transparent" />
          {hoverRing}
          {selectionRing}
          <polygon points={points} fill={color} fillOpacity={0.85} />
          {/* Base line under cone */}
          <line x1={wx - s * 0.7} y1={wy + s * 0.6} x2={wx + s * 0.7} y2={wy + s * 0.6} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          {rotationHandle}
          {scaleHandle}
        </g>
      );
    }

    case 'arrow': {
      // Two-point arrow model: from → to
      if (!obj.from || !obj.to) return null;
      const { wx: x1, wy: y1 } = normalizedToWorld(obj.from.x, obj.from.y);
      const { wx: x2, wy: y2 } = normalizedToWorld(obj.to.x, obj.to.y);
      const arrowColor = (obj.props.color as string) ?? '#6b7280';
      const pattern = (obj.props.pattern as string) ?? 'solid';
      const hasArrowhead = obj.props.arrowhead !== false;

      return (
        <g style={{ cursor: 'pointer' }}>
          {/* Invisible wide hit target for the line */}
          <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="transparent"
            strokeWidth={ARROW_HIT_WIDTH}
            onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, obj.id); }}
          />
          {/* Visible arrow line */}
          <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={arrowColor}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray={pattern === 'dashed' ? '8 6' : undefined}
            markerEnd={hasArrowhead ? 'url(#spatial-arrowhead)' : undefined}
            pointerEvents="none"
          />
          {/* Selection highlight + endpoint handles */}
          {isSelected && (
            <>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#2563eb"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                pointerEvents="none"
                data-selection-ring
              />
              {/* From endpoint handle */}
              <circle
                cx={x1} cy={y1} r={ENDPOINT_HIT_R}
                fill="transparent"
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onEndpointPointerDown?.(e, obj.id, 'from');
                }}
              />
              <circle
                cx={x1} cy={y1} r={ENDPOINT_VIS_R}
                fill={arrowColor} fillOpacity={0.15}
                stroke={arrowColor} strokeWidth={2} strokeOpacity={0.6}
                pointerEvents="none"
                data-selection-ring
              />
              {/* To endpoint handle */}
              <circle
                cx={x2} cy={y2} r={ENDPOINT_HIT_R}
                fill="transparent"
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onEndpointPointerDown?.(e, obj.id, 'to');
                }}
              />
              <circle
                cx={x2} cy={y2} r={ENDPOINT_VIS_R}
                fill={arrowColor} fillOpacity={0.15}
                stroke={arrowColor} strokeWidth={2} strokeOpacity={0.6}
                pointerEvents="none"
                data-selection-ring
              />
            </>
          )}
        </g>
      );
    }

    case 'zone': {
      const zoneColor = (obj.props.color as string) ?? '#8b5cf6';
      const fillOpacity = (obj.props.fillOpacity as number) ?? 0.2;
      const polyPoints = obj.props.points as { x: number; y: number }[] | undefined;
      const isWater = obj.props.polygonVariant === 'water';

      // Polygon-based zone/water
      if (polyPoints && polyPoints.length >= 3) {
        const polyStr = polyPoints
          .map((p) => {
            const { wx: px, wy: py } = normalizedToWorld(p.x, p.y);
            return `${px},${py}`;
          })
          .join(' ');

        return (
          <g {...common}>
            {isSelected && (
              <polygon
                points={polyStr}
                fill="none"
                stroke="#2563eb"
                strokeWidth={2.5}
                strokeDasharray="6 3"
                data-selection-ring
              />
            )}
            <polygon
              points={polyStr}
              fill={zoneColor}
              fillOpacity={fillOpacity}
              stroke={zoneColor}
              strokeWidth={2}
              strokeDasharray={isWater ? undefined : '8 4'}
            />
            {/* Water wave pattern */}
            {isWater && (() => {
              const cx = polyPoints.reduce((s, p) => s + p.x, 0) / polyPoints.length;
              const cy = polyPoints.reduce((s, p) => s + p.y, 0) / polyPoints.length;
              const { wx: cwx, wy: cwy } = normalizedToWorld(cx, cy);
              return (
                <text
                  x={cwx}
                  y={cwy}
                  textAnchor="middle"
                  fontSize={24}
                  fill={zoneColor}
                  fillOpacity={0.6}
                  pointerEvents="none"
                >
                  ≈
                </text>
              );
            })()}
          </g>
        );
      }

      // Legacy rect-based zone
      const zw = ((obj.props.width as number) ?? 0.1) * WORLD_WIDTH;
      const zh = ((obj.props.height as number) ?? 0.07) * WORLD_HEIGHT;
      return (
        <g {...common} transform={combinedTransform}>
          {isSelected && (
            <rect
              x={wx - zw / 2 - 4}
              y={wy - zh / 2 - 4}
              width={zw + 8}
              height={zh + 8}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2.5}
              strokeDasharray="6 3"
              data-selection-ring
            />
          )}
          <rect
            x={wx - zw / 2}
            y={wy - zh / 2}
            width={zw}
            height={zh}
            fill={zoneColor}
            fillOpacity={fillOpacity}
            stroke={zoneColor}
            strokeWidth={2}
            strokeDasharray="8 4"
          />
        </g>
      );
    }

    case 'label': {
      const text = (obj.props.text as string) ?? 'Text';
      const fontSize = (obj.props.fontSize as number) ?? 16;
      const textColor = (obj.props.color as string) ?? '#1f2937';
      const borderColor = (obj.props.borderColor as string) ?? '#ffffff';
      return (
        <g {...common} transform={combinedTransform}>
          {/* Invisible hit target */}
          <rect
            x={wx - fontSize * 2}
            y={wy - fontSize * 0.6}
            width={fontSize * 4}
            height={fontSize * 1.2}
            fill="transparent"
          />
          {hoverRing}
          {selectionRing}
          {/* Halo / border for readability */}
          <text
            x={wx}
            y={wy + fontSize * 0.35}
            textAnchor="middle"
            fontSize={fontSize}
            fill="none"
            stroke={borderColor}
            strokeWidth={4}
            strokeLinejoin="round"
            pointerEvents="none"
          >
            {text}
          </text>
          <text
            x={wx}
            y={wy + fontSize * 0.35}
            textAnchor="middle"
            fontSize={fontSize}
            fill={textColor}
            fontWeight={500}
            pointerEvents="none"
          >
            {text}
          </text>
          {rotationHandle}
          {scaleHandle}
        </g>
      );
    }

    case 'checkpoint': {
      const cpLabel = (obj.props.label as string) ?? '?';
      const cpKind = (obj.props.kind as string) ?? 'checkpoint';
      const R = 18; // circle radius
      const isStart = cpKind === 'start';
      const isFinish = cpKind === 'finish';

      return (
        <g {...common} transform={combinedTransform}>
          {/* Hit target */}
          <circle cx={wx} cy={wy} r={R + HIT_EXPAND} fill="transparent" />
          {hoverRing}
          {selectionRing}

          {/* Pin stem */}
          <line
            x1={wx} y1={wy + R} x2={wx} y2={wy + R + 10}
            stroke={color} strokeWidth={3} strokeLinecap="round"
            pointerEvents="none"
          />

          {/* Main circle */}
          <circle
            cx={wx} cy={wy} r={R}
            fill={color} fillOpacity={0.9}
            pointerEvents="none"
          />
          <circle
            cx={wx} cy={wy} r={R}
            fill="none"
            stroke="#fff" strokeWidth={2}
            pointerEvents="none"
          />

          {/* Kind indicator ring */}
          {isStart && (
            <circle
              cx={wx} cy={wy} r={R + 4}
              fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 2"
              pointerEvents="none"
            />
          )}
          {isFinish && (
            <circle
              cx={wx} cy={wy} r={R + 4}
              fill="none" stroke={color} strokeWidth={3}
              pointerEvents="none"
            />
          )}

          {/* Label text */}
          <text
            x={wx}
            y={wy + 5}
            textAnchor="middle"
            fontSize={cpLabel.length > 2 ? 10 : 14}
            fontWeight="bold"
            fill="#fff"
            pointerEvents="none"
          >
            {cpLabel}
          </text>
          {rotationHandle}
          {scaleHandle}
        </g>
      );
    }

    default: {
      // Path-segment with polyline points (multi-point chain)
      const pathPts = obj.props.points as { x: number; y: number }[] | undefined;
      if (obj.type === 'path-segment' && pathPts && pathPts.length >= 2) {
        const pathColor = (obj.props.color as string) ?? '#a16207';
        const strokeW = (obj.props.strokeWidth as number) ?? 3;
        const polylineStr = pathPts
          .map((p) => {
            const { wx: px, wy: py } = normalizedToWorld(p.x, p.y);
            return `${px},${py}`;
          })
          .join(' ');

        return (
          <g {...common}>
            {/* Wide invisible hit target */}
            <polyline
              points={polylineStr}
              fill="none"
              stroke="transparent"
              strokeWidth={ARROW_HIT_WIDTH}
            />
            {isSelected && (
              <polyline
                points={polylineStr}
                fill="none"
                stroke="#2563eb"
                strokeWidth={strokeW + 4}
                strokeDasharray="6 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                data-selection-ring
              />
            )}
            {/* White halo for visibility */}
            <polyline
              points={polylineStr}
              fill="none"
              stroke="#fff"
              strokeWidth={strokeW + 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.7}
              pointerEvents="none"
            />
            {/* Actual path line */}
            <polyline
              points={polylineStr}
              fill="none"
              stroke={pathColor}
              strokeWidth={strokeW}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="10 5"
              pointerEvents="none"
            />
            {/* Vertex dots */}
            {pathPts.map((p, i) => {
              const { wx: px, wy: py } = normalizedToWorld(p.x, p.y);
              return (
                <circle
                  key={i}
                  cx={px}
                  cy={py}
                  r={isSelected ? 5 : 3}
                  fill={isSelected ? '#2563eb' : pathColor}
                  fillOpacity={0.6}
                  pointerEvents="none"
                />
              );
            })}
          </g>
        );
      }

      // Arrow-chain: polyline with arrowhead marker
      const acPts = obj.props.points as { x: number; y: number }[] | undefined;
      if (obj.type === 'arrow-chain' && acPts && acPts.length >= 2) {
        const acColor = (obj.props.color as string) ?? '#6b7280';
        const acStrokeW = (obj.props.strokeWidth as number) ?? 3;
        const acPattern = (obj.props.pattern as string) ?? 'solid';
        const hasArrowhead = obj.props.arrowhead !== false;
        const markerId = `arrowhead-${obj.id}`;
        const polyStr = acPts
          .map((p) => {
            const { wx: px, wy: py } = normalizedToWorld(p.x, p.y);
            return `${px},${py}`;
          })
          .join(' ');

        return (
          <g {...common}>
            {/* Arrowhead marker definition */}
            {hasArrowhead && (
              <defs>
                <marker
                  id={markerId}
                  markerWidth="10" markerHeight="7"
                  refX="9" refY="3.5"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill={acColor}
                  />
                </marker>
              </defs>
            )}
            {/* Wide invisible hit target */}
            <polyline
              points={polyStr}
              fill="none"
              stroke="transparent"
              strokeWidth={ARROW_HIT_WIDTH}
            />
            {isSelected && (
              <polyline
                points={polyStr}
                fill="none"
                stroke="#2563eb"
                strokeWidth={acStrokeW + 4}
                strokeDasharray="6 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                data-selection-ring
              />
            )}
            {/* White halo */}
            <polyline
              points={polyStr}
              fill="none"
              stroke="#fff"
              strokeWidth={acStrokeW + 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.7}
              pointerEvents="none"
            />
            {/* Actual arrow-chain line */}
            <polyline
              points={polyStr}
              fill="none"
              stroke={acColor}
              strokeWidth={acStrokeW}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={acPattern === 'dashed' ? '10 5' : undefined}
              markerEnd={hasArrowhead ? `url(#${markerId})` : undefined}
              pointerEvents="none"
            />
            {/* Vertex dots */}
            {acPts.map((p, i) => {
              const { wx: px, wy: py } = normalizedToWorld(p.x, p.y);
              return (
                <circle
                  key={i}
                  cx={px}
                  cy={py}
                  r={isSelected ? 5 : 3}
                  fill={isSelected ? '#2563eb' : acColor}
                  fillOpacity={0.6}
                  pointerEvents="none"
                />
              );
            })}
          </g>
        );
      }

      // Surroundings assets (tree, house, water, treasure, etc.)
      const Renderer = SURROUNDINGS_RENDERERS[obj.type];
      if (!Renderer) return null;
      return (
        <g {...common} transform={combinedTransform}>
          {/* Hit target */}
          <circle cx={wx} cy={wy} r={20 + HIT_EXPAND} fill="transparent" />
          {hoverRing}
          {selectionRing}
          <Renderer
            wx={wx}
            wy={wy}
            color={color}
            variant={(obj.props.variant as string) ?? undefined}
            number={(obj.props.number as number) ?? undefined}
            rotation={rotation}
          />
          {rotationHandle}
          {scaleHandle}
        </g>
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Grid background
// ---------------------------------------------------------------------------

function GridBackground() {
  const step = 50;
  const lines: React.ReactNode[] = [];

  for (let x = 0; x <= WORLD_WIDTH; x += step) {
    lines.push(
      <line
        key={`v${x}`}
        x1={x} y1={0} x2={x} y2={WORLD_HEIGHT}
        stroke="#e5e7eb"
        strokeWidth={x % 100 === 0 ? 1.5 : 0.75}
      />,
    );
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += step) {
    lines.push(
      <line
        key={`h${y}`}
        x1={0} y1={y} x2={WORLD_WIDTH} y2={y}
        stroke="#e5e7eb"
        strokeWidth={y % 100 === 0 ? 1.5 : 0.75}
      />,
    );
  }

  return <g>{lines}</g>;
}

// ---------------------------------------------------------------------------
// World boundary
// ---------------------------------------------------------------------------

function WorldBorder() {
  return (
    <rect
      x={0} y={0}
      width={WORLD_WIDTH} height={WORLD_HEIGHT}
      fill="#ffffff"
      stroke="#d1d5db"
      strokeWidth={2}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Canvas Component
// ---------------------------------------------------------------------------

type DragState =
  | { kind: 'object'; anchors: Map<string, { startNx: number; startNy: number }>; startScreenX: number; startScreenY: number; vbSnapshot: ViewBox }
  | { kind: 'arrow-endpoint'; id: string; handle: 'from' | 'to'; startScreenX: number; startScreenY: number; startNx: number; startNy: number; vbSnapshot: ViewBox }
  | { kind: 'rotate'; id: string; cx: number; cy: number; startAngle: number; startRotation: number }
  | { kind: 'scale'; id: string; cx: number; cy: number; startDist: number; startScale: number }
  | null;

export const SpatialCanvas = forwardRef<SVGSVGElement>(function SpatialCanvas(_props, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  useImperativeHandle(ref, () => svgRef.current!, []);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [isAltDown, setIsAltDown] = useState(false);
  const [isShiftDown, setIsShiftDown] = useState(false);
  // Refs mirror the state above but are immediately up-to-date (no re-render needed).
  // This avoids stale-closure bugs where a pointerDown callback fires before
  // React has re-rendered after a keyDown state change (common on laptop touchpads).
  const isSpaceDownRef = useRef(false);
  const isAltDownRef = useRef(false);
  /** Hovered object ID for hover glow */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  /** Ghost target for live preview during two-click creation */
  const [ghostTarget, setGhostTarget] = useState<{ nx: number; ny: number } | null>(null);
  const panStartRef = useRef<{ sx: number; sy: number; vb: ViewBox } | null>(null);
  const dragRef = useRef<DragState>(null);

  const viewBox = useSpatialEditorStore((s) => s.viewBox);
  const doc = useSpatialEditorStore((s) => s.doc);
  const selectedIds = useSpatialEditorStore((s) => s.selectedIds);
  const activeTool = useSpatialEditorStore((s) => s.activeTool);
  const activePlaceType = useSpatialEditorStore((s) => s.activePlaceType);
  const pendingStart = useSpatialEditorStore((s) => s.pendingStart);
  const snapEnabled = useSpatialEditorStore((s) => s.snapEnabled);
  const select = useSpatialEditorStore((s) => s.select);
  const toggleSelect = useSpatialEditorStore((s) => s.toggleSelect);
  const placeAt = useSpatialEditorStore((s) => s.placeAt);
  const handleArrowClick = useSpatialEditorStore((s) => s.handleArrowClick);
  const handleZoneClick = useSpatialEditorStore((s) => s.handleZoneClick);
  const handlePolygonClick = useSpatialEditorStore((s) => s.handlePolygonClick);
  const pendingPolygonPoints = useSpatialEditorStore((s) => s.pendingPolygonPoints);
  const pendingPolygonType = useSpatialEditorStore((s) => s.pendingPolygonType);
  const handlePathClick = useSpatialEditorStore((s) => s.handlePathClick);
  const pendingPathPoints = useSpatialEditorStore((s) => s.pendingPathPoints);
  const handleArrowChainClick = useSpatialEditorStore((s) => s.handleArrowChainClick);
  const pendingArrowChainPoints = useSpatialEditorStore((s) => s.pendingArrowChainPoints);
  const moveSelected = useSpatialEditorStore((s) => s.moveSelected);
  const moveArrowEndpoint = useSpatialEditorStore((s) => s.moveArrowEndpoint);
  const setViewBox = useSpatialEditorStore((s) => s.setViewBox);
  const deleteSelected = useSpatialEditorStore((s) => s.deleteSelected);
  const duplicateSelected = useSpatialEditorStore((s) => s.duplicateSelected);
  const nudgeSelected = useSpatialEditorStore((s) => s.nudgeSelected);
  const showTrail = useSpatialEditorStore((s) => s.showTrail);
  const constrainToContentBox = useSpatialEditorStore((s) => s.constrainToContentBox);
  const backgroundLocked = useSpatialEditorStore((s) => s.backgroundLocked);
  const updateObjectTransform = useSpatialEditorStore((s) => s.updateObjectTransform);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Collect all visible objects
  const visibleObjects = doc.layers
    .filter((l) => l.visible)
    .flatMap((l) => l.objects);

  /** Apply snap conditionally (respects snapEnabled + Alt key override) */
  const conditionalSnap = useCallback(
    (v: number) => (snapEnabled && !isAltDown) ? snap(v) : v,
    [snapEnabled, isAltDown],
  );

  // ---- Keep viewBox aspect ratio in sync with the container ----
  // This ensures screenToWorld math is always correct (no letterbox offset).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const syncAspect = () => {
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const containerAspect = rect.width / rect.height;
      const vb = useSpatialEditorStore.getState().viewBox;
      const currentAspect = vb.w / vb.h;
      // Only update if aspect ratio changed beyond threshold (avoids loops)
      if (Math.abs(containerAspect - currentAspect) > 0.005) {
        const newH = vb.w / containerAspect;
        setViewBox({ ...vb, h: newH });
      }
    };

    syncAspect();
    const ro = new ResizeObserver(syncAspect);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [setViewBox]);

  // Helper: screen event → snapped normalized coords
  const eventToNormalized = useCallback(
    (e: React.PointerEvent | React.MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return { nx: 0, ny: 0 };
      const rect = svg.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const { wx, wy } = screenToWorld(screenX, screenY, rect, viewBox);
      const { nx, ny } = worldToNormalized(wx, wy);
      return { nx: conditionalSnap(nx), ny: conditionalSnap(ny) };
    },
    [viewBox, conditionalSnap],
  );

  // ------ Keyboard ------
  // Track modifier keys via window-level listeners so they work even when
  // the SVG element doesn't have strict focus (common on laptops / touchpads).
  const spaceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        // Prevent page scroll, but only if our SVG area is likely active
        // (not when typing in an input or textarea)
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        if (spaceTimerRef.current) {
          clearTimeout(spaceTimerRef.current);
          spaceTimerRef.current = null;
        }
        isSpaceDownRef.current = true;
        setIsSpaceDown(true);
      }
      if (e.key === 'Alt') { isAltDownRef.current = true; setIsAltDown(true); }
      if (e.key === 'Shift') setIsShiftDown(true);
    };

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        // Small grace period (150ms) so space+click on touchpad works even
        // if keyUp fires slightly before pointerDown.
        if (spaceTimerRef.current) clearTimeout(spaceTimerRef.current);
        isSpaceDownRef.current = false;
        spaceTimerRef.current = setTimeout(() => {
          setIsSpaceDown(false);
          spaceTimerRef.current = null;
        }, 150);
      }
      if (e.key === 'Alt') { isAltDownRef.current = false; setIsAltDown(false); }
      if (e.key === 'Shift') setIsShiftDown(false);
    };

    // Also reset on window blur (prevents stuck modifier keys)
    const handleBlur = () => {
      isSpaceDownRef.current = false;
      isAltDownRef.current = false;
      setIsSpaceDown(false);
      setIsAltDown(false);
      setIsShiftDown(false);
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (spaceTimerRef.current) clearTimeout(spaceTimerRef.current);
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Space, Alt, Shift are now handled globally above
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
      if (e.key === 'Escape') {
        select(null);
        const store = useSpatialEditorStore.getState();
        // Cancel polygon mode if active
        if (store.pendingPolygonPoints.length > 0 || store.pendingPolygonType) {
          store.cancelPolygon();
          return;
        }
        // Cancel path mode if active
        if (store.pendingPathPoints.length > 0 || store.activeTool === 'path') {
          store.cancelPath();
          return;
        }
        // Cancel arrow-chain mode if active
        if (store.pendingArrowChainPoints.length > 0 || store.activeTool === 'arrow-chain') {
          store.cancelArrowChain();
          return;
        }
        store.setActivePlaceType(null);
        if (store.activeTool !== 'select') {
          store.setTool('select');
        }
      }
      // Enter key: finalize path/polygon if in progress
      if (e.key === 'Enter') {
        const store = useSpatialEditorStore.getState();
        if (store.activeTool === 'path' && store.pendingPathPoints.length >= 2) {
          e.preventDefault();
          store.finalizePath();
          return;
        }
        if (store.activeTool === 'polygon' && store.pendingPolygonPoints.length >= 3) {
          e.preventDefault();
          store.finalizePolygon();
          return;
        }
        if (store.activeTool === 'arrow-chain' && store.pendingArrowChainPoints.length >= 2) {
          e.preventDefault();
          store.finalizeArrowChain();
          return;
        }
      }
      // Nudge with arrow keys: 1 snap step, Shift = 5× step
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = SNAP_STEP * (e.shiftKey ? NUDGE_MULTIPLIER : 1);
        const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
        const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
        nudgeSelected(dx, dy);
      }
      // Duplicate: Ctrl/Cmd+D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
      }
    },
    [deleteSelected, select, nudgeSelected, duplicateSelected],
  );

  const handleKeyUp = useCallback((_e: React.KeyboardEvent) => {
    // Modifiers now handled globally
  }, []);

  // ------ Wheel zoom ------
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newVb = zoomViewBox(viewBox, screenX, screenY, rect, factor);
      setViewBox(newVb);
    },
    [viewBox, setViewBox],
  );

  // ------ Pointer down on canvas background ------
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;

      // Middle-mouse or Space+click or Hand tool → start pan
      // Use ref (not state) for isSpaceDown to avoid stale-closure on touchpads
      if (e.button === 1 || (e.button === 0 && (isSpaceDownRef.current || activeTool === 'hand'))) {
        setIsPanning(true);
        panStartRef.current = {
          sx: e.clientX,
          sy: e.clientY,
          vb: { ...viewBox },
        };
        svg.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }

      // Left click on empty canvas
      if (e.button === 0) {
        const { nx, ny } = eventToNormalized(e);

        // Two-click arrow mode
        if (activeTool === 'arrow') {
          handleArrowClick(nx, ny);
          return;
        }

        // Two-click zone mode
        if (activeTool === 'zone') {
          handleZoneClick(nx, ny);
          return;
        }

        // Multi-click polygon mode
        if (activeTool === 'polygon') {
          handlePolygonClick(nx, ny);
          return;
        }

        // Multi-click path mode
        if (activeTool === 'path') {
          handlePathClick(nx, ny);
          return;
        }

        // Multi-click arrow-chain mode
        if (activeTool === 'arrow-chain') {
          handleArrowChainClick(nx, ny);
          return;
        }

        // Point placement mode
        if (activeTool === 'place' && activePlaceType) {
          placeAt(nx, ny);
          return;
        }

        // Deselect (unless background is locked)
        if (!backgroundLocked) {
          select(null);
        }
      }
    },
    [activeTool, activePlaceType, viewBox, select, placeAt, handleArrowClick, handleZoneClick, handlePolygonClick, handlePathClick, handleArrowChainClick, eventToNormalized, backgroundLocked],
  );

  // ------ Object pointer down (select + start drag) ------
  const handleObjectPointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      // Don't start drag if we're in a creation mode
      if (activeTool === 'arrow' || activeTool === 'zone' || activeTool === 'polygon' || activeTool === 'path' || activeTool === 'arrow-chain') return;

      // Shift+click → toggle multi-select
      if (e.shiftKey) {
        toggleSelect(id);
        return;
      }

      // Regular click → solo select (unless already in selection set)
      const currentIds = useSpatialEditorStore.getState().selectedIds;
      if (!currentIds.includes(id)) {
        select(id);
      }

      // Build drag anchors for all currently-selected objects
      const afterIds = useSpatialEditorStore.getState().selectedIds;
      const anchors = new Map<string, { startNx: number; startNy: number }>();
      for (const sid of afterIds) {
        const obj = visibleObjects.find((o) => o.id === sid);
        if (obj) anchors.set(sid, { startNx: obj.t.x, startNy: obj.t.y });
      }

      dragRef.current = {
        kind: 'object',
        anchors,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        vbSnapshot: { ...useSpatialEditorStore.getState().viewBox },
      };

      svgRef.current?.setPointerCapture(e.pointerId);
    },
    [select, toggleSelect, visibleObjects, activeTool],
  );

  // ------ Arrow endpoint pointer down ------
  const handleEndpointPointerDown = useCallback(
    (e: React.PointerEvent, id: string, handle: 'from' | 'to') => {
      e.stopPropagation();
      if (e.button !== 0) return;

      const obj = visibleObjects.find((o) => o.id === id);
      if (!obj || !obj.from || !obj.to) return;

      const endpoint = handle === 'from' ? obj.from : obj.to;

      dragRef.current = {
        kind: 'arrow-endpoint',
        id,
        handle,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startNx: endpoint.x,
        startNy: endpoint.y,
        vbSnapshot: { ...useSpatialEditorStore.getState().viewBox },
      };

      svgRef.current?.setPointerCapture(e.pointerId);
    },
    [visibleObjects],
  );

  // ------ Rotation handle pointer down ------
  const handleRotateHandlePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      const obj = visibleObjects.find((o) => o.id === id);
      if (!obj) return;

      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();

      // Object center in screen coords
      const { wx, wy } = normalizedToWorld(obj.t.x, obj.t.y);
      const cx = rect.left + ((wx - viewBox.x) / viewBox.w) * rect.width;
      const cy = rect.top + ((wy - viewBox.y) / viewBox.h) * rect.height;

      // Angle from center to pointer
      const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);

      dragRef.current = {
        kind: 'rotate',
        id,
        cx,
        cy,
        startAngle,
        startRotation: obj.t.rotation ?? 0,
      };

      svgRef.current?.setPointerCapture(e.pointerId);
    },
    [visibleObjects, viewBox],
  );

  // ------ Scale handle pointer down ------
  const handleScaleHandlePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      const obj = visibleObjects.find((o) => o.id === id);
      if (!obj) return;

      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();

      // Object center in screen coords
      const { wx, wy } = normalizedToWorld(obj.t.x, obj.t.y);
      const cx = rect.left + ((wx - viewBox.x) / viewBox.w) * rect.width;
      const cy = rect.top + ((wy - viewBox.y) / viewBox.h) * rect.height;

      // Distance from center to pointer at drag start
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const startDist = Math.sqrt(dx * dx + dy * dy);

      dragRef.current = {
        kind: 'scale',
        id,
        cx,
        cy,
        startDist: Math.max(startDist, 1), // avoid division by zero
        startScale: obj.t.scale ?? 1,
      };

      svgRef.current?.setPointerCapture(e.pointerId);
    },
    [visibleObjects, viewBox],
  );

  // ------ Pointer move (pan, drag, endpoint drag, or ghost tracking) ------
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();

      // Ghost preview tracking — update cursor position when pendingStart is active
      if (pendingStart && (activeTool === 'arrow' || activeTool === 'zone')) {
        let { nx, ny } = eventToNormalized(e);
        if (constrainToContentBox) {
          const box = getActiveContentBox(doc);
          if (box) { const c = clampToBox(nx, ny, box); nx = c.nx; ny = c.ny; }
        }
        setGhostTarget({ nx, ny });
      }

      // Ghost preview tracking — polygon mode
      if (activeTool === 'polygon') {
        let { nx, ny } = eventToNormalized(e);
        if (constrainToContentBox) {
          const box = getActiveContentBox(doc);
          if (box) { const c = clampToBox(nx, ny, box); nx = c.nx; ny = c.ny; }
        }
        setGhostTarget({ nx, ny });
      }

      // Ghost preview tracking — path mode
      if (activeTool === 'path') {
        let { nx, ny } = eventToNormalized(e);
        if (constrainToContentBox) {
          const box = getActiveContentBox(doc);
          if (box) { const c = clampToBox(nx, ny, box); nx = c.nx; ny = c.ny; }
        }
        setGhostTarget({ nx, ny });
      }

      // Ghost preview tracking — arrow-chain mode
      if (activeTool === 'arrow-chain') {
        let { nx, ny } = eventToNormalized(e);
        if (constrainToContentBox) {
          const box = getActiveContentBox(doc);
          if (box) { const c = clampToBox(nx, ny, box); nx = c.nx; ny = c.ny; }
        }
        setGhostTarget({ nx, ny });
      }

      // Ghost preview for place mode (checkpoint hover pin, etc.)
      if (activeTool === 'place') {
        let { nx, ny } = eventToNormalized(e);
        if (constrainToContentBox) {
          const box = getActiveContentBox(doc);
          if (box) { const c = clampToBox(nx, ny, box); nx = c.nx; ny = c.ny; }
        }
        setGhostTarget({ nx, ny });
      }

      // Pan
      if (isPanning && panStartRef.current) {
        const ps = panStartRef.current;
        const dx = e.clientX - ps.sx;
        const dy = e.clientY - ps.sy;
        const dwx = -(dx / rect.width) * ps.vb.w;
        const dwy = -(dy / rect.height) * ps.vb.h;
        setViewBox({
          ...ps.vb,
          x: ps.vb.x + dwx,
          y: ps.vb.y + dwy,
        });
        return;
      }

      const drag = dragRef.current;
      if (!drag) return;

      if (drag.kind === 'object' && drag.anchors.size > 0) {
        const dx = e.clientX - drag.startScreenX;
        const dy = e.clientY - drag.startScreenY;
        const { dwx, dwy } = screenDeltaToWorld(dx, dy, rect, drag.vbSnapshot);
        const dnx = dwx / WORLD_WIDTH;
        const dny = dwy / WORLD_HEIGHT;

        const positions = new Map<string, { nx: number; ny: number }>();
        for (const [id, anchor] of drag.anchors) {
          positions.set(id, {
            nx: conditionalSnap(anchor.startNx + dnx),
            ny: conditionalSnap(anchor.startNy + dny),
          });
        }
        moveSelected(positions);
      }

      if (drag.kind === 'arrow-endpoint') {
        const dx = e.clientX - drag.startScreenX;
        const dy = e.clientY - drag.startScreenY;
        const { dwx, dwy } = screenDeltaToWorld(dx, dy, rect, drag.vbSnapshot);
        const newNx = conditionalSnap(drag.startNx + dwx / WORLD_WIDTH);
        const newNy = conditionalSnap(drag.startNy + dwy / WORLD_HEIGHT);
        moveArrowEndpoint(drag.id, drag.handle, newNx, newNy);
      }

      if (drag.kind === 'rotate') {
        const currentAngle = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx) * (180 / Math.PI);
        const delta = currentAngle - drag.startAngle;
        let newRotation = drag.startRotation + delta;

        // Snap to 15° increments unless Shift is held (free rotation)
        if (!isShiftDown) {
          newRotation = Math.round(newRotation / 15) * 15;
        }

        // Normalize to -180..180
        while (newRotation > 180) newRotation -= 360;
        while (newRotation < -180) newRotation += 360;

        updateObjectTransform(drag.id, { rotation: newRotation });
      }

      if (drag.kind === 'scale') {
        const dx = e.clientX - drag.cx;
        const dy = e.clientY - drag.cy;
        const currentDist = Math.sqrt(dx * dx + dy * dy);
        let newScale = drag.startScale * (currentDist / drag.startDist);

        // Clamp to 0.3..3.0
        newScale = Math.max(0.3, Math.min(3.0, newScale));

        // Snap to 0.1 increments unless Shift is held
        if (!isShiftDown) {
          newScale = Math.round(newScale * 10) / 10;
        }

        updateObjectTransform(drag.id, { scale: newScale });
      }
    },
    [isPanning, setViewBox, moveSelected, moveArrowEndpoint, updateObjectTransform, isShiftDown, conditionalSnap, pendingStart, activeTool, eventToNormalized, constrainToContentBox, doc],
  );

  // ------ Pointer up ------
  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
    dragRef.current = null;
  }, []);

  // ------ Cursor style ------
  let cursorClass = 'cursor-default';
  if (isPanning || isSpaceDown || activeTool === 'hand') cursorClass = 'cursor-grab';
  if (activeTool === 'place' || activeTool === 'arrow' || activeTool === 'zone' || activeTool === 'arrow-chain') cursorClass = 'cursor-crosshair';

  const vb = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return (
    <svg
      ref={svgRef}
      viewBox={vb}
      className={`spatial-canvas-svg w-full h-full select-none outline-none bg-gray-100 ${cursorClass}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Defs */}
      <defs>
        <marker
          id="spatial-arrowhead"
          markerWidth={12}
          markerHeight={12}
          refX={10}
          refY={6}
          orient="auto"
          markerUnits="userSpaceOnUse"
          viewBox="0 0 12 12"
        >
          <path d="M0,0 L0,12 L12,6 z" fill="#6b7280" />
        </marker>
      </defs>

      {/* Background */}
      <WorldBorder />
      {doc.background.type === 'grid' && <GridBackground />}
      {doc.background.type === 'sport-field' && doc.background.variant && (
        <SportFieldRenderer
          variant={doc.background.variant}
          opacity={doc.background.opacity ?? 1}
        />
      )}
      {doc.background.type === 'sport-field' && (
        <g opacity={0.15}>
          <GridBackground />
        </g>
      )}

      {/* Custom image background */}
      {doc.background.type === 'image' && doc.background.src && (
        (() => {
          const imgW = doc.background.imageWidth ?? 1;
          const imgH = doc.background.imageHeight ?? 1;
          const fit = computeContainFit(WORLD_WIDTH, WORLD_HEIGHT, imgW, imgH);
          return (
            <image
              href={doc.background.src}
              x={fit.x}
              y={fit.y}
              width={fit.width}
              height={fit.height}
              preserveAspectRatio="none"
              opacity={doc.background.opacity ?? 1}
            />
          );
        })()
      )}
      {doc.background.type === 'image' && (
        <g opacity={0.1}>
          <GridBackground />
        </g>
      )}

      {/* Objects – zones rendered first (back), then others */}
      {visibleObjects
        .slice()
        .sort((a, b) => {
          const order: Record<string, number> = { zone: 0, arrow: 1 };
          return (order[a.type] ?? 2) - (order[b.type] ?? 2);
        })
        .map((obj) => (
          <RenderObject
            key={obj.id}
            obj={obj}
            isSelected={selectedIdSet.has(obj.id)}
            isHovered={hoveredId === obj.id}
            onPointerDown={handleObjectPointerDown}
            onEndpointPointerDown={handleEndpointPointerDown}
            onRotateHandlePointerDown={handleRotateHandlePointerDown}
            onScaleHandlePointerDown={handleScaleHandlePointerDown}
            onHoverChange={setHoveredId}
          />
        ))}

      {/* ContentBox constraint indicator */}
      {constrainToContentBox && (() => {
        let box: { x: number; y: number; w: number; h: number } | null = null;
        if (doc.background.type === 'sport-field' && doc.background.variant) {
          box = getContentBox(doc.background.variant);
        } else if (doc.background.type === 'image' && doc.background.imageWidth && doc.background.imageHeight) {
          const fit = computeContainFit(WORLD_WIDTH, WORLD_HEIGHT, doc.background.imageWidth, doc.background.imageHeight);
          box = { x: fit.x / WORLD_WIDTH, y: fit.y / WORLD_HEIGHT, w: fit.width / WORLD_WIDTH, h: fit.height / WORLD_HEIGHT };
        }
        if (!box) return null;
        const bx = box.x * WORLD_WIDTH;
        const by = box.y * WORLD_HEIGHT;
        const bw = box.w * WORLD_WIDTH;
        const bh = box.h * WORLD_HEIGHT;
        return (
          <rect
            x={bx} y={by} width={bw} height={bh}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="10 5"
            strokeOpacity={0.5}
            pointerEvents="none"
            data-selection-ring
          />
        );
      })()}

      {/* Auto-route trail line connecting checkpoints in order */}
      {showTrail && (() => {
        const checkpoints = visibleObjects
          .filter((o) => o.type === 'checkpoint')
          .sort((a, b) =>
            (((a.props.order as number) ?? 999) - ((b.props.order as number) ?? 999))
            || a.id.localeCompare(b.id),
          );
        if (checkpoints.length < 2) return null;
        const points = checkpoints
          .map((cp) => {
            const { wx, wy } = normalizedToWorld(cp.t.x, cp.t.y);
            return `${wx},${wy}`;
          })
          .join(' ');
        return (
          <>
            {/* Wide white halo so trail stays visible over scaled-up stations */}
            <polyline
              points={points}
              fill="none"
              stroke="#ffffff"
              strokeWidth={6}
              strokeOpacity={0.6}
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="none"
            />
            <polyline
              points={points}
              fill="none"
              stroke="#10b981"
              strokeWidth={3}
              strokeOpacity={0.7}
              strokeDasharray="8 6"
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="none"
            />
          </>
        );
      })()}

      {/* Ghost preview for point-object placement */}
      {activeTool === 'place' && activePlaceType && ghostTarget && (
        <g pointerEvents="none" data-selection-ring>
          {(() => {
            const { wx: gx, wy: gy } = normalizedToWorld(ghostTarget.nx, ghostTarget.ny);
            const ghostColor = '#10b981';
            const ghostOpacity = 0.35;

            if (activePlaceType === 'checkpoint') {
              const R = 18;
              return (
                <>
                  <line
                    x1={gx} y1={gy + R} x2={gx} y2={gy + R + 10}
                    stroke={ghostColor} strokeWidth={3} strokeLinecap="round" strokeOpacity={ghostOpacity}
                  />
                  <circle
                    cx={gx} cy={gy} r={R}
                    fill={ghostColor} fillOpacity={0.2}
                    stroke={ghostColor} strokeWidth={2} strokeOpacity={0.4}
                  />
                  <circle
                    cx={gx} cy={gy} r={R}
                    fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.4}
                  />
                  <text
                    x={gx} y={gy + 5}
                    textAnchor="middle" fontSize={14} fontWeight="bold"
                    fill="#fff" fillOpacity={0.5}
                  >
                    ?
                  </text>
                </>
              );
            }

            // Check for surroundings renderer
            const SurrRenderer = SURROUNDINGS_RENDERERS[activePlaceType];
            if (SurrRenderer) {
              return (
                <g opacity={ghostOpacity}>
                  <SurrRenderer wx={gx} wy={gy} color={ghostColor} />
                </g>
              );
            }

            // Generic ghost for player/ball/cone/label
            if (activePlaceType === 'player') {
              const sportVariant = doc.background.type === 'sport-field' ? doc.background.variant : undefined;
              const ghostMarker = sportVariant ? PLAYER_MARKER_BY_SPORT[sportVariant] : undefined;
              if (ghostMarker) {
                return (
                  <image
                    href={ghostMarker}
                    x={gx - 20}
                    y={gy - 20}
                    width={40}
                    height={40}
                    opacity={0.45}
                    pointerEvents="none"
                  />
                );
              }
              return (
                <>
                  <circle cx={gx} cy={gy} r={20} fill={ghostColor} fillOpacity={0.2} stroke={ghostColor} strokeWidth={2} strokeOpacity={0.4} />
                  <circle cx={gx} cy={gy} r={20} fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.3} />
                </>
              );
            }
            if (activePlaceType === 'ball') {
              const sportVariant = doc.background.type === 'sport-field' ? doc.background.variant : undefined;
              const ghostBall = sportVariant ? BALL_MARKER_BY_SPORT[sportVariant] : undefined;
              if (ghostBall) {
                return (
                  <image
                    href={ghostBall}
                    x={gx - 14}
                    y={gy - 14}
                    width={28}
                    height={28}
                    opacity={0.45}
                    pointerEvents="none"
                  />
                );
              }
              return <circle cx={gx} cy={gy} r={12} fill={ghostColor} fillOpacity={0.25} stroke={ghostColor} strokeWidth={2} strokeOpacity={0.4} />;
            }
            if (activePlaceType === 'cone') {
              const s = 18;
              const pts = `${gx},${gy - s} ${gx - s * 0.7},${gy + s * 0.6} ${gx + s * 0.7},${gy + s * 0.6}`;
              return <polygon points={pts} fill={ghostColor} fillOpacity={0.25} stroke={ghostColor} strokeWidth={2} strokeOpacity={0.4} />;
            }
            if (activePlaceType === 'label') {
              return (
                <text x={gx} y={gy + 5} textAnchor="middle" fontSize={16} fill={ghostColor} fillOpacity={0.5} fontWeight={500}>
                  Text
                </text>
              );
            }

            // Fallback: generic circle
            return <circle cx={gx} cy={gy} r={14} fill={ghostColor} fillOpacity={0.2} stroke={ghostColor} strokeWidth={2} strokeOpacity={0.4} />;
          })()}
        </g>
      )}

      {/* Ghost preview for two-click creation (live arrow/zone preview) */}
      {pendingStart && (activeTool === 'arrow' || activeTool === 'zone') && (() => {
        const { wx: px, wy: py } = normalizedToWorld(pendingStart.x, pendingStart.y);
        const indicatorColor = activeTool === 'arrow' ? '#6b7280' : '#8b5cf6';

        // Target point (cursor or fallback to pending start)
        const target = ghostTarget ?? { nx: pendingStart.x, ny: pendingStart.y };
        const { wx: tx, wy: ty } = normalizedToWorld(target.nx, target.ny);

        return (
          <g data-selection-ring pointerEvents="none">
            {/* Start point indicator */}
            <circle
              cx={px} cy={py} r={8}
              fill={indicatorColor} fillOpacity={0.3}
              stroke={indicatorColor} strokeWidth={2}
            />

            {/* Ghost arrow line */}
            {activeTool === 'arrow' && (
              <line
                x1={px} y1={py} x2={tx} y2={ty}
                stroke={indicatorColor}
                strokeWidth={2.5}
                strokeOpacity={0.45}
                strokeDasharray="6 4"
                strokeLinecap="round"
                markerEnd="url(#spatial-arrowhead)"
              />
            )}

            {/* Ghost zone rectangle */}
            {activeTool === 'zone' && (() => {
              const gx = Math.min(px, tx);
              const gy = Math.min(py, ty);
              const gw = Math.abs(tx - px);
              const gh = Math.abs(ty - py);
              return (
                <rect
                  x={gx} y={gy} width={gw} height={gh}
                  fill={indicatorColor} fillOpacity={0.08}
                  stroke={indicatorColor} strokeWidth={2}
                  strokeOpacity={0.45}
                  strokeDasharray="6 4"
                />
              );
            })()}

            {/* Hint text */}
            <text
              x={px + 14} y={py - 10}
              fontSize={12 * (viewBox.w / WORLD_WIDTH)}
              fill={indicatorColor}
              fillOpacity={0.8}
            >
              {activeTool === 'arrow' ? 'Klicka för slutpunkt' : 'Klicka för andra hörnet'}
            </text>
          </g>
        );
      })()}

      {/* Place-mode crosshair indicator */}
      {activeTool === 'place' && (
        <text
          x={viewBox.x + viewBox.w - 16}
          y={viewBox.y + 26}
          textAnchor="end"
          fontSize={14 * (viewBox.w / WORLD_WIDTH)}
          fill="#6b7280"
          fillOpacity={0.7}
          data-selection-ring
        >
          Klicka för att placera
        </text>
      )}

      {/* Ghost preview for polygon creation */}
      {activeTool === 'polygon' && pendingPolygonType && (() => {
        const polyColor = pendingPolygonType === 'water' ? '#3b82f6' : '#8b5cf6';
        const pts = pendingPolygonPoints;
        const cursor = ghostTarget ? normalizedToWorld(ghostTarget.nx, ghostTarget.ny) : null;

        if (pts.length === 0 && cursor) {
          // No vertices yet — show a crosshair / hint
          return (
            <g pointerEvents="none" data-selection-ring>
              <circle
                cx={cursor.wx} cy={cursor.wy} r={6}
                fill={polyColor} fillOpacity={0.4}
                stroke={polyColor} strokeWidth={2} strokeOpacity={0.6}
              />
              <text
                x={cursor.wx + 14} y={cursor.wy - 10}
                fontSize={12 * (viewBox.w / WORLD_WIDTH)}
                fill={polyColor}
                fillOpacity={0.8}
              >
                Klicka för att sätta hörn
              </text>
            </g>
          );
        }

        // Build world-coordinate points for existing vertices
        const worldPts = pts.map((p) => normalizedToWorld(p.x, p.y));

        return (
          <g pointerEvents="none" data-selection-ring>
            {/* Filled polygon preview (existing points + cursor) */}
            {pts.length >= 2 && (() => {
              const allPts = [...worldPts];
              if (cursor) allPts.push(cursor);
              const polyStr = allPts.map((p) => `${p.wx},${p.wy}`).join(' ');
              return (
                <polygon
                  points={polyStr}
                  fill={polyColor}
                  fillOpacity={0.1}
                  stroke={polyColor}
                  strokeWidth={2}
                  strokeOpacity={0.5}
                  strokeDasharray="6 4"
                />
              );
            })()}

            {/* Lines between vertices */}
            {worldPts.map((p, i) => {
              const next = i < worldPts.length - 1 ? worldPts[i + 1] : cursor;
              if (!next) return null;
              return (
                <line
                  key={i}
                  x1={p.wx} y1={p.wy}
                  x2={next.wx} y2={next.wy}
                  stroke={polyColor}
                  strokeWidth={2}
                  strokeOpacity={0.6}
                  strokeDasharray="6 4"
                />
              );
            })}

            {/* Closing line from cursor back to first point (preview) */}
            {pts.length >= 2 && cursor && (
              <line
                x1={cursor.wx} y1={cursor.wy}
                x2={worldPts[0].wx} y2={worldPts[0].wy}
                stroke={polyColor}
                strokeWidth={1.5}
                strokeOpacity={0.3}
                strokeDasharray="4 4"
              />
            )}

            {/* Vertex dots */}
            {worldPts.map((p, i) => (
              <circle
                key={i}
                cx={p.wx} cy={p.wy}
                r={i === 0 && pts.length >= 3 ? 8 : 5}
                fill={polyColor}
                fillOpacity={i === 0 && pts.length >= 3 ? 0.5 : 0.3}
                stroke={polyColor}
                strokeWidth={2}
                strokeOpacity={0.7}
              />
            ))}

            {/* Cursor dot */}
            {cursor && (
              <circle
                cx={cursor.wx} cy={cursor.wy} r={5}
                fill={polyColor} fillOpacity={0.4}
                stroke={polyColor} strokeWidth={2} strokeOpacity={0.6}
              />
            )}

            {/* Hint text */}
            {worldPts.length > 0 && (
              <text
                x={worldPts[0].wx + 14} y={worldPts[0].wy - 12}
                fontSize={11 * (viewBox.w / WORLD_WIDTH)}
                fill={polyColor}
                fillOpacity={0.8}
              >
                {pts.length < 3 ? `${3 - pts.length} hörn till...` : 'Klicka nära start för att stänga'}
              </text>
            )}
          </g>
        );
      })()}

      {/* Ghost preview for path creation */}
      {activeTool === 'path' && (() => {
        const pathColor = '#a16207';
        const pts = pendingPathPoints;
        const cursor = ghostTarget ? normalizedToWorld(ghostTarget.nx, ghostTarget.ny) : null;

        if (pts.length === 0 && cursor) {
          return (
            <g pointerEvents="none" data-selection-ring>
              <circle
                cx={cursor.wx} cy={cursor.wy} r={6}
                fill={pathColor} fillOpacity={0.4}
                stroke={pathColor} strokeWidth={2} strokeOpacity={0.6}
              />
              <text
                x={cursor.wx + 14} y={cursor.wy - 10}
                fontSize={12 * (viewBox.w / WORLD_WIDTH)}
                fill={pathColor}
                fillOpacity={0.8}
              >
                Klicka för att sätta punkt
              </text>
            </g>
          );
        }

        const worldPts = pts.map((p) => normalizedToWorld(p.x, p.y));

        return (
          <g pointerEvents="none" data-selection-ring>
            {/* Lines between vertices */}
            {worldPts.map((p, i) => {
              const next = i < worldPts.length - 1 ? worldPts[i + 1] : cursor;
              if (!next) return null;
              return (
                <line
                  key={i}
                  x1={p.wx} y1={p.wy}
                  x2={next.wx} y2={next.wy}
                  stroke={pathColor}
                  strokeWidth={3}
                  strokeOpacity={0.5}
                  strokeDasharray="10 5"
                  strokeLinecap="round"
                />
              );
            })}

            {/* White halo on existing lines */}
            {worldPts.length >= 2 && (() => {
              const polyStr = worldPts.map((p) => `${p.wx},${p.wy}`).join(' ');
              return (
                <polyline
                  points={polyStr}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={0.4}
                />
              );
            })()}

            {/* Vertex dots */}
            {worldPts.map((p, i) => (
              <circle
                key={i}
                cx={p.wx} cy={p.wy} r={5}
                fill={pathColor} fillOpacity={0.5}
                stroke={pathColor} strokeWidth={2} strokeOpacity={0.7}
              />
            ))}

            {/* Cursor dot */}
            {cursor && (
              <circle
                cx={cursor.wx} cy={cursor.wy} r={5}
                fill={pathColor} fillOpacity={0.4}
                stroke={pathColor} strokeWidth={2} strokeOpacity={0.6}
              />
            )}

            {/* Hint text */}
            {worldPts.length > 0 && (
              <text
                x={worldPts[0].wx + 14} y={worldPts[0].wy - 12}
                fontSize={11 * (viewBox.w / WORLD_WIDTH)}
                fill={pathColor}
                fillOpacity={0.8}
              >
                {pts.length < 2 ? 'Lägg till fler punkter...' : 'Enter = klar, Esc = avbryt'}
              </text>
            )}
          </g>
        );
      })()}

      {/* Ghost preview for arrow-chain creation */}
      {activeTool === 'arrow-chain' && (() => {
        const acColor = '#6b7280';
        const pts = pendingArrowChainPoints;
        const cursor = ghostTarget ? normalizedToWorld(ghostTarget.nx, ghostTarget.ny) : null;

        if (pts.length === 0 && cursor) {
          return (
            <g pointerEvents="none" data-selection-ring>
              <circle
                cx={cursor.wx} cy={cursor.wy} r={6}
                fill={acColor} fillOpacity={0.4}
                stroke={acColor} strokeWidth={2} strokeOpacity={0.6}
              />
              <text
                x={cursor.wx + 14} y={cursor.wy - 10}
                fontSize={12 * (viewBox.w / WORLD_WIDTH)}
                fill={acColor}
                fillOpacity={0.8}
              >
                Klicka för att sätta punkt
              </text>
            </g>
          );
        }

        const worldPts = pts.map((p) => normalizedToWorld(p.x, p.y));

        return (
          <g pointerEvents="none" data-selection-ring>
            {/* Lines between vertices */}
            {worldPts.map((p, i) => {
              const next = i < worldPts.length - 1 ? worldPts[i + 1] : cursor;
              if (!next) return null;
              return (
                <line
                  key={i}
                  x1={p.wx} y1={p.wy}
                  x2={next.wx} y2={next.wy}
                  stroke={acColor}
                  strokeWidth={3}
                  strokeOpacity={0.5}
                  strokeDasharray="10 5"
                  strokeLinecap="round"
                />
              );
            })}

            {/* White halo on existing lines */}
            {worldPts.length >= 2 && (() => {
              const polyStr = worldPts.map((p) => `${p.wx},${p.wy}`).join(' ');
              return (
                <polyline
                  points={polyStr}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={0.4}
                />
              );
            })()}

            {/* Arrowhead preview on last segment */}
            {worldPts.length >= 1 && cursor && (() => {
              const lastPt = worldPts[worldPts.length - 1];
              const dx = cursor.wx - lastPt.wx;
              const dy = cursor.wy - lastPt.wy;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len < 1) return null;
              const ux = dx / len;
              const uy = dy / len;
              const tipX = cursor.wx;
              const tipY = cursor.wy;
              const sz = 12;
              return (
                <polygon
                  points={`${tipX},${tipY} ${tipX - ux * sz + uy * sz * 0.4},${tipY - uy * sz - ux * sz * 0.4} ${tipX - ux * sz - uy * sz * 0.4},${tipY - uy * sz + ux * sz * 0.4}`}
                  fill={acColor}
                  fillOpacity={0.5}
                />
              );
            })()}

            {/* Vertex dots */}
            {worldPts.map((p, i) => (
              <circle
                key={i}
                cx={p.wx} cy={p.wy} r={5}
                fill={acColor} fillOpacity={0.5}
                stroke={acColor} strokeWidth={2} strokeOpacity={0.7}
              />
            ))}

            {/* Cursor dot */}
            {cursor && (
              <circle
                cx={cursor.wx} cy={cursor.wy} r={5}
                fill={acColor} fillOpacity={0.4}
                stroke={acColor} strokeWidth={2} strokeOpacity={0.6}
              />
            )}

            {/* Hint text */}
            {worldPts.length > 0 && (
              <text
                x={worldPts[0].wx + 14} y={worldPts[0].wy - 12}
                fontSize={11 * (viewBox.w / WORLD_WIDTH)}
                fill={acColor}
                fillOpacity={0.8}
              >
                {pts.length < 2 ? 'Lägg till fler punkter...' : 'Enter = klar, Esc = avbryt'}
              </text>
            )}
          </g>
        );
      })()}
    </svg>
  );
});
