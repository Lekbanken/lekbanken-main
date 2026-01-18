'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { applySessionTimeBankDelta, getSessionTimeBank, type TimeBankLedgerRow } from '@/features/play/api/time-bank-api';
import { useLiveSession } from '@/features/play/hooks/useLiveSession';

type TimeBankPanelProps = {
  sessionId: string;
  disabled?: boolean;
};

function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatTimeShort(value: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export function TimeBankPanel({ sessionId, disabled = false }: TimeBankPanelProps) {
  const t = useTranslations('play.timeBankPanel');
  const locale = useLocale();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [balanceSeconds, setBalanceSeconds] = useState(0);
  const [ledger, setLedger] = useState<TimeBankLedgerRow[]>([]);

  const [customDelta, setCustomDelta] = useState('');
  const [customReason, setCustomReason] = useState('manual');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSessionTimeBank(sessionId);
      setBalanceSeconds(res.timeBank.balanceSeconds ?? 0);
      setLedger(res.ledger ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [sessionId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const { connected } = useLiveSession({
    sessionId,
    enabled: true,
    onTimeBankChanged: (payload) => {
      if (payload.sessionId !== sessionId) return;
      void load();
    },
  });

  const quickButtons = useMemo(
    () => [30, 60, -30, -60],
    []
  );

  const formatDeltaSeconds = useCallback(
    (deltaSeconds: number) => {
      const sign = deltaSeconds > 0 ? '+' : deltaSeconds < 0 ? '-' : '';
      return t('format.deltaSeconds', { sign, seconds: Math.abs(deltaSeconds) });
    },
    [t]
  );

  const applyDelta = useCallback(
    async (deltaSeconds: number, reason: string) => {
      setSubmitting(true);
      setError(null);
      try {
        await applySessionTimeBankDelta(sessionId, {
          deltaSeconds,
          reason,
        });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.updateFailed'));
      } finally {
        setSubmitting(false);
      }
    },
    [sessionId, load, t]
  );

  const handleApplyCustom = useCallback(async () => {
    const deltaSeconds = Number(customDelta);
    if (!Number.isFinite(deltaSeconds) || !Number.isInteger(deltaSeconds) || deltaSeconds === 0) return;
    const reason = customReason.trim() || 'manual';
    await applyDelta(deltaSeconds, reason);
    setCustomDelta('');
  }, [customDelta, customReason, applyDelta]);

  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Badge variant={connected ? 'success' : 'secondary'} size="sm">
          {connected ? t('status.live') : t('status.offline')}
        </Badge>
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <div className="text-3xl font-mono font-bold text-primary">{formatSeconds(balanceSeconds)}</div>
        <div className="text-sm text-muted-foreground">{t('format.minSec')}</div>
      </div>

      {error && <div className="mt-3 text-sm text-destructive">{error}</div>}

      <div className="mt-4 flex flex-wrap gap-2">
        {quickButtons.map((deltaSeconds) => (
          <Button
            key={deltaSeconds}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void applyDelta(deltaSeconds, 'quick')}
            disabled={disabled || submitting}
          >
            {formatDeltaSeconds(deltaSeconds)}
          </Button>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Input
          value={customDelta}
          onChange={(e) => setCustomDelta(e.target.value)}
          placeholder={t('placeholders.deltaSeconds')}
          disabled={disabled || submitting}
        />
        <Input
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          placeholder={t('placeholders.reason')}
          disabled={disabled || submitting}
        />
        <Button
          type="button"
          onClick={() => void handleApplyCustom()}
          disabled={
            disabled ||
            submitting ||
            !customDelta.trim() ||
            !Number.isFinite(Number(customDelta)) ||
            Number(customDelta) === 0
          }
        >
          {t('actions.apply')}
        </Button>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('recentChanges.title')}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            {t('actions.refresh')}
          </Button>
        </div>

        <div className="max-h-64 overflow-auto rounded-md border border-border p-3 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('recentChanges.loading')}</p>
          ) : ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('recentChanges.empty')}</p>
          ) : (
            ledger.map((row) => (
              <div key={row.id} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="sm">
                      {formatDeltaSeconds(row.delta_seconds)}
                    </Badge>
                    <span className="text-muted-foreground">{row.reason}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeShort(row.created_at, locale)}
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
