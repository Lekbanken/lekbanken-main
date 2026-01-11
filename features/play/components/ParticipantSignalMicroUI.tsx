'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sendSessionSignal } from '@/features/play/api/signals-api';

type ParticipantSignalMicroUIProps = {
  sessionId: string;
  participantToken: string;
  disabled?: boolean;
};

type QueuedSignal = {
  id: string;
  channel: string;
  message: string;
  createdAt: string;
};

function makeQueueKey(sessionId: string, participantToken: string): string {
  // Avoid storing the whole token as key suffix
  const suffix = participantToken.slice(0, 12);
  return `lekbanken:signal-queue:${sessionId}:${suffix}`;
}

function safeParseQueue(raw: string | null): QueuedSignal[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    const result: QueuedSignal[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      if (typeof rec.id !== 'string') continue;
      if (typeof rec.channel !== 'string') continue;
      if (typeof rec.message !== 'string') continue;
      if (typeof rec.createdAt !== 'string') continue;
      result.push({
        id: rec.id,
        channel: rec.channel,
        message: rec.message,
        createdAt: rec.createdAt,
      });
    }
    return result.slice(0, 50);
  } catch {
    return [];
  }
}

function isNetworkError(err: unknown): boolean {
  // fetch() network failures often throw TypeError in browsers
  if (err instanceof TypeError) return true;
  return false;
}

export function ParticipantSignalMicroUI({
  sessionId,
  participantToken,
  disabled = false,
}: ParticipantSignalMicroUIProps) {
  const t = useTranslations('play.participantSignalMicroUI');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const queueKey = useMemo(() => makeQueueKey(sessionId, participantToken), [sessionId, participantToken]);
  const [queue, setQueue] = useState<QueuedSignal[]>(() => {
    if (typeof window === 'undefined') return [];
    return safeParseQueue(window.localStorage.getItem(queueKey));
  });

  const updateQueue = useCallback((updater: (prev: QueuedSignal[]) => QueuedSignal[]) => {
    setQueue((prev) => {
      const next = updater(prev).slice(0, 50);
      try {
        window.localStorage.setItem(queueKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [queueKey]);

  const enqueue = useCallback((item: QueuedSignal) => {
    updateQueue((prev) => [item, ...prev]);
  }, [updateQueue]);

  const dequeueById = useCallback((id: string) => {
    updateQueue((prev) => prev.filter((q) => q.id !== id));
  }, [updateQueue]);

  useEffect(() => {
    // Reload queue when session/token changes.
    setQueue(safeParseQueue(window.localStorage.getItem(queueKey)));
  }, [queueKey]);

  // Keep a ref to avoid stale closures in retry timer
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const sendNow = useCallback(async (channel: string, message: string) => {
    setSending(true);
    setError(null);
    try {
      await sendSessionSignal(
        sessionId,
        { channel, message },
        { participantToken }
      );
      return true;
    } catch (err) {
      if (isNetworkError(err) || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
        return false;
      }
      setError(err instanceof Error ? err.message : 'Kunde inte skicka signal');
      return true; // non-network error: don’t queue infinitely
    } finally {
      setSending(false);
    }
  }, [sessionId, participantToken]);

  const handleTap = useCallback(async (channel: string) => {
    if (disabled || sending) return;

    const item: QueuedSignal = {
      id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Date.now()),
      channel,
      message: 'tap',
      createdAt: new Date().toISOString(),
    };

    const ok = await sendNow(channel, item.message);
    if (!ok) {
      enqueue(item);
      setError(null);
    }
  }, [disabled, sending, sendNow, enqueue]);

  const retryQueueOnce = useCallback(async () => {
    const pending = queueRef.current;
    if (pending.length === 0) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    // Retry oldest last (FIFO-ish): take the last item in the array
    const next = pending[pending.length - 1];
    if (!next) return;

    const ok = await sendNow(next.channel, next.message);
    if (ok) {
      dequeueById(next.id);
    }
  }, [sendNow, dequeueById]);

  useEffect(() => {
    if (queue.length === 0) return;

    const interval = window.setInterval(() => {
      void retryQueueOnce();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [queue.length, retryQueueOnce]);

  useEffect(() => {
    const onOnline = () => {
      void retryQueueOnce();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [retryQueueOnce]);

  const buttons = useMemo(
    () => [
      { channel: 'READY', labelKey: 'ready' as const },
      { channel: 'SOS', labelKey: 'sos' as const },
      { channel: 'FOUND', labelKey: 'found' as const },
    ],
    []
  );

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('title')}</div>
        {queue.length > 0 && (
          <Badge variant="secondary" size="sm">{t('queueCount', { count: queue.length })}</Badge>
        )}
      </div>

      {error && <div className="mt-2 text-sm text-destructive">{error}</div>}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {buttons.map((b) => (
          <Button
            key={b.channel}
            type="button"
            onClick={() => void handleTap(b.channel)}
            disabled={disabled || sending}
          >
            {t(`buttons.${b.labelKey}` as Parameters<typeof t>[0])}
          </Button>
        ))}
      </div>

      {queue.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t('autoSendHint')}
        </p>
      )}
    </Card>
  );
}
