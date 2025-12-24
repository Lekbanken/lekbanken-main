'use client';

import { forwardRef, useState, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { Role, Participant } from '@/types/lobby';
import { Button } from '@/components/ui/button';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  EyeSlashIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid';

export interface RolesSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** Available roles */
  roles: Role[];
  /** Participants to assign roles to */
  participants: Participant[];
  /** Callback when role is edited */
  onEditRole?: (role: Role) => void;
  /** Callback when role is deleted */
  onDeleteRole?: (roleId: string) => void;
  /** Callback when new role is added */
  onAddRole?: () => void;
  /** Callback when participant is assigned to a role */
  onAssignRole?: (participantId: string, roleId: string | undefined) => void;
  /** Callback to randomize role assignments */
  onRandomizeRoles?: () => void;
  /** Whether editing is allowed */
  canEdit?: boolean;
}

/**
 * RolesSection - Role management and assignment for lobby
 * 
 * Shows roles with their assignments, secrets preview (for host),
 * and allows drag-drop style assignment
 */
export const RolesSection = forwardRef<HTMLDivElement, RolesSectionProps>(
  (
    {
      roles,
      participants,
      onEditRole,
      onDeleteRole,
      onAddRole,
      onAssignRole,
      onRandomizeRoles,
      canEdit = true,
      className,
      ...props
    },
    ref
  ) => {
    const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

    // Get participants assigned to a role
    const getAssignedParticipants = (roleId: string): Participant[] => {
      return participants.filter(p => p.roleId === roleId);
    };

    // Get unassigned participants
    const unassignedParticipants = participants.filter(p => !p.roleId);

    // Role accent colors using semantic design tokens (no hardcoded palette colors)
    const roleColors: Record<string, string> = {
      primary: 'bg-primary/10 border-primary/30 text-primary',
      accent: 'bg-accent/10 border-accent/30 text-accent',
      yellow: 'bg-yellow/10 border-yellow/30 text-yellow',
      success: 'bg-success/10 border-success/30 text-success',
      warning: 'bg-warning/10 border-warning/30 text-warning',
      destructive: 'bg-destructive/10 border-destructive/30 text-destructive',
      info: 'bg-info/10 border-info/30 text-info',
      muted: 'bg-muted/50 border-border text-foreground',
    };

    const getRoleColorClass = (color?: string) => {
      if (!color) return roleColors.muted;
      return roleColors[color] ?? roleColors.muted;
    };

    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-6', className)}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Roller</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {roles.length} roller • {unassignedParticipants.length} utan roll
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onRandomizeRoles && participants.length > 0 && roles.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRandomizeRoles}
                className="gap-1.5"
              >
                <SparklesIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Slumpa</span>
              </Button>
            )}
            {canEdit && onAddRole && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAddRole}
                className="gap-1.5"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Ny roll</span>
              </Button>
            )}
          </div>
        </div>

        {/* Roles List */}
        {roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <UserIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">Inga roller skapade</p>
            <p className="text-sm text-muted-foreground mt-1">
              Lägg till roller för att tilldela deltagare
            </p>
            {canEdit && onAddRole && (
              <Button
                variant="outline"
                onClick={onAddRole}
                className="mt-4 gap-1.5"
              >
                <PlusIcon className="h-4 w-4" />
                Skapa första rollen
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {roles.map((role) => {
              const assigned = getAssignedParticipants(role.id);
              const isExpanded = expandedRoleId === role.id;

              return (
                <div
                  key={role.id}
                  className={cn(
                    'rounded-xl border-2 p-4 transition-all',
                    getRoleColorClass(role.color)
                  )}
                >
                  {/* Role Header */}
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {role.icon && (
                          <span className="text-xl" aria-hidden="true">
                            {role.icon}
                          </span>
                        )}
                        <span className="font-semibold">
                          {role.name}
                          {role.isHost && (
                            <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                              Värd
                            </span>
                          )}
                        </span>
                      </div>
                      {role.description && (
                        <p className="text-sm opacity-70 mt-1">
                          {role.description}
                        </p>
                      )}
                    </button>

                    {/* Edit/Delete buttons */}
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        {onEditRole && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditRole(role)}
                            className="h-8 w-8 p-0"
                            aria-label="Redigera roll"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        )}
                        {onDeleteRole && !role.isHost && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteRole(role.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            aria-label="Ta bort roll"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Secrets indicator */}
                  {role.secrets && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs opacity-60">
                      <EyeSlashIcon className="h-3.5 w-3.5" />
                      <span>Hemlig information finns</span>
                    </div>
                  )}

                  {/* Assigned Participants */}
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wide opacity-60 mb-2">
                      Tilldelad till ({assigned.length})
                    </p>
                    {assigned.length === 0 ? (
                      <p className="text-sm opacity-50 italic">
                        Ingen tilldelad
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {assigned.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-1.5"
                          >
                            <span className="text-sm font-medium">
                              {participant.name}
                            </span>
                            {canEdit && onAssignRole && (
                              <button
                                type="button"
                                onClick={() => onAssignRole(participant.id, undefined)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label={`Ta bort ${participant.name} från roll`}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expanded: Role secrets (host only) */}
                  {isExpanded && role.secrets && (
                    <div className="mt-4 pt-4 border-t border-current/10">
                      <p className="text-xs uppercase tracking-wide opacity-60 mb-2 flex items-center gap-1.5">
                        <EyeSlashIcon className="h-3.5 w-3.5" />
                        Hemlig information
                      </p>
                      <p className="text-sm bg-background/30 rounded-lg p-3 italic">
                        {role.secrets}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Unassigned Participants */}
        {unassignedParticipants.length > 0 && roles.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground mb-3">
              Deltagare utan roll ({unassignedParticipants.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {unassignedParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-2 bg-background rounded-lg border border-border px-3 py-1.5"
                >
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{participant.name}</span>
                  {canEdit && onAssignRole && roles.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => onAssignRole(participant.id, e.target.value || undefined)}
                      className="text-xs bg-muted border border-border rounded px-1.5 py-0.5 ml-2"
                      aria-label={`Tilldela roll till ${participant.name}`}
                    >
                      <option value="">Tilldela...</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.icon ? `${role.icon} ` : ''}{role.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

RolesSection.displayName = 'RolesSection';
