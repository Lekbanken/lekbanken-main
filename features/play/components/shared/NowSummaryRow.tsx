/**
 * NowSummaryRow — Glanceable session status bar
 *
 * A single compact row showing step position, elapsed time, participant count,
 * and signal attention count. Designed to sit below the header so the Director
 * can scan session state without opening any drawer.
 *
 * Design rules:
 * - Fixed min-height (no layout jumps)
 * - Muted text with 1 accent per block
 * - No actions in v1 (info-only)
 * - tabular-nums on all numbers for width stability
 * - Responsive: wraps gracefully on narrow screens
 */

'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface NowSummaryRowProps {
  /** 1-based step number */
  stepNumber: number;
  /** Total number of steps */
  totalSteps: number;
  /** Current step title */
  stepTitle: string;
  /** Planned duration for current step (minutes), undefined = no plan */
  plannedMinutes?: number;
  /** Epoch ms when the current step started (undefined = not started) */
  stepStartedAt?: number;
  /** Is the time bank paused? */
  timerPaused?: boolean;
  /** Live participant count (omit to hide) */
  participantCount?: number;
  /** Number of unhandled signals requiring attention */
  unhandledSignals?: number;
  /** Optional labels (pre-resolved i18n) */
  labels?: {
    step?: string;      // default "Step"
    live?: string;      // default "live"
    paused?: string;    // default "paused"
    signals?: string;   // default "signals"
  };
  /** Optional trailing slot (e.g. time bank display) */
  trailing?: ReactNode;
  className?: string;
}

/** Format seconds → M:SS */
function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function NowSummaryRow({
  stepNumber,
  totalSteps,
  stepTitle,
  plannedMinutes,
  stepStartedAt,
  timerPaused = false,
  participantCount,
  unhandledSignals = 0,
  labels,
  trailing,
  className,
}: NowSummaryRowProps) {
  const [now, setNow] = useState(() => Date.now());

  // Tick every second for live elapsed display
  useEffect(() => {
    if (!stepStartedAt || timerPaused) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [stepStartedAt, timerPaused]);

  const elapsedSec = stepStartedAt ? Math.max(0, Math.floor((now - stepStartedAt) / 1000)) : 0;
  const isOvertime = plannedMinutes != null && elapsedSec >= plannedMinutes * 60;

  return (
    <div
      className={cn(
        'flex items-center gap-3 min-h-[2rem] border-b border-border/40 bg-muted/20 px-4 py-1.5 text-xs shrink-0 overflow-x-auto',
        className,
      )}
    >
      {/* Step meta */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="font-mono tabular-nums text-muted-foreground shrink-0">
          {labels?.step ?? 'Step'}{' '}
          <span className="font-semibold text-foreground">{stepNumber}/{totalSteps}</span>
        </span>
        <span className="text-muted-foreground/40 shrink-0">·</span>
        <span className="truncate text-foreground/80 font-medium">{stepTitle}</span>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-1 shrink-0">
        <span
          className={cn(
            'font-mono tabular-nums min-w-[3.5ch] text-right',
            timerPaused
              ? 'text-amber-500 dark:text-amber-400'
              : isOvertime
                ? 'text-red-500 dark:text-red-400 font-semibold'
                : 'text-muted-foreground',
          )}
        >
          {stepStartedAt ? formatElapsed(elapsedSec) : '—'}
        </span>
        {plannedMinutes != null && (
          <span className="text-muted-foreground/50 font-mono tabular-nums">
            /{plannedMinutes}m
          </span>
        )}
        {timerPaused && (
          <span className="text-[10px] font-medium text-amber-500 dark:text-amber-400 uppercase">
            {labels?.paused ?? 'paused'}
          </span>
        )}
      </div>

      {/* Participant count (hidden when omitted) */}
      {participantCount != null && participantCount > 0 && (
        <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
          <span className="font-mono tabular-nums font-medium text-foreground">{participantCount}</span>
          <span>{labels?.live ?? 'live'}</span>
        </div>
      )}

      {/* Unhandled signals attention dot */}
      {unhandledSignals > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
          </span>
          <span className="font-mono tabular-nums font-medium text-orange-600 dark:text-orange-400">
            {unhandledSignals}
          </span>
        </div>
      )}

      {/* Trailing slot (e.g. time bank) */}
      {trailing}
    </div>
  );
}
