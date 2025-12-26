'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Keypad } from '@/components/play/Keypad';

type KeypadMetadata = {
  correctCode?: string;
  codeLength?: number;
  successMessage?: string;
};

type SessionArtifact = {
  id: string;
  title: string;
  description?: string | null;
  artifact_type?: string | null;
  artifact_order?: number;
  metadata?: KeypadMetadata | null;
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
  const [unlockedKeypads, setUnlockedKeypads] = useState<Set<string>>(new Set());

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
        <Card className="p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-foreground">Inga artefakter ännu</h3>
          <p className="text-sm text-muted-foreground">
            Spelet kan ha dokument, bilder eller andra resurser kopplade till sig.
          </p>
          <Button size="sm" onClick={snapshot}>
            Hämta artefakter från spelet
          </Button>
          <p className="text-xs text-muted-foreground">
            Om knappen inte fungerar har spelet inga artefakter definierade.
          </p>
        </Card>
      ) : (
        artifacts.map((a) => {
          const vs = variantsByArtifact.get(a.id) ?? [];

          // Keypad artifact rendering
          if (a.artifact_type === 'keypad') {
            const correctCode = a.metadata?.correctCode || '1234';
            const codeLength = a.metadata?.codeLength || correctCode.length;
            const successMessage = a.metadata?.successMessage;
            const isUnlocked = unlockedKeypads.has(a.id);

            return (
              <Card key={a.id} className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔐</span>
                      <h3 className="font-medium">{a.title}</h3>
                    </div>
                    {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                  </div>
                  <Badge variant={isUnlocked ? 'default' : 'secondary'}>
                    {isUnlocked ? 'Upplåst' : 'Låst'}
                  </Badge>
                </div>

                {isUnlocked ? (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      ✓ {successMessage || 'Koden är korrekt!'}
                    </p>
                    {vs.length > 0 && (
                      <div className="mt-3 space-y-2 text-left">
                        {vs.map((v) => (
                          <div key={v.id} className="rounded border border-border p-2 text-sm">
                            <p className="font-medium">{v.title || 'Upplåst innehåll'}</p>
                            {v.body && <p className="text-muted-foreground">{v.body}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Keypad
                    correctCode={correctCode}
                    codeLength={codeLength}
                    title={a.title || 'Ange koden'}
                    size="md"
                    onSuccess={() => {
                      setUnlockedKeypads((prev) => new Set([...prev, a.id]));
                      // Optionally auto-reveal variants
                      if (vs.length > 0) {
                        vs.forEach((v) => {
                          if (v.visibility === 'public' && !v.revealed_at) {
                            updateVariant({ action: 'reveal_variant', variantId: v.id, revealed: true });
                          }
                        });
                      }
                    }}
                  />
                )}
              </Card>
            );
          }

          // Standard artifact rendering (card, document, image, etc.)
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
