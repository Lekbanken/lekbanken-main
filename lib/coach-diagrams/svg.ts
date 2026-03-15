import type { CoachDiagramDocumentV1 } from '@/lib/validation/coachDiagramSchemaV1';
import { getCourtBackgroundUrl } from './courtBackgrounds';

// Portrait canvas (mobile-first)
const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 1000;

// Sport-specific marker images (relative URLs)
const PLAYER_MARKER_BY_SPORT: Record<string, string> = {
  basketball: '/coach-diagram/markers/basketball-player_v2.webp',
  football: '/coach-diagram/markers/football-player_v2.webp',
  handball: '/coach-diagram/markers/football-player_v2.webp',
  hockey: '/coach-diagram/markers/hockeyjersey-player_v2.webp',
  innebandy: '/coach-diagram/markers/football-player_v2.webp',
  custom: '/coach-diagram/markers/football-player_v2.webp',
};

const BALL_MARKER_BY_SPORT: Record<string, string> = {
  basketball: '/coach-diagram/markers/basketball-ball_v2.webp',
  football: '/coach-diagram/markers/football-ball_v2.webp',
  handball: '/coach-diagram/markers/handball-ball_v2.webp',
  hockey: '/coach-diagram/markers/hockeypuck-ball_v2.webp',
  innebandy: '/coach-diagram/markers/innebandyball-ball_v2.webp',
  custom: '/coach-diagram/markers/football-ball_v2.webp',
};

function imageSizeForSize(size: 'sm' | 'md' | 'lg'): number {
  switch (size) {
    case 'sm':
      return 34;
    case 'lg':
      return 62;
    default:
      return 48;
  }
}


function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function posToPx(pos: { x: number; y: number }): { x: number; y: number } {
  return {
    x: clamp01(pos.x) * VIEWBOX_WIDTH,
    y: clamp01(pos.y) * VIEWBOX_HEIGHT,
  };
}

function radiusForSize(size: 'sm' | 'md' | 'lg'): number {
  switch (size) {
    case 'sm':
      return 14;
    case 'lg':
      return 26;
    default:
      return 20;
  }
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderDiagramSvg(doc: CoachDiagramDocumentV1, options?: { baseUrl?: string }): string {
  const baseUrl = options?.baseUrl ?? '';
  
  const defs = `
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
    </marker>
  </defs>`;

  // Background court image
  const courtUrl = getCourtBackgroundUrl(doc.sportType);
  const background = courtUrl
    ? `<image href="${baseUrl}${courtUrl}" x="0" y="0" width="${VIEWBOX_WIDTH}" height="${VIEWBOX_HEIGHT}" preserveAspectRatio="xMidYMid meet" />`
    : '';

  // Sport-specific marker URLs
  const playerImageUrl = `${baseUrl}${PLAYER_MARKER_BY_SPORT[doc.sportType] || PLAYER_MARKER_BY_SPORT.football}`;
  const ballImageUrl = `${baseUrl}${BALL_MARKER_BY_SPORT[doc.sportType] || BALL_MARKER_BY_SPORT.football}`;

  // Render zones first (background layer)
  const zones = (doc.zones ?? [])
    .map((zone) => {
      const fill = escapeXml(zone.style.fill);
      const fillOpacity = zone.style.fillOpacity ?? 0.2;
      const strokeOpacity = 0.35;

      if (zone.type === 'rect') {
        const x = clamp01(zone.x) * VIEWBOX_WIDTH;
        const y = clamp01(zone.y) * VIEWBOX_HEIGHT;
        const width = clamp01(zone.width) * VIEWBOX_WIDTH;
        const height = clamp01(zone.height) * VIEWBOX_HEIGHT;
        return `
  <g data-zone-id="${escapeXml(zone.id)}">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${fill}" stroke-opacity="${strokeOpacity}" stroke-width="2" />
  </g>`;
      }

      if (zone.type === 'circle') {
        const cx = clamp01(zone.cx) * VIEWBOX_WIDTH;
        const cy = clamp01(zone.cy) * VIEWBOX_HEIGHT;
        const r = clamp01(zone.r) * Math.min(VIEWBOX_WIDTH, VIEWBOX_HEIGHT);
        return `
  <g data-zone-id="${escapeXml(zone.id)}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${fill}" stroke-opacity="${strokeOpacity}" stroke-width="2" />
  </g>`;
      }

      if (zone.type === 'triangle') {
        const points = zone.points
          .map((p) => `${clamp01(p.x) * VIEWBOX_WIDTH},${clamp01(p.y) * VIEWBOX_HEIGHT}`)
          .join(' ');
        return `
  <g data-zone-id="${escapeXml(zone.id)}">
    <polygon points="${points}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${fill}" stroke-opacity="${strokeOpacity}" stroke-width="2" />
  </g>`;
      }

      return '';
    })
    .join('');

  const arrows = doc.arrows
    .map((a) => {
      const from = posToPx(a.from);
      const to = posToPx(a.to);
      const dash = a.style.pattern === 'dashed' ? ' stroke-dasharray="8 6"' : '';
      const marker = a.style.arrowhead ? ' marker-end="url(#arrowhead)"' : '';
      const labelText = a.label ? escapeXml(a.label) : '';
      const labelX = (from.x + to.x) / 2;
      const labelY = (from.y + to.y) / 2 - 10;
      const label = a.label
        ? `
    <text x="${labelX}" y="${labelY}" font-size="14" text-anchor="middle" fill="none" stroke="white" stroke-opacity="0.9" stroke-width="4" stroke-linejoin="round">${labelText}</text>
    <text x="${labelX}" y="${labelY}" font-size="14" text-anchor="middle" fill="currentColor" fill-opacity="0.85">${labelText}</text>`
        : '';

      return `
  <g data-arrow-id="${escapeXml(a.id)}">
    <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-opacity="0.9"${dash}${marker} />
    ${label}
  </g>`;
    })
    .join('');

  const objects = doc.objects
    .map((o) => {
      const { x, y } = posToPx(o.position);
      const r = radiusForSize(o.style.size);
      const imageSize = imageSizeForSize(o.style.size);

      if (o.type === 'ball') {
        // Render ball as PNG image
        const imgX = x - imageSize / 2;
        const imgY = y - imageSize / 2;
        return `
  <g data-object-id="${escapeXml(o.id)}">
    <image href="${ballImageUrl}" x="${imgX}" y="${imgY}" width="${imageSize}" height="${imageSize}" preserveAspectRatio="xMidYMid meet" />
  </g>`;
      }

      if (o.type === 'player') {
        // Render player as PNG image
        const imgX = x - imageSize / 2;
        const imgY = y - imageSize / 2;
        const labelValue = o.style.label?.trim() ? escapeXml(o.style.label) : '';
        const labelY = y - imageSize / 2 - 8;
        const label = labelValue
          ? `
    <text x="${x}" y="${labelY}" font-size="14" text-anchor="middle" fill="none" stroke="white" stroke-opacity="0.9" stroke-width="4" stroke-linejoin="round">${labelValue}</text>
    <text x="${x}" y="${labelY}" font-size="14" text-anchor="middle" fill="currentColor" fill-opacity="0.9">${labelValue}</text>`
          : '';
        return `
  <g data-object-id="${escapeXml(o.id)}">
    <image href="${playerImageUrl}" x="${imgX}" y="${imgY}" width="${imageSize}" height="${imageSize}" preserveAspectRatio="xMidYMid meet" />
    ${label}
  </g>`;
      }

      // Marker (cross) - keep as SVG shape
      const half = r * 0.9;
      const labelValue = o.style.label?.trim() ? escapeXml(o.style.label) : '';
      const labelY = y - r - 8;
      const label = labelValue
        ? `
    <text x="${x}" y="${labelY}" font-size="14" text-anchor="middle" fill="none" stroke="white" stroke-opacity="0.9" stroke-width="4" stroke-linejoin="round">${labelValue}</text>
    <text x="${x}" y="${labelY}" font-size="14" text-anchor="middle" fill="currentColor" fill-opacity="0.9">${labelValue}</text>`
        : '';

      return `
  <g data-object-id="${escapeXml(o.id)}">
    <circle cx="${x}" cy="${y}" r="${half}" fill="currentColor" fill-opacity="0.12" />
    <line x1="${x - half}" y1="${y - half}" x2="${x + half}" y2="${y + half}" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-opacity="0.85" />
    <line x1="${x - half}" y1="${y + half}" x2="${x + half}" y2="${y - half}" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-opacity="0.85" />
    ${label}
  </g>`;
    })
    .join('');

  const title = escapeXml(doc.title);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}" width="${VIEWBOX_WIDTH}" height="${VIEWBOX_HEIGHT}" role="img" aria-label="${title}">
${defs}
${background}
${zones}
${arrows}
${objects}
</svg>`;
}

export const diagramViewBox = {
  width: VIEWBOX_WIDTH,
  height: VIEWBOX_HEIGHT,
};
