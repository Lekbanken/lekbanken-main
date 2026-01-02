import type { CoachDiagramDocumentV1 } from '@/lib/validation/coachDiagramSchemaV1';

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 600;

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

  const field = `
  <g>
    <rect x="10" y="10" width="980" height="580" rx="18" ry="18" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="2" />
    <line x1="500" y1="10" x2="500" y2="590" stroke="currentColor" stroke-opacity="0.18" stroke-width="2" />
    <circle cx="500" cy="300" r="70" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="2" />
  </g>`;

  const arrows = doc.arrows
    .map((a) => {
      const from = posToPx(a.from);
      const to = posToPx(a.to);
      const dash = a.style.pattern === 'dashed' ? ' stroke-dasharray="8 6"' : '';
      const marker = a.style.arrowhead ? ' marker-end="url(#arrowhead)"' : '';
      const label = a.label
        ? `<text x="${(from.x + to.x) / 2}" y="${(from.y + to.y) / 2}" font-size="14" text-anchor="middle" fill="currentColor" fill-opacity="0.8">${escapeXml(
            a.label
          )}</text>`
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
      const label = o.style.label
        ? `<text x="${x}" y="${y + 5}" font-size="14" text-anchor="middle" fill="currentColor" fill-opacity="0.9">${escapeXml(
            o.style.label
          )}</text>`
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
