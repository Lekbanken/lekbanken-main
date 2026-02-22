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
  getSignalChannelLabel,
  getSignalDirectionLabel,
} from './signalHelpers';
export type { SignalEventLike } from './signalHelpers';

// Signal catalog — SSoT for signal type metadata
export {
  SIGNAL_CATALOG,
  lookupSignal,
  getSignalSeverity,
  resolveSignalDirection,
} from './signalCatalog';
export type {
  SignalCatalogEntry,
  SignalSeverity,
  SignalOrigin,
  SignalDirection,
  SignalPresentation,
} from './signalCatalog';

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
