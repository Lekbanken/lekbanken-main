'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { SessionStatusBadge, type SessionStatus } from './SessionStatusBadge';
import {
  UsersIcon,
  ClockIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

export type SessionListItemProps = {
  id: string;
  code: string;
  name: string;
  status: SessionStatus;
  participantCount: number;
  gameName?: string | null;
  gameImageUrl?: string | null;
  createdAt: string;
  startedAt?: string | null;
  href?: string;
  className?: string;
};

export function SessionListItem({
  id: _id,
  code,
  name,
  status,
  participantCount,
  gameName,
  gameImageUrl,
  createdAt,
  startedAt: _startedAt,
  href,
  className = '',
}: SessionListItemProps) {
  const t = useTranslations('play.sessionCard');
  const isActive = status === 'active';
  const isPaused = status === 'paused';
  const isLive = isActive || isPaused;
  const isDraft = status === 'draft';
  const isLobby = status === 'lobby';
  const isPreLive = isDraft || isLobby;

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays });

    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  };

  // Status indicator colors
  const getStatusDotColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-amber-500';
      case 'lobby':
        return 'bg-blue-500';
      case 'draft':
        return 'bg-gray-400';
      case 'locked':
        return 'bg-purple-500';
      case 'ended':
      case 'archived':
      case 'cancelled':
      default:
        return 'bg-gray-300';
    }
  };

  const content = (
    <div className={cn(
      'relative flex items-center gap-4 py-4 px-4 hover:bg-muted/50 transition-colors',
      className
    )}>
      {/* Game Image or Placeholder */}
      <div className="shrink-0">
        {gameImageUrl ? (
          <Image
            src={gameImageUrl}
            alt={gameName || name}
            width={48}
            height={48}
            className="h-12 w-12 rounded-lg object-cover bg-muted"
          />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-lg font-bold text-primary/60">
              {(gameName || name).charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {/* Live status dot */}
          <div className={cn(
            'h-2 w-2 rounded-full shrink-0',
            getStatusDotColor()
          )} />
          
          <h3 className="text-sm font-semibold text-foreground truncate">
            {name}
          </h3>
          
          {/* Session code for live/lobby sessions */}
          {(isLive || isPreLive) && (
            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {code}
            </span>
          )}
        </div>

        {/* Meta info */}
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {gameName && (
            <>
              <span className="truncate">{gameName}</span>
              <span className="text-muted-foreground/50">•</span>
            </>
          )}
          
          <span className="flex items-center gap-1">
            <UsersIcon className="h-3 w-3" />
            {participantCount}
          </span>
          
          <span className="text-muted-foreground/50">•</span>
          
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {formatRelativeTime(createdAt)}
          </span>
        </div>
      </div>

      {/* Right side: Status badge and chevron */}
      <div className="flex items-center gap-3 shrink-0">
        <SessionStatusBadge status={status} size="sm" showIcon={false} />
        <ChevronRightIcon className="h-5 w-5 text-muted-foreground/50" />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export function SessionListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4 px-4 animate-pulse">
      <div className="h-12 w-12 rounded-lg bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 bg-muted rounded" />
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
      <div className="h-6 w-16 bg-muted rounded-full" />
    </div>
  );
}
