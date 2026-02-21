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
import { Badge } from '@/components/ui/badge';
import {
  CheckIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowPathIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  WifiIcon,
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
  /** Connection quality — drives inline feedback instead of floating banner */
  connectionState?: 'connected' | 'degraded' | 'offline';
  /** Why is the connection degraded? */
  degradedReason?: 'auth' | 'not-found' | 'temporary' | null;
  /** Last successful sync timestamp */
  lastSyncedAt?: Date | null;
  /** Retry action (re-fetch /me for degraded, full loadData for offline) */
  onRetry?: () => void;
  /** Whether a retry request is currently in-flight (disables retry button) */
  retrying?: boolean;
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
  isReady,
  readyLoading,
  onToggleReady,
  onLeave,
  onOpenChat,
  chatUnreadCount = 0,
  enableChat = false,
  status,
  connectionState = 'connected',
  degradedReason = null,
  lastSyncedAt = null,
  onRetry,
  retrying = false,
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
      {/* 1. HEADER: "Lobby" left + status right                            */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between w-full mb-5">
        <h1 className="text-xl font-bold text-foreground">Lobby</h1>
        <Badge variant="secondary" size="sm" dot>
          {statusLabel}
        </Badge>
      </div>

      {/* ================================================================= */}
      {/* 2. GAME COVER IMAGE                                               */}
      {/* ================================================================= */}
      {gameCoverUrl && (
        <div className="w-full mb-4 rounded-xl overflow-hidden shadow-sm border border-border/50">
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
      {/* 3. GAME NAME (free, large, centered)                              */}
      {/* ================================================================= */}
      {gameName && (
        <h2 className="text-lg font-semibold text-foreground text-center w-full mb-5">
          {gameName}
        </h2>
      )}

      {/* ================================================================= */}
      {/* 4. CHAT + READY ROW                                               */}
      {/* ================================================================= */}
      <div className="flex items-center gap-3 w-full mb-5">
        {/* Chat button (left) */}
        {enableChat && onOpenChat && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onOpenChat}
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1.5" />
            {t('openChat')}
            {chatUnreadCount > 0 && (
              <Badge variant="destructive" size="sm" className="ml-1.5">
                {chatUnreadCount}
              </Badge>
            )}
          </Button>
        )}

        {/* Ready button (right) */}
        <Button
          size="sm"
          className={cn(
            'flex-1 text-sm font-bold shadow-sm transition-all',
            isReady
              ? 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground',
          )}
          onClick={onToggleReady}
          loading={readyLoading}
        >
          {isReady ? t('readyActive') : t('readyButton')}
        </Button>
      </div>

      {/* ================================================================= */}
      {/* 5. PARTICIPANTS (clean purple card)                               */}
      {/* ================================================================= */}
      <div className="w-full mb-5 rounded-xl bg-primary/10 dark:bg-primary/15 px-5 py-4">
        {/* Active participants only */}
        {participants.length > 0 && (
          <div className="flex flex-wrap gap-4 justify-center">
            {participants.map((p) => (
              <AvatarSlot
                key={p.id}
                participant={p}
                isMe={p.id === myParticipantId}
              />
            ))}
          </div>
        )}

        {/* Status text */}
        <p className="text-xs text-muted-foreground text-center mt-3">
          {readyCount === participants.length && participants.length > 0
            ? t('allReady')
            : t('waitingForOthers')}
        </p>

        {/* Inline connection feedback */}
        {connectionState === 'degraded' && (
          <div className="flex flex-col items-center gap-1.5 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <WifiIcon className="h-3.5 w-3.5" />
              <span>
                {degradedReason === 'auth'
                  ? t('degradedAuth')
                  : degradedReason === 'not-found'
                    ? t('degradedNotFound')
                    : t('degradedTemporary')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={retrying}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowPathIcon className={cn('h-3 w-3', retrying && 'animate-spin')} />
                  {degradedReason === 'auth'
                    ? t('retryReconnect')
                    : degradedReason === 'not-found'
                      ? t('retryGoBack')
                      : t('retryAction')}
                </button>
              )}
              {lastSyncedAt && (
                <span className="text-[10px] text-muted-foreground">
                  {t('lastSynced', {
                    time: lastSyncedAt.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    }),
                  })}
                </span>
              )}
            </div>
          </div>
        )}
        {connectionState === 'offline' && (
          <div className="flex flex-col items-center gap-1.5 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-destructive dark:text-red-400">
              <WifiIcon className="h-3.5 w-3.5 animate-pulse" />
              <span>{t('connectionOffline')}</span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className={cn('h-3 w-3', retrying && 'animate-spin')} />
                {t('retryAction')}
              </button>
            )}
          </div>
        )}

      </div>

      {/* ================================================================= */}
      {/* 6. FOOTER: Leave left + Session code right                        */}
      {/* ================================================================= */}
      <div className="mt-auto pt-4 flex items-center justify-between w-full">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={onLeave}
        >
          <ArrowRightStartOnRectangleIcon className="h-4 w-4 mr-1.5" />
          {t('leave')}
        </Button>

        <button
          type="button"
          onClick={handleCopyCode}
          className={cn(
            'font-mono text-sm font-semibold tracking-wider transition-colors',
            codeCopied
              ? 'text-green-500'
              : codeCopyFailed
                ? 'text-destructive'
                : 'text-muted-foreground hover:text-primary',
          )}
        >
          {codeCopied ? t('copied') : code}
        </button>
      </div>
    </div>
  );
}
