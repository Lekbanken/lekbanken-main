'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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

type SignalPreset = {
  id: string;
  label: string;
  channel: string;
  message?: string;
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
  const t = useTranslations('play.signalPanel');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [signals, setSignals] = useState<SessionSignalRow[]>([]);

  const [channel, setChannel] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const presets: SignalPreset[] = [
    { id: 'ready', label: t('presets.ready'), channel: 'READY', message: t('presets.ready') },
    { id: 'hint', label: t('presets.hint'), channel: 'HINT', message: t('presets.hintAvailable') },
    { id: 'attention', label: t('presets.attention'), channel: 'ATTENTION', message: t('presets.gatherAttention') },
    { id: 'pause', label: t('presets.pause'), channel: 'PAUSE', message: t('presets.pauseNow') },
    { id: 'found', label: t('presets.found'), channel: 'FOUND', message: t('presets.findConfirmed') },
    { id: 'sos', label: t('presets.sos'), channel: 'SOS', message: t('presets.needHelp') },
  ];

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
      setError(err instanceof Error ? err.message : t('errors.loadFailed'));
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

  const suggestedChannels = useMemo(() => {
    const suggested = ['READY', 'HINT', 'ATTENTION', 'PAUSE', 'FOUND', 'SOS'];
    const merged = [...quickChannels, ...suggested];
    return merged.filter((value, index) => merged.indexOf(value) === index).slice(0, 8);
  }, [quickChannels]);

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
      setError(err instanceof Error ? err.message : t('errors.sendFailed'));
    } finally {
      setSending(false);
    }
  }, [sessionId, channel, message, load, t]);

  const handlePresetSend = useCallback(async (preset: SignalPreset) => {
    if (disabled || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendSessionSignal(sessionId, {
        channel: preset.channel,
        message: preset.message ?? preset.label,
      });
      setChannel(preset.channel);
      setMessage('');
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.sendFailed'));
    } finally {
      setSending(false);
    }
  }, [disabled, sending, sessionId, load, t]);

  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Badge variant={connected ? 'success' : 'secondary'} size="sm">
          {connected ? 'Live' : 'Offline'}
        </Badge>
      </div>

      {error && <div className="mt-3 text-sm text-destructive">{error}</div>}

      <div className="mt-4 space-y-3">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('quickButtons')}</h3>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handlePresetSend(preset)}
                disabled={disabled || sending}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder={t('channelPlaceholder')}
            disabled={disabled || sending}
          />
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('messagePlaceholder')}
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
            {t('send')}
          </Button>
        </div>

        {suggestedChannels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedChannels.map((c) => (
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
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('recent')}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            {t('refresh')}
          </Button>
        </div>

        <div className="max-h-64 overflow-auto rounded-md border border-border p-3 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          ) : signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noSignals')}</p>
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
