'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('play.outcomePanel');
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
      if (!res.ok) throw new Error(data.error || t('errors.loadFailed'));
      setOutcomes(data.outcomes || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createOutcome = useCallback(async () => {
    setError(null);
    const titleValue = title.trim();
    if (!titleValue) {
      setError(t('errors.titleRequired'));
      return;
    }

    const res = await fetch(`/api/play/sessions/${sessionId}/outcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', title: titleValue, body: body.trim() || null }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || t('errors.createFailed'));
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
        setError(data.error || t('errors.updateFailed'));
        return;
      }

      await load();
    },
    [sessionId, load]
  );

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium">{t('form.titleLabel')}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('form.titlePlaceholder')} />
          </div>
          <div>
            <label className="text-sm font-medium">{t('form.textLabel')}</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder={t('form.textPlaceholder')} />
          </div>
          <div className="flex justify-end">
            <Button onClick={createOutcome}>{t('form.createOutcome')}</Button>
          </div>
        </div>
      </Card>

      {outcomes.length === 0 ? (
        <Card className="p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-foreground">{t('empty.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('empty.description')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('empty.hint')}
          </p>
        </Card>
      ) : (
        outcomes.map((o) => (
          <Card key={o.id} className="p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-medium">{o.title}</h3>
                {o.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{o.body}</p>}
              </div>
              <Badge variant="secondary">{o.revealed_at ? t('status.revealed') : t('status.hidden')}</Badge>
            </div>
            <div>
              <Button
                size="sm"
                variant={o.revealed_at ? 'outline' : 'primary'}
                onClick={() => toggleReveal(o.id, !o.revealed_at)}
              >
                {o.revealed_at ? t('actions.hide') : t('actions.reveal')}
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
