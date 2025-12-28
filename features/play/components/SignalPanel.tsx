'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getSessionSignals, sendSessionSignal, type SessionSignalRow } from '@/features/play/api/signals-api';
import { useLiveSession } from '@/features/play/hooks/useLiveSession';
import type { SignalReceivedBroadcast } from '@/types/play-runtime';

type SignalPanelProps = {
  sessionId: string;
  disabled?: boolean;
};

function formatSignalText(payload: unknown): string {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const msg = (payload as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return '';
  }
}

function toRow(p: SignalReceivedBroadcast['payload']): SessionSignalRow {
  return {
    id: p.id,
    session_id: '',
    channel: p.channel,
    payload: p.payload,
    sender_user_id: p.sender_user_id,
    sender_participant_id: p.sender_participant_id,
    created_at: p.created_at,
  };
}

export function SignalPanel({ sessionId, disabled = false }: SignalPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [signals, setSignals] = useState<SessionSignalRow[]>([]);

  const [channel, setChannel] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSessionSignals(sessionId);
      setSignals(res.signals ?? []);
      if (!channel && (res.signals?.[0]?.channel ?? '')) {
        setChannel(res.signals[0]!.channel);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda signals');
    } finally {
      setLoading(false);
    }
  }, [sessionId, channel]);

  useEffect(() => {
    void load();
  }, [load]);

  const { connected } = useLiveSession({
    sessionId,
    enabled: true,
    onSignalReceived: (payload) => {
      setSignals((prev) => {
        const next = [toRow(payload), ...prev.filter((p) => p.id !== payload.id)];
        return next.slice(0, 20);
      });
      if (!channel) {
        setChannel(payload.channel);
      }
    },
  });

  const quickChannels = useMemo(() => {
    const channels: string[] = [];
    for (const s of signals) {
      if (!channels.includes(s.channel)) channels.push(s.channel);
      if (channels.length >= 6) break;
    }
    return channels;
  }, [signals]);

  const handleSend = useCallback(async () => {
    const c = channel.trim();
    const m = message.trim();
    if (!c || !m) return;

    setSending(true);
    setError(null);
    try {
      await sendSessionSignal(sessionId, { channel: c, message: m });
      setMessage('');
      // Rely on realtime, but keep it responsive even if connection is flaky
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte skicka signal');
    } finally {
      setSending(false);
    }
  }, [sessionId, channel, message, load]);

  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Signals</h2>
          <p className="text-sm text-muted-foreground">Skicka enkla events (t.ex. READY, SOS, FOUND).</p>
        </div>
        <Badge variant={connected ? 'success' : 'secondary'} size="sm">
          {connected ? 'Live' : 'Offline'}
        </Badge>
      </div>

      {error && <div className="mt-3 text-sm text-destructive">{error}</div>}

      <div className="mt-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="Kanal"
            disabled={disabled || sending}
          />
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Meddelande"
            disabled={disabled || sending}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={disabled || sending || !channel.trim() || !message.trim()}
          >
            Skicka
          </Button>
        </div>

        {quickChannels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickChannels.map((c) => (
              <Button
                key={c}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setChannel(c)}
                disabled={disabled || sending}
              >
                {c}
              </Button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Senaste</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            Uppdatera
          </Button>
        </div>

        <div className="max-h-64 overflow-auto rounded-md border border-border p-3 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Laddar…</p>
          ) : signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga signals ännu.</p>
          ) : (
            signals.map((s) => (
              <div key={s.id} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="sm">{s.channel}</Badge>
                    <span className="text-muted-foreground">{formatSignalText(s.payload)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
