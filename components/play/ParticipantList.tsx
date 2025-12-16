'use client';

import { useState, useMemo } from 'react';
import type { Database } from '@/types/supabase';
import { cn } from '@/lib/utils';
import { ParticipantRow } from './ParticipantRow';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

type Participant = {
  id: string;
  display_name: string;
  status: Database['public']['Enums']['participant_status'];
  role: Database['public']['Enums']['participant_role'];
  last_seen_at?: string | null;
};

type ParticipantListProps = {
  participants: Participant[];
  currentUserId?: string;
  showActions?: boolean;
  collapsible?: boolean;
  maxVisible?: number;
  onKick?: (participantId: string) => void;
  onBlock?: (participantId: string) => void;
  className?: string;
};

export function ParticipantList({
  participants,
  currentUserId,
  showActions = false,
  collapsible = false,
  maxVisible = 10,
  onKick,
  onBlock,
  className = '',
}: ParticipantListProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  // Sort: current user first, then by status (active > idle > disconnected > kicked/blocked)
  const sortedParticipants = useMemo(() => {
    const statusOrder: Record<string, number> = {
      active: 0,
      idle: 1,
      disconnected: 2,
      kicked: 3,
      blocked: 4,
    };

    return [...participants].sort((a, b) => {
      // Current user always first
      if (currentUserId) {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
      }
      // Then by status
      return (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
    });
  }, [participants, currentUserId]);

  const visibleParticipants = isExpanded
    ? sortedParticipants
    : sortedParticipants.slice(0, maxVisible);

  const hiddenCount = sortedParticipants.length - maxVisible;
  const showExpandButton = collapsible && hiddenCount > 0;

  // Stats
  const stats = useMemo(() => {
    const active = participants.filter((p) => p.status === 'active').length;
    const idle = participants.filter((p) => p.status === 'idle').length;
    const disconnected = participants.filter((p) => p.status === 'disconnected').length;
    return { active, idle, disconnected };
  }, [participants]);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header with stats */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-foreground">
          Deltagare ({participants.length})
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success" />
            {stats.active}
          </span>
          {stats.idle > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-warning" />
              {stats.idle}
            </span>
          )}
          {stats.disconnected > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              {stats.disconnected}
            </span>
          )}
        </div>
      </div>

      {/* Participant rows */}
      <div className="divide-y divide-border/50 rounded-lg border border-border/60 bg-card">
        {visibleParticipants.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Inga deltagare ännu
          </p>
        ) : (
          visibleParticipants.map((participant) => (
            <ParticipantRow
              key={participant.id}
              participant={participant}
              isCurrentUser={participant.id === currentUserId}
              showActions={showActions}
              showBadge={false}
              compact
              onKick={onKick}
              onBlock={onBlock}
            />
          ))
        )}

        {/* Expand button */}
        {showExpandButton && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="h-4 w-4" />
                Visa färre
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-4 w-4" />
                +{hiddenCount} till
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
