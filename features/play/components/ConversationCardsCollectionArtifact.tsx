'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type ConversationCard = {
  id: string;
  card_title: string | null;
  primary_prompt: string;
  followup_1: string | null;
  followup_2: string | null;
  followup_3: string | null;
  leader_tip: string | null;
};

type DeckResponse = {
  collection?: {
    id: string;
    title: string;
    description: string | null;
  };
  cards?: ConversationCard[];
};

function readCollectionId(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>).conversation_card_collection_id;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function ConversationCardsCollectionArtifact(props: {
  sessionId: string;
  participantToken?: string | null;
  artifactTitle?: string | null;
  artifactDescription?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const t = useTranslations('play.conversationCards');
  const { sessionId, participantToken, artifactTitle, artifactDescription, metadata } = props;

  const collectionId = useMemo(() => readCollectionId(metadata), [metadata]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<ConversationCard[]>([]);
  const [deckTitle, setDeckTitle] = useState<string | null>(null);
  const [deckDescription, setDeckDescription] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const current = cards[index] ?? null;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setCards([]);
      setIndex(0);
      setDeckTitle(null);
      setDeckDescription(null);

      if (!collectionId) {
        setError(t('errors.missingCollection'));
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/play/sessions/${sessionId}/conversation-cards/collections/${collectionId}`, {
          method: 'GET',
          headers: participantToken ? { 'x-participant-token': participantToken } : undefined,
          cache: 'no-store',
        });

        const data = (await res.json().catch(() => ({}))) as DeckResponse & { error?: string };
        if (!res.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : t('errors.loadFailed'));
        }

        if (cancelled) return;
        setDeckTitle(data.collection?.title ?? null);
        setDeckDescription(data.collection?.description ?? null);
        setCards(Array.isArray(data.cards) ? data.cards : []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('errors.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId, participantToken, collectionId]);

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{artifactTitle ?? t('title')}</p>
        <Badge variant="secondary">{t('badge')}</Badge>
      </div>

      {artifactDescription && <p className="text-xs text-muted-foreground">{artifactDescription}</p>}

      {(deckTitle || deckDescription) && (
        <Card className="p-3 bg-muted/30">
          {deckTitle && <p className="text-sm font-semibold text-foreground">{deckTitle}</p>}
          {deckDescription && <p className="mt-1 text-xs text-muted-foreground">{deckDescription}</p>}
        </Card>
      )}

      {loading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && cards.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('noCards')}</p>
      )}

      {!loading && !error && current && (
        <Card className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{current.card_title ?? t('card')}</p>
            <p className="text-xs text-muted-foreground">
              {index + 1} / {cards.length}
            </p>
          </div>

          <p className="text-sm text-foreground">{current.primary_prompt}</p>

          {(current.followup_1 || current.followup_2 || current.followup_3) && (
            <div className="space-y-1">
              {current.followup_1 && <p className="text-xs text-muted-foreground">• {current.followup_1}</p>}
              {current.followup_2 && <p className="text-xs text-muted-foreground">• {current.followup_2}</p>}
              {current.followup_3 && <p className="text-xs text-muted-foreground">• {current.followup_3}</p>}
            </div>
          )}

          {current.leader_tip && (
            <div className="rounded border border-border bg-muted/30 p-2">
              <p className="text-xs text-muted-foreground">{t('leaderTip')}: {current.leader_tip}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index <= 0}>
              {t('previous')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIndex((i) => Math.min(cards.length - 1, i + 1))}
              disabled={index >= cards.length - 1}
            >
              {t('next')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
