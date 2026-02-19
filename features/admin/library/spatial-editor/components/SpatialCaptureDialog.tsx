'use client';

// =============================================================================
// SpatialCaptureDialog – Inline map capture modal for the Spatial Editor
// =============================================================================
// Replaces the standalone /sandbox/spatial-capture page.
// Opens as a HeadlessUI Dialog from BackgroundPopover.
// On capture, calls setBackground() directly via Zustand — no sessionStorage.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { useSpatialEditorStore } from '../store/spatial-editor-store';
import { geocode, renderTilesToCanvas } from '../lib/osm';
import type { NominatimResult } from '../lib/osm';

// Default: Stockholm
const DEFAULT_LAT = 59.3293;
const DEFAULT_LON = 18.0686;
const DEFAULT_ZOOM = 16;

// Capture image dimensions — matches editor world (1000×1414 A4-ish)
const CAPTURE_W = 1000;
const CAPTURE_H = 1414;

// A4 aspect ratio for the preview overlay frame
const A4_ASPECT = CAPTURE_W / CAPTURE_H; // ≈ 0.707

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SpatialCaptureDialog({ open, onClose }: Props) {
  const t = useTranslations('admin.library.spatialEditor.capture');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setBackground = useSpatialEditorStore((s) => s.setBackground);

  // Map state
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Capture
  const [capturing, setCapturing] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);

  // Drag
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; lat: number; lon: number } | null>(null);

  // ---------------------------------------------------------------------------
  // Render tiles to visible canvas
  // ---------------------------------------------------------------------------

  const renderPreview = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previewW = canvas.width;
    const previewH = canvas.height;

    try {
      const rendered = await renderTilesToCanvas({ lat, lon, zoom, width: previewW, height: previewH });
      ctx.clearRect(0, 0, previewW, previewH);
      ctx.drawImage(rendered, 0, 0);

      // --- A4 crop overlay ---
      const frameW = previewW * A4_ASPECT;
      const frameH = previewH;
      const frameX = (previewW - frameW) / 2;

      // Dim areas outside A4 frame
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, frameX, previewH);
      ctx.fillRect(frameX + frameW, 0, frameX, previewH);

      // Dashed A4 border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(frameX, 0, frameW, frameH);
      ctx.setLineDash([]);

      // Label
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText('A4 export', frameX + 6, 16);

      // Crosshair
      const cx = previewW / 2;
      const cy = previewH / 2;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy);
      ctx.lineTo(cx + 12, cy);
      ctx.moveTo(cx, cy - 12);
      ctx.lineTo(cx, cy + 12);
      ctx.stroke();
    } catch (err) {
      console.warn('[spatial-capture] tile render error:', err);
    }
  }, [lat, lon, zoom]);

  useEffect(() => {
    if (open) renderPreview();
  }, [open, renderPreview]);

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await geocode(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('[spatial-capture] geocode error:', err);
      setSearchResults([]);
    }
    setSearching(false);
  }, [searchQuery]);

  const handleSelectResult = useCallback((result: NominatimResult) => {
    setLat(parseFloat(result.lat));
    setLon(parseFloat(result.lon));
    setSearchResults([]);
    setSearchQuery(result.display_name.split(',').slice(0, 2).join(','));
  }, []);

  // ---------------------------------------------------------------------------
  // Pan (drag) — identical to working sandbox/spatial-capture implementation
  // ---------------------------------------------------------------------------

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, lat, lon };
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    },
    [lat, lon],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDragging || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const scale = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = canvas.width / rect.width;
      const metersPerPixel = scale / pixelRatio;
      const dLon = (-dx * metersPerPixel) / (111320 * Math.cos((lat * Math.PI) / 180));
      const dLat = (dy * metersPerPixel) / 110574;
      setLat(dragStartRef.current.lat + dLat);
      setLon(dragStartRef.current.lon + dLon);
    },
    [isDragging, lat, zoom],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // ---------------------------------------------------------------------------
  // Zoom (wheel)
  // ---------------------------------------------------------------------------

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((z) => Math.max(1, Math.min(19, z + (e.deltaY < 0 ? 1 : -1))));
  }, []);

  // ---------------------------------------------------------------------------
  // Capture high-res snapshot
  // ---------------------------------------------------------------------------

  const handleCapture = useCallback(async () => {
    setCapturing(true);
    try {
      const PREVIEW_SIZE = 600;
      const a4TileW = PREVIEW_SIZE * A4_ASPECT;
      const a4TileH = PREVIEW_SIZE;
      const captureZoom = Math.min(zoom + 1, 19);
      const zoomFactor = Math.pow(2, captureZoom - zoom);
      const renderW = Math.round(a4TileW * zoomFactor);
      const renderH = Math.round(a4TileH * zoomFactor);

      const tileCanvas = await renderTilesToCanvas({ lat, lon, zoom: captureZoom, width: renderW, height: renderH });

      const output = document.createElement('canvas');
      output.width = CAPTURE_W;
      output.height = CAPTURE_H;
      const outCtx = output.getContext('2d');
      if (!outCtx) throw new Error('Canvas 2D context not available');
      outCtx.drawImage(tileCanvas, 0, 0, CAPTURE_W, CAPTURE_H);

      setCapturedDataUrl(output.toDataURL('image/png'));
    } catch (err) {
      console.error('[spatial-capture] capture error:', err);
      alert('Kunde inte fånga kartan. Försök igen.');
    }
    setCapturing(false);
  }, [lat, lon, zoom]);

  // ---------------------------------------------------------------------------
  // Use captured image as editor background
  // ---------------------------------------------------------------------------

  const handleUseInEditor = useCallback(() => {
    if (!capturedDataUrl) return;
    setBackground({
      type: 'image',
      src: capturedDataUrl,
      imageWidth: CAPTURE_W,
      imageHeight: CAPTURE_H,
      opacity: 0.6,
    });
    setCapturedDataUrl(null);
    onClose();
  }, [capturedDataUrl, setBackground, onClose]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCapturedDataUrl(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />

      {/* Panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-5xl rounded-xl bg-white shadow-2xl dark:bg-gray-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
            <DialogTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              🗺️ {t('title')}
            </DialogTitle>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              ✕
            </button>
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-2 gap-6 p-5">
            {/* Left column: Map */}
            <div className="flex flex-col gap-3">
              {/* Search */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  placeholder={t('searchPlaceholder')}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {searching ? '…' : '🔍'}
                </button>
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 max-h-36 overflow-y-auto">
                  {searchResults.map((r) => (
                    <button
                      key={r.place_id}
                      type="button"
                      onClick={() => handleSelectResult(r)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      {r.display_name}
                    </button>
                  ))}
                </div>
              )}

              {/* Map canvas */}
              <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={600}
                  className="w-full aspect-square bg-gray-100 dark:bg-gray-900 cursor-grab active:cursor-grabbing"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onWheel={handleWheel}
                />

                {/* Zoom controls */}
                <div className="absolute top-3 right-3 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(19, z + 1))}
                    className="w-8 h-8 rounded-md bg-white/90 text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-white text-lg font-bold dark:bg-gray-800/90 dark:text-gray-200 dark:ring-gray-700"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(1, z - 1))}
                    className="w-8 h-8 rounded-md bg-white/90 text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-white text-lg font-bold dark:bg-gray-800/90 dark:text-gray-200 dark:ring-gray-700"
                  >
                    −
                  </button>
                </div>

                {/* Coordinate info */}
                <div className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[11px] text-gray-600 font-mono dark:bg-gray-800/90 dark:text-gray-300">
                  {lat.toFixed(5)}, {lon.toFixed(5)} · zoom {zoom}
                </div>
              </div>

              {/* Capture button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={capturing}
                  className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {capturing ? t('capturing') : `📸 ${t('captureButton')}`}
                </button>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {CAPTURE_W}×{CAPTURE_H} px
                </span>
              </div>

              {/* Tips */}
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {t('tips')}
              </p>
            </div>

            {/* Right column: Preview */}
            <div className="flex flex-col">
              {capturedDataUrl ? (
                <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                      ✅ {t('capturedTitle')}
                    </span>
                    <button
                      type="button"
                      onClick={handleUseInEditor}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                    >
                      🎨 {t('useAsBackground')}
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={capturedDataUrl}
                    alt="Captured map"
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700"
                  />
                  <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    {lat.toFixed(5)}, {lon.toFixed(5)} · zoom {zoom} · © OpenStreetMap contributors
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-900/50">
                  <div className="text-center">
                    <span className="block text-4xl mb-3 opacity-40">🖼️</span>
                    <p className="text-sm text-gray-400 dark:text-gray-500 max-w-48 mx-auto">
                      {t('placeholder')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
