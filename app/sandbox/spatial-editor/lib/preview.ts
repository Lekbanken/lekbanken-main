// =============================================================================
// Preview PNG generator – renders SVG canvas to a small PNG for library cards
// =============================================================================

import { WORLD_WIDTH, WORLD_HEIGHT } from './types';

/** Preview dimensions – half-size A4 (keeps file size ≈ 30–80 KB) */
const PREVIEW_W = 500;
const PREVIEW_H = Math.round(PREVIEW_W * (WORLD_HEIGHT / WORLD_WIDTH)); // 707

/**
 * Generate a preview PNG from the editor SVG element.
 *
 * @returns base64-encoded PNG (data-URL) or null on failure
 */
export function generatePreviewBase64(svgEl: SVGSVGElement): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // Clone and prepare standalone SVG
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('width', String(PREVIEW_W));
      clone.setAttribute('height', String(PREVIEW_H));
      clone.setAttribute('viewBox', `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

      // Strip selection UI from export
      clone.querySelectorAll('[data-selection-ring]').forEach((el) => el.remove());

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = PREVIEW_W;
        canvas.height = PREVIEW_H;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
        ctx.drawImage(img, 0, 0, PREVIEW_W, PREVIEW_H);
        URL.revokeObjectURL(url);

        // Convert to base64 data-URL (PNG)
        const dataUrl = canvas.toDataURL('image/png', 0.85);
        resolve(dataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    } catch {
      resolve(null);
    }
  });
}
