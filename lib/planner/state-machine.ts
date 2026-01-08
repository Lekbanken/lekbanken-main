/**
 * Plan Status State Machine
 * 
 * Manages valid state transitions for plans.
 * Ensures data integrity by preventing invalid status changes.
 */

import type { PlannerStatus } from '@/types/planner'

// =============================================================================
// VALID TRANSITIONS
// =============================================================================

/**
 * Defines which status transitions are allowed.
 * 
 * - draft → published (first publish)
 * - draft → archived (discard)
 * - published → modified (edit after publish)
 * - published → archived (retire)
 * - modified → published (republish)
 * - modified → archived (retire)
 * - archived → draft (restore)
 */
const VALID_TRANSITIONS: Record<PlannerStatus, PlannerStatus[]> = {
  draft: ['published', 'archived'],
  published: ['modified', 'archived'],
  modified: ['published', 'archived'],
  archived: ['draft'],
}

// =============================================================================
// TRANSITION VALIDATION
// =============================================================================

/**
 * Check if a status transition is valid.
 */
export function canTransition(from: PlannerStatus, to: PlannerStatus): boolean {
  if (from === to) return true // No-op is always valid
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Assert that a status transition is valid.
 * Throws an error if the transition is invalid.
 */
export function assertTransition(from: PlannerStatus, to: PlannerStatus): void {
  if (!canTransition(from, to)) {
    throw new PlanStatusTransitionError(from, to)
  }
}

/**
 * Get all valid next statuses from the current status.
 */
export function getValidNextStatuses(current: PlannerStatus): PlannerStatus[] {
  return VALID_TRANSITIONS[current] ?? []
}

// =============================================================================
// ACTION-BASED TRANSITIONS
// =============================================================================

export type PlanStatusAction = 'publish' | 'edit' | 'archive' | 'restore'

/**
 * Get the next status based on an action.
 * 
 * @param current - Current plan status
 * @param action - The action being performed
 * @returns The new status after the action
 * @throws PlanStatusTransitionError if the action is invalid for the current status
 */
export function getNextStatus(current: PlannerStatus, action: PlanStatusAction): PlannerStatus {
  switch (action) {
    case 'publish':
      if (current === 'draft' || current === 'modified') {
        return 'published'
      }
      throw new PlanStatusTransitionError(current, 'published', `Cannot publish from status: ${current}`)
    
    case 'edit':
      // Editing a published plan marks it as modified
      if (current === 'published') {
        return 'modified'
      }
      // Draft and modified stay the same when edited
      if (current === 'draft' || current === 'modified') {
        return current
      }
      throw new PlanStatusTransitionError(current, current, `Cannot edit plan in status: ${current}`)
    
    case 'archive':
      if (current !== 'archived') {
        return 'archived'
      }
      throw new PlanStatusTransitionError(current, 'archived', 'Plan is already archived')
    
    case 'restore':
      if (current === 'archived') {
        return 'draft'
      }
      throw new PlanStatusTransitionError(current, 'draft', 'Can only restore archived plans')
    
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

/**
 * Check if an action can be performed on a plan with the given status.
 */
export function canPerformAction(current: PlannerStatus, action: PlanStatusAction): boolean {
  try {
    getNextStatus(current, action)
    return true
  } catch {
    return false
  }
}

/**
 * Get all available actions for a given status.
 */
export function getAvailableActions(current: PlannerStatus): PlanStatusAction[] {
  const actions: PlanStatusAction[] = []
  
  if (canPerformAction(current, 'publish')) actions.push('publish')
  if (canPerformAction(current, 'edit')) actions.push('edit')
  if (canPerformAction(current, 'archive')) actions.push('archive')
  if (canPerformAction(current, 'restore')) actions.push('restore')
  
  return actions
}

// =============================================================================
// ERROR CLASS
// =============================================================================

export class PlanStatusTransitionError extends Error {
  public readonly from: PlannerStatus
  public readonly to: PlannerStatus
  public readonly code = 'INVALID_STATUS_TRANSITION'
  
  constructor(from: PlannerStatus, to: PlannerStatus, message?: string) {
    super(message ?? `Invalid status transition: ${from} → ${to}`)
    this.name = 'PlanStatusTransitionError'
    this.from = from
    this.to = to
  }
}

// =============================================================================
// STATUS METADATA
// =============================================================================

/**
 * Describes the meaning and behavior of each status.
 */
export const STATUS_METADATA: Record<PlannerStatus, {
  description: string
  isEditable: boolean
  isPlayable: boolean
  isVisible: boolean
}> = {
  draft: {
    description: 'Planen har aldrig publicerats och är under arbete.',
    isEditable: true,
    isPlayable: false,
    isVisible: true,
  },
  published: {
    description: 'Planen är publicerad och den senaste versionen är tillgänglig.',
    isEditable: true, // Editing transitions to "modified"
    isPlayable: true,
    isVisible: true,
  },
  modified: {
    description: 'Planen har opublicerade ändringar sedan senaste publicering.',
    isEditable: true,
    isPlayable: true, // Can still play the published version
    isVisible: true,
  },
  archived: {
    description: 'Planen är arkiverad och inte längre tillgänglig för användning.',
    isEditable: false,
    isPlayable: false,
    isVisible: false, // Hidden from normal lists
  },
}
