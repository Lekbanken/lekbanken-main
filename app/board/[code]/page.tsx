import { headers } from 'next/headers';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

type BoardApiResponse = {
  session: {
    id: string;
    code: string;
    status: 'active' | 'paused' | 'ended' | 'cancelled' | string;
    current_step_index: number;
    current_phase_index: number;
    current_phase_name: string | null;
    timer_state: unknown | null;
    board_state: { message?: string | null } | null;
  };
  game: {
    id: string | null;
    title: string;
    board_config: Record<string, unknown> | null;
  };
  artifacts: {
    revealed_public_variants: Array<{
      id: string;
      session_artifact_id: string;
      title: string | null;
      body: string | null;
      media_ref: unknown | null;
      variant_order: number | null;
      visibility: string | null;
      revealed_at: string | null;
      highlighted_at: string | null;
    }>;
    highlighted_variant: {
      id: string;
      session_artifact_id: string;
      title: string | null;
      body: string | null;
      media_ref: unknown | null;
      variant_order: number | null;
      visibility: string | null;
      revealed_at: string | null;
      highlighted_at: string | null;
    } | null;
  };
  decisions: {
    revealed: Array<{
      id: string;
      title: string | null;
      results: Array<{ key?: string; label?: string; count: number }>;
    }>;
  };
  outcomes: Array<{
    id: string;
    title: string | null;
    body: string | null;
    outcome_type: string | null;
    revealed_at: string | null;
    created_at: string | null;
  }>;
};

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

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
        <Card className="p-4">
          <p className="text-sm font-semibold text-foreground">Board</p>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? 'Kunde inte ladda board.'}</p>
        </Card>
      </div>
    );
  }

  const statusVariant = data.session.status === 'active' ? 'default' : 'secondary';
  const boardMessage = data.session.board_state?.message ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Board</p>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{data.game.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kod: <span className="font-mono">{data.session.code}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={statusVariant}>{data.session.status === 'paused' ? 'Pausad' : 'Aktiv'}</Badge>
            {data.session.current_phase_name && (
              <p className="text-xs text-muted-foreground">{data.session.current_phase_name}</p>
            )}
          </div>
        </div>
      </header>

      {boardMessage && (
        <Card className="p-4">
          <p className="text-sm font-semibold text-foreground">Meddelande</p>
          <p className="mt-2 text-sm text-muted-foreground">{boardMessage}</p>
        </Card>
      )}

      {data.artifacts.highlighted_variant && (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Markerat</p>
            <Badge variant="default">Artefakt</Badge>
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">
            {data.artifacts.highlighted_variant.title ?? 'Artefakt'}
          </p>
          {data.artifacts.highlighted_variant.body && (
            <p className="mt-1 text-sm text-muted-foreground">{data.artifacts.highlighted_variant.body}</p>
          )}
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Offentliga artefakter</p>
        {data.artifacts.revealed_public_variants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga offentliga artefakter visade ännu.</p>
        ) : (
          <div className="space-y-2">
            {data.artifacts.revealed_public_variants.map((v) => (
              <div key={v.id} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium text-foreground">{v.title ?? 'Artefakt'}</p>
                {v.body && <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Beslut (resultat)</p>
        {data.decisions.revealed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga beslut är visade ännu.</p>
        ) : (
          <div className="space-y-3">
            {data.decisions.revealed.map((d) => (
              <div key={d.id} className="rounded-md border border-border p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">{d.title ?? 'Beslut'}</p>
                <div className="space-y-1">
                  {d.results.map((r) => (
                    <div key={r.key ?? r.label} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{r.label ?? r.key}</span>
                      <span className="text-muted-foreground">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Utfall</p>
        {data.outcomes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga utfall är visade ännu.</p>
        ) : (
          <div className="space-y-2">
            {data.outcomes.map((o) => (
              <div key={o.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{o.title ?? 'Utfall'}</p>
                  {o.outcome_type && <Badge variant="secondary">{o.outcome_type}</Badge>}
                </div>
                {o.body && <p className="mt-1 text-sm text-muted-foreground">{o.body}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
