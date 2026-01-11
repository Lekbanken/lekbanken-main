'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { SessionStatusBadge } from './SessionStatusBadge';
import {
  ArrowLeftIcon,
  ClipboardIcon,
  CheckIcon,
  UsersIcon,
  ClockIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import type { Database } from '@/types/supabase';

type SessionStatus = Database['public']['Enums']['participant_session_status'];

type SessionHeaderProps = {
  name: string;
  code: string;
  status: SessionStatus;
  participantCount: number;
  maxParticipants?: number | null;
  gameName?: string | null;
  startedAt?: string | null;
  onBack?: () => void;
  onSettings?: () => void;
  backHref?: string;
  className?: string;
};

export function SessionHeader({
  name,
  code,
  status,
  participantCount,
  maxParticipants,
  gameName,
  startedAt,
  onBack,
  onSettings,
  backHref,
  className = '',
}: SessionHeaderProps) {
  const t = useTranslations('play.sessionHeader');
  const [copied, setCopied] = useState(false);
  const isLive = status === 'active' || status === 'paused';

  const formatDuration = (startDateString: string): string => {
    const start = new Date(startDateString);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) return t('duration.hoursMinutes', { hours, minutes: mins });
    return t('duration.minutes', { minutes: mins });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <header className={cn('border-b bg-background', className)}>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {/* Top row: Back + Title + Settings */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back button */}
            {backHref ? (
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('back')}
                className="p-2"
                href={backHref}
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            ) : onBack ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                aria-label={t('back')}
                className="p-2"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            ) : null}

            {/* Title */}
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate sm:text-xl">
                {name}
              </h1>
              {gameName && (
                <p className="text-sm text-muted-foreground truncate">{gameName}</p>
              )}
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <SessionStatusBadge status={status} showIcon />

            {onSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettings}
                aria-label={t('settings')}
                className="p-2"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Bottom row: Code + Stats */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          {/* Session code with copy */}
          {isLive && (
            <button
              onClick={handleCopyCode}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5',
                'bg-primary/10 text-primary font-mono font-bold tracking-wider',
                'transition-colors hover:bg-primary/20',
                'focus:outline-none focus:ring-2 focus:ring-primary/30'
              )}
              aria-label={copied ? t('codeCopied') : t('copySessionCode')}
            >
              {code}
              {copied ? (
                <CheckIcon className="h-4 w-4 text-green-600" />
              ) : (
                <ClipboardIcon className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Participant count */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <UsersIcon className="h-4 w-4" />
            <span>
              {participantCount}
              {maxParticipants && ` / ${maxParticipants}`}
              {' '}{t('participants')}
            </span>
          </div>

          {/* Duration */}
          {startedAt && isLive && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ClockIcon className="h-4 w-4" />
              <span>{t('ongoing')} {formatDuration(startedAt)}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
