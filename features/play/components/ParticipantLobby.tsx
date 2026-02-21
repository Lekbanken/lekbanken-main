/**
 * ParticipantLobby — Waiting room UI for participants
 *
 * Design principles:
 *   - Minimalist and calm "pre-game" feel
 *   - Large touch targets (mobile-first)
 *   - Self-explanatory avatar grid for readiness
 *   - Session code with copy-to-clipboard
 *   - Chat behind feature flag
 *   - No heavy side-effects — polling is handled by parent
 *
 * Avatar states:
 *   1. Empty placeholder (grey dashed border) — slot not yet filled
 *   2. Connected (colored avatar, person icon) — joined but not ready
 *   3. Ready (green ring + check) — tapped "Redo"
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowRightStartOnRectangleIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import type { LobbyParticipant } from '@/features/play-participant/api';

// =============================================================================
// Types
// =============================================================================

export interface ParticipantLobbyProps {
  /** Session code (e.g. "ABC123") */
  code: string;
  /** Session display name */
  sessionName: string;
  /** Game name (if linked) */
  gameName?: string | null;
  /** Game cover image URL */
  gameCoverUrl?: string | null;
  /** Current participant's ID */
  myParticipantId: string | null;
  /** Current participant's display name */
  myDisplayName: string | null;
  /** All lobby participants (from polling) */
  participants: LobbyParticipant[];
  /** Max participant count (from session settings) */
  maxParticipants?: number | null;
  /** Is the current user ready? */
  isReady: boolean;
  /** Loading state for the ready toggle */
  readyLoading: boolean;
  /** Toggle readiness */
  onToggleReady: () => void;
  /** Leave the lobby */
  onLeave: () => void;
  /** Open chat (only called if enableChat is true) */
  onOpenChat?: () => void;
  /** Unread chat messages */
  chatUnreadCount?: number;
  /** Enable chat in lobby */
  enableChat?: boolean;
  /** Session status */
  status: string;
}

// =============================================================================
// Avatar item
// =============================================================================

function AvatarSlot({
  participant,
  isMe,
}: {
  participant?: LobbyParticipant;
  isMe: boolean;
}) {
  if (!participant) {
    // Empty placeholder slot
    return (
      <div
        className={cn(
          'relative flex items-center justify-center',
          'h-14 w-14 rounded-full',
          'border-2 border-dashed border-muted-foreground/20',
          'bg-muted/30',
        )}
      >
        <UserIcon className="h-6 w-6 text-muted-foreground/30" />
      </div>
    );
  }

  const { displayName, isReady } = participant;
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative flex flex-col items-center gap-1">
      {/* Avatar circle */}
      <div
        className={cn(
          'relative flex items-center justify-center',
          'h-14 w-14 rounded-full text-sm font-bold',
          'transition-all duration-300',
          isReady
            ? 'bg-green-100 text-green-700 ring-2 ring-green-500 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-400'
            : 'bg-primary/10 text-primary ring-2 ring-primary/30 dark:bg-primary/20',
          isMe && 'ring-offset-2 ring-offset-background',
        )}
      >
        {initials || <UserIcon className="h-5 w-5" />}

        {/* Ready check badge */}
        {isReady && (
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5',
              'flex items-center justify-center',
              'h-5 w-5 rounded-full',
              'bg-green-500 text-white',
              'ring-2 ring-background',
            )}
          >
            <CheckIcon className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Name */}
      <span
        className={cn(
          'text-[11px] max-w-[64px] truncate text-center leading-tight',
          isMe ? 'font-semibold text-foreground' : 'text-muted-foreground',
        )}
      >
        {isMe ? displayName + ' ★' : displayName}
      </span>
    </div>
  );
}

// =============================================================================
// Main Lobby Component
// =============================================================================

export function ParticipantLobby({
  code,
  sessionName,
  gameName,
  gameCoverUrl,
  myParticipantId,
  myDisplayName: _myDisplayName,
  participants,
  maxParticipants,
  isReady,
  readyLoading,
  onToggleReady,
  onLeave,
  onOpenChat,
  chatUnreadCount = 0,
  enableChat = false,
  status,
}: ParticipantLobbyProps) {
  const t = useTranslations('play.participantView.waitingRoom');
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeCopyFailed, setCodeCopyFailed] = useState(false);

  // Copy session code to clipboard
  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setCodeCopyFailed(false);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback for browsers that deny clipboard
      setCodeCopyFailed(true);
      setTimeout(() => setCodeCopyFailed(false), 2000);
    }
  }, [code]);

  // Build avatar grid — fill remaining slots up to maxParticipants or at least participants.length + 3
  const totalSlots = maxParticipants
    ? Math.max(maxParticipants, participants.length)
    : Math.max(participants.length + 3, 6);
  const readyCount = participants.filter((p) => p.isReady).length;

  const statusLabel =
    status === 'lobby'
      ? t('statusWaiting')
      : status === 'active'
        ? t('statusActive')
        : status === 'paused'
          ? t('statusPaused')
          : t('statusWaiting');

  return (
    <div className="min-h-[80vh] flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full">
      {/* ================================================================= */}
      {/* HEADER                                                            */}
      {/* ================================================================= */}
      <div className="text-center mb-6 w-full">
        <Badge
          variant="secondary"
          size="sm"
          className="mb-3"
          dot
        >
          {statusLabel}
        </Badge>
        <h1 className="text-2xl font-bold text-foreground">
          {t('title')}
        </h1>
        {gameName && (
          <p className="text-sm text-muted-foreground mt-1">{gameName}</p>
        )}
      </div>

      {/* ================================================================= */}
      {/* GAME COVER IMAGE                                                  */}
      {/* ================================================================= */}
      {gameCoverUrl && (
        <div className="w-full mb-6 rounded-xl overflow-hidden shadow-sm border border-border/50">
          <div className="relative aspect-[16/9] bg-muted">
            <Image
              src={gameCoverUrl}
              alt={gameName ?? sessionName}
              fill
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
              priority
            />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SESSION CODE                                                      */}
      {/* ================================================================= */}
      <Card
        className={cn(
          'w-full mb-6 cursor-pointer transition-colors',
          'hover:bg-muted/50 active:bg-muted/70',
        )}
        onClick={handleCopyCode}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('sessionCode')}
            </p>
            <p className="font-mono text-2xl font-bold text-primary tracking-[0.25em] mt-0.5">
              {code}
            </p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {codeCopied ? (
              <CheckIcon className="h-5 w-5 text-green-500" />
            ) : (
              <ClipboardDocumentIcon className="h-5 w-5" />
            )}
            <span className={cn('text-xs', codeCopyFailed && 'text-destructive')}>
              {codeCopied
                ? t('copied')
                : codeCopyFailed
                  ? t('codeCopyFailed')
                  : t('tapToCopy')}
            </span>
          </div>
        </div>
      </Card>

      {/* ================================================================= */}
      {/* PARTICIPANTS GRID                                                 */}
      {/* ================================================================= */}
      <Card className="w-full mb-6">
        <div className="px-5 py-4">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              {t('participantsTitle')}
            </h2>
            <span className="text-xs text-muted-foreground">
              {t('readyCount', { ready: readyCount, total: participants.length })}
            </span>
          </div>

          {/* Avatar grid */}
          <div className="flex flex-wrap gap-4 justify-center">
            {Array.from({ length: totalSlots }).map((_, i) => {
              const p = participants[i];
              return (
                <AvatarSlot
                  key={p?.id ?? `empty-${i}`}
                  participant={p}
                  isMe={p?.id === myParticipantId}
                />
              );
            })}
          </div>

          {/* Ready progress bar */}
          {participants.length > 0 && (
            <div className="mt-5">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(readyCount / participants.length) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1.5">
                {readyCount === participants.length && participants.length > 0
                  ? t('allReady')
                  : t('waitingForOthers')}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* ================================================================= */}
      {/* READY BUTTON                                                      */}
      {/* ================================================================= */}
      <Button
        size="lg"
        className={cn(
          'w-full text-lg font-bold py-6 shadow-sm transition-all',
          isReady
            ? 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white'
            : 'bg-primary hover:bg-primary/90 text-primary-foreground',
        )}
        onClick={onToggleReady}
        loading={readyLoading}
      >
        {isReady ? (
          <>
            <CheckIcon className="h-6 w-6 mr-2" />
            {t('readyActive')}
          </>
        ) : (
          t('readyButton')
        )}
      </Button>

      {/* ================================================================= */}
      {/* CHAT BUTTON (feature-flagged)                                     */}
      {/* ================================================================= */}
      {enableChat && onOpenChat && (
        <Button
          variant="outline"
          size="lg"
          className="w-full mt-3"
          onClick={onOpenChat}
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
          {t('openChat')}
          {chatUnreadCount > 0 && (
            <Badge variant="destructive" size="sm" className="ml-2">
              {chatUnreadCount}
            </Badge>
          )}
        </Button>
      )}

      {/* ================================================================= */}
      {/* LEAVE BUTTON                                                      */}
      {/* ================================================================= */}
      <div className="mt-6">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={onLeave}
        >
          <ArrowRightStartOnRectangleIcon className="h-4 w-4 mr-1.5" />
          {t('leave')}
        </Button>
      </div>
    </div>
  );
}
