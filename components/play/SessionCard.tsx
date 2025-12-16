'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SessionStatusBadge } from './SessionStatusBadge';
import {
  UsersIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import type { Database } from '@/types/supabase';

type SessionStatus = Database['public']['Enums']['participant_session_status'];

type SessionCardProps = {
  id: string;
  code: string;
  name: string;
  status: SessionStatus;
  participantCount: number;
  maxParticipants?: number | null;
  gameName?: string | null;
  createdAt: string;
  startedAt?: string | null;
  href?: string;
  onQuickAction?: () => void;
  quickActionLabel?: string;
  showQuickAction?: boolean;
  compact?: boolean;
  className?: string;
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just nu';
  if (diffMins < 60) return `${diffMins} min sedan`;
  if (diffHours < 24) return `${diffHours} tim sedan`;
  if (diffDays < 7) return `${diffDays} dagar sedan`;

  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

function formatDuration(startDateString: string): string {
  const start = new Date(startDateString);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 0) return `${hours} tim ${mins} min`;
  return `${mins} min`;
}

export function SessionCard({
  id: _id,
  code,
  name,
  status,
  participantCount,
  maxParticipants,
  gameName,
  createdAt,
  startedAt,
  href,
  onQuickAction,
  quickActionLabel,
  showQuickAction = false,
  compact = false,
  className = '',
}: SessionCardProps) {
  const isActive = status === 'active';
  const isPaused = status === 'paused';
  const isLive = isActive || isPaused;

  const cardContent = (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className={cn(
            'font-semibold text-foreground truncate',
            compact ? 'text-sm' : 'text-base'
          )}>
            {name}
          </h3>
          {gameName && (
            <p className="text-sm text-muted-foreground truncate">{gameName}</p>
          )}
        </div>
        <SessionStatusBadge status={status} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Session Code */}
      {isLive && (
        <div className="mt-3">
          <Badge variant="secondary" size="lg" className="font-mono tracking-wider">
            {code}
          </Badge>
        </div>
      )}

      {/* Stats */}
      <div className={cn(
        'flex items-center gap-4 text-muted-foreground',
        compact ? 'mt-2 text-xs' : 'mt-4 text-sm'
      )}>
        {/* Participants */}
        <div className="flex items-center gap-1.5">
          <UsersIcon className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          <span>
            {participantCount}
            {maxParticipants && `/${maxParticipants}`}
          </span>
        </div>

        {/* Duration or Time */}
        <div className="flex items-center gap-1.5">
          <ClockIcon className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          <span>
            {startedAt && isLive
              ? formatDuration(startedAt)
              : formatRelativeTime(createdAt)}
          </span>
        </div>
      </div>

      {/* Quick Action */}
      {showQuickAction && onQuickAction && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickAction();
            }}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium',
              'text-primary hover:text-primary/80 transition-colors'
            )}
          >
            {isActive ? (
              <>
                <PauseIcon className="h-4 w-4" />
                {quickActionLabel || 'Pausa'}
              </>
            ) : isPaused ? (
              <>
                <PlayIcon className="h-4 w-4" />
                {quickActionLabel || 'Fortsätt'}
              </>
            ) : (
              <>
                <ArrowRightIcon className="h-4 w-4" />
                {quickActionLabel || 'Öppna'}
              </>
            )}
          </button>
        </div>
      )}
    </>
  );

  const cardClasses = cn(
    'transition-all duration-150',
    href && 'cursor-pointer hover:shadow-md hover:border-primary/30',
    isLive && 'ring-1 ring-primary/20',
    compact ? 'p-3' : 'p-4',
    className
  );

  if (href) {
    return (
      <Link href={href}>
        <Card variant="elevated" className={cardClasses}>
          {cardContent}
        </Card>
      </Link>
    );
  }

  return (
    <Card variant="elevated" className={cardClasses}>
      {cardContent}
    </Card>
  );
}

// Quick loading skeleton
export function SessionCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card variant="elevated" className={cn(compact ? 'p-3' : 'p-4')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className={cn('bg-muted rounded animate-pulse', compact ? 'h-4 w-32' : 'h-5 w-40')} />
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
      </div>
      <div className={cn('flex gap-4', compact ? 'mt-2' : 'mt-4')}>
        <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
      </div>
    </Card>
  );
}
