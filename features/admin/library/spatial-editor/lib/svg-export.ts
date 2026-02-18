// =============================================================================
// Spatial Editor – SVG Export (Pure Function)
// =============================================================================
// Renders a SpatialDocumentV1 as a standalone SVG string.
// Server-safe: no DOM, no React — pure string concatenation.
//
// This is the SSoT renderer: the document is the source of truth,
// the SVG is derived on-demand (never stored).
// =============================================================================

import type {
  SpatialDocumentV1,
  SpatialObjectBase,
  SpatialLayer,
  SpatialBackground,
} from './types';
import { WORLD_WIDTH, WORLD_HEIGHT } from './types';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface RenderSpatialSvgOptions {
  /** Base URL prefix for absolute image hrefs (e.g. "https://app.lekbanken.se") */
  baseUrl?: string;
  /** Include grid background? Default: true when background.type === 'grid' */
  includeGrid?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/** Convert normalized 0..1 coords to world px */
function toWorld(nx: number, ny: number): { x: number; y: number } {
  return {
    x: clamp01(nx) * WORLD_WIDTH,
    y: clamp01(ny) * WORLD_HEIGHT,
  };
}

/** Fixed-precision number for stable SVG output (4 decimals) */
function f(n: number): string {
  return Number(n.toFixed(4)).toString();
}

// ---------------------------------------------------------------------------
// Sport-field / map background registry (server-safe, no React)
// ---------------------------------------------------------------------------

interface FieldMeta {
  id: string;
  src: string;
  imageWidth: number;
  imageHeight: number;
}

const IMG_W = 1000;
const IMG_H = 1414;

const ALL_BACKGROUNDS: FieldMeta[] = [
  // Sport fields
  { id: 'football', src: '/court/fotball_v2.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'handball', src: '/court/handball_v2.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'basketball', src: '/court/basket_v2.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'hockey', src: '/court/hockey_v2.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'innebandy', src: '/court/innebandy_v2.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  // Map backgrounds
  { id: 'dungeon_dark', src: '/map-background/dungeon_dark.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'dungeon_light', src: '/map-background/dungeon_light.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'urbansquare_gray', src: '/map-background/urbansquare_gray.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'floor_light', src: '/map-background/floor_light.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'grass_map', src: '/map-background/grass_map.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'schoolyard_sand', src: '/map-background/schoolyard_sand.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'pastell_geographic', src: '/map-background/pastell_geographic.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'suttle_world', src: '/map-background/suttle_world.webp', imageWidth: IMG_W, imageHeight: IMG_H },
  { id: 'tresure_map', src: '/map-background/tresure_map.webp', imageWidth: IMG_W, imageHeight: IMG_H },
];

const BG_MAP = new Map(ALL_BACKGROUNDS.map((b) => [b.id, b]));

function computeContainFit(
  worldW: number,
  worldH: number,
  imgW: number,
  imgH: number,
): { x: number; y: number; width: number; height: number } {
  const worldAspect = worldW / worldH;
  const imgAspect = imgW / imgH;
  let fitW: number;
  let fitH: number;
  if (imgAspect < worldAspect) {
    fitH = worldH;
    fitW = worldH * imgAspect;
  } else {
    fitW = worldW;
    fitH = worldW / imgAspect;
  }
  return {
    x: (worldW - fitW) / 2,
    y: (worldH - fitH) / 2,
    width: fitW,
    height: fitH,
  };
}

// ---------------------------------------------------------------------------
// Background renderers
// ---------------------------------------------------------------------------

function renderGrid(): string {
  const step = 50;
  const lines: string[] = [];
  for (let gx = 0; gx <= WORLD_WIDTH; gx += step) {
    lines.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${WORLD_HEIGHT}" stroke="#e5e7eb" stroke-width="0.5" />`);
  }
  for (let gy = 0; gy <= WORLD_HEIGHT; gy += step) {
    lines.push(`<line x1="0" y1="${gy}" x2="${WORLD_WIDTH}" y2="${gy}" stroke="#e5e7eb" stroke-width="0.5" />`);
  }
  return `<g data-layer="grid">\n${lines.join('\n')}\n</g>`;
}

function renderBackground(bg: SpatialBackground, baseUrl: string, includeGrid: boolean): string {
  const parts: string[] = [];

  // White canvas fill
  parts.push(`<rect x="0" y="0" width="${WORLD_WIDTH}" height="${WORLD_HEIGHT}" fill="#ffffff" />`);

  if (bg.type === 'grid' && includeGrid) {
    parts.push(renderGrid());
  }

  if (bg.type === 'sport-field' && bg.variant) {
    const meta = BG_MAP.get(bg.variant);
    if (meta) {
      const fit = computeContainFit(WORLD_WIDTH, WORLD_HEIGHT, meta.imageWidth, meta.imageHeight);
      const opacity = bg.opacity ?? 1;
      parts.push(
        `<image href="${baseUrl}${meta.src}" x="${f(fit.x)}" y="${f(fit.y)}" width="${f(fit.width)}" height="${f(fit.height)}" preserveAspectRatio="none"${opacity < 1 ? ` opacity="${opacity}"` : ''} />`,
      );
    }
  }

  if (bg.type === 'image' && bg.src) {
    const imgW = bg.imageWidth ?? IMG_W;
    const imgH = bg.imageHeight ?? IMG_H;
    const fit = computeContainFit(WORLD_WIDTH, WORLD_HEIGHT, imgW, imgH);
    const opacity = bg.opacity ?? 1;
    // For custom uploaded images we use the stored src (data-url or remote URL)
    const href = bg.src.startsWith('data:') || bg.src.startsWith('http') ? bg.src : `${baseUrl}${bg.src}`;
    parts.push(
      `<image href="${escapeXml(href)}" x="${f(fit.x)}" y="${f(fit.y)}" width="${f(fit.width)}" height="${f(fit.height)}" preserveAspectRatio="none"${opacity < 1 ? ` opacity="${opacity}"` : ''} />`,
    );
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// SVG defs (arrowhead marker)
// ---------------------------------------------------------------------------

const SVG_DEFS = `<defs>
  <marker id="spatial-arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
    <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
  </marker>
</defs>`;

// ---------------------------------------------------------------------------
// Object renderers — each returns an SVG string fragment
// ---------------------------------------------------------------------------

function renderPlayer(obj: SpatialObjectBase, wx: number, wy: number, baseUrl: string, transform: string): string {
  const num = (obj.props.number as number) ?? '';
  const markerImage = obj.props.markerImage as string | undefined;
  const color = (obj.props.color as string) ?? '#3b82f6';
  const imgSize = 40;

  if (markerImage) {
    const href = markerImage.startsWith('http') ? markerImage : `${baseUrl}${markerImage}`;
    return `<g data-id="${escapeXml(obj.id)}" data-type="player"${transform}>
  <image href="${escapeXml(href)}" x="${f(wx - imgSize / 2)}" y="${f(wy - imgSize / 2)}" width="${imgSize}" height="${imgSize}" />
  <text x="${f(wx)}" y="${f(wy + 5)}" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff" stroke="#000" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke">${num}</text>
</g>`;
  }

  return `<g data-id="${escapeXml(obj.id)}" data-type="player"${transform}>
  <circle cx="${f(wx)}" cy="${f(wy)}" r="20" fill="${escapeXml(color)}" fill-opacity="0.9" />
  <circle cx="${f(wx)}" cy="${f(wy)}" r="20" fill="none" stroke="#fff" stroke-width="2" />
  <text x="${f(wx)}" y="${f(wy + 5)}" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff">${num}</text>
</g>`;
}

function renderBall(obj: SpatialObjectBase, wx: number, wy: number, baseUrl: string, transform: string): string {
  const markerImage = obj.props.markerImage as string | undefined;
  const color = (obj.props.color as string) ?? '#f97316';
  const imgSize = 28;

  if (markerImage) {
    const href = markerImage.startsWith('http') ? markerImage : `${baseUrl}${markerImage}`;
    return `<g data-id="${escapeXml(obj.id)}" data-type="ball"${transform}>
  <image href="${escapeXml(href)}" x="${f(wx - imgSize / 2)}" y="${f(wy - imgSize / 2)}" width="${imgSize}" height="${imgSize}" />
</g>`;
  }

  return `<g data-id="${escapeXml(obj.id)}" data-type="ball"${transform}>
  <circle cx="${f(wx)}" cy="${f(wy)}" r="12" fill="${escapeXml(color)}" fill-opacity="0.85" />
  <circle cx="${f(wx)}" cy="${f(wy)}" r="12" fill="none" stroke="#fff" stroke-width="1.5" />
</g>`;
}

function renderCone(obj: SpatialObjectBase, wx: number, wy: number, transform: string): string {
  const color = (obj.props.color as string) ?? '#eab308';
  const s = 18;
  const pts = `${f(wx)},${f(wy - s)} ${f(wx - s * 0.7)},${f(wy + s * 0.6)} ${f(wx + s * 0.7)},${f(wy + s * 0.6)}`;
  return `<g data-id="${escapeXml(obj.id)}" data-type="cone"${transform}>
  <polygon points="${pts}" fill="${escapeXml(color)}" fill-opacity="0.85" />
  <line x1="${f(wx - s * 0.7)}" y1="${f(wy + s * 0.6)}" x2="${f(wx + s * 0.7)}" y2="${f(wy + s * 0.6)}" stroke="${escapeXml(color)}" stroke-width="2.5" stroke-linecap="round" />
</g>`;
}

function renderLabel(obj: SpatialObjectBase, wx: number, wy: number, transform: string): string {
  const text = escapeXml((obj.props.text as string) ?? 'Text');
  const fontSize = (obj.props.fontSize as number) ?? 16;
  const textColor = escapeXml((obj.props.color as string) ?? '#1f2937');
  const borderColor = escapeXml((obj.props.borderColor as string) ?? '#ffffff');
  const yPos = f(wy + fontSize * 0.35);

  return `<g data-id="${escapeXml(obj.id)}" data-type="label"${transform}>
  <text x="${f(wx)}" y="${yPos}" text-anchor="middle" font-size="${fontSize}" fill="none" stroke="${borderColor}" stroke-width="4" stroke-linejoin="round">${text}</text>
  <text x="${f(wx)}" y="${yPos}" text-anchor="middle" font-size="${fontSize}" fill="${textColor}" font-weight="500">${text}</text>
</g>`;
}

function renderCheckpoint(obj: SpatialObjectBase, wx: number, wy: number, transform: string): string {
  const color = escapeXml((obj.props.color as string) ?? '#10b981');
  const label = escapeXml((obj.props.label as string) ?? '?');
  const kind = (obj.props.kind as string) ?? 'checkpoint';
  const R = 18;
  const fontSize = label.length > 2 ? 10 : 14;

  let kindRing = '';
  if (kind === 'start') {
    kindRing = `\n  <circle cx="${f(wx)}" cy="${f(wy)}" r="${R + 4}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4 2" />`;
  } else if (kind === 'finish') {
    kindRing = `\n  <circle cx="${f(wx)}" cy="${f(wy)}" r="${R + 4}" fill="none" stroke="${color}" stroke-width="3" />`;
  }

  return `<g data-id="${escapeXml(obj.id)}" data-type="checkpoint"${transform}>
  <line x1="${f(wx)}" y1="${f(wy + R)}" x2="${f(wx)}" y2="${f(wy + R + 10)}" stroke="${color}" stroke-width="3" stroke-linecap="round" />
  <circle cx="${f(wx)}" cy="${f(wy)}" r="${R}" fill="${color}" fill-opacity="0.9" />
  <circle cx="${f(wx)}" cy="${f(wy)}" r="${R}" fill="none" stroke="#fff" stroke-width="2" />${kindRing}
  <text x="${f(wx)}" y="${f(wy + 5)}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" fill="#fff">${label}</text>
</g>`;
}

function renderArrow(obj: SpatialObjectBase): string {
  if (!obj.from || !obj.to) return '';
  const { x: x1, y: y1 } = toWorld(obj.from.x, obj.from.y);
  const { x: x2, y: y2 } = toWorld(obj.to.x, obj.to.y);
  const color = escapeXml((obj.props.color as string) ?? '#6b7280');
  const pattern = (obj.props.pattern as string) ?? 'solid';
  const hasArrowhead = obj.props.arrowhead !== false;
  const dash = pattern === 'dashed' ? ' stroke-dasharray="8 6"' : '';
  const marker = hasArrowhead ? ' marker-end="url(#spatial-arrowhead)"' : '';

  return `<g data-id="${escapeXml(obj.id)}" data-type="arrow" color="${color}">
  <line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-opacity="0.9"${dash}${marker} />
</g>`;
}

function renderZone(obj: SpatialObjectBase, wx: number, wy: number, transform: string): string {
  const color = escapeXml((obj.props.color as string) ?? '#8b5cf6');
  const fillOpacity = (obj.props.fillOpacity as number) ?? 0.2;
  const polyPoints = obj.props.points as { x: number; y: number }[] | undefined;
  const isWater = obj.props.polygonVariant === 'water';

  // Polygon-based zone/water
  if (polyPoints && polyPoints.length >= 3) {
    const polyStr = polyPoints
      .map((p) => {
        const { x: px, y: py } = toWorld(p.x, p.y);
        return `${f(px)},${f(py)}`;
      })
      .join(' ');

    let waterSymbol = '';
    if (isWater) {
      const cx = polyPoints.reduce((s, p) => s + p.x, 0) / polyPoints.length;
      const cy = polyPoints.reduce((s, p) => s + p.y, 0) / polyPoints.length;
      const { x: cwx, y: cwy } = toWorld(cx, cy);
      waterSymbol = `\n  <text x="${f(cwx)}" y="${f(cwy)}" text-anchor="middle" font-size="24" fill="${color}" fill-opacity="0.6">&#x2248;</text>`;
    }

    return `<g data-id="${escapeXml(obj.id)}" data-type="zone">
  <polygon points="${polyStr}" fill="${color}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="2"${isWater ? '' : ' stroke-dasharray="8 4"'} />${waterSymbol}
</g>`;
  }

  // Legacy rect-based zone
  const zw = ((obj.props.width as number) ?? 0.1) * WORLD_WIDTH;
  const zh = ((obj.props.height as number) ?? 0.07) * WORLD_HEIGHT;
  return `<g data-id="${escapeXml(obj.id)}" data-type="zone"${transform}>
  <rect x="${f(wx - zw / 2)}" y="${f(wy - zh / 2)}" width="${f(zw)}" height="${f(zh)}" fill="${color}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="2" stroke-dasharray="8 4" />
</g>`;
}

function renderPath(obj: SpatialObjectBase): string {
  const points = obj.props.points as { x: number; y: number }[] | undefined;
  if (!points || points.length < 2) return '';

  const color = escapeXml((obj.props.color as string) ?? '#a16207');
  const strokeW = (obj.props.strokeWidth as number) ?? 3;

  const polyStr = points
    .map((p) => {
      const { x: px, y: py } = toWorld(p.x, p.y);
      return `${f(px)},${f(py)}`;
    })
    .join(' ');

  const dots = points
    .map((p) => {
      const { x: px, y: py } = toWorld(p.x, p.y);
      return `  <circle cx="${f(px)}" cy="${f(py)}" r="3" fill="${color}" fill-opacity="0.6" />`;
    })
    .join('\n');

  return `<g data-id="${escapeXml(obj.id)}" data-type="path-segment">
  <polyline points="${polyStr}" fill="none" stroke="#fff" stroke-width="${strokeW + 2}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.7" />
  <polyline points="${polyStr}" fill="none" stroke="${color}" stroke-width="${strokeW}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 5" />
${dots}
</g>`;
}

// ---------------------------------------------------------------------------
// Surroundings asset renderers (string-based, matching SurroundingsAssets.tsx)
// ---------------------------------------------------------------------------

function renderTree(wx: number, wy: number, color: string, variant?: string): string {
  if (variant === 'conifer') {
    return `  <rect x="${f(wx - 2)}" y="${f(wy + 4)}" width="4" height="10" fill="#92400e" rx="1" />
  <polygon points="${f(wx)},${f(wy - 16)} ${f(wx - 10)},${f(wy + 4)} ${f(wx + 10)},${f(wy + 4)}" fill="${color}" />
  <polygon points="${f(wx)},${f(wy - 10)} ${f(wx - 8)},${f(wy)} ${f(wx + 8)},${f(wy)}" fill="${color}" opacity="0.8" />`;
  }
  return `  <rect x="${f(wx - 2)}" y="${f(wy + 4)}" width="4" height="12" fill="#92400e" rx="1" />
  <circle cx="${f(wx)}" cy="${f(wy - 4)}" r="12" fill="${color}" />
  <circle cx="${f(wx - 6)}" cy="${f(wy - 1)}" r="8" fill="${color}" opacity="0.8" />
  <circle cx="${f(wx + 6)}" cy="${f(wy - 1)}" r="8" fill="${color}" opacity="0.8" />`;
}

function renderBush(wx: number, wy: number, color: string): string {
  return `  <ellipse cx="${f(wx)}" cy="${f(wy)}" rx="12" ry="8" fill="${color}" />
  <ellipse cx="${f(wx - 5)}" cy="${f(wy + 2)}" rx="7" ry="5" fill="${color}" opacity="0.7" />
  <ellipse cx="${f(wx + 5)}" cy="${f(wy + 2)}" rx="7" ry="5" fill="${color}" opacity="0.7" />`;
}

function renderHouse(wx: number, wy: number, color: string, variant?: string): string {
  const w = variant === 'large' ? 36 : variant === 'medium' ? 28 : 20;
  const h = variant === 'large' ? 28 : variant === 'medium' ? 22 : 16;
  return `  <rect x="${f(wx - w / 2)}" y="${f(wy - h / 2 + 4)}" width="${w}" height="${h - 4}" fill="${color}" rx="1" />
  <polygon points="${f(wx - w / 2 - 3)},${f(wy - h / 2 + 4)} ${f(wx)},${f(wy - h / 2 - 8)} ${f(wx + w / 2 + 3)},${f(wy - h / 2 + 4)}" fill="#b45309" />
  <rect x="${f(wx - 3)}" y="${f(wy + 2)}" width="6" height="${f(h / 2 - 2)}" fill="#78716c" />`;
}

function renderBuilding(wx: number, wy: number, color: string): string {
  return `  <rect x="${f(wx - 16)}" y="${f(wy - 18)}" width="32" height="36" fill="${color}" rx="2" />
  <rect x="${f(wx - 12)}" y="${f(wy - 12)}" width="8" height="8" fill="#bfdbfe" rx="1" />
  <rect x="${f(wx + 4)}" y="${f(wy - 12)}" width="8" height="8" fill="#bfdbfe" rx="1" />
  <rect x="${f(wx - 12)}" y="${f(wy)}" width="8" height="8" fill="#bfdbfe" rx="1" />
  <rect x="${f(wx + 4)}" y="${f(wy)}" width="8" height="8" fill="#bfdbfe" rx="1" />
  <rect x="${f(wx - 4)}" y="${f(wy + 8)}" width="8" height="10" fill="#78716c" rx="1" />`;
}

function renderPathSegmentAsset(wx: number, wy: number, color: string): string {
  return `  <rect x="${f(wx - 20)}" y="${f(wy - 4)}" width="40" height="8" fill="${color}" rx="3" opacity="0.7" />`;
}

function renderBridge(wx: number, wy: number, color: string): string {
  return `  <rect x="${f(wx - 18)}" y="${f(wy - 3)}" width="36" height="6" fill="${color}" rx="1" />
  <rect x="${f(wx - 20)}" y="${f(wy - 6)}" width="4" height="12" fill="${color}" rx="1" />
  <rect x="${f(wx + 16)}" y="${f(wy - 6)}" width="4" height="12" fill="${color}" rx="1" />
  <path d="M${f(wx - 16)},${f(wy - 3)} Q${f(wx)},${f(wy - 10)} ${f(wx + 16)},${f(wy - 3)}" fill="none" stroke="${color}" stroke-width="2" />`;
}

function renderWaterAsset(wx: number, wy: number, color: string): string {
  return `  <ellipse cx="${f(wx)}" cy="${f(wy)}" rx="18" ry="10" fill="${color}" opacity="0.5" />
  <path d="M${f(wx - 10)},${f(wy - 2)} Q${f(wx - 5)},${f(wy - 5)} ${f(wx)},${f(wy - 2)} Q${f(wx + 5)},${f(wy + 1)} ${f(wx + 10)},${f(wy - 2)}" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.6" />`;
}

function renderHill(wx: number, wy: number, color: string): string {
  return `  <ellipse cx="${f(wx)}" cy="${f(wy + 4)}" rx="20" ry="12" fill="${color}" opacity="0.6" />`;
}

function renderBench(wx: number, wy: number, color: string): string {
  return `  <rect x="${f(wx - 12)}" y="${f(wy - 2)}" width="24" height="4" fill="${color}" rx="1" />
  <rect x="${f(wx - 10)}" y="${f(wy + 2)}" width="2" height="6" fill="${color}" />
  <rect x="${f(wx + 8)}" y="${f(wy + 2)}" width="2" height="6" fill="${color}" />
  <rect x="${f(wx - 12)}" y="${f(wy - 6)}" width="24" height="2" fill="${color}" rx="1" opacity="0.7" />`;
}

function renderFence(wx: number, wy: number, color: string): string {
  return `  <rect x="${f(wx - 20)}" y="${f(wy - 1)}" width="40" height="2" fill="${color}" />
  <rect x="${f(wx - 18)}" y="${f(wy - 8)}" width="2" height="14" fill="${color}" />
  <rect x="${f(wx - 8)}" y="${f(wy - 8)}" width="2" height="14" fill="${color}" />
  <rect x="${f(wx + 2)}" y="${f(wy - 8)}" width="2" height="14" fill="${color}" />
  <rect x="${f(wx + 12)}" y="${f(wy - 8)}" width="2" height="14" fill="${color}" />
  <rect x="${f(wx - 20)}" y="${f(wy - 5)}" width="40" height="2" fill="${color}" opacity="0.7" />`;
}

function renderPlayground(wx: number, wy: number, color: string): string {
  return `  <path d="M${f(wx - 6)},${f(wy - 14)} Q${f(wx - 4)},${f(wy)} ${f(wx + 8)},${f(wy + 10)}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" />
  <line x1="${f(wx - 6)}" y1="${f(wy - 14)}" x2="${f(wx - 6)}" y2="${f(wy + 10)}" stroke="${color}" stroke-width="2" stroke-linecap="round" />
  <line x1="${f(wx - 9)}" y1="${f(wy - 8)}" x2="${f(wx - 3)}" y2="${f(wy - 8)}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />
  <line x1="${f(wx - 9)}" y1="${f(wy - 2)}" x2="${f(wx - 3)}" y2="${f(wy - 2)}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />
  <line x1="${f(wx - 9)}" y1="${f(wy + 4)}" x2="${f(wx - 3)}" y2="${f(wy + 4)}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />
  <line x1="${f(wx + 8)}" y1="${f(wy + 10)}" x2="${f(wx + 8)}" y2="${f(wy + 14)}" stroke="${color}" stroke-width="2" stroke-linecap="round" />
  <line x1="${f(wx - 10)}" y1="${f(wy + 14)}" x2="${f(wx + 12)}" y2="${f(wy + 14)}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" opacity="0.5" />`;
}

function renderFlagStart(wx: number, wy: number, color: string): string {
  return `  <rect x="${f(wx - 1)}" y="${f(wy - 14)}" width="2" height="28" fill="#78716c" rx="1" />
  <polygon points="${f(wx + 1)},${f(wy - 14)} ${f(wx + 16)},${f(wy - 8)} ${f(wx + 1)},${f(wy - 2)}" fill="${color}" />`;
}

function renderTrophy(wx: number, wy: number, color: string): string {
  // Checkered flag
  const sz = 7;
  const fx = wx + 1;
  const fy = wy - 14;
  const squares: string[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const isDark = (r + c) % 2 === 0;
      squares.push(
        `  <rect x="${f(fx + c * sz)}" y="${f(fy + r * sz)}" width="${sz}" height="${sz}" fill="${isDark ? color : '#ffffff'}" stroke="${color}" stroke-width="0.5" />`,
      );
    }
  }
  return `  <rect x="${f(wx - 1)}" y="${f(wy - 14)}" width="2" height="28" fill="#78716c" rx="1" />\n${squares.join('\n')}`;
}

function renderXMark(wx: number, wy: number, color: string): string {
  return `  <line x1="${f(wx - 12)}" y1="${f(wy - 12)}" x2="${f(wx + 12)}" y2="${f(wy + 12)}" stroke="${color}" stroke-width="4" stroke-linecap="round" />
  <line x1="${f(wx + 12)}" y1="${f(wy - 12)}" x2="${f(wx - 12)}" y2="${f(wy + 12)}" stroke="${color}" stroke-width="4" stroke-linecap="round" />`;
}

function renderTreasure(wx: number, wy: number, color: string): string {
  return `  <rect x="${f(wx - 13)}" y="${f(wy - 2)}" width="26" height="14" fill="${color}" rx="2" />
  <path d="M${f(wx - 13)},${f(wy - 2)} L${f(wx - 13)},${f(wy - 6)} Q${f(wx)},${f(wy - 14)} ${f(wx + 13)},${f(wy - 6)} L${f(wx + 13)},${f(wy - 2)} Z" fill="${color}" opacity="0.85" />
  <rect x="${f(wx - 13)}" y="${f(wy - 2)}" width="26" height="2" fill="#92400e" opacity="0.5" />
  <rect x="${f(wx - 2)}" y="${f(wy - 10)}" width="4" height="22" fill="#92400e" opacity="0.3" rx="1" />
  <circle cx="${f(wx)}" cy="${f(wy + 2)}" r="3" fill="#fbbf24" stroke="#92400e" stroke-width="1.5" />
  <rect x="${f(wx - 0.8)}" y="${f(wy + 2)}" width="1.6" height="3" fill="#92400e" rx="0.5" />`;
}

function renderKey(wx: number, wy: number, color: string): string {
  return `  <circle cx="${f(wx - 6)}" cy="${f(wy - 4)}" r="6" fill="none" stroke="${color}" stroke-width="2.5" />
  <line x1="${f(wx)}" y1="${f(wy - 4)}" x2="${f(wx + 12)}" y2="${f(wy - 4)}" stroke="${color}" stroke-width="2.5" stroke-linecap="round" />
  <line x1="${f(wx + 8)}" y1="${f(wy - 4)}" x2="${f(wx + 8)}" y2="${f(wy + 2)}" stroke="${color}" stroke-width="2" stroke-linecap="round" />
  <line x1="${f(wx + 12)}" y1="${f(wy - 4)}" x2="${f(wx + 12)}" y2="${f(wy + 2)}" stroke="${color}" stroke-width="2" stroke-linecap="round" />`;
}

function renderClue(wx: number, wy: number, color: string): string {
  return `  <rect x="${f(wx - 8)}" y="${f(wy - 10)}" width="16" height="20" fill="#fefce8" rx="2" stroke="${color}" stroke-width="1.5" />
  <line x1="${f(wx - 4)}" y1="${f(wy - 5)}" x2="${f(wx + 4)}" y2="${f(wy - 5)}" stroke="${color}" stroke-width="1" opacity="0.5" />
  <line x1="${f(wx - 4)}" y1="${f(wy - 1)}" x2="${f(wx + 4)}" y2="${f(wy - 1)}" stroke="${color}" stroke-width="1" opacity="0.5" />
  <line x1="${f(wx - 4)}" y1="${f(wy + 3)}" x2="${f(wx + 2)}" y2="${f(wy + 3)}" stroke="${color}" stroke-width="1" opacity="0.5" />
  <text x="${f(wx)}" y="${f(wy + 1)}" text-anchor="middle" font-size="14" font-weight="bold" fill="${color}">?</text>`;
}

function renderDanger(wx: number, wy: number, color: string): string {
  const s = 16;
  return `  <polygon points="${f(wx)},${f(wy - s)} ${f(wx - s * 0.9)},${f(wy + s * 0.6)} ${f(wx + s * 0.9)},${f(wy + s * 0.6)}" fill="${color}" />
  <text x="${f(wx)}" y="${f(wy + 5)}" text-anchor="middle" font-size="16" font-weight="bold" fill="#fff">!</text>`;
}

function renderCompass(wx: number, wy: number, color: string): string {
  return `  <circle cx="${f(wx)}" cy="${f(wy)}" r="14" fill="none" stroke="${color}" stroke-width="1.5" />
  <polygon points="${f(wx)},${f(wy - 12)} ${f(wx - 3)},${f(wy)} ${f(wx)},${f(wy - 4)} ${f(wx + 3)},${f(wy)}" fill="${color}" />
  <polygon points="${f(wx)},${f(wy + 12)} ${f(wx - 3)},${f(wy)} ${f(wx)},${f(wy + 4)} ${f(wx + 3)},${f(wy)}" fill="${color}" opacity="0.4" />
  <text x="${f(wx)}" y="${f(wy - 16)}" text-anchor="middle" font-size="8" font-weight="bold" fill="${color}">N</text>`;
}

function renderNumBadge(wx: number, wy: number, color: string, num: number): string {
  const fontSize = num > 9 ? 11 : 13;
  return `  <circle cx="${f(wx)}" cy="${f(wy)}" r="12" fill="${color}" />
  <text x="${f(wx)}" y="${f(wy + 4.5)}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" fill="#fff">${num}</text>`;
}

function renderTable(wx: number, wy: number, color: string): string {
  return `  <rect x="${f(wx - 16)}" y="${f(wy - 10)}" width="32" height="20" fill="${color}" rx="2" stroke="#78716c" stroke-width="1" />`;
}

function renderChair(wx: number, wy: number, color: string): string {
  return `  <rect x="${f(wx - 6)}" y="${f(wy - 2)}" width="12" height="10" fill="${color}" rx="1" />
  <rect x="${f(wx - 6)}" y="${f(wy - 10)}" width="12" height="4" fill="${color}" rx="1" opacity="0.7" />`;
}

function renderWhiteboard(wx: number, wy: number, color: string): string {
  return `  <rect x="${f(wx - 20)}" y="${f(wy - 12)}" width="40" height="24" fill="${color}" rx="2" stroke="#94a3b8" stroke-width="1.5" />
  <line x1="${f(wx - 14)}" y1="${f(wy - 4)}" x2="${f(wx + 10)}" y2="${f(wy - 4)}" stroke="#94a3b8" stroke-width="1" opacity="0.4" />
  <line x1="${f(wx - 14)}" y1="${f(wy)}" x2="${f(wx + 6)}" y2="${f(wy)}" stroke="#94a3b8" stroke-width="1" opacity="0.4" />`;
}

function renderDoor(wx: number, wy: number, color: string): string {
  return `  <rect x="${f(wx - 8)}" y="${f(wy - 14)}" width="16" height="28" fill="${color}" rx="2" />
  <circle cx="${f(wx + 4)}" cy="${f(wy + 2)}" r="2" fill="#d4d4d8" />`;
}

// Surroundings dispatch table
const SURROUNDINGS_SVG: Record<string, (wx: number, wy: number, color: string, variant?: string, num?: number) => string> = {
  tree: renderTree,
  bush: renderBush,
  house: renderHouse,
  building: renderBuilding,
  'path-segment': renderPathSegmentAsset,
  bridge: renderBridge,
  water: renderWaterAsset,
  hill: renderHill,
  bench: renderBench,
  fence: renderFence,
  playground: renderPlayground,
  'flag-start': renderFlagStart,
  trophy: renderTrophy,
  'x-mark': renderXMark,
  treasure: renderTreasure,
  key: renderKey,
  clue: renderClue,
  danger: renderDanger,
  compass: renderCompass,
  'num-badge': (wx, wy, color, _v, num) => renderNumBadge(wx, wy, color, num ?? 1),
  table: renderTable,
  chair: renderChair,
  whiteboard: renderWhiteboard,
  door: renderDoor,
};

// ---------------------------------------------------------------------------
// Object dispatch
// ---------------------------------------------------------------------------

function renderObject(obj: SpatialObjectBase, baseUrl: string): string {
  const { x: wx, y: wy } = toWorld(obj.t.x, obj.t.y);
  const rotation = obj.t.rotation ?? 0;
  const scale = obj.t.scale ?? 1;
  const color = escapeXml((obj.props.color as string) ?? '#3b82f6');

  // Build combined transform string
  const transforms: string[] = [];
  if (scale !== 1) transforms.push(`translate(${f(wx)}, ${f(wy)}) scale(${f(scale)}) translate(${f(-wx)}, ${f(-wy)})`);
  if (rotation !== 0) transforms.push(`rotate(${f(rotation)}, ${f(wx)}, ${f(wy)})`);
  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';

  switch (obj.type) {
    case 'player':
      return renderPlayer(obj, wx, wy, baseUrl, transformAttr);
    case 'ball':
      return renderBall(obj, wx, wy, baseUrl, transformAttr);
    case 'cone':
      return renderCone(obj, wx, wy, transformAttr);
    case 'label':
      return renderLabel(obj, wx, wy, transformAttr);
    case 'checkpoint':
      return renderCheckpoint(obj, wx, wy, transformAttr);
    case 'arrow':
      return renderArrow(obj);
    case 'zone':
      return renderZone(obj, wx, wy, transformAttr);
    default:
      break;
  }

  // Path-segment with polyline points
  if (obj.type === 'path-segment' && Array.isArray(obj.props.points)) {
    return renderPath(obj);
  }

  // Surroundings asset
  const renderer = SURROUNDINGS_SVG[obj.type];
  if (renderer) {
    const variant = (obj.props.variant as string) ?? undefined;
    const num = (obj.props.number as number) ?? undefined;
    const inner = renderer(wx, wy, color, variant, num);
    return `<g data-id="${escapeXml(obj.id)}" data-type="${escapeXml(obj.type)}"${transformAttr}>\n${inner}\n</g>`;
  }

  // Unknown type — skip silently
  return '';
}

// ---------------------------------------------------------------------------
// Layer rendering
// ---------------------------------------------------------------------------

function renderLayer(layer: SpatialLayer, baseUrl: string): string {
  if (!layer.visible) return '';

  // Render zone/arrow objects first (background elements), then point objects on top
  // This matches the canvas z-order
  const background: SpatialObjectBase[] = [];
  const foreground: SpatialObjectBase[] = [];

  for (const obj of layer.objects) {
    if (obj.type === 'zone' || obj.type === 'arrow') {
      background.push(obj);
    } else {
      foreground.push(obj);
    }
  }

  const parts = [...background, ...foreground]
    .map((obj) => renderObject(obj, baseUrl))
    .filter(Boolean);

  if (parts.length === 0) return '';
  return `<g data-layer="${escapeXml(layer.id)}">\n${parts.join('\n')}\n</g>`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Render a SpatialDocumentV1 as a standalone SVG string.
 *
 * Pure function — no DOM, no React, safe for server-side use.
 * The document is the SSoT; the SVG is always derived on-demand.
 *
 * @param doc       The spatial editor document (v1)
 * @param options   Optional: baseUrl for absolute image hrefs, grid toggle
 * @returns         Complete SVG string with XML declaration
 */
export function renderSpatialSvg(
  doc: SpatialDocumentV1,
  options: RenderSpatialSvgOptions = {},
): string {
  const baseUrl = options.baseUrl ?? '';
  const includeGrid = options.includeGrid ?? true;

  const W = doc.world?.width ?? WORLD_WIDTH;
  const H = doc.world?.height ?? WORLD_HEIGHT;

  const bg = renderBackground(doc.background, baseUrl, includeGrid);
  const layers = doc.layers
    .map((layer) => renderLayer(layer, baseUrl))
    .filter(Boolean)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">
${SVG_DEFS}
${bg}
${layers}
</svg>`;
}
