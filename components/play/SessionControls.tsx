'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusIcon,
  ShareIcon,
} from '@heroicons/react/24/solid';
import type { Database } from '@/types/supabase';

type SessionStatus = Database['public']['Enums']['participant_session_status'];

type SessionControlsProps = {
  status: SessionStatus;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onEnd?: () => void;
  onLock?: () => void;
  onUnlock?: () => void;
  onReset?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onAddParticipant?: () => void;
  isLoading?: boolean;
  loadingAction?: string;
  variant?: 'full' | 'compact' | 'minimal';
  className?: string;
};

export function SessionControls({
  status,
  onStart: _onStart,
  onPause,
  onResume,
  onEnd,
  onLock,
  onUnlock,
  onReset,
  onDelete,
  onShare,
  onAddParticipant,
  isLoading = false,
  loadingAction,
  variant = 'full',
  className = '',
}: SessionControlsProps) {
  const isActive = status === 'active';
  const isPaused = status === 'paused';
  const isLocked = status === 'locked';
  const isEnded = status === 'ended';
  const isArchived = status === 'archived';
  const isLive = isActive || isPaused || isLocked;

  const getButtonProps = (action: string) => ({
    loading: isLoading && loadingAction === action,
    disabled: isLoading,
  });

  // Minimal variant - just the most important action
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {isActive && onPause && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPause}
            {...getButtonProps('pause')}
          >
            <PauseIcon className="h-4 w-4" />
            Pausa
          </Button>
        )}
        {isPaused && onResume && (
          <Button
            variant="primary"
            size="sm"
            onClick={onResume}
            {...getButtonProps('resume')}
          >
            <PlayIcon className="h-4 w-4" />
            Fortsätt
          </Button>
        )}
        {isLive && onEnd && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onEnd}
            {...getButtonProps('end')}
          >
            <StopIcon className="h-4 w-4" />
            Avsluta
          </Button>
        )}
        {(isEnded || isArchived) && onReset && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            {...getButtonProps('reset')}
          >
            <ArrowPathIcon className="h-4 w-4" />
            Återställ
          </Button>
        )}
      </div>
    );
  }

  // Compact variant - primary actions in a row
  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {/* Play/Pause */}
        {isActive && onPause && (
          <Button
            variant="outline"
            onClick={onPause}
            {...getButtonProps('pause')}
          >
            <PauseIcon className="h-4 w-4" />
            Pausa
          </Button>
        )}
        {isPaused && onResume && (
          <Button
            variant="primary"
            onClick={onResume}
            {...getButtonProps('resume')}
          >
            <PlayIcon className="h-4 w-4" />
            Fortsätt
          </Button>
        )}

        {/* Lock/Unlock */}
        {(isActive || isPaused) && onLock && (
          <Button
            variant="outline"
            onClick={onLock}
            {...getButtonProps('lock')}
          >
            <LockClosedIcon className="h-4 w-4" />
            Lås
          </Button>
        )}
        {isLocked && onUnlock && (
          <Button
            variant="outline"
            onClick={onUnlock}
            {...getButtonProps('unlock')}
          >
            <LockOpenIcon className="h-4 w-4" />
            Lås upp
          </Button>
        )}

        {/* End */}
        {isLive && onEnd && (
          <Button
            variant="destructive"
            onClick={onEnd}
            {...getButtonProps('end')}
          >
            <StopIcon className="h-4 w-4" />
            Avsluta
          </Button>
        )}

        {/* Ended state actions */}
        {(isEnded || isArchived) && (
          <>
            {onReset && (
              <Button
                variant="outline"
                onClick={onReset}
                {...getButtonProps('reset')}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Återställ
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                onClick={onDelete}
                {...getButtonProps('delete')}
              >
                <TrashIcon className="h-4 w-4" />
                Ta bort
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  // Full variant - all controls organized in groups
  return (
    <div className={cn('space-y-4', className)}>
      {/* Primary controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Play/Pause control */}
        {isActive && onPause && (
          <Button
            variant="outline"
            size="lg"
            onClick={onPause}
            {...getButtonProps('pause')}
          >
            <PauseIcon className="h-5 w-5" />
            Pausa session
          </Button>
        )}
        {isPaused && onResume && (
          <Button
            variant="primary"
            size="lg"
            onClick={onResume}
            {...getButtonProps('resume')}
          >
            <PlayIcon className="h-5 w-5" />
            Fortsätt session
          </Button>
        )}

        {/* Lock control */}
        {(isActive || isPaused) && onLock && (
          <Button
            variant="outline"
            size="lg"
            onClick={onLock}
            {...getButtonProps('lock')}
          >
            <LockClosedIcon className="h-5 w-5" />
            Lås session
          </Button>
        )}
        {isLocked && onUnlock && (
          <Button
            variant="primary"
            size="lg"
            onClick={onUnlock}
            {...getButtonProps('unlock')}
          >
            <LockOpenIcon className="h-5 w-5" />
            Lås upp session
          </Button>
        )}
      </div>

      {/* Secondary controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Share */}
        {isLive && onShare && (
          <Button
            variant="ghost"
            onClick={onShare}
            {...getButtonProps('share')}
          >
            <ShareIcon className="h-4 w-4" />
            Dela kod
          </Button>
        )}

        {/* Add participant */}
        {isLive && onAddParticipant && (
          <Button
            variant="ghost"
            onClick={onAddParticipant}
            {...getButtonProps('add')}
          >
            <PlusIcon className="h-4 w-4" />
            Lägg till deltagare
          </Button>
        )}

        {/* Separator */}
        {isLive && (onShare || onAddParticipant) && onEnd && (
          <div className="h-6 w-px bg-border" />
        )}

        {/* End session */}
        {isLive && onEnd && (
          <Button
            variant="destructive"
            onClick={onEnd}
            {...getButtonProps('end')}
          >
            <StopIcon className="h-4 w-4" />
            Avsluta session
          </Button>
        )}
      </div>

      {/* Ended state controls */}
      {(isEnded || isArchived) && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
          {onReset && (
            <Button
              variant="outline"
              onClick={onReset}
              {...getButtonProps('reset')}
            >
              <ArrowPathIcon className="h-4 w-4" />
              Återställ session
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              {...getButtonProps('delete')}
            >
              <TrashIcon className="h-4 w-4" />
              Ta bort permanent
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
