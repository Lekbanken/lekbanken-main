/*
 * ActiveSessionShell
 *
 * A focused, distraction-free session overlay shared by host + participant.
 * - Mobile: fullscreen overlay (covers AppShell header + BottomNav)
 * - Desktop: modal overlay (explicit close only; no click-outside)
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export type ActiveSessionRole = 'host' | 'participant';

type HostExitAction = 'continue_active' | 'pause_session' | 'end_session';

export interface ActiveSessionShellProps {
  role: ActiveSessionRole;
  title?: string;
  open: boolean;
  onRequestClose: () => void;

  // Host-only: choose what happens to the session when leaving
  onHostExitAction?: (action: HostExitAction) => Promise<void> | void;

  // Optional chat affordance (PR3 wires real behavior)
  chatUnreadCount?: number;
  onOpenChat?: () => void;

  children: React.ReactNode;
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = (document.body.style as unknown as { overscrollBehavior?: string }).overscrollBehavior;
    document.body.style.overflow = 'hidden';
    (document.body.style as unknown as { overscrollBehavior?: string }).overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      (document.body.style as unknown as { overscrollBehavior?: string }).overscrollBehavior = prevOverscroll ?? '';
    };
  }, [locked]);
}

export function ActiveSessionShell({
  role,
  title,
  open,
  onRequestClose,
  onHostExitAction,
  chatUnreadCount = 0,
  onOpenChat,
  children,
}: ActiveSessionShellProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hostBusy, setHostBusy] = useState(false);

  useBodyScrollLock(open);

  // Close confirm if shell closes externally
  useEffect(() => {
    if (!open) setConfirmOpen(false);
  }, [open]);

  // Prevent accidental escape-key dismissal
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true } as unknown as boolean);
  }, [open]);

  const topTitle = useMemo(() => {
    if (title) return title;
    return role === 'host' ? 'Aktiv session' : 'Aktiv session';
  }, [role, title]);

  if (!open) return null;

  const requestClose = () => setConfirmOpen(true);

  const participantConfirm = (
    <Card variant="elevated" className="w-full max-w-md p-6">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Tillbaka till Lobbyn</h2>
        <p className="text-sm text-muted-foreground">Du är påväg att lämna sessionen. Stämmer det?</p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Nej
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setConfirmOpen(false);
              onRequestClose();
            }}
          >
            Ja
          </Button>
        </div>
      </div>
    </Card>
  );

  const hostConfirm = (
    <Card variant="elevated" className="w-full max-w-lg p-6">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Leave active session</h2>
        <p className="text-sm text-muted-foreground">You are about to leave the active session.</p>
        <div className="grid gap-2 pt-2">
          <Button
            variant="outline"
            disabled={hostBusy}
            onClick={() => {
              setConfirmOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            disabled={hostBusy}
            onClick={async () => {
              setHostBusy(true);
              try {
                await onHostExitAction?.('continue_active');
                setConfirmOpen(false);
                onRequestClose();
              } finally {
                setHostBusy(false);
              }
            }}
          >
            Session continues as ACTIVE
          </Button>
          <Button
            variant="outline"
            disabled={hostBusy}
            onClick={async () => {
              setHostBusy(true);
              try {
                await onHostExitAction?.('pause_session');
                setConfirmOpen(false);
                onRequestClose();
              } finally {
                setHostBusy(false);
              }
            }}
          >
            Session is PAUSED
          </Button>
          <Button
            variant="destructive"
            disabled={hostBusy}
            onClick={async () => {
              setHostBusy(true);
              try {
                await onHostExitAction?.('end_session');
                setConfirmOpen(false);
                onRequestClose();
              } finally {
                setHostBusy(false);
              }
            }}
          >
            Session is ENDED
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div
      className={cn(
        'fixed inset-0 z-[70] flex flex-col bg-background/95 backdrop-blur-sm',
        'overscroll-contain',
      )}
      role="dialog"
      aria-modal="true"
      aria-label={topTitle}
    >
      {/* Desktop overlay framing */}
      <div className="hidden lg:block absolute inset-0 bg-black/40" aria-hidden="true" />

      {/* Container: fullscreen on mobile; centered modal on desktop */}
      <div className="relative flex h-full w-full flex-col lg:mx-auto lg:my-8 lg:max-w-5xl">
        <div
          className={cn(
            'flex items-center justify-between border-b border-border bg-background/90 px-3 py-3 backdrop-blur',
            'lg:rounded-t-2xl lg:border lg:border-border',
          )}
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={requestClose}>
              <ArrowLeftIcon className="h-4 w-4" />
              Till Lobbyn
            </Button>
          </div>

          <div className="min-w-0 flex-1 px-3 text-center">
            <div className="truncate text-sm font-medium text-foreground">{topTitle}</div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onOpenChat} aria-label="Chat" disabled={!onOpenChat}>
              <span className="relative inline-flex items-center">
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                {chatUnreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {chatUnreadCount}
                  </span>
                )}
              </span>
            </Button>
          </div>
        </div>

        <div
          className={cn(
            'relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background',
            'lg:rounded-b-2xl lg:border lg:border-t-0 lg:border-border',
          )}
          style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
        >
          <div className="min-h-0 flex-1 overflow-auto px-3 py-4 sm:px-6">
            {children}
          </div>
        </div>
      </div>

      {/* Confirm overlay (blocks click-outside close) */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
          {role === 'host' ? hostConfirm : participantConfirm}
        </div>
      )}
    </div>
  );
}
