import type { CoachDiagramDocumentV1 } from '@/lib/validation/coachDiagramSchemaV1';

// Portrait canvas (mobile-first)
const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 1000;

const FIELD_MARGIN = 10;

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

export function renderDiagramSvg(doc: CoachDiagramDocumentV1): string {
  const innerW = VIEWBOX_WIDTH - FIELD_MARGIN * 2;
  const innerH = VIEWBOX_HEIGHT - FIELD_MARGIN * 2;
  const centerX = VIEWBOX_WIDTH / 2;
  const centerY = VIEWBOX_HEIGHT / 2;
  const centerCircleR = Math.round(Math.min(VIEWBOX_WIDTH, VIEWBOX_HEIGHT) * 0.12);

  // Generic field markings (more visual structure than just a border + center line).
  const penaltyW = innerW * 0.6;
  const penaltyH = innerH * 0.18;
  const goalW = innerW * 0.32;
  const goalH = innerH * 0.08;
  const penaltyX = (VIEWBOX_WIDTH - penaltyW) / 2;
  const goalX = (VIEWBOX_WIDTH - goalW) / 2;
  const topPenaltyY = FIELD_MARGIN;
  const bottomPenaltyY = VIEWBOX_HEIGHT - FIELD_MARGIN - penaltyH;
  const topGoalY = FIELD_MARGIN;
  const bottomGoalY = VIEWBOX_HEIGHT - FIELD_MARGIN - goalH;
  const spotOffset = penaltyH * 0.65;
  const topSpotY = FIELD_MARGIN + spotOffset;
  const bottomSpotY = VIEWBOX_HEIGHT - FIELD_MARGIN - spotOffset;

  const defs = `
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
    </marker>
  </defs>`;

  const field = `
  <g>
    <rect x="${FIELD_MARGIN}" y="${FIELD_MARGIN}" width="${innerW}" height="${innerH}" rx="18" ry="18" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="2" />
    <line x1="${FIELD_MARGIN}" y1="${centerY}" x2="${VIEWBOX_WIDTH - FIELD_MARGIN}" y2="${centerY}" stroke="currentColor" stroke-opacity="0.18" stroke-width="2" />
    <circle cx="${centerX}" cy="${centerY}" r="${centerCircleR}" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="2" />

    <rect x="${penaltyX}" y="${topPenaltyY}" width="${penaltyW}" height="${penaltyH}" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="2" />
    <rect x="${goalX}" y="${topGoalY}" width="${goalW}" height="${goalH}" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="2" />
    <circle cx="${centerX}" cy="${topSpotY}" r="3" fill="currentColor" fill-opacity="0.18" />

    <rect x="${penaltyX}" y="${bottomPenaltyY}" width="${penaltyW}" height="${penaltyH}" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="2" />
    <rect x="${goalX}" y="${bottomGoalY}" width="${goalW}" height="${goalH}" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="2" />
    <circle cx="${centerX}" cy="${bottomSpotY}" r="3" fill="currentColor" fill-opacity="0.18" />
  </g>`;

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

      if (o.type === 'ball') {
        return `
  <g data-object-id="${escapeXml(o.id)}">
    <circle cx="${x}" cy="${y}" r="${Math.max(10, r - 6)}" fill="currentColor" fill-opacity="0.9" />
    <circle cx="${x}" cy="${y}" r="${Math.max(10, r - 6)}" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" />
  </g>`;
      }

      const fill = o.type === 'marker' ? 'fill="currentColor" fill-opacity="0.12"' : 'fill="none"';
      const labelValue = o.style.label?.trim() ? escapeXml(o.style.label) : '';
      const isShort = labelValue.length > 0 && labelValue.length <= 2;
      const labelX = x;
      const labelY = isShort ? y + 5 : y - r - 8;
      const labelFontSize = isShort ? 16 : 14;
      const label = labelValue
        ? `
    <text x="${labelX}" y="${labelY}" font-size="${labelFontSize}" text-anchor="middle" fill="none" stroke="white" stroke-opacity="0.9" stroke-width="4" stroke-linejoin="round">${labelValue}</text>
    <text x="${labelX}" y="${labelY}" font-size="${labelFontSize}" text-anchor="middle" fill="currentColor" fill-opacity="0.9">${labelValue}</text>`
        : '';

      return `
  <g data-object-id="${escapeXml(o.id)}">
    <circle cx="${x}" cy="${y}" r="${r}" ${fill} stroke="currentColor" stroke-width="3" stroke-opacity="0.85" />
    ${label}
  </g>`;
    })
    .join('');

  const title = escapeXml(doc.title);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}" width="${VIEWBOX_WIDTH}" height="${VIEWBOX_HEIGHT}" role="img" aria-label="${title}">
${defs}
${field}
${arrows}
${objects}
</svg>`;
}

export const diagramViewBox = {
  width: VIEWBOX_WIDTH,
  height: VIEWBOX_HEIGHT,
};
