/**
 * RoleAssigner Component
 * 
 * UI for facilitators to assign roles to participants.
 * Supports both manual assignment and random assignment.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  UserCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  UsersIcon,
  PlusIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  randomAssignRoles,
  getAvailableRolesForParticipant,
  getUnassignedParticipants,
  checkMinimumCounts,
  type Participant,
  type AssignmentResult,
} from '@/lib/utils/role-assignment';
import type { SessionRole, RoleAssignment } from '@/types/play-runtime';

// =============================================================================
// Types
// =============================================================================

export interface RoleAssignerProps {
  /** Session ID */
  sessionId: string;
  /** Available roles */
  roles: SessionRole[];
  /** Current participants */
  participants: Participant[];
  /** Current assignments */
  assignments: RoleAssignment[];
  /** Called when roles are assigned */
  onAssign: (assignments: Array<{ participantId: string; roleId: string }>) => Promise<void>;
  /** Called when an assignment is removed */
  onUnassign?: (participantId: string, roleId: string) => Promise<void>;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Show compact view */
  compact?: boolean;
}

// =============================================================================
// Helper Components
// =============================================================================

interface RoleColorClasses {
  bg: string;
  border: string;
  text: string;
}

function getRoleColorClasses(color: string | null): RoleColorClasses {
  const colorMap: Record<string, RoleColorClasses> = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
  };
  return colorMap[color || ''] || { bg: 'bg-muted/50', border: 'border-border', text: 'text-foreground' };
}

// =============================================================================
// Main Component
// =============================================================================

export function RoleAssigner({
  sessionId: _sessionId,
  roles,
  participants,
  assignments,
  onAssign,
  onUnassign,
  disabled = false,
  compact = false,
}: RoleAssignerProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [lastResult, setLastResult] = useState<AssignmentResult | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  
  // Build assignment maps
  const participantToRole = useMemo(() => {
    const map = new Map<string, SessionRole>();
    for (const assignment of assignments) {
      const role = roles.find((r) => r.id === assignment.session_role_id);
      if (role) {
        map.set(assignment.participant_id, role);
      }
    }
    return map;
  }, [assignments, roles]);
  
  const roleToParticipants = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const role of roles) {
      map.set(role.id, []);
    }
    for (const assignment of assignments) {
      const current = map.get(assignment.session_role_id) || [];
      current.push(assignment.participant_id);
      map.set(assignment.session_role_id, current);
    }
    return map;
  }, [assignments, roles]);
  
  // Get unassigned participants
  const unassigned = useMemo(() => 
    getUnassignedParticipants(participants, assignments),
    [participants, assignments]
  );
  
  // Check minimum requirements
  const minCheck = useMemo(() => {
    const rolesWithCounts = roles.map((r) => ({
      ...r,
      assigned_count: (roleToParticipants.get(r.id) || []).length,
    }));
    return checkMinimumCounts(rolesWithCounts);
  }, [roles, roleToParticipants]);
  
  // ==========================================================================
  // Handlers
  // ==========================================================================
  
  const handleRandomAssign = useCallback(async () => {
    setIsAssigning(true);
    setLastResult(null);
    
    try {
      // Build current assignments map
      const currentAssignments = new Map<string, string>();
      for (const assignment of assignments) {
        currentAssignments.set(assignment.participant_id, assignment.session_role_id);
      }
      
      // Update role counts for algorithm
      const rolesWithCounts = roles.map((r) => ({
        ...r,
        assigned_count: (roleToParticipants.get(r.id) || []).length,
      }));
      
      const result = randomAssignRoles({
        participants,
        roles: rolesWithCounts,
        currentAssignments,
        respectMinimums: true,
        skipAssigned: true,
      });
      
      setLastResult(result);
      
      if (result.assignments.length > 0) {
        await onAssign(result.assignments);
      }
    } catch (error) {
      console.error('[RoleAssigner] Random assignment failed:', error);
      setLastResult({
        success: false,
        assignments: [],
        errors: ['Ett fel uppstod vid slumpmässig tilldelning'],
        warnings: [],
      });
    } finally {
      setIsAssigning(false);
    }
  }, [assignments, participants, roles, roleToParticipants, onAssign]);
  
  const handleManualAssign = useCallback(async (participantId: string, roleId: string) => {
    setIsAssigning(true);
    try {
      await onAssign([{ participantId, roleId }]);
      setSelectedParticipant(null);
    } catch (error) {
      console.error('[RoleAssigner] Manual assignment failed:', error);
    } finally {
      setIsAssigning(false);
    }
  }, [onAssign]);
  
  const handleUnassign = useCallback(async (participantId: string, roleId: string) => {
    if (!onUnassign) return;
    setIsAssigning(true);
    try {
      await onUnassign(participantId, roleId);
    } catch (error) {
      console.error('[RoleAssigner] Unassign failed:', error);
    } finally {
      setIsAssigning(false);
    }
  }, [onUnassign]);
  
  // Get available roles for selected participant
  const availableRoles = useMemo(() => {
    if (!selectedParticipant) return [];
    return getAvailableRolesForParticipant(
      selectedParticipant,
      roles.map((r) => ({
        ...r,
        assigned_count: (roleToParticipants.get(r.id) || []).length,
      })),
      participantToRole
    );
  }, [selectedParticipant, roles, roleToParticipants, participantToRole]);

  // ==========================================================================
  // Render
  // ==========================================================================
  
  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">
              {assignments.length} av {participants.length} tilldelade
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleRandomAssign}
            disabled={disabled || isAssigning || unassigned.length === 0}
            className="gap-1.5"
          >
            <SparklesIcon className="h-4 w-4" />
            Slumpa roller
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with random assign button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Rolltilldelning
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {assignments.length} av {participants.length} deltagare har roller
          </p>
        </div>
        
        <Button
          onClick={handleRandomAssign}
          disabled={disabled || isAssigning || unassigned.length === 0}
          className="gap-2"
        >
          {isAssigning ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <SparklesIcon className="h-4 w-4" />
          )}
          Slumpa {unassigned.length > 0 ? `(${unassigned.length})` : 'roller'}
        </Button>
      </div>
      
      {/* Result message */}
      {lastResult && (
        <div className={`rounded-lg p-3 ${
          lastResult.errors.length > 0 
            ? 'bg-red-50 text-red-700' 
            : lastResult.warnings.length > 0 
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-green-50 text-green-700'
        }`}>
          <div className="flex items-start gap-2">
            {lastResult.errors.length > 0 ? (
              <XMarkIcon className="h-5 w-5 shrink-0" />
            ) : lastResult.warnings.length > 0 ? (
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            ) : (
              <CheckIcon className="h-5 w-5 shrink-0" />
            )}
            <div className="text-sm">
              {lastResult.assignments.length > 0 && (
                <p className="font-medium">
                  {lastResult.assignments.length} roller tilldelade
                </p>
              )}
              {lastResult.errors.map((err, i) => (
                <p key={`err-${i}`}>{err}</p>
              ))}
              {lastResult.warnings.map((warn, i) => (
                <p key={`warn-${i}`}>{warn}</p>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Minimum requirements warning */}
      {!minCheck.satisfied && (
        <div className="rounded-lg bg-yellow-50 p-3 text-yellow-700">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Minimikrav ej uppfyllt</p>
              {minCheck.unsatisfied.map(({ role, needed }) => (
                <p key={role.id}>
                  {role.name}: {needed} fler behövs
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Roles Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => {
          const assignedParticipantIds = roleToParticipants.get(role.id) || [];
          const assignedParticipants = assignedParticipantIds
            .map((id) => participants.find((p) => p.id === id))
            .filter((p): p is Participant => !!p);
          const isFull = role.max_count !== null && assignedParticipants.length >= role.max_count;
          const needsMore = assignedParticipants.length < role.min_count;
          const colors = getRoleColorClasses(role.color);
          
          return (
            <Card key={role.id} className={`overflow-hidden ${colors.border} border-2`}>
              {/* Role header */}
              <div className={`p-3 ${colors.bg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{role.icon || '👤'}</span>
                    <div>
                      <h4 className={`font-semibold ${colors.text}`}>{role.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {assignedParticipants.length}
                        {role.max_count !== null ? ` / ${role.max_count}` : ''} tilldelade
                        {role.min_count > 1 && ` (min ${role.min_count})`}
                      </p>
                    </div>
                  </div>
                  
                  {needsMore && (
                    <Badge variant="destructive" className="text-xs">
                      Behöver {role.min_count - assignedParticipants.length}
                    </Badge>
                  )}
                  {isFull && (
                    <Badge variant="default" className="text-xs bg-green-600">
                      Full
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Assigned participants */}
              <div className="p-3 space-y-2">
                {assignedParticipants.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Ingen tilldelad ännu
                  </p>
                ) : (
                  assignedParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <UserCircleIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{p.display_name}</span>
                      </div>
                      {onUnassign && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnassign(p.id, role.id)}
                          disabled={disabled || isAssigning}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Unassigned Participants */}
      {unassigned.length > 0 && (
        <Card className="p-4">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Deltagare utan roll ({unassigned.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedParticipant(
                  selectedParticipant === p.id ? null : p.id
                )}
                disabled={disabled || isAssigning}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  selectedParticipant === p.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <UserCircleIcon className="h-4 w-4" />
                {p.display_name}
                {selectedParticipant !== p.id && (
                  <PlusIcon className="h-3 w-3 opacity-50" />
                )}
              </button>
            ))}
          </div>
          
          {/* Role selection for selected participant */}
          {selectedParticipant && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="mb-3 text-sm font-medium">
                Välj roll för{' '}
                <span className="text-primary">
                  {participants.find((p) => p.id === selectedParticipant)?.display_name}
                </span>
              </p>
              {availableRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Inga roller tillgängliga (alla fulla eller konflikt)
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableRoles.map((role) => {
                    const colors = getRoleColorClasses(role.color);
                    return (
                      <button
                        key={role.id}
                        onClick={() => handleManualAssign(selectedParticipant, role.id)}
                        disabled={disabled || isAssigning}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:ring-2 hover:ring-primary/50 ${colors.bg} ${colors.border} ${colors.text} border`}
                      >
                        {role.icon && <span>{role.icon}</span>}
                        {role.name}
                      </button>
                    );
                  })}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedParticipant(null)}
                className="mt-3"
              >
                Avbryt
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
