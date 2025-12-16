'use client';

import type { Database } from '@/types/supabase';
import { cn } from '@/lib/utils';
import { ParticipantStatusBadge, ParticipantStatusDot } from './ParticipantStatusBadge';
import { Button } from '@/components/ui/button';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

type Participant = {
  id: string;
  display_name: string;
  status: Database['public']['Enums']['participant_status'];
  role: Database['public']['Enums']['participant_role'];
  last_seen_at?: string | null;
};

type ParticipantRowProps = {
  participant: Participant;
  isCurrentUser?: boolean;
  showActions?: boolean;
  showBadge?: boolean;
  compact?: boolean;
  onKick?: (participantId: string) => void;
  onBlock?: (participantId: string) => void;
  className?: string;
};

export function ParticipantRow({
  participant,
  isCurrentUser = false,
  showActions = false,
  showBadge = true,
  compact = false,
  onKick,
  onBlock,
  className = '',
}: ParticipantRowProps) {
  const handleKick = () => {
    onKick?.(participant.id);
  };

  const handleBlock = () => {
    onBlock?.(participant.id);
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg transition-colors',
        compact ? 'px-2 py-1.5' : 'px-3 py-2',
        isCurrentUser && 'bg-primary/5 ring-1 ring-primary/20',
        !isCurrentUser && 'hover:bg-muted/50',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <ParticipantStatusDot status={participant.status} />
        <span className={cn('font-medium text-foreground', compact && 'text-sm')}>
          {participant.display_name}
          {isCurrentUser && (
            <span className="ml-1 text-muted-foreground">(du)</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {showBadge && <ParticipantStatusBadge status={participant.status} />}

        {showActions && (onKick || onBlock) && (
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Deltagaråtgärder"
            >
              <EllipsisVerticalIcon className="h-4 w-4" />
            </Button>
            {/* Dropdown menu would go here */}
            <div className="absolute right-0 top-full z-10 hidden group-focus-within:block">
              <div className="mt-1 rounded-lg border border-border bg-card p-1 shadow-lg">
                {onKick && (
                  <button
                    onClick={handleKick}
                    className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    Sparka
                  </button>
                )}
                {onBlock && (
                  <button
                    onClick={handleBlock}
                    className="block w-full rounded px-3 py-1.5 text-left text-sm text-destructive hover:bg-muted"
                  >
                    Blockera
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
