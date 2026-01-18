'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Database } from '@/types/supabase';
import { cn } from '@/lib/utils';
import { ParticipantStatusBadge, ParticipantStatusDot } from './ParticipantStatusBadge';
import { Button } from '@/components/ui/button';
import { 
  EllipsisVerticalIcon,
  HandRaisedIcon,
  TrophyIcon,
  XMarkIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';

type Participant = {
  id: string;
  displayName: string;
  status: Database['public']['Enums']['participant_status'];
  role: Database['public']['Enums']['participant_role'];
  lastSeenAt?: string | null;
  position?: number | null;
  isNextStarter?: boolean;
};

type ParticipantRowProps = {
  participant: Participant;
  isCurrentUser?: boolean;
  showActions?: boolean;
  showBadge?: boolean;
  compact?: boolean;
  isSessionEnded?: boolean;
  participantCount?: number;
  onKick?: (participantId: string) => void;
  onBlock?: (participantId: string) => void;
  onApprove?: (participantId: string) => void;
  onSetNextStarter?: (participantId: string) => void;
  onSetPosition?: (participantId: string, position: number) => void;
  className?: string;
};

export function ParticipantRow({
  participant,
  isCurrentUser = false,
  showActions = false,
  showBadge = true,
  compact = false,
  isSessionEnded = false,
  participantCount = 0,
  onKick,
  onBlock,
  onApprove,
  onSetNextStarter,
  onSetPosition,
  className = '',
}: ParticipantRowProps) {
  const t = useTranslations('play.participantRow');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleKick = () => {
    onKick?.(participant.id);
    setIsMenuOpen(false);
  };

  const handleBlock = () => {
    onBlock?.(participant.id);
    setIsMenuOpen(false);
  };

  const handleApprove = () => {
    onApprove?.(participant.id);
    setIsMenuOpen(false);
  };

  const handleSetNextStarter = () => {
    onSetNextStarter?.(participant.id);
    setIsMenuOpen(false);
  };

  const handleSetPosition = (position: number) => {
    onSetPosition?.(participant.id, position);
    setIsMenuOpen(false);
  };

  // Generate position labels based on participant count
  const getPositionLabel = (pos: number) => {
    if (pos === 1) return `🥇 ${t('winner')}`;
    if (pos === 2) return `🥈 ${t('secondPlace')}`;
    if (pos === 3) return `🥉 ${t('thirdPlace')}`;
    return t('nthPlace', { position: pos });
  };

  const hasAnyAction = onKick || onBlock || onApprove || onSetNextStarter || (isSessionEnded && onSetPosition);

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg transition-colors',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
        isCurrentUser && 'bg-primary/5 ring-1 ring-primary/20',
        participant.isNextStarter && 'bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-300 dark:ring-amber-700',
        !isCurrentUser && !participant.isNextStarter && 'hover:bg-muted/50',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <ParticipantStatusDot status={participant.status} />
        <div className="flex flex-col">
          <span className={cn('font-medium text-foreground', compact && 'text-sm')}>
            {participant.displayName}
            {isCurrentUser && (
              <span className="ml-1 text-muted-foreground">({t('you')})</span>
            )}
          </span>
          {participant.isNextStarter && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {t('startsNext')}
            </span>
          )}
          {participant.position && (
            <span className="text-xs text-muted-foreground">
              {getPositionLabel(participant.position)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Position badge when session ended */}
        {isSessionEnded && participant.position && (
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            participant.position === 1 && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
            participant.position === 2 && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
            participant.position === 3 && 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
            participant.position > 3 && 'bg-muted text-muted-foreground'
          )}>
            {participant.position === 1 ? '🥇' : participant.position === 2 ? '🥈' : participant.position === 3 ? '🥉' : `#${participant.position}`}
          </span>
        )}

        {/* Next starter indicator */}
        {participant.isNextStarter && !isSessionEnded && (
          <HandRaisedIcon className="h-4 w-4 text-amber-500" />
        )}

        {showBadge && !compact && <ParticipantStatusBadge status={participant.status} />}

        {showActions && hasAnyAction && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label={t('participantActions')}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <EllipsisVerticalIcon className="h-4 w-4" />
            </Button>

            {isMenuOpen && (
              <>
                {/* Backdrop to close menu */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsMenuOpen(false)}
                />
                
                {/* Dropdown menu */}
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-border bg-card p-1 shadow-lg">
                  {participant.status === 'idle' && onApprove && (
                    <button
                      onClick={handleApprove}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <HandRaisedIcon className="h-4 w-4 text-amber-500" />
                        {t('approve')}
                    </button>
                  )}

                  {/* Set as next starter - only for active sessions */}
                  {!isSessionEnded && onSetNextStarter && (
                    <button
                      onClick={handleSetNextStarter}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <HandRaisedIcon className="h-4 w-4 text-amber-500" />
                      {t('startsNext')}
                    </button>
                  )}

                  {/* Position options - only for ended sessions */}
                  {isSessionEnded && onSetPosition && participantCount > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        {t('setPosition')}
                      </div>
                      {Array.from({ length: Math.min(participantCount, 10) }, (_, i) => i + 1).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => handleSetPosition(pos)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm hover:bg-muted',
                            participant.position === pos && 'bg-primary/10 text-primary'
                          )}
                        >
                          {pos <= 3 && <TrophyIcon className="h-4 w-4" />}
                          {getPositionLabel(pos)}
                        </button>
                      ))}
                      <div className="my-1 border-t border-border" />
                    </>
                  )}

                  {/* Kick - only for active sessions */}
                  {!isSessionEnded && onKick && (
                    <button
                      onClick={handleKick}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      {t('remove')}
                    </button>
                  )}

                  {/* Block */}
                  {onBlock && (
                    <button
                      onClick={handleBlock}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                    >
                      <NoSymbolIcon className="h-4 w-4" />
                      {t('block')}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
