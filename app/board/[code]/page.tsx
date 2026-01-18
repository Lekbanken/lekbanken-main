import { headers } from 'next/headers';
import { BoardClient, type BoardApiResponse } from './BoardClient';

export const dynamic = 'force-dynamic';

async function fetchBoardData(code: string): Promise<{ data: BoardApiResponse | null; error: string | null }> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';

  if (!host) {
    return { data: null, error: 'Missing host headers' };
  }

  const url = `${proto}://${host}/api/play/board/${encodeURIComponent(code)}`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : `Board fetch failed: ${res.status}`;
    return { data: null, error: msg };
  }

  return { data: (await res.json()) as BoardApiResponse, error: null };
}

export default async function BoardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data, error } = await fetchBoardData(code);

  return <BoardClient code={code} initialData={data} initialError={error} />;
}
