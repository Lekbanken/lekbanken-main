'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type Outcome = {
  id: string;
  title: string;
  body?: string | null;
  outcome_type?: string | null;
  revealed_at?: string | null;
};

export function OutcomePanel({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/outcome`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte ladda utfall');
      setOutcomes(data.outcomes || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte ladda utfall');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createOutcome = useCallback(async () => {
    setError(null);
    const t = title.trim();
    if (!t) {
      setError('Titel krävs');
      return;
    }

    const res = await fetch(`/api/play/sessions/${sessionId}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', title: t, body: body.trim() || null }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Kunde inte skapa utfall');
      return;
    }

    setTitle('');
    setBody('');
    await load();
  }, [sessionId, title, body, load]);

  const toggleReveal = useCallback(
    async (outcomeId: string, reveal: boolean) => {
      setError(null);
      const res = await fetch(`/api/play/sessions/${sessionId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: reveal ? 'reveal' : 'hide', outcomeId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Kunde inte uppdatera utfall');
        return;
      }

      await load();
    },
    [sessionId, load]
  );

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Laddar utfall…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Utfall</h2>
          <p className="text-sm text-muted-foreground">Skriv ett utfall och reveal på tavlan.</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium">Titel</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Domen faller" />
          </div>
          <div>
            <label className="text-sm font-medium">Text</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Valfri beskrivning…" />
          </div>
          <div className="flex justify-end">
            <Button onClick={createOutcome}>Skapa utfall</Button>
          </div>
        </div>
      </Card>

      {outcomes.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Inga utfall ännu.</p>
        </Card>
      ) : (
        outcomes.map((o) => (
          <Card key={o.id} className="p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-medium">{o.title}</h3>
                {o.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{o.body}</p>}
              </div>
              <Badge variant="secondary">{o.revealed_at ? 'revealed' : 'hidden'}</Badge>
            </div>
            <div>
              <Button
                size="sm"
                variant={o.revealed_at ? 'outline' : 'primary'}
                onClick={() => toggleReveal(o.id, !o.revealed_at)}
              >
                {o.revealed_at ? 'Dölj' : 'Reveal'}
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
