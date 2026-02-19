import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/geocode?q=...&limit=5
 * Proxies Nominatim geocoding to avoid browser CORS / fetch issues.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 });
  }

  const limit = req.nextUrl.searchParams.get('limit') ?? '5';

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', limit);
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Lekbanken-SpatialCapture/1.0 (https://lekbanken.no)',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Nominatim returned ${res.status}` },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
