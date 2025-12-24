'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { LobbyState, SectionReadiness } from '@/types/lobby';
import { calculateOverallReadiness, countParticipantsWithoutRoles, countContentIssues } from '@/types/lobby';
import { ReadinessBadge } from './ReadinessBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  UsersIcon,
  SparklesIcon,
  DocumentTextIcon,
  BoltIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
  PlayIcon,
} from '@heroicons/react/24/solid';

// ============================================================================
// Types
// ============================================================================

export interface LobbySectionCardProps {
  /** Section icon */
  icon: React.ReactNode;
  /** Section title */
  title: string;
  /** Section description */
  description: string;
  /** Badge content (e.g., count) */
  badge?: React.ReactNode;
  /** Readiness status for this section */
  readiness?: SectionReadiness;
  /** Called when section is clicked */
  onClick?: () => void;
  /** Whether this section is disabled */
  disabled?: boolean;
}

export interface LobbyHubProps {
  /** Current lobby state */
  state: LobbyState;
  /** Called when Participants section is clicked */
  onParticipantsClick?: () => void;
  /** Called when Roles section is clicked */
  onRolesClick?: () => void;
  /** Called when Content section is clicked */
  onContentClick?: () => void;
  /** Called when Triggers section is clicked */
  onTriggersClick?: () => void;
  /** Called when Settings section is clicked */
  onSettingsClick?: () => void;
  /** Called when Start Session is clicked */
  onStartSession?: () => void;
  /** Whether the start button is loading */
  isStarting?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// LobbySectionCard Component
// ============================================================================

export const LobbySectionCard = forwardRef<HTMLButtonElement, LobbySectionCardProps>(
  (
    {
      icon,
      title,
      description,
      badge,
      readiness,
      onClick,
      disabled = false,
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'w-full text-left p-4 rounded-xl border bg-surface-primary',
          'transition-all duration-200',
          'hover:shadow-md hover:border-primary/30 hover:bg-surface-secondary',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          'active:scale-[0.99]',
          disabled && 'opacity-50 cursor-not-allowed hover:shadow-none hover:bg-surface-primary'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Left side: Icon, title, description */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">{title}</h3>
                {badge}
              </div>
              <p className="text-sm text-foreground-secondary line-clamp-2 mt-0.5">
                {description}
              </p>
            </div>
          </div>

          {/* Right side: Readiness + Arrow */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {readiness && (
              <ReadinessBadge level={readiness.level} size="sm" />
            )}
            <ChevronRightIcon className="h-5 w-5 text-foreground-secondary" />
          </div>
        </div>

        {/* Readiness warning message */}
        {readiness && readiness.level !== 'ready' && readiness.checks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className={cn(
              'text-sm',
              readiness.level === 'error' && 'text-error',
              readiness.level === 'warning' && 'text-warning'
            )}>
              {readiness.checks.find(c => c.status !== 'ready')?.message}
            </p>
          </div>
        )}
      </button>
    );
  }
);

LobbySectionCard.displayName = 'LobbySectionCard';

// ============================================================================
// LobbyHub Component
// ============================================================================

export const LobbyHub = forwardRef<HTMLDivElement, LobbyHubProps>(
  (
    {
      state,
      onParticipantsClick,
      onRolesClick,
      onContentClick,
      onTriggersClick,
      onSettingsClick,
      onStartSession,
      isStarting = false,
      className,
    },
    ref
  ) => {
    // Calculate readiness info
    const participantsWithoutRoles = countParticipantsWithoutRoles(state.participants);
    const contentIssues = countContentIssues(state.phases);
    const overallReadiness = calculateOverallReadiness(state.readiness);

    // Get section readiness
    const getReadiness = (section: string): SectionReadiness | undefined => {
      return state.readiness.find(r => r.section === section);
    };

    const canStart = overallReadiness !== 'error' && state.participants.length > 0;

    return (
      <div ref={ref} className={cn('max-w-xl mx-auto space-y-6', className)}>
        {/* Header */}
        <div className="text-center pb-4 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">
            {state.sessionName}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="secondary" size="sm">
              {state.sessionStatus === 'lobby' ? 'Lobby' : state.sessionStatus}
            </Badge>
            <ReadinessBadge 
              level={overallReadiness} 
              variant="badge" 
              showLabel 
              size="sm"
            />
          </div>
        </div>

        {/* Section Cards */}
        <div className="space-y-3">
          {/* Participants */}
          <LobbySectionCard
            icon={<UsersIcon className="h-5 w-5" />}
            title="Participants"
            description="View, invite, and manage participants"
            badge={
              <Badge variant="secondary" size="sm">
                {state.participants.length}/{state.settings.maxParticipants}
              </Badge>
            }
            readiness={getReadiness('participants')}
            onClick={onParticipantsClick}
          />

          {/* Roles & Secrets */}
          <LobbySectionCard
            icon={<SparklesIcon className="h-5 w-5" />}
            title="Roles &amp; Secrets"
            description="Assign characters and hidden information"
            badge={
              participantsWithoutRoles > 0 ? (
                <Badge variant="warning" size="sm">
                  {participantsWithoutRoles} unassigned
                </Badge>
              ) : state.roles.length > 0 ? (
                <Badge variant="success" size="sm">
                  All assigned
                </Badge>
              ) : undefined
            }
            readiness={getReadiness('roles')}
            onClick={onRolesClick}
          />

          {/* Content Preview */}
          <LobbySectionCard
            icon={<DocumentTextIcon className="h-5 w-5" />}
            title="Content Preview"
            description="Steps, phases, and artifacts"
            badge={
              contentIssues > 0 ? (
                <Badge variant="warning" size="sm">
                  {contentIssues} issues
                </Badge>
              ) : (
                <Badge variant="success" size="sm">
                  Ready
                </Badge>
              )
            }
            readiness={getReadiness('content')}
            onClick={onContentClick}
          />

          {/* Triggers & Automation */}
          <LobbySectionCard
            icon={<BoltIcon className="h-5 w-5" />}
            title="Triggers &amp; Automation"
            description="Configure game automation rules"
            badge={
              <Badge variant="secondary" size="sm">
                {state.triggerCount} triggers
              </Badge>
            }
            readiness={getReadiness('triggers')}
            onClick={onTriggersClick}
          />

          {/* Session Settings */}
          <LobbySectionCard
            icon={<Cog6ToothIcon className="h-5 w-5" />}
            title="Session Settings"
            description="Timing, permissions, and advanced options"
            readiness={getReadiness('settings')}
            onClick={onSettingsClick}
          />
        </div>

        {/* Start Session Button */}
        <div className="pt-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onStartSession}
            disabled={!canStart || isStarting}
            className="w-full h-14 text-lg"
          >
            {isStarting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting...
              </>
            ) : (
              <>
                <PlayIcon className="h-6 w-6 mr-2" />
                Start Session
              </>
            )}
          </Button>

          {!canStart && (
            <p className="text-center text-sm text-error mt-2">
              {state.participants.length === 0 
                ? 'Add at least one participant to start'
                : 'Resolve errors before starting'
              }
            </p>
          )}
        </div>
      </div>
    );
  }
);

LobbyHub.displayName = 'LobbyHub';

export default LobbyHub;
