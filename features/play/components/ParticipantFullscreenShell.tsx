/**
 * ParticipantFullscreenShell
 *
 * Premium fullscreen container for the participant play experience.
 * Mobile-first: covers entire viewport (including safe areas).
 * Desktop: centred modal with max-width, same as ActiveSessionShell.
 *
 * Combines:
 * - ActiveSessionShell patterns (CSS overlay, body scroll lock, confirm dialog)
 * - DirectorModeDrawer patterns (Fullscreen API + webkit fallback)
 *
 * Guardrails:
 * - "Stage cannot shift" — the shell layout is fixed, only content scrolls.
 * - No heavy imports — artifact renderers are lazy-loaded by OverlayStack.
 * - Overlay portal: children render inside a scrollable stage area;
 *   overlay slot renders above the stage (fixed, portalled).
 */

'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { PlayHeader } from '@/features/play/components/shared/PlayHeader';
import { PlayTopArea } from '@/features/play/components/shared/PlayTopArea';
import { PlaySurface } from '@/features/play/components/shared/PlaySurface';
import type { ConnectionState, SessionStatus } from '@/features/play/components/shared/play-types';

// =============================================================================
// TopSlot portal context — allows children (ParticipantPlayView) to render
// content inside PlayTopArea (e.g. NowSummaryRow) via createPortal.
// =============================================================================

export const ParticipantTopSlotContext = createContext<HTMLDivElement | null>(null);

// =============================================================================
// Fullscreen API helpers (from DirectorModeDrawer pattern)
// =============================================================================

async function requestFullscreen(): Promise<boolean> {
  try {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    } else if (
      (el as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen
    ) {
      (el as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
      return true;
    }
  } catch {
    /* Fullscreen not supported, denied, or requires user gesture */
  }
  return false;
}

function exitFullscreen() {
  try {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
    ) {
      (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
    }
  } catch {
    /* Silent */
  }
}

function isFullscreenActive(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
  );
}

// =============================================================================
// Body scroll lock (iOS Safari-safe pattern)
// Saves scrollY → position:fixed + top:-scrollY → restores on unlock.
// Prevents layout shift on iOS when toggling overflow:hidden.
// =============================================================================

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    // Save current scroll position BEFORE locking
    const scrollY = window.scrollY;

    // Apply lock: position:fixed prevents iOS Safari rubber-banding
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    (document.body.style as unknown as { overscrollBehavior?: string }).overscrollBehavior = 'none';

    return () => {
      // Unlock: restore position and scroll
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      (document.body.style as unknown as { overscrollBehavior?: string }).overscrollBehavior = '';

      // Restore scroll position (scrollY was captured at lock time)
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

// =============================================================================
// Types
// =============================================================================

export type { ConnectionState } from '@/features/play/components/shared/play-types';

export interface ParticipantFullscreenShellProps {
  /** Whether the shell is visible */
  open: boolean;
  /** Game / session title shown in header */
  title?: string;
  /** Called when participant wants to leave (back to lobby) */
  onRequestClose: () => void;

  /** Real-time connection indicator */
  connectionState?: ConnectionState;

  /** Session lifecycle status — drives StatusPill in shared header */
  sessionStatus?: SessionStatus;

  /** Chat affordance */
  chatUnreadCount?: number;
  onOpenChat?: () => void;

  /** Main stage content (step + timer) */
  children: React.ReactNode;
  /** Overlay content (decision modals, story, countdown, drawers) */
  overlaySlot?: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function ParticipantFullscreenShell({
  open,
  title,
  onRequestClose,
  connectionState = 'connected',
  sessionStatus = 'active',
  chatUnreadCount = 0,
  onOpenChat,
  children,
  overlaySlot,
}: ParticipantFullscreenShellProps) {
  const t = useTranslations('play.activeSessionShell');
  const tShared = useTranslations('play.shared');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Portal target for TopSlot (NowSummaryRow) — uses callback ref so
  // children get a re-render when the DOM node is ready.
  const [topSlotEl, setTopSlotEl] = useState<HTMLDivElement | null>(null);

  // Derived: never show confirm when shell is closed
  const showConfirm = open && confirmOpen;

  // ---------------------------------------------------------------------------
  // Scroll + escape lock
  // ---------------------------------------------------------------------------
  useBodyScrollLock(open);

  // Prevent Escape from exiting fullscreen (we handle it via confirm dialog)
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () =>
      window.removeEventListener('keydown', onKeyDown, { capture: true } as unknown as boolean);
  }, [open]);

  // ---------------------------------------------------------------------------
  // Fullscreen API (auto-enter on open, exit on close)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (open) {
      requestFullscreen().then(setIsFullscreen);
    }
    return () => {
      // Cleanup: exit fullscreen when open goes false or on unmount
      exitFullscreen();
    };
  }, [open]);

  // Track external fullscreen changes (e.g. user presses F11)
  useEffect(() => {
    const sync = () => setIsFullscreen(isFullscreenActive());
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreenActive()) {
      exitFullscreen();
      setIsFullscreen(false);
    } else {
      const ok = await requestFullscreen();
      setIsFullscreen(ok);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const topTitle = useMemo(() => title ?? t('defaultTitle'), [title, t]);

  if (!open) return null;

  const handleRequestClose = () => setConfirmOpen(true);

  // ---------------------------------------------------------------------------
  // Confirm dialog (participant-only variant)
  // ---------------------------------------------------------------------------
  const confirmDialog = showConfirm ? (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
      <Card variant="elevated" className="w-full max-w-md p-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {t('participant.confirmTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('participant.confirmDescription')}</p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('participant.no')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmOpen(false);
                exitFullscreen();
                onRequestClose();
              }}
            >
              {t('participant.yes')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  ) : null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[70] flex flex-col bg-background',
        'overscroll-contain overflow-hidden',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={topTitle}
    >
      {/* Desktop overlay backdrop */}
      <div className="hidden lg:block absolute inset-0 bg-black/40" aria-hidden="true" />

      {/* Container: fullscreen mobile; centred modal desktop (PlaySurface owns the single border) */}
      <PlaySurface className="lg:shadow-xl">
        {/* ---------------------------------------------------------------- */}
        {/* TOP AREA — SSoT shared PlayTopArea (header + portal slot)        */}
        {/* Mirrors Director: PlayHeader + NowSummaryRow + ChipLane inside   */}
        {/* the same PlayTopArea. Children use createPortal to inject here.  */}
        {/* ---------------------------------------------------------------- */}
        <PlayTopArea
          header={
            <PlayHeader
              title={topTitle}
              onBack={handleRequestClose}
              backLabel={tShared('header.backToLobby')}
              connectionState={connectionState}
              sessionStatus={sessionStatus}
              statusLabels={{
                live: tShared('status.active'),
                paused: tShared('status.paused'),
                degraded: tShared('connection.degraded'),
                offline: tShared('connection.offline'),
              }}
              isFullscreen={isFullscreen}
              showFullscreenButton
              onToggleFullscreen={toggleFullscreen}
            />
          }
        >
          {/* Portal target — NowSummaryRow is rendered here via createPortal
              from ParticipantPlayView, keeping data ownership where it lives. */}
          <div ref={setTopSlotEl} />
        </PlayTopArea>

        {/* ---------------------------------------------------------------- */}
        {/* STAGE — scrollable content area, "stage cannot shift" guardrail  */}
        {/* ---------------------------------------------------------------- */}
        <div
          ref={stageRef}
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
            <ParticipantTopSlotContext.Provider value={topSlotEl}>
              {children}
            </ParticipantTopSlotContext.Provider>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* BOTTOM ACTION BAR — chat + future actions (mirrors Director)     */}
        {/* ---------------------------------------------------------------- */}
        <div
          className="shrink-0 border-t bg-muted/30 px-4 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-center gap-2 max-w-xl mx-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenChat}
              disabled={!onOpenChat}
              className="h-9 gap-1.5 text-xs relative"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              {t('chatLabel')}
              {chatUnreadCount > 0 && (
                <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground">
                  {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </PlaySurface>
      {/* OVERLAY PORTAL — renders above stage, managed by OverlayStack      */}
      {/* ------------------------------------------------------------------ */}
      {overlaySlot}

      {/* Confirm dialog */}
      {confirmDialog}
    </div>
  );
}
