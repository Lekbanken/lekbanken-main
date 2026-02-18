// =============================================================================
// OSM Tile Helpers – Geocoding (Nominatim) + Tile math
// =============================================================================
// All client-side. No server route needed.
// Uses OpenStreetMap Nominatim (free) for geocoding and OSM tile servers.
// =============================================================================

/** Nominatim search result */
export interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
}

/**
 * Geocode an address/place name via Nominatim.
 * Returns up to `limit` results.
 */
export async function geocode(query: string, limit = 5): Promise<NominatimResult[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), {
    headers: {
      // Nominatim requires a User-Agent
      'User-Agent': 'Lekbanken-SpatialCapture/1.0',
    },
  });

  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Tile math (Slippy Map tilenames)
// ---------------------------------------------------------------------------

/** Convert lat/lon/zoom to tile coordinates */
export function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

/** Convert tile coordinates back to lat/lon (NW corner of tile) */
export function tileToLatLon(x: number, y: number, zoom: number): { lat: number; lon: number } {
  const n = 2 ** zoom;
  const lon = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lon };
}

/**
 * Get the fractional pixel offset within a tile for a given lat/lon.
 * Returns 0..255 pixel position within the 256×256 tile.
 */
export function latLonToPixelInTile(
  lat: number,
  lon: number,
  zoom: number,
): { globalX: number; globalY: number } {
  const n = 2 ** zoom;
  const globalX = ((lon + 180) / 360) * n * 256;
  const latRad = (lat * Math.PI) / 180;
  const globalY = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * 256;
  return { globalX, globalY };
}

/** OSM tile URL */
export function tileUrl(x: number, y: number, zoom: number): string {
  // Using standard OSM tile server (a/b/c subdomains for load balancing)
  const sub = ['a', 'b', 'c'][Math.abs(x + y) % 3];
  return `https://${sub}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

// ---------------------------------------------------------------------------
// Stitch tiles into a canvas
// ---------------------------------------------------------------------------

export interface CaptureParams {
  lat: number;
  lon: number;
  zoom: number;
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
}

/**
 * Render OSM tiles centered on lat/lon into a canvas.
 * Returns the canvas element (caller can toDataURL / toBlob).
 */
export async function renderTilesToCanvas(params: CaptureParams): Promise<HTMLCanvasElement> {
  const { lat, lon, zoom, width, height } = params;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Fill with white background
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, width, height);

  // Calculate the global pixel position of the center
  const center = latLonToPixelInTile(lat, lon, zoom);

  // Top-left global pixel
  const topLeftGX = center.globalX - width / 2;
  const topLeftGY = center.globalY - height / 2;

  // Which tiles do we need?
  const tileStartX = Math.floor(topLeftGX / 256);
  const tileStartY = Math.floor(topLeftGY / 256);
  const tileEndX = Math.floor((topLeftGX + width) / 256);
  const tileEndY = Math.floor((topLeftGY + height) / 256);

  // Load all tiles in parallel
  const tilePromises: Promise<{ img: HTMLImageElement; dx: number; dy: number } | null>[] = [];

  for (let ty = tileStartY; ty <= tileEndY; ty++) {
    for (let tx = tileStartX; tx <= tileEndX; tx++) {
      const url = tileUrl(tx, ty, zoom);
      // Position on canvas
      const dx = tx * 256 - topLeftGX;
      const dy = ty * 256 - topLeftGY;

      tilePromises.push(
        new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve({ img, dx, dy });
          img.onerror = () => resolve(null); // Skip failed tiles
          img.src = url;
        }),
      );
    }
  }

  const tiles = await Promise.all(tilePromises);

  // Draw tiles onto canvas
  for (const tile of tiles) {
    if (tile) {
      ctx.drawImage(tile.img, tile.dx, tile.dy, 256, 256);
    }
  }

  // OSM attribution (required by license)
  ctx.font = '10px sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(width - 190, height - 16, 190, 16);
  ctx.fillStyle = '#fff';
  ctx.fillText('© OpenStreetMap contributors', width - 185, height - 4);

  return canvas;
}
