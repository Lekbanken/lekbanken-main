/**
 * Role Assignment Utilities
 * 
 * Logic for assigning roles to participants with support for:
 * - Random assignment
 * - Manual assignment
 * - Conflict detection
 * - Min/max count constraints
 */

import type { SessionRole, RoleAssignment } from '@/types/play-runtime';

// =============================================================================
// Types
// =============================================================================

export interface Participant {
  id: string;
  display_name: string;
  status: string;
}

export interface AssignmentResult {
  success: boolean;
  assignments: Array<{
    participantId: string;
    roleId: string;
  }>;
  errors: string[];
  warnings: string[];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingRoles: string[];
  message?: string;
}

// =============================================================================
// Shuffle Utility (Fisher-Yates)
// =============================================================================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// =============================================================================
// Conflict Detection
// =============================================================================

/**
 * Check if assigning a role to a participant would create a conflict.
 * Conflicts are based on role names in the conflicts_with array.
 */
export function checkConflict(
  role: SessionRole,
  participantId: string,
  currentAssignments: Map<string, SessionRole>, // participantId -> role
): ConflictCheckResult {
  const participantCurrentRole = currentAssignments.get(participantId);
  
  if (!participantCurrentRole) {
    return { hasConflict: false, conflictingRoles: [] };
  }
  
  // Check if the new role conflicts with current role
  if (role.conflicts_with.includes(participantCurrentRole.name)) {
    return {
      hasConflict: true,
      conflictingRoles: [participantCurrentRole.name],
      message: `${role.name} konfliktar med ${participantCurrentRole.name}`,
    };
  }
  
  // Check if current role conflicts with the new role
  if (participantCurrentRole.conflicts_with.includes(role.name)) {
    return {
      hasConflict: true,
      conflictingRoles: [participantCurrentRole.name],
      message: `${participantCurrentRole.name} konfliktar med ${role.name}`,
    };
  }
  
  return { hasConflict: false, conflictingRoles: [] };
}

/**
 * Get all participants that would conflict with a given role.
 */
export function getConflictingParticipants(
  role: SessionRole,
  currentAssignments: Map<string, SessionRole>,
): string[] {
  const conflicting: string[] = [];
  
  for (const [participantId, _assignedRole] of currentAssignments) {
    const check = checkConflict(role, participantId, currentAssignments);
    if (check.hasConflict) {
      conflicting.push(participantId);
    }
  }
  
  return conflicting;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate if a role can be assigned (respects max_count).
 */
export function canAssignRole(role: SessionRole): boolean {
  if (role.max_count === null) return true;
  return role.assigned_count < role.max_count;
}

/**
 * Check if minimum role counts are satisfied.
 */
export function checkMinimumCounts(
  roles: SessionRole[],
): { satisfied: boolean; unsatisfied: Array<{ role: SessionRole; needed: number }> } {
  const unsatisfied: Array<{ role: SessionRole; needed: number }> = [];
  
  for (const role of roles) {
    if (role.assigned_count < role.min_count) {
      unsatisfied.push({
        role,
        needed: role.min_count - role.assigned_count,
      });
    }
  }
  
  return {
    satisfied: unsatisfied.length === 0,
    unsatisfied,
  };
}

// =============================================================================
// Random Assignment Algorithm
// =============================================================================

export interface RandomAssignmentOptions {
  /** Participants to assign */
  participants: Participant[];
  /** Available roles */
  roles: SessionRole[];
  /** Current assignments (participantId -> roleId) */
  currentAssignments?: Map<string, string>;
  /** Whether to respect min_count requirements first */
  respectMinimums?: boolean;
  /** Whether to skip participants that already have a role */
  skipAssigned?: boolean;
}

/**
 * Randomly assign roles to participants.
 * 
 * Algorithm:
 * 1. If respectMinimums, first fill minimum requirements
 * 2. Shuffle remaining participants
 * 3. Assign roles in order, respecting max_count and conflicts
 */
export function randomAssignRoles(options: RandomAssignmentOptions): AssignmentResult {
  const {
    participants,
    roles,
    currentAssignments = new Map(),
    respectMinimums = true,
    skipAssigned = true,
  } = options;
  
  const result: AssignmentResult = {
    success: true,
    assignments: [],
    errors: [],
    warnings: [],
  };
  
  // Build role map for lookups
  const roleMap = new Map(roles.map((r) => [r.id, r]));
  
  // Build assignment tracking
  const roleAssignmentCounts = new Map(roles.map((r) => [r.id, r.assigned_count]));
  const participantRoles = new Map<string, SessionRole>(); // For conflict checking
  
  // Populate existing assignments
  for (const [participantId, roleId] of currentAssignments) {
    const role = roleMap.get(roleId);
    if (role) {
      participantRoles.set(participantId, role);
    }
  }
  
  // Get unassigned participants
  let availableParticipants = skipAssigned
    ? participants.filter((p) => !currentAssignments.has(p.id))
    : [...participants];
  
  if (availableParticipants.length === 0) {
    result.warnings.push('Inga deltagare att tilldela roller till');
    return result;
  }
  
  // Shuffle participants
  availableParticipants = shuffleArray(availableParticipants);
  
  // Phase 1: Fill minimum requirements if requested
  if (respectMinimums) {
    for (const role of roles) {
      const currentCount = roleAssignmentCounts.get(role.id) || 0;
      const needed = role.min_count - currentCount;
      
      if (needed <= 0) continue;
      
      let assigned = 0;
      for (let i = 0; i < availableParticipants.length && assigned < needed; i++) {
        const participant = availableParticipants[i];
        
        // Skip if already assigned in this round
        if (result.assignments.some((a) => a.participantId === participant.id)) {
          continue;
        }
        
        // Check max_count
        const count = roleAssignmentCounts.get(role.id) || 0;
        if (role.max_count !== null && count >= role.max_count) {
          break;
        }
        
        // Check conflicts
        const conflictCheck = checkConflict(role, participant.id, participantRoles);
        if (conflictCheck.hasConflict) {
          continue;
        }
        
        // Assign
        result.assignments.push({
          participantId: participant.id,
          roleId: role.id,
        });
        roleAssignmentCounts.set(role.id, count + 1);
        participantRoles.set(participant.id, role);
        assigned++;
      }
      
      if (assigned < needed) {
        result.warnings.push(
          `Kunde bara tilldela ${assigned} av ${needed} för rollen "${role.name}"`
        );
      }
    }
  }
  
  // Phase 2: Assign remaining participants to any available role
  for (const participant of availableParticipants) {
    // Skip if already assigned
    if (result.assignments.some((a) => a.participantId === participant.id)) {
      continue;
    }
    
    // Find an available role
    const shuffledRoles = shuffleArray(roles);
    let assigned = false;
    
    for (const role of shuffledRoles) {
      const count = roleAssignmentCounts.get(role.id) || 0;
      
      // Check max_count
      if (role.max_count !== null && count >= role.max_count) {
        continue;
      }
      
      // Check conflicts
      const conflictCheck = checkConflict(role, participant.id, participantRoles);
      if (conflictCheck.hasConflict) {
        continue;
      }
      
      // Assign
      result.assignments.push({
        participantId: participant.id,
        roleId: role.id,
      });
      roleAssignmentCounts.set(role.id, count + 1);
      participantRoles.set(participant.id, role);
      assigned = true;
      break;
    }
    
    if (!assigned) {
      result.warnings.push(
        `Kunde inte tilldela roll till "${participant.display_name}" (konflikter eller max uppnått)`
      );
    }
  }
  
  // Check final state
  const minCheck = checkMinimumCounts(
    roles.map((r) => ({
      ...r,
      assigned_count: roleAssignmentCounts.get(r.id) || 0,
    }))
  );
  
  if (!minCheck.satisfied) {
    for (const { role, needed } of minCheck.unsatisfied) {
      result.warnings.push(
        `Rollen "${role.name}" behöver ${needed} fler tilldelning(ar)`
      );
    }
  }
  
  return result;
}

// =============================================================================
// Manual Assignment Helpers
// =============================================================================

/**
 * Get available roles for a specific participant.
 * Filters out roles that are full or would conflict.
 */
export function getAvailableRolesForParticipant(
  participantId: string,
  roles: SessionRole[],
  currentAssignments: Map<string, SessionRole>,
): SessionRole[] {
  return roles.filter((role) => {
    // Check max_count
    if (!canAssignRole(role)) return false;
    
    // Check conflicts
    const conflictCheck = checkConflict(role, participantId, currentAssignments);
    if (conflictCheck.hasConflict) return false;
    
    return true;
  });
}

/**
 * Get available participants for a specific role.
 * Filters out participants that would conflict or already have max roles.
 */
export function getAvailableParticipantsForRole(
  role: SessionRole,
  participants: Participant[],
  currentAssignments: Map<string, SessionRole>,
  existingRoleAssignments: Map<string, string[]>, // participantId -> roleIds
): Participant[] {
  return participants.filter((p) => {
    // Check if participant already has this role
    const participantRoles = existingRoleAssignments.get(p.id) || [];
    if (participantRoles.includes(role.id)) return false;
    
    // Check conflicts
    const conflictCheck = checkConflict(role, p.id, currentAssignments);
    if (conflictCheck.hasConflict) return false;
    
    return true;
  });
}

// =============================================================================
// Summary Helpers
// =============================================================================

/**
 * Get a summary of role assignments for display.
 */
export function getAssignmentSummary(
  roles: SessionRole[],
  assignments: RoleAssignment[],
  participants: Participant[],
): Array<{
  role: SessionRole;
  assignedParticipants: Participant[];
  remainingSlots: number | null; // null = unlimited
}> {
  const participantMap = new Map(participants.map((p) => [p.id, p]));
  
  return roles.map((role) => {
    const roleAssignments = assignments.filter((a) => a.session_role_id === role.id);
    const assignedParticipants = roleAssignments
      .map((a) => participantMap.get(a.participant_id))
      .filter((p): p is Participant => !!p);
    
    return {
      role,
      assignedParticipants,
      remainingSlots: role.max_count !== null 
        ? Math.max(0, role.max_count - assignedParticipants.length)
        : null,
    };
  });
}

/**
 * Get unassigned participants.
 */
export function getUnassignedParticipants(
  participants: Participant[],
  assignments: RoleAssignment[],
): Participant[] {
  const assignedIds = new Set(assignments.map((a) => a.participant_id));
  return participants.filter((p) => !assignedIds.has(p.id));
}
