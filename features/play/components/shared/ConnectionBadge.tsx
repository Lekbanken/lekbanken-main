'use client';

/**
 * ConnectionBadge — Shared 3-tier connection indicator
 *
 * States: connected (green), degraded (amber pulse), offline (red)
 * Used by both ParticipantFullscreenShell and DirectorModePanel header.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SignalIcon, SignalSlashIcon } from '@heroicons/react/24/outline';
import {
  MOTION_CONNECTION_BADGE,
  MOTION_CONNECTION_DEGRADED,
} from './motion-tokens';

// =============================================================================
// Types
// =============================================================================

export type { ConnectionState } from './play-types';
import type { ConnectionState } from './play-types';

export interface ConnectionBadgeProps {
  state: ConnectionState;
  labels: {
    live: string;
    degraded: string;
    offline: string;
  };
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ConnectionBadge({ state, labels, className }: ConnectionBadgeProps) {
  return (
    <Badge
      variant={state === 'connected' ? 'default' : 'destructive'}
      className={cn(
        MOTION_CONNECTION_BADGE,
        state === 'degraded' && MOTION_CONNECTION_DEGRADED,
        className,
      )}
    >
      {state === 'connected' ? (
        <SignalIcon className="h-3 w-3" />
      ) : state === 'degraded' ? (
        <SignalIcon className="h-3 w-3 opacity-60" />
      ) : (
        <SignalSlashIcon className="h-3 w-3" />
      )}
      {state === 'connected'
        ? labels.live
        : state === 'degraded'
          ? labels.degraded
          : labels.offline}
    </Badge>
  );
}
