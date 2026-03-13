import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api/route-handler';

/**
 * GET /api/geocode?q=...&limit=5
 * Proxies Nominatim geocoding to avoid browser CORS / fetch issues.
 * Auth-gated — only authenticated users (admin spatial editor).
 */
export const GET = apiHandler({
  auth: 'user',
  rateLimit: 'strict',
  handler: async ({ req }) => {
    const q = req.nextUrl.searchParams.get('q');
    if (!q) {
      return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 });
    }

    const limitParam = parseInt(req.nextUrl.searchParams.get('limit') ?? '5', 10);
    const limit = Math.min(Math.max(limitParam || 5, 1), 10);

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(limit));
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
  },
});
