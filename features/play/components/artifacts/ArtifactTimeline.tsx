/**
 * ArtifactTimeline — Per-artifact event history for Director "Mer info".
 *
 * PR #3: Filters SessionEvent[] by artifactId and renders a compact
 * vertical timeline (most recent first). Pure presentation — no fetches,
 * no subscriptions.
 *
 * Event mapping uses safe fallbacks: unknown event types render as
 * "Event" + timestamp. Labels are kept under 25 words (dense UI).
 */

'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import type { SessionEvent, SessionEventType } from '@/types/session-cockpit';

// =============================================================================
// Props
// =============================================================================

export interface ArtifactTimelineProps {
  /** All session events — will be filtered by artifactId internally. */
  events: SessionEvent[];
  /** The artifact to show history for. */
  artifactId: string;
  /** Compact mode for tight layouts. */
  compact?: boolean;
}

// =============================================================================
// Event → visual mapping
// =============================================================================

type EventConfig = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  className: string;
  labelKey: string;
};

const EVENT_CONFIG: Partial<Record<SessionEventType, EventConfig>> = {
  artifact_revealed: {
    icon: EyeIcon,
    className: 'text-green-600 dark:text-green-400',
    labelKey: 'revealed',
  },
  artifact_hidden: {
    icon: EyeSlashIcon,
    className: 'text-muted-foreground',
    labelKey: 'hidden',
  },
  artifact_state_changed: {
    icon: ArrowPathIcon,
    className: 'text-blue-600 dark:text-blue-400',
    labelKey: 'stateChanged',
  },
  puzzle_solved: {
    icon: CheckCircleIcon,
    className: 'text-green-600 dark:text-green-400',
    labelKey: 'solved',
  },
  puzzle_failed: {
    icon: XCircleIcon,
    className: 'text-red-600 dark:text-red-400',
    labelKey: 'failed',
  },
  trigger_fired: {
    icon: BoltIcon,
    className: 'text-amber-600 dark:text-amber-400',
    labelKey: 'triggerFired',
  },
};

const DEFAULT_CONFIG: EventConfig = {
  icon: ArrowPathIcon,
  className: 'text-muted-foreground',
  labelKey: 'unknown',
};

// =============================================================================
// Helpers
// =============================================================================

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return new Date(timestamp).toLocaleDateString();
}

// =============================================================================
// Component
// =============================================================================

const MAX_ITEMS = 15;

export function ArtifactTimeline({
  events,
  artifactId,
  compact = false,
}: ArtifactTimelineProps) {
  const t = useTranslations('play.artifactTimeline');

  // Memoised filter → sort → slice to avoid re-computation on every render.
  // Fallback: also match events where artifactId lives in payload (some event
  // producers store it there instead of on the top-level field).
  const filtered = useMemo(() => {
    const matches = events.filter(
      (e) =>
        e.artifactId === artifactId ||
        (e.payload &&
          typeof (e.payload as Record<string, unknown>).artifactId === 'string' &&
          (e.payload as Record<string, unknown>).artifactId === artifactId),
    );
    return matches
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, MAX_ITEMS);
  }, [events, artifactId]);

  if (filtered.length === 0) {
    return (
      <span className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
        {t('empty')}
      </span>
    );
  }

  return (
    <div className="space-y-0">
      {filtered.map((event) => {
        const config = EVENT_CONFIG[event.type] ?? DEFAULT_CONFIG;
        const Icon = config.icon;
        const isUnknown = !EVENT_CONFIG[event.type];

        return (
          <div
            key={event.id}
            className={cn(
              'flex items-start gap-2 py-1',
              compact ? 'text-[10px]' : 'text-xs',
            )}
          >
            {/* Timeline dot + icon */}
            <Icon className={cn('h-3 w-3 shrink-0 mt-0.5', config.className)} />

            {/* Label */}
            <div className="min-w-0 flex-1">
              <span className="text-foreground/80">
                {t(`event.${config.labelKey}`)}
              </span>
              {/* Show raw type as debug hint for unmapped events */}
              {isUnknown && (
                <span className="text-muted-foreground/60 ml-1 text-[9px]">
                  [{event.type}]
                </span>
              )}
              {event.actorName && (
                <span className="text-muted-foreground ml-1">
                  ({event.actorName})
                </span>
              )}
            </div>

            {/* Time */}
            <span className="text-muted-foreground shrink-0">
              {formatRelativeTime(event.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
