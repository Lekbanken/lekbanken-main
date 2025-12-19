'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

type Decision = {
  id: string;
  title: string;
  prompt?: string | null;
  options: Array<{ key: string; label: string }>;
  status: 'draft' | 'open' | 'closed' | 'revealed';
  max_choices?: number;
  allow_anonymous?: boolean;
  revealed_at?: string | null;
};

type DecisionResult = { key: string; label: string; count: number };

export function DecisionsPanel({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newOptions, setNewOptions] = useState<Array<{ key: string; label: string }>>([
    { key: 'a', label: '' },
    { key: 'b', label: '' },
  ]);

  const [resultsByDecisionId, setResultsByDecisionId] = useState<Record<string, DecisionResult[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/decisions`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte ladda beslut');
      setDecisions(data.decisions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte ladda beslut');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createDecision = useCallback(async () => {
    setError(null);
    const title = newTitle.trim();
    if (!title) {
      setError('Titel krävs');
      return;
    }

    const options = newOptions
      .map((o) => ({ key: o.key.trim(), label: o.label.trim() }))
      .filter((o) => o.key && o.label);

    if (options.length < 2) {
      setError('Minst två alternativ krävs');
      return;
    }

    const res = await fetch(`/api/play/sessions/${sessionId}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        title,
        prompt: newPrompt.trim() || null,
        options,
        max_choices: 1,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Kunde inte skapa beslut');
      return;
    }

    setNewTitle('');
    setNewPrompt('');
    setNewOptions([
      { key: 'a', label: '' },
      { key: 'b', label: '' },
    ]);

    await load();
  }, [sessionId, newTitle, newPrompt, newOptions, load]);

  const action = useCallback(
    async (decisionId: string, act: 'open' | 'close' | 'reveal') => {
      setError(null);
      const res = await fetch(`/api/play/sessions/${sessionId}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: act, decisionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Kunde inte uppdatera beslut');
        return;
      }
      await load();
    },
    [sessionId, load]
  );

  const loadResults = useCallback(
    async (decisionId: string) => {
      const res = await fetch(`/api/play/sessions/${sessionId}/decisions/${decisionId}/results`, {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setResultsByDecisionId((prev) => ({ ...prev, [decisionId]: data.results || [] }));
    },
    [sessionId]
  );

  useEffect(() => {
    // Auto-load results for revealed decisions
    void (async () => {
      for (const d of decisions) {
        if (d.status === 'revealed' && !resultsByDecisionId[d.id]) {
          await loadResults(d.id);
        }
      }
    })();
  }, [decisions, resultsByDecisionId, loadResults]);

  const optionKeySuggestions = useMemo(() => ['a', 'b', 'c', 'd', 'e'], []);

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Laddar beslut…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Beslut</h2>
          <p className="text-sm text-muted-foreground">Skapa ett beslut och öppna röstning (single-choice).</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium">Titel</label>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Vad gör ni nu?" />
          </div>
          <div>
            <label className="text-sm font-medium">Prompt</label>
            <Textarea value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} rows={3} placeholder="Valfri kontext…" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Alternativ</label>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setNewOptions((prev) => [
                    ...prev,
                    {
                      key: optionKeySuggestions[Math.min(prev.length, optionKeySuggestions.length - 1)] ?? String(prev.length + 1),
                      label: '',
                    },
                  ])
                }
              >
                Lägg till
              </Button>
            </div>
            {newOptions.map((o, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-2">
                <Input
                  className="col-span-1"
                  value={o.key}
                  onChange={(e) =>
                    setNewOptions((prev) => prev.map((p, i) => (i === idx ? { ...p, key: e.target.value } : p)))
                  }
                  placeholder="key"
                />
                <Input
                  className="col-span-4"
                  value={o.label}
                  onChange={(e) =>
                    setNewOptions((prev) => prev.map((p, i) => (i === idx ? { ...p, label: e.target.value } : p)))
                  }
                  placeholder="Label"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={createDecision}>Skapa beslut</Button>
          </div>
        </div>
      </Card>

      {decisions.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Inga beslut ännu.</p>
        </Card>
      ) : (
        decisions.map((d) => (
          <Card key={d.id} className="p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-medium">{d.title}</h3>
                {d.prompt && <p className="text-sm text-muted-foreground">{d.prompt}</p>}
              </div>
              <Badge variant="secondary">{d.status}</Badge>
            </div>

            <ul className="text-sm list-disc list-inside text-muted-foreground">
              {d.options?.map((o) => (
                <li key={o.key}>
                  <span className="font-medium text-foreground">{o.label}</span> <span className="opacity-75">({o.key})</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-2">
              {d.status === 'draft' && (
                <Button size="sm" onClick={() => action(d.id, 'open')}>
                  Öppna röstning
                </Button>
              )}
              {d.status === 'open' && (
                <Button size="sm" variant="outline" onClick={() => action(d.id, 'close')}>
                  Stäng
                </Button>
              )}
              {d.status === 'closed' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => action(d.id, 'open')}>
                    Öppna igen
                  </Button>
                  <Button size="sm" onClick={() => action(d.id, 'reveal')}>
                    Reveal resultat
                  </Button>
                </>
              )}
              {d.status === 'revealed' && (
                <Button size="sm" variant="outline" onClick={() => loadResults(d.id)}>
                  Uppdatera resultat
                </Button>
              )}
            </div>

            {d.status === 'revealed' && resultsByDecisionId[d.id] && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm font-medium mb-2">Resultat</p>
                <div className="space-y-1">
                  {resultsByDecisionId[d.id].map((r) => (
                    <div key={r.key} className="flex items-center justify-between text-sm">
                      <span>{r.label}</span>
                      <span className="font-mono tabular-nums">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
