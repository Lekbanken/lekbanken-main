import type { CoachDiagramDocumentV1 } from '@/lib/validation/coachDiagramSchemaV1';

// Portrait canvas (mobile-first)
const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 1000;


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
  const defs = `
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
    </marker>
  </defs>`;

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
${arrows}
${objects}
</svg>`;
}

export const diagramViewBox = {
  width: VIEWBOX_WIDTH,
  height: VIEWBOX_HEIGHT,
};
