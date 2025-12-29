/**
 * Play Feature Hooks
 * 
 * Export all hooks related to the Play runtime system.
 */

export { useLiveSession, useLiveTimer } from './useLiveSession';
export type { UseLiveSessionOptions, UseLiveSessionResult } from './useLiveSession';

export { usePlayBroadcast } from './usePlayBroadcast';
export type { UsePlayBroadcastOptions, UsePlayBroadcastResult } from './usePlayBroadcast';

export { usePuzzleRealtime } from './usePuzzleRealtime';
export type { 
  UsePuzzleRealtimeOptions, 
  UsePuzzleRealtimeResult,
  PuzzleStateData,
} from './usePuzzleRealtime';

export { useTriggerEngine } from './useTriggerEngine';
export type {
  TriggerEvent,
  TriggerActionContext,
  UseTriggerEngineOptions,
  UseTriggerEngineReturn,
} from './useTriggerEngine';

export { withSignalAndTimeBank } from './withSignalAndTimeBank';

// Session Cockpit (unified state management)
export { useSessionState } from './useSessionState';
export type { UseSessionStateReturn } from '@/types/session-cockpit';

// Signal capabilities detection
export { useSignalCapabilities } from './useSignalCapabilities';
export type {
  SignalCapability,
  SignalCapabilityStatus,
  SignalCapabilities,
  UseSignalCapabilitiesOptions,
  UseSignalCapabilitiesReturn,
} from './useSignalCapabilities';

// Session events (observability)
export { useSessionEvents, createEventEmitters } from './useSessionEvents';
export type {
  UseSessionEventsOptions,
  UseSessionEventsReturn,
  SessionEventEmitter,
} from './useSessionEvents';

// Director keyboard shortcuts
export { useDirectorShortcuts, SHORTCUT_CATEGORY_LABELS } from './useDirectorShortcuts';
export type {
  DirectorShortcut,
  DirectorAction,
  ShortcutCategory,
  UseDirectorShortcutsOptions,
  UseDirectorShortcutsReturn,
} from './useDirectorShortcuts';

// Session readiness (confidence indicator)
export { useSessionReadiness, READINESS_CATEGORY_LABELS } from './useSessionReadiness';
export type {
  ReadinessCheck,
  ReadinessCategory,
  SessionReadinessInput,
  UseSessionReadinessReturn,
} from './useSessionReadiness';

// Batch artifact operations
export {
  useBatchArtifacts,
  PRESET_FILTERS,
  OPERATION_LABELS,
  OPERATION_ICONS,
} from './useBatchArtifacts';
export type {
  ArtifactInfo,
  ArtifactFilter,
  BatchOperation,
  BatchOperationResult,
  UseBatchArtifactsOptions,
  UseBatchArtifactsReturn,
} from './useBatchArtifacts';

// Session timeline
export { useSessionTimeline } from './useSessionTimeline';
export type {
  TimelineMarker,
  TimelineSegment,
  TimelineStats,
  UseSessionTimelineOptions,
  UseSessionTimelineReturn,
} from './useSessionTimeline';

// Session analytics
export { useSessionAnalytics } from './useSessionAnalytics';
export type {
  StepMetrics,
  PuzzleMetrics,
  ParticipantMetrics,
  EngagementMetrics,
  SessionAnalytics,
  UseSessionAnalyticsOptions,
  UseSessionAnalyticsReturn,
} from './useSessionAnalytics';

// Multi-language leader script
export { useMultiLanguageScript } from './useMultiLanguageScript';
export type {
  UseMultiLanguageScriptOptions,
  CurrentContent,
  UseMultiLanguageScriptReturn,
} from './useMultiLanguageScript';
