/**
 * Role State Helpers — Shared role-assignment status utilities
 *
 * Pure functions for deriving role state from data.
 * Used by both Director (assignment cockpit) and Participant (role card) views.
 *
 * These are *presentation helpers* — no side effects, no API calls.
 * All behaviour (assign/reveal/acknowledge) stays in the control/experience layers.
 */

import type { RoleAssignment, SessionRole } from '@/types/play-runtime';

// =============================================================================
// Single-assignment queries
// =============================================================================

/** Is a specific participant assigned any role? */
export function isRoleAssigned(
  participantId: string,
  assignments: RoleAssignment[],
): boolean {
  return assignments.some((a) => a.participant_id === participantId);
}

/** Is a specific participant's role revealed (visible to them)? */
export function isRoleRevealed(
  participantId: string,
  assignments: RoleAssignment[],
): boolean {
  const assignment = assignments.find((a) => a.participant_id === participantId);
  return assignment?.revealed_at != null;
}

/** Get the assignment for a specific participant (or undefined). */
export function getAssignment(
  participantId: string,
  assignments: RoleAssignment[],
): RoleAssignment | undefined {
  return assignments.find((a) => a.participant_id === participantId);
}

/** Get the role for a specific participant (or undefined). */
export function getParticipantRole(
  participantId: string,
  assignments: RoleAssignment[],
  roles: SessionRole[],
): SessionRole | undefined {
  const assignment = getAssignment(participantId, assignments);
  if (!assignment) return undefined;
  return roles.find((r) => r.id === assignment.session_role_id);
}

// =============================================================================
// Aggregate status
// =============================================================================

export interface RoleAssignmentStatus {
  /** Total participants expected */
  totalParticipants: number;
  /** Number of participants with a role assigned */
  assignedCount: number;
  /** Number of participants whose role has been revealed */
  revealedCount: number;
  /** True when every participant has a role */
  allAssigned: boolean;
  /** True when every assigned role has been revealed */
  allRevealed: boolean;
}

/**
 * Compute aggregate role assignment status for the whole session.
 *
 * @param participantIds — array of all active participant IDs
 * @param assignments — current role assignments
 */
export function getRoleAssignmentStatus(
  participantIds: string[],
  assignments: RoleAssignment[],
): RoleAssignmentStatus {
  const total = participantIds.length;
  const assignedSet = new Set(assignments.map((a) => a.participant_id));
  const assignedCount = participantIds.filter((id) => assignedSet.has(id)).length;
  const revealedCount = assignments.filter(
    (a) => a.revealed_at != null && participantIds.includes(a.participant_id),
  ).length;

  return {
    totalParticipants: total,
    assignedCount,
    revealedCount,
    allAssigned: total > 0 && assignedCount >= total,
    allRevealed: assignedCount > 0 && revealedCount >= assignedCount,
  };
}

// =============================================================================
// Per-role counts
// =============================================================================

export interface RoleCount {
  roleId: string;
  roleName: string;
  assigned: number;
  min: number;
  max: number | null;
  isMet: boolean;
}

/**
 * Get per-role assignment counts with min/max status.
 */
export function getRoleCounts(
  roles: SessionRole[],
  assignments: RoleAssignment[],
): RoleCount[] {
  return roles.map((role) => {
    const assigned = assignments.filter((a) => a.session_role_id === role.id).length;
    return {
      roleId: role.id,
      roleName: role.name,
      assigned,
      min: role.min_count,
      max: role.max_count,
      isMet: assigned >= role.min_count,
    };
  });
}
