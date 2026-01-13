'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';

type CollectionListRow = {
  id: string;
  title: string;
  description: string | null;
  scope_type: 'global' | 'tenant';
  tenant_id: string | null;
  audience: string | null;
  language: string | null;
  main_purpose_id: string | null;
  status: 'published';
};

type CardRow = {
  id: string;
  sort_order: number;
  card_title: string | null;
  primary_prompt: string;
  followup_1: string | null;
  followup_2: string | null;
  followup_3: string | null;
  leader_tip: string | null;
};

export function ConversationCardsV1() {
  const t = useTranslations('tools.conversationCards');
  const [collections, setCollections] = useState<CollectionListRow[] | null>(null);
  const [activeCollectionId, setActiveCollectionId] = useState<string>('');
  const [cards, setCards] = useState<CardRow[] | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const res = await fetch('/api/toolbelt/conversation-cards/collections', { cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as unknown;
        if (!res.ok) {
          const msg = (data as { error?: unknown })?.error;
          throw new Error(typeof msg === 'string' ? msg : t('errorLoadCollections'));
        }

        const rows = (data as { collections?: unknown })?.collections;
        const parsed = Array.isArray(rows) ? (rows as CollectionListRow[]) : [];
        if (cancelled) return;
        setCollections(parsed);

        // Default select first collection (if any)
        if (parsed.length > 0) {
          setActiveCollectionId((prev) => prev || parsed[0].id);
        }
      } catch (e) {
        if (cancelled) return;
        setCollections([]);
        setError(e instanceof Error ? e.message : t('errorLoadCollections'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeCollectionId) return;

    let cancelled = false;
    void (async () => {
      setError(null);
      setCards(null);
      setActiveIndex(0);

      try {
        const res = await fetch(`/api/toolbelt/conversation-cards/collections/${activeCollectionId}`, { cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as unknown;
        if (!res.ok) {
          const msg = (data as { error?: unknown })?.error;
          throw new Error(typeof msg === 'string' ? msg : t('errorLoadCards'));
        }

        const rows = (data as { cards?: unknown })?.cards;
        const parsed = Array.isArray(rows) ? (rows as CardRow[]) : [];
        if (cancelled) return;
        setCards(parsed);
      } catch (e) {
        if (cancelled) return;
        setCards([]);
        setError(e instanceof Error ? e.message : t('errorLoadCards'));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeCollectionId, t]);

  const activeCard = useMemo(() => {
    if (!cards || cards.length === 0) return null;
    return cards[Math.max(0, Math.min(activeIndex, cards.length - 1))] ?? null;
  }, [cards, activeIndex]);

  const canPrev = Boolean(cards && cards.length > 0 && activeIndex > 0);
  const canNext = Boolean(cards && cards.length > 0 && activeIndex < cards.length - 1);

  return (
    <Card className="p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{t('title')}</h3>
        <p className="text-xs text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <div className="mt-4">
        <Select
          label={t('collection')}
          value={activeCollectionId}
          onChange={(e) => setActiveCollectionId(e.target.value)}
          options={[
            { value: '', label: collections === null ? t('loading') : t('selectCollection'), disabled: true },
            ...(collections ?? []).map((c) => ({ value: c.id, label: c.title })),
          ]}
        />
      </div>

      {error ? <div className="mt-3 text-sm text-destructive">{error}</div> : null}

      {collections && collections.length === 0 ? (
        <div className="mt-4 text-sm text-muted-foreground">{t('noCollections')}</div>
      ) : null}

      <div className="mt-4">
        {cards === null ? (
          <div className="text-sm text-muted-foreground">{t('loadingCards')}</div>
        ) : cards.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t('noCardsInCollection')}</div>
        ) : activeCard ? (
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold text-foreground">{activeCard.card_title || t('card')}</div>
              <div className="text-xs text-muted-foreground">
                {activeIndex + 1}/{cards.length}
              </div>
            </div>

            <div className="mt-3 whitespace-pre-wrap text-sm">{activeCard.primary_prompt}</div>

            {activeCard.followup_1 || activeCard.followup_2 || activeCard.followup_3 ? (
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {activeCard.followup_1 ? <div>{t('followup', { n: 1 })}: {activeCard.followup_1}</div> : null}
                {activeCard.followup_2 ? <div>{t('followup', { n: 2 })}: {activeCard.followup_2}</div> : null}
                {activeCard.followup_3 ? <div>{t('followup', { n: 3 })}: {activeCard.followup_3}</div> : null}
              </div>
            ) : null}

            {activeCard.leader_tip ? (
              <div className="mt-3 text-xs">
                <span className="font-semibold text-foreground">{t('leaderTip')}:</span>{' '}
                <span className="text-muted-foreground">{activeCard.leader_tip}</span>
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setActiveIndex((i) => Math.max(0, i - 1))} disabled={!canPrev}>
                {t('previous')}
              </Button>
              <Button type="button" size="sm" onClick={() => setActiveIndex((i) => i + 1)} disabled={!canNext}>
                {t('next')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
