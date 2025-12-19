'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type SessionArtifact = {
  id: string;
  title: string;
  description?: string | null;
  artifact_type?: string | null;
  artifact_order?: number;
};

type SessionArtifactVariant = {
  id: string;
  session_artifact_id: string;
  title?: string | null;
  body?: string | null;
  visibility: 'public' | 'leader_only' | 'role_private';
  visible_to_session_role_id?: string | null;
  revealed_at?: string | null;
  highlighted_at?: string | null;
};

export function ArtifactsPanel({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<SessionArtifact[]>([]);
  const [variants, setVariants] = useState<SessionArtifactVariant[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/artifacts`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte ladda artefakter');
      setArtifacts(data.artifacts || []);
      setVariants(data.variants || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte ladda artefakter');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const variantsByArtifact = useMemo(() => {
    const map = new Map<string, SessionArtifactVariant[]>();
    for (const v of variants) {
      const list = map.get(v.session_artifact_id) ?? [];
      list.push(v);
      map.set(v.session_artifact_id, list);
    }
    return map;
  }, [variants]);

  const snapshot = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/play/sessions/${sessionId}/artifacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Kunde inte snapshotta artefakter');
      return;
    }
    await load();
  }, [sessionId, load]);

  const updateVariant = useCallback(
    async (body: unknown) => {
      setError(null);
      const res = await fetch(`/api/play/sessions/${sessionId}/artifacts/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Kunde inte uppdatera artefakt');
        return;
      }
      await load();
    },
    [sessionId, load]
  );

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Laddar artefakter…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Artefakter</h2>
            <p className="text-sm text-muted-foreground">Snapshot, reveal och highlight av artefakter.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={load}>
              Uppdatera
            </Button>
            <Button size="sm" onClick={snapshot}>
              Snapshotta från spel
            </Button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </Card>

      {artifacts.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Inga session-artefakter ännu. Klicka “Snapshotta från spel”.</p>
        </Card>
      ) : (
        artifacts.map((a) => {
          const vs = variantsByArtifact.get(a.id) ?? [];
          return (
            <Card key={a.id} className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">{a.title}</h3>
                  {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                </div>
                <Badge variant="secondary">{vs.length} varianter</Badge>
              </div>

              <div className="space-y-2">
                {vs.map((v) => {
                  const revealable = v.visibility === 'public';
                  const revealed = Boolean(v.revealed_at);
                  const highlighted = Boolean(v.highlighted_at);
                  return (
                    <div key={v.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {v.title || 'Variant'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {v.visibility}
                            {v.visibility === 'role_private' && v.visible_to_session_role_id ? ' (roll)' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {revealable && (
                            <Button
                              size="sm"
                              variant={revealed ? 'outline' : 'primary'}
                              onClick={() =>
                                updateVariant({ action: 'reveal_variant', variantId: v.id, revealed: !revealed })
                              }
                            >
                              {revealed ? 'Dölj' : 'Reveal'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={highlighted ? 'outline' : 'ghost'}
                            onClick={() =>
                              updateVariant({ action: 'highlight_variant', variantId: v.id, highlighted: !highlighted })
                            }
                          >
                            {highlighted ? 'Avmarkera' : 'Highlight'}
                          </Button>
                        </div>
                      </div>
                      {v.body && <p className="mt-2 text-sm whitespace-pre-wrap">{v.body}</p>}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
