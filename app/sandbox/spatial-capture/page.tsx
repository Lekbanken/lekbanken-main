'use client';

// =============================================================================
// Spatial Capture – Search location → Pan/zoom → Capture map snapshot as PNG
// =============================================================================
// Uses OpenStreetMap Nominatim (free geocoding) + OSM tile server.
// Outputs a PNG data-URL that can be used as editor background.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { SandboxShell } from '../components/shell/SandboxShellV2';
import { geocode, renderTilesToCanvas } from './lib/osm';
import type { NominatimResult } from './lib/osm';
import Link from 'next/link';

// Default: Stockholm
const DEFAULT_LAT = 59.3293;
const DEFAULT_LON = 18.0686;
const DEFAULT_ZOOM = 16;

// Capture image dimensions – matches editor world (1000×1414 A4-ish)
const CAPTURE_W = 1000;
const CAPTURE_H = 1414;

// A4 aspect ratio used for the preview overlay frame
const A4_ASPECT = CAPTURE_W / CAPTURE_H; // ≈ 0.707

export default function SpatialCapturePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Map state
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Capture state
  const [capturing, setCapturing] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);

  // Drag state
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

    // Use a smaller preview size for the live canvas
    const previewW = canvas.width;
    const previewH = canvas.height;

    try {
      const rendered = await renderTilesToCanvas({
        lat,
        lon,
        zoom,
        width: previewW,
        height: previewH,
      });

      ctx.clearRect(0, 0, previewW, previewH);
      ctx.drawImage(rendered, 0, 0);

      // --- A4 crop overlay ---
      // The export will be taller than wide (A4). Show the crop frame so
      // the user sees exactly what will be captured.
      const frameW = previewW * A4_ASPECT; // narrower than full width
      const frameH = previewH;
      const frameX = (previewW - frameW) / 2;
      const frameY = 0;

      // Dim areas outside the A4 frame
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, frameX, previewH);                       // left
      ctx.fillRect(frameX + frameW, 0, frameX, previewH);         // right

      // Dashed A4 border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(frameX, frameY, frameW, frameH);
      ctx.setLineDash([]);

      // Label
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText('A4 export', frameX + 6, 16);

      // Crosshair at center
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
    renderPreview();
  }, [renderPreview]);

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
  // Pan (drag)
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

      // Convert pixel delta to lat/lon delta
      const scale = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
      // Approximate: 1 pixel = scale meters
      // Canvas is displayed at some CSS size, get the ratio
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

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      setZoom((z) => Math.max(1, Math.min(19, z + (e.deltaY < 0 ? 1 : -1))));
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Capture high-res snapshot
  // ---------------------------------------------------------------------------

  const handleCapture = useCallback(async () => {
    setCapturing(true);
    try {
      // The live preview is a 600×600 canvas with an A4 overlay frame.
      // The A4 frame covers (PREVIEW_SIZE * A4_ASPECT) × PREVIEW_SIZE tile-pixels
      // at `zoom`. We must capture exactly that geographic area.
      const PREVIEW_SIZE = 600; // must match <canvas width/height>
      const a4TileW = PREVIEW_SIZE * A4_ASPECT; // ~424 tile-px at zoom
      const a4TileH = PREVIEW_SIZE;             // 600 tile-px at zoom

      // Bump zoom by 1 for sharper output (2× tile resolution, same area).
      // Clamp to max zoom 19.
      const captureZoom = Math.min(zoom + 1, 19);
      const zoomFactor = Math.pow(2, captureZoom - zoom); // 2 when zoom<19, else 1
      const renderW = Math.round(a4TileW * zoomFactor);
      const renderH = Math.round(a4TileH * zoomFactor);

      // Render tiles for exactly the A4 geographic area
      const tileCanvas = await renderTilesToCanvas({
        lat,
        lon,
        zoom: captureZoom,
        width: renderW,
        height: renderH,
      });

      // Scale to final output dimensions (1000×1414)
      const output = document.createElement('canvas');
      output.width = CAPTURE_W;
      output.height = CAPTURE_H;
      const outCtx = output.getContext('2d');
      if (!outCtx) throw new Error('Canvas 2D context not available');
      outCtx.drawImage(tileCanvas, 0, 0, CAPTURE_W, CAPTURE_H);

      const dataUrl = output.toDataURL('image/png');
      setCapturedDataUrl(dataUrl);
    } catch (err) {
      console.error('[spatial-capture] capture error:', err);
      alert('Kunde inte fånga kartan. Försök igen.');
    }
    setCapturing(false);
  }, [lat, lon, zoom]);

  // ---------------------------------------------------------------------------
  // Use in editor
  // ---------------------------------------------------------------------------

  // editorUrl computed on demand inside handleUseInEditor

  const handleUseInEditor = useCallback(() => {
    if (!capturedDataUrl) return;
    // Store in sessionStorage so the editor can pick it up
    sessionStorage.setItem(
      'spatial-capture-snapshot',
      JSON.stringify({
        dataUrl: capturedDataUrl,
        centerLatLng: { lat, lon },
        zoom,
        exportSize: { w: CAPTURE_W, h: CAPTURE_H },
        provider: 'osm',
        capturedAt: new Date().toISOString(),
      }),
    );
    window.location.href = '/sandbox/spatial-editor?mapSnapshot=1';
  }, [capturedDataUrl, lat, lon, zoom]);

  return (
    <SandboxShell
      moduleId="spatial-capture"
      title="Kartfångst"
      description="Sök en plats, zooma in och fånga en kartbild att använda som bakgrund i Spatial Editor."
      contentWidth="full"
    >
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            🗺️ Kartfångst
          </h1>
          <Link
            href="/sandbox/spatial-editor"
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            ← Tillbaka till editor
          </Link>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Sök plats... (t.ex. Fridhemsskolan Stockholm)"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {searching ? '...' : '🔍 Sök'}
            </button>
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-1 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 max-h-48 overflow-y-auto">
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
        </div>

        {/* Map preview canvas */}
        <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-4">
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

          {/* Zoom controls overlay */}
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

          {/* Info overlay */}
          <div className="absolute bottom-3 left-3 rounded-md bg-white/90 px-2 py-1 text-[11px] text-gray-600 font-mono dark:bg-gray-800/90 dark:text-gray-300">
            {lat.toFixed(5)}, {lon.toFixed(5)} · zoom {zoom}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCapture}
            disabled={capturing}
            className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {capturing ? 'Fångar...' : '📸 Fånga kartbild'}
          </button>

          <span className="text-xs text-gray-400 dark:text-gray-500">
            {CAPTURE_W}×{CAPTURE_H} px
          </span>
        </div>

        {/* Captured preview */}
        {capturedDataUrl && (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                ✅ Kartbild fångad
              </h2>
              <button
                type="button"
                onClick={handleUseInEditor}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                🎨 Använd i Editor
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedDataUrl}
              alt="Captured map"
              className="w-full max-w-md rounded-md border border-gray-200 dark:border-gray-700"
            />
            <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              {lat.toFixed(5)}, {lon.toFixed(5)} · zoom {zoom} · {CAPTURE_W}×{CAPTURE_H}px · © OpenStreetMap contributors
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 text-xs text-gray-400 dark:text-gray-500 space-y-1">
          <p>💡 Dra i kartan för att panorera. Scrolla för att zooma.</p>
          <p>💡 Kartdata från OpenStreetMap (gratis, öppen data).</p>
          <p>💡 Nivå A fallback: ladda upp en skärmdump direkt i editorn via &ldquo;Ladda upp bild&rdquo;.</p>
        </div>
      </div>
    </SandboxShell>
  );
}
