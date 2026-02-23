/**
 * Session Cockpit Types
 * 
 * Unified state management for the host session experience.
 * Single source of truth for Lobby and Director Mode.
 */

import type { SessionRole } from './play-runtime';
import type { TriggerConditionType } from './trigger';

// =============================================================================
// Core Session State
// =============================================================================

export type SessionCockpitStatus = 'draft' | 'lobby' | 'active' | 'paused' | 'locked' | 'ended';

export interface SessionCockpitState {
  // Core identifiers
  sessionId: string;
  gameId: string | null;
  sessionCode: string;
  displayName: string;
  startedAt?: string | null;
  pausedAt?: string | null;
  endedAt?: string | null;
  
  // Status
  status: SessionCockpitStatus;
  isDirectorMode: boolean;
  isLoading: boolean;
  error: string | null;
  lastSyncAt?: string | null;
  
  // Participants & Roles  
  participants: CockpitParticipant[];
  sessionRoles: SessionRole[];
  roleAssignments: Record<string, string>; // participantId → roleId
  
  // Game Structure
  steps: CockpitStep[];
  phases: CockpitPhase[];
  currentStepIndex: number;
  currentPhaseIndex: number;
  
  // Artifacts
  artifacts: CockpitArtifact[];
  artifactStates: Record<string, ArtifactState>;
  /** Monotonic counter — incremented on every artifact mutation (reveal/hide/reset/trigger). Used as refreshKey for components with independent state. */
  artifactVersion: number;
  
  // Triggers
  triggers: CockpitTrigger[];
  
  // Signals
  signalCapabilities: SignalCapabilities;
  signalPresets: SignalPreset[];
  recentSignals: Signal[];
  
  // Time Bank
  timeBankBalance: number;
  timeBankLedger: TimeBankEntry[];
  timeBankRules: TimeBankRules;
  timeBankPaused: boolean;
  
  // Secrets
  secretsUnlockedAt: string | null;
  secretsRevealedBy: Record<string, string>; // participantId → timestamp
  
  // Event Log
  eventLog: SessionEvent[];
  
  // Safety & Inclusion (from game)
  safetyInfo: SafetyInfo;
  
  // Readiness (computed)
  preflightItems: PreflightItem[];
  canStartDirectorMode: boolean;
}

// =============================================================================
// Safety & Inclusion Types
// =============================================================================

export interface SafetyInfo {
  safetyNotes?: string;
  accessibilityNotes?: string;
  spaceRequirements?: string;
  leaderTips?: string;
}

// =============================================================================
// Participant Types
// =============================================================================

export type ParticipantStatus = 'idle' | 'joined' | 'active' | 'disconnected' | 'left' | 'kicked';

export interface CockpitParticipant {
  id: string;
  displayName: string;
  status: ParticipantStatus;
  role?: string; // participant_role enum
  position?: number | null;
  isNextStarter?: boolean;
  joinedAt: string;
  lastSeenAt?: string;
  
  // Role assignment
  assignedRoleId?: string;
  assignedRoleName?: string;
}

// =============================================================================
// Game Structure Types
// =============================================================================

export interface CockpitStep {
  id: string;
  title: string;
  description?: string;
  stepOrder: number;
  durationMinutes?: number;
  leaderScript?: string; // Host-only instructions
  participantPrompt?: string;
  boardText?: string;
  phaseId?: string;
}

export interface CockpitPhase {
  id: string;
  name: string;
  description?: string;
  phaseOrder: number;
  phaseType: 'intro' | 'round' | 'finale' | 'break';
}

// =============================================================================
// Artifact Types
// =============================================================================

export interface CockpitArtifact {
  id: string;
  title: string;
  description?: string;
  artifactType: string;
  artifactOrder: number;
  metadata: Record<string, unknown> | null;
  stepId?: string;
  phaseId?: string;
}

export type ArtifactStateStatus = 
  | 'hidden' 
  | 'revealed' 
  | 'locked' 
  | 'unlocked' 
  | 'solved' 
  | 'failed';

export interface ArtifactState {
  artifactId: string;
  status: ArtifactStateStatus;
  isRevealed: boolean;
  isHighlighted: boolean;
  isLocked: boolean;
  isSolved: boolean;
  
  // Type-specific state
  attemptCount?: number;
  maxAttempts?: number;
  progress?: number; // 0-100
  solvedAt?: string;
  solvedBy?: string; // participantId
  
  // Additional metadata
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Trigger Types
// =============================================================================

export type TriggerStatus = 'armed' | 'fired' | 'disabled' | 'error';

export interface CockpitTrigger {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  status: TriggerStatus;
  executeOnce: boolean;
  firedCount: number;
  lastFiredAt?: string;
  lastError?: string;
  delaySeconds?: number;
  
  // Structured condition/action data for rich UI
  conditionType: string;
  condition: Record<string, unknown>;
  actions: Array<Record<string, unknown>>;
  
  // Condition/action summaries for display
  conditionSummary: string;
  actionSummary: string;
}

/**
 * Result from a trigger action (fire/arm/disable).
 * Returned by useSessionState callbacks so the UI can clear pending on HTTP success
 * and show actionable diagnostics on failure.
 *
 * `kind` classifies the failure so the UI can show the right copy:
 *   - request_failed: network / HTTP transport error (offline, 5xx, timeout)
 *   - action_failed:  server understood but refused/couldn't execute (RPC error, guard, missing ref)
 */
export type TriggerActionResult =
  | {
      ok: true;
      action: 'fire' | 'arm' | 'disable';
      triggerId: string;
      /** Runtime state after the action */
      trigger?: { status: TriggerStatus; firedCount: number; firedAt: string | null };
      /** Actions executed client-side after fire (debug info) */
      executedActions?: string[];
      /** Actions that failed during post-fire execution */
      failedActions?: Array<{ type: string; error: string }>;
    }
  | {
      ok: false;
      action: 'fire' | 'arm' | 'disable';
      triggerId: string;
      /** Classifies the failure for UI copy selection */
      kind: 'request_failed' | 'action_failed';
      /** HTTP status code (0 if no response) */
      httpStatus: number;
      /** Machine-readable error code from server */
      errorCode: string;
      /** User-safe message */
      message: string;
      /** Optional structured details (e.g. { artifactId } for missing artifacts) */
      details?: Record<string, unknown>;
    };

// =============================================================================
// Signal Types
// =============================================================================

export type SignalOutputType = 'torch' | 'audio' | 'screen' | 'vibration';

export interface SignalCapabilities {
  torch: boolean;
  audio: boolean;
  screen: boolean;
  vibration: boolean;
  
  // Diagnostics
  torchError?: string;
  audioGateRequired?: boolean; // iOS needs tap
  lastTested?: string;
}

export interface SignalPreset {
  id: string;
  name: string;
  channel: string;
  output: SignalOutputType;
  pattern?: 'morse' | 'pulse' | 'sos' | 'custom';
  customPattern?: number[]; // ms durations
  color?: string; // For screen flash
  soundUrl?: string; // For audio
}

export interface Signal {
  id: string;
  sessionId: string;
  channel: string;
  payload: unknown;
  senderType: 'host' | 'participant' | 'system' | 'trigger';
  senderUserId?: string;
  senderParticipantId?: string;
  createdAt: string;
}

// =============================================================================
// Time Bank Types
// =============================================================================

export interface TimeBankRules {
  initialBalance: number; // seconds
  minBalance?: number; // floor
  maxBalance?: number; // cap
  
  // Automatic rules (from triggers)
  autoRewards: TimeBankAutoRule[];
  autoPenalties: TimeBankAutoRule[];
}

export interface TimeBankAutoRule {
  id: string;
  condition: TriggerConditionType;
  targetId?: string; // artifact/step/phase ID
  deltaSeconds: number;
  reason: string;
}

export interface TimeBankEntry {
  id: string;
  sessionId: string;
  deltaSeconds: number;
  reason: string;
  balance: number; // Balance AFTER this entry
  
  // Source
  triggerId?: string;
  actorType: 'host' | 'system' | 'trigger' | 'participant';
  actorUserId?: string;
  actorParticipantId?: string;
  
  createdAt: string;
}

// =============================================================================
// Event Types
// =============================================================================

export type SessionEventType =
  // Lifecycle
  | 'session_created'
  | 'session_started'
  | 'session_paused'
  | 'session_resumed'
  | 'session_ended'
  
  // Navigation
  | 'step_started'
  | 'step_completed'
  | 'phase_started'
  | 'phase_completed'
  
  // Participants
  | 'participant_joined'
  | 'participant_left'
  | 'participant_kicked'
  | 'role_assigned'
  | 'secrets_unlocked'
  | 'secret_revealed'
  
  // Artifacts
  | 'artifact_revealed'
  | 'artifact_hidden'
  | 'artifact_state_changed'
  | 'puzzle_solved'
  | 'puzzle_failed'
  
  // Triggers
  | 'trigger_fired'
  | 'trigger_error'
  | 'trigger_disabled'
  | 'trigger_armed'
  
  // Signals
  | 'signal_sent'
  | 'signal_received'
  
  // TimeBank
  | 'time_bank_delta'
  | 'time_bank_paused'
  | 'time_bank_resumed'
  
  // Timer
  | 'timer_started'
  | 'timer_paused'
  | 'timer_ended'
  
  // Chat
  | 'chat_message'
  
  // Debug
  | 'error'
  | 'warning'
  | 'replay_marker';

export type EventActorType = 'system' | 'host' | 'participant' | 'trigger';

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: SessionEventType;
  timestamp: string;
  
  // Actor
  actorType: EventActorType;
  actorId?: string;
  actorName?: string;
  
  // Payload
  payload: Record<string, unknown>;
  
  // Correlation
  correlationId?: string; // Group related events
  parentEventId?: string; // Causation chain
  
  // Context
  stepId?: string;
  phaseId?: string;
  artifactId?: string;
  triggerId?: string;
}

// =============================================================================
// Preflight / Readiness Types
// =============================================================================

export type PreflightStatus = 'ready' | 'warning' | 'error' | 'pending';

export interface PreflightItem {
  id: string;
  label: string;
  status: PreflightStatus;
  detail?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface RoleMinCountStatus {
  roleId: string;
  name: string;
  min: number;
  assigned: number;
  met: boolean;
}

export interface ExtendedPreflightState {
  participantCount: number;
  hasGame: boolean;
  rolesSnapshotted: boolean;
  rolesAssignedCount: number;
  totalRoles: number;
  roleMinCountsStatus: RoleMinCountStatus[];
  hasSecretInstructions: boolean;
  secretsUnlocked: boolean;
  secretsRevealedCount: number;
  triggersSnapshotted: boolean;
  armedTriggersCount: number;
  hasTriggers: boolean;
  artifactsSnapshotted: boolean;
  signalCapabilitiesTested: boolean;
}

// =============================================================================
// Action Types (for useSessionState hook)
// =============================================================================

export interface SessionCockpitActions {
  // Mode
  enterDirectorMode: () => void;
  exitDirectorMode: () => void;
  
  // Session lifecycle
  startSession: () => Promise<void>;
  publishSession: () => Promise<void>;
  unpublishSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  endSession: () => Promise<void>;
  
  // Navigation
  goToStep: (stepIndex: number) => Promise<void>;
  goToPhase: (phaseIndex: number) => Promise<void>;
  nextStep: () => Promise<void>;
  previousStep: () => Promise<void>;
  
  // Roles
  assignRole: (participantId: string, roleId: string) => Promise<void>;
  unassignRole: (participantId: string) => Promise<void>;
  randomizeRoles: () => Promise<void>;
  snapshotRoles: () => Promise<void>;
  
  // Secrets
  unlockSecrets: () => Promise<void>;
  relockSecrets: () => Promise<void>;
  
  // Artifacts
  revealArtifact: (artifactId: string) => Promise<void>;
  hideArtifact: (artifactId: string) => Promise<void>;
  resetArtifact: (artifactId: string) => Promise<void>;
  
  // Triggers
  fireTrigger: (triggerId: string) => Promise<TriggerActionResult>;
  disableTrigger: (triggerId: string) => Promise<TriggerActionResult>;
  armTrigger: (triggerId: string) => Promise<TriggerActionResult>;
  disableAllTriggers: () => Promise<void>;
  
  // Signals
  sendSignal: (channel: string, payload: unknown) => Promise<void>;
  testSignalCapability: (type: SignalOutputType) => Promise<boolean>;
  
  // TimeBank
  applyTimeBankDelta: (deltaSeconds: number, reason: string) => Promise<void>;
  pauseTimeBank: () => Promise<void>;
  resumeTimeBank: () => Promise<void>;
  
  // Events
  addEvent: (event: Omit<SessionEvent, 'id' | 'sessionId' | 'timestamp'>) => void;
  clearEventLog: () => void;
  
  // Refresh
  refresh: () => Promise<void>;
}

// =============================================================================
// Combined Hook Return Type
// =============================================================================

export type UseSessionStateReturn = SessionCockpitState & SessionCockpitActions;

// =============================================================================
// Utility Types
// =============================================================================

export interface SessionCockpitConfig {
  sessionId: string;
  enableRealtime?: boolean;
  pollInterval?: number;
  onError?: (error: Error) => void;
}

export const DEFAULT_TIMEBANK_RULES: TimeBankRules = {
  initialBalance: 300, // 5 minutes
  minBalance: 0,
  maxBalance: 600, // 10 minutes
  autoRewards: [],
  autoPenalties: [],
};

export const DEFAULT_SIGNAL_CAPABILITIES: SignalCapabilities = {
  torch: false,
  audio: false,
  screen: true,
  vibration: false,
};
