'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { Participant, Role } from '@/types/lobby';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronLeftIcon,
  UserPlusIcon,
  ArrowPathRoundedSquareIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid';

// ============================================================================
// Types
// ============================================================================

export interface ParticipantsSectionProps {
  /** List of participants */
  participants: Participant[];
  /** Available roles */
  roles: Role[];
  /** Maximum allowed participants */
  maxParticipants?: number;
  /** Called when back is clicked */
  onBack?: () => void;
  /** Called when invite is clicked */
  onInvite?: () => void;
  /** Called when randomize roles is clicked */
  onRandomize?: () => void;
  /** Called when a participant is clicked */
  onParticipantClick?: (participant: Participant) => void;
  /** Called when assigning a role to a participant */
  onAssignRole?: (participantId: string, roleId: string) => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// ParticipantCard
// ============================================================================

interface ParticipantCardProps {
  participant: Participant;
  role?: Role;
  isHost?: boolean;
  onClick?: () => void;
}

function ParticipantCard({ participant, role, isHost, onClick }: ParticipantCardProps) {
  const hasRole = !!role;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg border bg-surface-primary',
        'transition-all hover:shadow-sm hover:border-primary/30',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        !hasRole && 'border-warning/50'
      )}
    >
      {/* Avatar */}
      <Avatar
        src={participant.avatarUrl}
        name={participant.name}
        size="md"
      />

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            {participant.name}
          </span>
          {!participant.isConnected && (
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-foreground-secondary" title="Offline" />
          )}
          {participant.isConnected && (
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-success" title="Online" />
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-0.5">
          {isHost && (
            <Badge variant="primary" size="sm">Host</Badge>
          )}
          {hasRole ? (
            <span className="text-sm text-foreground-secondary flex items-center gap-1">
              {role.icon && <span>{role.icon}</span>}
              {role.name}
            </span>
          ) : (
            <span className="text-sm text-warning flex items-center gap-1">
              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
              No role assigned
            </span>
          )}
        </div>
      </div>

      {/* Status icon */}
      <div className="flex-shrink-0">
        {hasRole ? (
          <CheckCircleIcon className="h-5 w-5 text-success" />
        ) : (
          <span className="text-sm text-primary font-medium">Assign →</span>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// ParticipantsSection Component
// ============================================================================

export const ParticipantsSection = forwardRef<HTMLDivElement, ParticipantsSectionProps>(
  (
    {
      participants,
      roles,
      maxParticipants = 20,
      onBack,
      onInvite,
      onRandomize,
      onParticipantClick,
      className,
    },
    ref
  ) => {
    // Count stats
    const totalParticipants = participants.length;
    const withRoles = participants.filter(p => p.roleId).length;
    const withoutRoles = totalParticipants - withRoles;
    const connected = participants.filter(p => p.isConnected).length;

    // Get role for participant
    const getRole = (participant: Participant): Role | undefined => {
      return roles.find(r => r.id === participant.roleId);
    };

    // Check if participant is host
    const isHost = (participant: Participant): boolean => {
      const role = getRole(participant);
      return role?.isHost ?? false;
    };

    return (
      <div ref={ref} className={cn('max-w-xl mx-auto', className)}>
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-6">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-surface-secondary transition-colors"
              aria-label="Go back"
            >
              <ChevronLeftIcon className="h-5 w-5 text-foreground" />
            </button>
          )}
          <h1 className="text-xl font-bold text-foreground flex-1">Participants</h1>
          <Badge variant="secondary" size="md">
            {totalParticipants}/{maxParticipants}
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-6 text-sm text-foreground-secondary">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            {connected} online
          </span>
          {withoutRoles > 0 && (
            <span className="flex items-center gap-1.5 text-warning">
              <ExclamationTriangleIcon className="h-4 w-4" />
              {withoutRoles} without roles
            </span>
          )}
          {withoutRoles === 0 && totalParticipants > 0 && (
            <span className="flex items-center gap-1.5 text-success">
              <CheckCircleIcon className="h-4 w-4" />
              All roles assigned
            </span>
          )}
        </div>

        {/* Participant list */}
        {participants.length > 0 ? (
          <div className="space-y-2 mb-6">
            {participants.map(participant => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                role={getRole(participant)}
                isHost={isHost(participant)}
                onClick={() => onParticipantClick?.(participant)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 mb-6">
            <div className="h-16 w-16 mx-auto rounded-full bg-surface-secondary flex items-center justify-center mb-4">
              <UserPlusIcon className="h-8 w-8 text-foreground-secondary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No participants yet</h3>
            <p className="text-foreground-secondary text-sm">
              Invite people to join your session
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          {onInvite && (
            <Button variant="primary" onClick={onInvite} className="flex-1">
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Invite More
            </Button>
          )}
          
          {onRandomize && roles.length > 0 && (
            <Button 
              variant="outline" 
              onClick={onRandomize}
              disabled={participants.length === 0}
            >
              <ArrowPathRoundedSquareIcon className="h-4 w-4 mr-2" />
              Randomize
            </Button>
          )}
        </div>
      </div>
    );
  }
);

ParticipantsSection.displayName = 'ParticipantsSection';

export default ParticipantsSection;
