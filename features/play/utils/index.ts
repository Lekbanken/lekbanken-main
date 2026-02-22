/**
 * Play feature — shared utilities
 *
 * Pure-function helpers for signal events and role state.
 * No side effects, no API calls — presentation logic only.
 */

// Signal helpers
export {
  sortedSignalEvents,
  selectLatestUnhandledSignal,
  countUnhandledSignals,
  extractSignalMeta,
} from './signalHelpers';
export type { SignalEventLike } from './signalHelpers';

// Role state helpers
export {
  isRoleAssigned,
  isRoleRevealed,
  getAssignment,
  getParticipantRole,
  getRoleAssignmentStatus,
  getRoleCounts,
} from './roleState';
export type { RoleAssignmentStatus, RoleCount } from './roleState';
