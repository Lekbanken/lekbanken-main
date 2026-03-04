'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toDataURL } from 'qrcode';
import { createBrowserClient } from '@/lib/supabase/client';
import { getPlayChannelName, PLAY_BROADCAST_EVENTS } from '@/lib/realtime/play-broadcast';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchRunSession, createRunSession, fetchSessionState, type RunSessionData } from '../api';
import type { TimerState, BoardState } from '@/types/play-runtime';
import { calculateTimerDisplay, formatTime } from '@/lib/utils/timer-utils';
import type { RunStep } from '../types';

/** Polling fallback interval (ms) — longer now that realtime is primary */
const POLL_INTERVAL_MS = 30_000;

/** Debounce delay for realtime-triggered refetch (ms) */
const REALTIME_DEBOUNCE_MS = 400;

/** Max seq gap before triggering an out-of-sync refetch */
const SEQ_GAP_THRESHOLD = 5;

/** participant_session statuses that are terminal (no further host actions) */
const TERMINAL_STATUSES = new Set(['ended', 'archived', 'cancelled']);

/** participant_session statuses that are "live" (lobby or playing) */
const LIVE_STATUSES = new Set(['lobby', 'active', 'paused', 'locked']);

interface RunSessionCockpitProps {
  /** Current run step requiring a session */
  step: RunStep;
  /** Active run ID */
  runId: string;
  /** Called when session state changes (for navigation guard) */
  onSessionStateChange?: (state: 'none' | 'active' | 'completed') => void;
}

/**
 * Director-mode session cockpit for PlayPlanPage.
 *
 * MS8 — Handles creating a participant session, showing QR/join link/code,
 * polling for live participant count + status, and linking to the full
 * Director Mode session view.
 */
export function RunSessionCockpit({ step, runId, onSessionStateChange }: RunSessionCockpitProps) {
  const t = useTranslations('play.playPlanPage.runSession');
  const { success: toastSuccess } = useToast();
  const supabase = useMemo(() => createBrowserClient(), []);
  const [runSession, setRunSession] = useState<RunSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [connectionDegraded, setConnectionDegraded] = useState(false);
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [timerTick, setTimerTick] = useState(0); // forces re-render for countdown
  const autoCreateFired = useRef(false);
  const consecutiveFailures = useRef(0);
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeenSeq = useRef(-1);
  const gapRefetchCooldown = useRef(false);

  // ─── Derived state ───────────────────────────────────────────
  const ps = runSession?.participantSession ?? null;
  const sessionId = ps?.id ?? null;
  const sessionCode = ps?.sessionCode ?? null;
  const currentStatus = liveStatus ?? ps?.status ?? null;
  const isTerminal = currentStatus ? TERMINAL_STATUSES.has(currentStatus) : false;
  const isLive = currentStatus ? LIVE_STATUSES.has(currentStatus) : false;
  const isDraft = currentStatus === 'draft';
  // Hide degraded badge when session reaches terminal (no need to setState)
  const showConnectionDegraded = connectionDegraded && !isTerminal;

  const joinUrl =
    typeof window !== 'undefined' && sessionCode
      ? `${window.location.origin}/participants/join?code=${encodeURIComponent(sessionCode)}`
      : null;

  // ─── Report state to parent ──────────────────────────────────
  useEffect(() => {
    if (!ps) {
      onSessionStateChange?.('none');
    } else if (isTerminal) {
      onSessionStateChange?.('completed');
    } else {
      onSessionStateChange?.('active');
    }
  }, [ps, isTerminal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Initial fetch + auto-create ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    autoCreateFired.current = false;

    async function load() {
      setIsLoading(true);
      const data = await fetchRunSession(runId, step.index);
      if (cancelled) return;
      setRunSession(data);
      setIsLoading(false);

      if (data?.participantSession) {
        setParticipantCount(data.participantSession.participantCount);
        setLiveStatus(data.participantSession.status);
      } else {
        setLiveStatus(null);
        setParticipantCount(0);
        // Auto-create if configured
        if (step.sessionSpec?.autoCreate && !autoCreateFired.current) {
          autoCreateFired.current = true;
          await doCreateSession();
        }
      }
    }

    async function doCreateSession() {
      if (!step.sessionSpec?.gameId || cancelled) return;
      setIsCreating(true);
      setError(null);
      const result = await createRunSession(runId, step.index, step.sessionSpec.gameId, step.title);
      if (cancelled) return;
      setIsCreating(false);
      if (result.success) {
        setRunSession(result.data.runSession);
        const s = result.data.runSession.participantSession;
        if (s) {
          setParticipantCount(s.participantCount);
          setLiveStatus(s.status);
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [runId, step.index]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Poll session state (status + participant count) ─────────
  // Skips when tab is hidden or device is offline.
  // Exponential backoff on consecutive failures (5s → 10s → 20s max).
  useEffect(() => {
    if (!sessionId || isTerminal) return;
    const sid = sessionId; // capture for closures (TS narrowing)
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      if (cancelled) return;
      const backoffMultiplier = Math.min(
        Math.pow(2, consecutiveFailures.current),
        4 // max 4× = 20s
      );
      const delay = POLL_INTERVAL_MS * backoffMultiplier;
      timeoutId = setTimeout(tick, delay);
    }

    async function tick() {
      if (cancelled) return;
      // Skip when tab hidden or offline
      if (document.visibilityState === 'hidden' || !navigator.onLine) {
        scheduleNext();
        return;
      }

      const state = await fetchSessionState(sid);
      if (cancelled) return; // effect cleaned up while fetching
      if (state) {
        consecutiveFailures.current = 0;
        setConnectionDegraded(false);
        setParticipantCount(state.participant_count);
        setLiveStatus(state.status);
        setTimerState(state.timer_state);
        setBoardState(state.board_state);
      } else {
        consecutiveFailures.current++;
        if (consecutiveFailures.current >= 3) {
          setConnectionDegraded(true);
        }
      }
      scheduleNext();
    }

    scheduleNext();
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [sessionId, isTerminal]);

  // ─── Visibility catch-up — resync immediately on tab focus ───
  useEffect(() => {
    if (!sessionId || isTerminal) return;
    const sid = sessionId;
    let cancelled = false;

    const onVisChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void fetchSessionState(sid).then((state) => {
          if (cancelled || !state) return;
          consecutiveFailures.current = 0;
          setConnectionDegraded(false);
          setParticipantCount(state.participant_count);
          setLiveStatus(state.status);
          setTimerState(state.timer_state);
          setBoardState(state.board_state);
        });
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisChange); };
  }, [sessionId, isTerminal]);

  // ─── Realtime subscription (all play events) ─────────────────
  // Subscribes to the play broadcast channel for the session.
  // - `participants_changed` / `state_change` → debounced refetch (SSoT)
  // - `timer_update` / `board_update` → optimistic update via seq-guard (no refetch)
  // - On SUBSCRIBED: immediate state sync
  useEffect(() => {
    if (!sessionId || isTerminal) return;
    const sid = sessionId;
    let cancelled = false;

    /** Debounced canonical refetch (only for low-frequency events) */
    function debouncedRefetch() {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      realtimeDebounceRef.current = setTimeout(() => {
        if (cancelled || document.visibilityState === 'hidden') return;
        void fetchSessionState(sid).then((state) => {
          if (cancelled || !state) return;
          consecutiveFailures.current = 0;
          setConnectionDegraded(false);
          setParticipantCount(state.participant_count);
          setLiveStatus(state.status);
          setTimerState(state.timer_state);
          setBoardState(state.board_state);
        });
      }, REALTIME_DEBOUNCE_MS);
    }

    /** Rate-limited gap refetch (when seq jumps unexpectedly) */
    function gapRefetch() {
      if (gapRefetchCooldown.current || cancelled) return;
      gapRefetchCooldown.current = true;
      setTimeout(() => { gapRefetchCooldown.current = false; }, 5000);
      debouncedRefetch();
    }

    const channelName = getPlayChannelName(sid);
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: PLAY_BROADCAST_EVENTS.PLAY_EVENT }, (payload) => {
        const event = payload.payload as {
          type?: string;
          seq?: number;
          payload?: { status?: string; timer_state?: TimerState | null; action?: string; message?: string; overrides?: Record<string, boolean> };
        };
        if (cancelled) return;

        // Any realtime event proves connection is alive
        consecutiveFailures.current = 0;
        setConnectionDegraded(false);

        // Seq-guard: ignore out-of-order events
        const seq = typeof event.seq === 'number' ? event.seq : -1;
        if (seq > 0 && seq <= lastSeenSeq.current) return; // stale
        const gap = seq > 0 && lastSeenSeq.current > 0 ? seq - lastSeenSeq.current : 0;
        if (seq > 0) lastSeenSeq.current = seq;

        // Gap detection: if we skipped too many seqs, refetch canonical state
        if (gap > SEQ_GAP_THRESHOLD) {
          gapRefetch();
          return;
        }

        switch (event.type) {
          case 'participants_changed':
          case 'state_change':
            // Optimistic status update
            if (event.type === 'state_change' && event.payload?.status) {
              setLiveStatus(event.payload.status);
            }
            // Low-frequency: debounced canonical refetch
            debouncedRefetch();
            break;

          case 'timer_update':
            // High-frequency: optimistic update only (no REST call)
            if (event.payload?.timer_state !== undefined) {
              setTimerState(event.payload.timer_state);
            }
            break;

          case 'board_update':
            // Optimistic update only (no REST call)
            if (event.payload) {
              setBoardState((prev) => ({
                ...prev,
                message: event.payload?.message ?? prev?.message,
                overrides: event.payload?.overrides
                  ? { ...prev?.overrides, ...event.payload.overrides }
                  : prev?.overrides,
              }));
            }
            break;

          default:
            // Unknown event type — ignore but connection health was already updated
            break;
        }
      })
      .subscribe((status) => {
        // On SUBSCRIBED: immediate state sync to catch anything missed
        if (status === 'SUBSCRIBED' && !cancelled) {
          void fetchSessionState(sid).then((state) => {
            if (cancelled || !state) return;
            consecutiveFailures.current = 0;
            setConnectionDegraded(false);
            setParticipantCount(state.participant_count);
            setLiveStatus(state.status);
            setTimerState(state.timer_state);
            setBoardState(state.board_state);
          });
        }
      });

    return () => {
      cancelled = true;
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, isTerminal, supabase]);

  // ─── Timer tick (1s countdown for live display) ──────────────
  const timerDisplay = useMemo(() => calculateTimerDisplay(timerState), [timerState, timerTick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!timerState || timerState.paused_at || isTerminal) return;
    const id = setInterval(() => setTimerTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [timerState, isTerminal]);

  // ─── QR code generation ──────────────────────────────────────
  useEffect(() => {
    if (!qrOpen || !joinUrl) return;
    let active = true;
    void toDataURL(joinUrl, { margin: 1, width: 256 })
      .then((url: string) => { if (active) setQrDataUrl(url); })
      .catch(() => { if (active) setQrDataUrl(null); });
    return () => { active = false; };
  }, [qrOpen, joinUrl]);

  // ─── Handlers ────────────────────────────────────────────────
  async function handleCreateSession() {
    if (!step.sessionSpec?.gameId) return;
    setIsCreating(true);
    setError(null);

    const result = await createRunSession(
      runId, step.index, step.sessionSpec.gameId, step.title
    );
    setIsCreating(false);

    if (result.success) {
      setRunSession(result.data.runSession);
      const s = result.data.runSession.participantSession;
      if (s) {
        setParticipantCount(s.participantCount);
        setLiveStatus(s.status);
      }
    } else {
      setError(t('errorCreating'));
    }
  }

  const handleCopyCode = useCallback(() => {
    if (!sessionCode) return;
    void navigator.clipboard.writeText(sessionCode).then(() => {
      toastSuccess(t('codeCopied'));
    });
  }, [sessionCode, toastSuccess, t]);

  const handleCopyLink = useCallback(() => {
    if (!joinUrl) return;
    void navigator.clipboard.writeText(joinUrl).then(() => {
      toastSuccess(t('linkCopied'));
    });
  }, [joinUrl, toastSuccess, t]);

  // ─── Loading skeleton ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Status badge styling ────────────────────────────────────
  function statusBadge(status: string) {
    const variants: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      lobby: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      locked: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      ended: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[status] ?? variants.draft}`}>
        {t(`status.${status}` as Parameters<typeof t>[0])}
      </span>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          {/* Users icon */}
          <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t('title')}</h3>
          <p className="text-xs text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      {/* ── No session yet — show start button ── */}
      {!ps && (
        <div className="space-y-3">
          <Button className="w-full" onClick={() => void handleCreateSession()} disabled={isCreating}>
            {isCreating ? t('starting') : t('startSession')}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      {/* ── Session exists — lobby / live / terminal panels ── */}
      {ps && currentStatus && (
        <div className="space-y-3">
          {/* Session code + status badge + participant count */}
          <div className="flex items-center justify-between rounded-xl bg-card p-3 border border-border/50">
            <div>
              <p className="text-xs text-muted-foreground">{t('sessionCode')}</p>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-2xl font-bold tracking-widest text-primary font-mono hover:opacity-80 transition-opacity cursor-pointer"
                title={t('copyCode')}
              >
                {sessionCode}
              </button>
            </div>
            <div className="text-right space-y-1">
              {statusBadge(currentStatus)}
              <p className="text-xs text-muted-foreground">
                {t('participants', { count: participantCount })}
              </p>
              {showConnectionDegraded && (
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {t('connectionDegraded')}
                </span>
              )}
            </div>
          </div>

          {/* Timer + Board state — visible for live sessions */}
          {isLive && (timerState || boardState?.message) && (
            <div className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border/50">
              {/* Timer display */}
              {timerState && (
                <div className="flex items-center gap-2">
                  {/* Clock icon */}
                  <svg className="h-4 w-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <div className="text-sm font-mono font-medium tabular-nums">
                    {formatTime(timerDisplay.remaining)}
                  </div>
                  <span className={`inline-flex h-2 w-2 rounded-full ${timerDisplay.isRunning ? 'bg-green-500 animate-pulse' : timerDisplay.isPaused ? 'bg-yellow-500' : timerDisplay.isFinished ? 'bg-red-500' : 'bg-muted'}`} />
                </div>
              )}
              {/* Board message */}
              {boardState?.message && (
                <p className="flex-1 truncate text-xs text-muted-foreground italic">
                  {boardState.message}
                </p>
              )}
            </div>
          )}

          {/* Join link + QR + Copy — visible for non-terminal sessions */}
          {!isTerminal && joinUrl && (
            <div className="space-y-2">
              {/* Join link (truncated) + copy */}
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <span className="flex-1 truncate text-xs text-muted-foreground font-mono">
                  {joinUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  title={t('copyLink')}
                >
                  {/* Copy icon */}
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  title={t('showQr')}
                >
                  {/* QR icon */}
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="3" height="3" />
                    <line x1="21" y1="14" x2="21" y2="14.01" />
                    <line x1="21" y1="21" x2="21" y2="21.01" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Director Mode link — for live sessions */}
          {isLive && (
            <a
              href={`/app/play/sessions/${ps.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {/* External link icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              {t('openDirectorMode')}
            </a>
          )}

          {/* Status messages */}
          {isDraft && (
            <p className="text-xs text-center text-muted-foreground font-medium">
              {t('statusMessage.draft')}
            </p>
          )}
          {currentStatus === 'lobby' && (
            <p className="text-xs text-center text-amber-600 dark:text-amber-400 font-medium">
              {t('statusMessage.lobby', { count: participantCount })}
            </p>
          )}
          {currentStatus === 'active' && (
            <p className="text-xs text-center text-green-600 dark:text-green-400 font-medium">
              {t('sessionActive')}
            </p>
          )}
          {currentStatus === 'paused' && (
            <p className="text-xs text-center text-yellow-600 dark:text-yellow-400 font-medium">
              {t('statusMessage.paused')}
            </p>
          )}
          {isTerminal && (
            <p className="text-xs text-center text-blue-600 dark:text-blue-400 font-medium">
              {t('sessionCompleted')}
            </p>
          )}
        </div>
      )}

      {/* ── QR Code Modal ── */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">{t('qrTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element -- data URL, no optimization benefit from next/image */
              <img src={qrDataUrl} alt={t('qrAlt')} className="rounded-lg" width={256} height={256} />
            ) : (
              <div className="h-64 w-64 animate-pulse rounded-lg bg-muted" />
            )}
            {sessionCode && (
              <p className="text-2xl font-bold tracking-widest text-primary font-mono">
                {sessionCode}
              </p>
            )}
            <Button variant="outline" className="w-full" onClick={handleCopyLink}>
              {t('copyLink')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
