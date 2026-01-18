'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { resolveUiState } from '@/lib/play/ui-state';
import { toDataURL } from 'qrcode';

export type BoardApiResponse = {
  session: {
    id: string;
    code: string;
    status: 'active' | 'paused' | 'ended' | 'locked' | 'cancelled' | string;
    started_at?: string | null;
    ended_at?: string | null;
    current_step_index: number;
    current_phase_index: number;
    current_phase_name: string | null;
    current_step_title?: string | null;
    current_step_board_text?: string | null;
    timer_state: unknown | null;
    board_state: { message?: string | null } | null;
  };
  game: {
    id: string | null;
    title: string;
    board_config: Record<string, unknown> | null;
  };
  artifacts: {
    revealed_public_variants: Array<{
      id: string;
      session_artifact_id: string;
      title: string | null;
      body: string | null;
      media_ref: unknown | null;
      variant_order: number | null;
      visibility: string | null;
      revealed_at: string | null;
      highlighted_at: string | null;
    }>;
    highlighted_variant: {
      id: string;
      session_artifact_id: string;
      title: string | null;
      body: string | null;
      media_ref: unknown | null;
      variant_order: number | null;
      visibility: string | null;
      revealed_at: string | null;
      highlighted_at: string | null;
    } | null;
  };
  decisions: {
    revealed: Array<{
      id: string;
      title: string | null;
      results: Array<{ key?: string; label?: string; count: number }>;
    }>;
  };
  outcomes: Array<{
    id: string;
    title: string | null;
    body: string | null;
    outcome_type: string | null;
    revealed_at: string | null;
    created_at: string | null;
  }>;
};

type BoardClientProps = {
  code: string;
  initialData?: BoardApiResponse | null;
  initialError?: string | null;
};

const POLL_INTERVAL = 5000;

export function BoardClient({ code, initialData = null, initialError = null }: BoardClientProps) {
  const t = useTranslations('play.board');
  const locale = useLocale();
  const [data, setData] = useState<BoardApiResponse | null>(initialData);
  const [cachedData, setCachedData] = useState<BoardApiResponse | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [lastPollAt, setLastPollAt] = useState<string | null>(initialData ? new Date().toISOString() : null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const joinUrl = useMemo(() => `/participants/join?code=${encodeURIComponent(code)}`, [code]);

  useEffect(() => {
    let active = true;
    void toDataURL(joinUrl, { margin: 1, width: 256 })
      .then((url: string) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [joinUrl]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/play/board/${encodeURIComponent(code)}`, { cache: 'no-store' });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : t('errors.fetch'));
        }

        if (!cancelled) {
          setData(payload as BoardApiResponse);
          setCachedData(payload as BoardApiResponse);
          setError(null);
          const now = new Date().toISOString();
          setLastPollAt(now);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('errors.fetch'));
          setLastPollAt(new Date().toISOString());
        }
      }
    };

    const id = setInterval(poll, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [code, t]);

  const displayData = data ?? cachedData;

  const uiState = resolveUiState({
    status: displayData?.session.status,
    startedAt: displayData?.session.started_at ?? null,
    endedAt: displayData?.session.ended_at ?? null,
    lastPollAt,
  });

  const bannerCopy = {
    waiting: t('banner.waiting'),
    paused: t('banner.paused'),
    locked: t('banner.locked'),
    ended: t('banner.ended'),
    degraded: t('banner.degraded'),
    offline: t('banner.offline'),
    none: null,
  } as const;

  const bannerMessage = bannerCopy[uiState.banner];
  const formatTime = (value: string | null) => {
    if (!value) return t('timeUnknown');
    try {
      return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
    } catch {
      return t('timeUnknown');
    }
  };
  const updatingMessage = t('updating', { time: formatTime(lastPollAt) });

  if (!displayData) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
        <Card className="p-6 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('title')}</p>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('lobby.sessionCodeLabel')}</p>
          <p className="text-3xl font-mono font-bold tracking-widest text-foreground">{code}</p>
          <p className="text-sm text-muted-foreground">
            {error ? error : t('lobby.joinHint')}
          </p>
        </Card>
        <Card className="p-6 flex items-center justify-center">
          {qrDataUrl ? (
            <Image
              src={qrDataUrl}
              alt={t('lobby.qrAlt')}
              width={224}
              height={224}
              className="h-56 w-56"
              unoptimized
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              {error ? t('errors.fetch') : t('lobby.qrLoading')}
            </div>
          )}
        </Card>
      </div>
    );
  }

  const boardConfig = displayData.game.board_config ?? {};
  const welcomeMessage = (boardConfig as { welcome_message?: string | null }).welcome_message ?? null;

  const boardMessage =
    displayData.session.current_step_board_text ??
    displayData.session.board_state?.message ??
    null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {(uiState.connection !== 'connected' || Boolean(error)) && (
        <div className="rounded-lg border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          {updatingMessage}
        </div>
      )}
      {bannerMessage && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {bannerMessage}
        </div>
      )}

      {uiState.uiMode === 'lobby' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('title')}</p>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{displayData.game.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t('lobby.sessionCodeLabel')}</p>
              <p className="mt-1 text-3xl font-mono font-bold tracking-widest text-foreground">
                {displayData.session.code}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('lobby.joinHint')}
            </p>
            {welcomeMessage && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {welcomeMessage}
              </div>
            )}
          </Card>

          <Card className="p-6 flex items-center justify-center">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt={t('lobby.qrAlt')}
                width={224}
                height={224}
                className="h-56 w-56"
                unoptimized
              />
            ) : (
              <div className="text-sm text-muted-foreground">{t('lobby.qrLoading')}</div>
            )}
          </Card>
        </div>
      )}

      {uiState.uiMode !== 'lobby' && (
        <div className="space-y-6">
          <header className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('title')}</p>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">{displayData.game.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('codeLabel')}: <span className="font-mono">{displayData.session.code}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={uiState.uiMode === 'paused' ? 'warning' : uiState.uiMode === 'ended' ? 'secondary' : 'default'}>
                  {uiState.uiMode === 'paused'
                    ? t('status.paused')
                    : uiState.uiMode === 'ended'
                      ? t('status.ended')
                      : t('status.active')}
                </Badge>
                {displayData.session.current_phase_name && (
                  <p className="text-xs text-muted-foreground">{displayData.session.current_phase_name}</p>
                )}
              </div>
            </div>
          </header>

          {displayData.session.current_step_title && (
            <Card className="p-4">
              <p className="text-sm font-semibold text-foreground">{t('currentStep')}</p>
              <p className="mt-2 text-base font-semibold text-foreground">{displayData.session.current_step_title}</p>
            </Card>
          )}

          {boardMessage && (
            <Card className="p-4">
              <p className="text-sm font-semibold text-foreground">{t('now')}</p>
              <p className="mt-2 text-sm text-muted-foreground">{boardMessage}</p>
            </Card>
          )}

          {displayData.artifacts.highlighted_variant && (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{t('highlighted')}</p>
                <Badge variant="default">{t('artifact')}</Badge>
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">
                {displayData.artifacts.highlighted_variant.title ?? t('artifact')}
              </p>
              {displayData.artifacts.highlighted_variant.body && (
                <p className="mt-1 text-sm text-muted-foreground">{displayData.artifacts.highlighted_variant.body}</p>
              )}
            </Card>
          )}

          <Card className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">{t('publicArtifacts')}</p>
            {displayData.artifacts.revealed_public_variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noPublicArtifacts')}</p>
            ) : (
              <div className="space-y-2">
                {displayData.artifacts.revealed_public_variants.map((v) => (
                  <div key={v.id} className="rounded-md border border-border p-3">
                    <p className="text-sm font-medium text-foreground">{v.title ?? t('artifact')}</p>
                    {v.body && <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">{t('decisions')}</p>
            {displayData.decisions.revealed.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noDecisions')}</p>
            ) : (
              <div className="space-y-3">
                {displayData.decisions.revealed.map((d) => (
                  <div key={d.id} className="rounded-md border border-border p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">{d.title ?? t('decision')}</p>
                    <div className="space-y-1">
                      {d.results.map((r) => (
                        <div key={r.key ?? r.label} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{r.label ?? r.key}</span>
                          <span className="text-muted-foreground">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">{t('outcomes')}</p>
            {displayData.outcomes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noOutcomes')}</p>
            ) : (
              <div className="space-y-2">
                {displayData.outcomes.map((o) => (
                  <div key={o.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{o.title ?? t('outcome')}</p>
                      {o.outcome_type && <Badge variant="secondary">{o.outcome_type}</Badge>}
                    </div>
                    {o.body && <p className="mt-1 text-sm text-muted-foreground">{o.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
