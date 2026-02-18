// =============================================================================
// Spatial Editor – Geometry helpers
// =============================================================================
// Conversions between screen coords, world coords, and normalized coords.
// =============================================================================

import type { ViewBox } from './types';
import { clamp01, WORLD_WIDTH, WORLD_HEIGHT } from './types';

/**
 * Convert a screen-space point (relative to the SVG element's bounding rect)
 * into world-space coordinates, based on the current viewBox.
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  svgRect: DOMRect,
  viewBox: ViewBox,
): { wx: number; wy: number } {
  const ratioX = screenX / svgRect.width;
  const ratioY = screenY / svgRect.height;
  return {
    wx: viewBox.x + ratioX * viewBox.w,
    wy: viewBox.y + ratioY * viewBox.h,
  };
}

/**
 * Convert world coordinates to normalized 0..1 coordinates.
 */
export function worldToNormalized(
  wx: number,
  wy: number,
  worldWidth = WORLD_WIDTH,
  worldHeight = WORLD_HEIGHT,
): { nx: number; ny: number } {
  return {
    nx: clamp01(wx / worldWidth),
    ny: clamp01(wy / worldHeight),
  };
}

/**
 * Convert normalized coordinates to world coordinates.
 */
export function normalizedToWorld(
  nx: number,
  ny: number,
  worldWidth = WORLD_WIDTH,
  worldHeight = WORLD_HEIGHT,
): { wx: number; wy: number } {
  return {
    wx: nx * worldWidth,
    wy: ny * worldHeight,
  };
}

/**
 * Compute the world-space delta for a screen-space drag delta.
 */
export function screenDeltaToWorld(
  dx: number,
  dy: number,
  svgRect: DOMRect,
  viewBox: ViewBox,
): { dwx: number; dwy: number } {
  return {
    dwx: (dx / svgRect.width) * viewBox.w,
    dwy: (dy / svgRect.height) * viewBox.h,
  };
}

/**
 * Zoom the viewBox, centered at a screen-space point.
 *
 * `factor` > 1 = zoom in, < 1 = zoom out.
 */
export function zoomViewBox(
  viewBox: ViewBox,
  screenX: number,
  screenY: number,
  svgRect: DOMRect,
  factor: number,
  minW = 200,
  maxW = WORLD_WIDTH * 3,
): ViewBox {
  // World-space point under cursor
  const { wx, wy } = screenToWorld(screenX, screenY, svgRect, viewBox);

  const newW = Math.max(minW, Math.min(maxW, viewBox.w / factor));
  const newH = newW * (viewBox.h / viewBox.w);

  // Keep the point under cursor in the same place
  const cursorRatioX = (wx - viewBox.x) / viewBox.w;
  const cursorRatioY = (wy - viewBox.y) / viewBox.h;

  return {
    x: wx - cursorRatioX * newW,
    y: wy - cursorRatioY * newH,
    w: newW,
    h: newH,
  };
}

/**
 * Return the initial viewBox that shows the full world.
 */
export function defaultViewBox(): ViewBox {
  return { x: 0, y: 0, w: WORLD_WIDTH, h: WORLD_HEIGHT };
}
