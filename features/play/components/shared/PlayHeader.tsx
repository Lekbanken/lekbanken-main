/**
 * PlayHeader — Unified top bar for both Director and Participant views.
 *
 * SSoT: there is exactly ONE header component. Role-specific content
 * (participant count, preview badge, etc.) is passed via `rightSlot`.
 *
 * Layout: [back + status pill] — [centred title] — [fullscreen + rightSlot]
 */

'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowLeftIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline';
import { StatusPill } from './StatusPill';
import type { ConnectionState, SessionStatus } from './play-types';

export type { ConnectionState, SessionStatus };

// =============================================================================
// Types
// =============================================================================

export interface PlayHeaderProps {
  /** Game / session title shown centred */
  title: string;
  /** Back-button tap handler */
  onBack: () => void;
  /** i18n label for back button (e.g. "Till lobbyn") */
  backLabel: string;

  /** Network connection state */
  connectionState: ConnectionState;
  /** Session lifecycle status */
  sessionStatus?: SessionStatus;

  /** Pre-resolved i18n labels for StatusPill */
  statusLabels: {
    live: string;
    paused?: string;
    statusLabel?: string;
    degraded: string;
    offline: string;
  };

  /** Whether Fullscreen API is active */
  isFullscreen?: boolean;
  /** Show fullscreen toggle (hidden on mobile by default) */
  showFullscreenButton?: boolean;
  /** Toggle fullscreen callback */
  onToggleFullscreen?: () => void;

  /** Optional status-tinted background class (e.g. 'bg-green-500/10') */
  bgTintClass?: string;

  /** Extra elements on the right side (participant count, preview badge, etc.) */
  rightSlot?: ReactNode;

  /**
   * @deprecated No longer needed — desktop border/rounding lives on PlaySurface.
   * Kept for backwards compat; has no visual effect.
   */
  desktopModal?: boolean;

  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function PlayHeader({
  title,
  onBack,
  backLabel,
  connectionState,
  sessionStatus = 'active',
  statusLabels,
  isFullscreen = false,
  showFullscreenButton = true,
  onToggleFullscreen,
  bgTintClass,
  rightSlot,
  desktopModal: _desktopModal = false,
  className,
}: PlayHeaderProps) {
  return (
    <header
      className={cn(
        'relative flex items-center justify-between gap-2 border-b transition-colors',
        'bg-background/95 backdrop-blur-sm px-3 py-2 shrink-0',
        bgTintClass,
        // desktopModal border removed — PlaySurface owns the single border
        className,
      )}
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      {/* Left: back + status pill */}
      <div className="flex items-center gap-2 z-10">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2 shrink-0">
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:ml-1">{backLabel}</span>
        </Button>
        <StatusPill
          connectionState={connectionState}
          sessionStatus={sessionStatus}
          labels={statusLabels}
        />
      </div>

      {/* Centre: title — absolutely positioned for true centre alignment */}
      <div className="absolute inset-x-0 flex justify-center pointer-events-none">
        <span className="truncate text-sm font-semibold text-foreground px-24 pointer-events-auto">{title}</span>
      </div>

      {/* Right: fullscreen + role-specific extras */}
      <div className="flex items-center gap-2 shrink-0 z-10">
        {rightSlot}
        {showFullscreenButton && onToggleFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hidden sm:flex"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="h-4 w-4" />
            ) : (
              <ArrowsPointingOutIcon className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
