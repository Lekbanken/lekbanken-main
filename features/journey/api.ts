import type { JourneyFeed, JourneySnapshot } from './types';
import type { CosmeticItem, CosmeticSlot } from './cosmetic-types';

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

// ── Cosmetics API (v2.0) ──

export type CosmeticCatalogResponse = {
  catalog: CosmeticItem[];
  unlocked: string[];
  loadout: Record<string, string>;
};

export async function fetchCosmeticCatalog(): Promise<CosmeticCatalogResponse> {
  const res = await fetch('/api/journey/cosmetics', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Cosmetic catalog failed: ${res.status}`);
  return (await res.json()) as CosmeticCatalogResponse;
}

export async function equipCosmetic(slot: CosmeticSlot, cosmeticId: string): Promise<void> {
  const res = await fetch('/api/journey/cosmetics/equip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot, cosmeticId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Equip failed: ${res.status}`);
  }
}

export async function unequipCosmetic(slot: CosmeticSlot): Promise<void> {
  const res = await fetch('/api/journey/cosmetics/equip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot, cosmeticId: null }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Unequip failed: ${res.status}`);
  }
}
