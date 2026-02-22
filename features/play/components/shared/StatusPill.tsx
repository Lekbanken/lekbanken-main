/**
 * StatusPill — Unified session + connection status indicator
 *
 * SSoT for status display in both Participant and Director headers.
 * Combines connection state (connected/degraded/offline) with session
 * status (live/paused/draft/lobby/ended) into a single pill badge.
 *
 * Rules:
 * - Uses i18n labels (never hardcodes casing)
 * - Visual uppercase via CSS (not string manipulation)
 * - One component, one source of truth, used everywhere
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SignalIcon, SignalSlashIcon } from '@heroicons/react/24/outline';
import {
  MOTION_CONNECTION_BADGE,
  MOTION_CONNECTION_DEGRADED,
} from './motion-tokens';

// =============================================================================
// Types — re-export from canonical source
// =============================================================================

export type { ConnectionState, SessionStatus } from './play-types';
import type { ConnectionState, SessionStatus } from './play-types';

export interface StatusPillProps {
  /** Network connection state */
  connectionState: ConnectionState;
  /** Session lifecycle status — determines label + colour when connected */
  sessionStatus?: SessionStatus;
  /** Pre-resolved i18n labels */
  labels: {
    /** Shown when connected + active (default session state) */
    live: string;
    /** Shown when connected + paused */
    paused?: string;
    /** Shown when connected + draft/lobby/ended (fallback to live) */
    statusLabel?: string;
    /** Shown when degraded */
    degraded: string;
    /** Shown when offline */
    offline: string;
  };
  className?: string;
}

// =============================================================================
// Colour config per session status
// =============================================================================

const STATUS_VARIANT: Record<SessionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  lobby: 'secondary',
  active: 'default',
  paused: 'secondary',
  locked: 'destructive',
  ended: 'secondary',
};

const STATUS_EXTRA_CLASS: Record<SessionStatus, string> = {
  draft: 'bg-slate-500/80 text-white',
  lobby: 'bg-blue-500/80 text-white',
  active: '',                              // default green badge
  paused: 'bg-amber-500/80 text-white',
  locked: '',
  ended: 'bg-gray-500/80 text-white',
};

// =============================================================================
// Component
// =============================================================================

export function StatusPill({
  connectionState,
  sessionStatus = 'active',
  labels,
  className,
}: StatusPillProps) {
  // Connection problems override session status
  if (connectionState === 'offline' || connectionState === 'degraded') {
    return (
      <Badge
        variant="destructive"
        className={cn(
          'uppercase tracking-wider text-[10px] font-bold',
          MOTION_CONNECTION_BADGE,
          connectionState === 'degraded' && MOTION_CONNECTION_DEGRADED,
          className,
        )}
      >
        {connectionState === 'degraded' ? (
          <SignalIcon className="h-3 w-3 opacity-60" />
        ) : (
          <SignalSlashIcon className="h-3 w-3" />
        )}
        {connectionState === 'degraded' ? labels.degraded : labels.offline}
      </Badge>
    );
  }

  // Connected — show session status
  const variant = STATUS_VARIANT[sessionStatus];
  const extraClass = STATUS_EXTRA_CLASS[sessionStatus];

  const label =
    sessionStatus === 'paused' && labels.paused
      ? labels.paused
      : sessionStatus === 'active'
        ? labels.live
        : labels.statusLabel ?? labels.live;

  return (
    <Badge
      variant={variant}
      className={cn(
        'uppercase tracking-wider text-[10px] font-bold',
        MOTION_CONNECTION_BADGE,
        extraClass,
        className,
      )}
    >
      <SignalIcon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
