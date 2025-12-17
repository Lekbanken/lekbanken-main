import type { JourneyFeed, JourneySnapshot } from './types';

export async function fetchJourneySnapshot(): Promise<JourneySnapshot> {
  const res = await fetch('/api/journey/snapshot', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Journey snapshot failed: ${res.status}`);
  return (await res.json()) as JourneySnapshot;
}

export async function fetchJourneyFeed(params?: { cursor?: string; limit?: number }): Promise<JourneyFeed> {
  const search = new URLSearchParams();
  if (params?.cursor) search.set('cursor', params.cursor);
  if (params?.limit) search.set('limit', String(params.limit));
  const url = `/api/journey/feed${search.size ? `?${search.toString()}` : ''}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Journey feed failed: ${res.status}`);
  return (await res.json()) as JourneyFeed;
}
