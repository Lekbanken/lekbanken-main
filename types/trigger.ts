/**
 * Trigger System Types for Legendary Play
 * 
 * Declarative rules engine: "When X happens, do Y"
 * Designed for escape-room style automation without code
 */

// ============================================================================
// Trigger Conditions (WHEN)
// ============================================================================

/** Step-related conditions */
export interface StepStartedCondition {
  type: 'step_started';
  stepId: string;
}

export interface StepCompletedCondition {
  type: 'step_completed';
  stepId: string;
}

/** Phase-related conditions */
export interface PhaseStartedCondition {
  type: 'phase_started';
  phaseId: string;
}

export interface PhaseCompletedCondition {
  type: 'phase_completed';
  phaseId: string;
}

/** Decision-related conditions */
export interface DecisionResolvedCondition {
  type: 'decision_resolved';
  decisionId: string;
  /** Specific outcome to match (optional - any outcome if not set) */
  outcome?: string;
}

/** Timer-related conditions */
export interface TimerEndedCondition {
  type: 'timer_ended';
  timerId: string;
}

/** Artifact-related conditions */
export interface ArtifactUnlockedCondition {
  type: 'artifact_unlocked';
  artifactId: string;
}

/** Keypad-related conditions */
export interface KeypadCorrectCondition {
  type: 'keypad_correct';
  keypadId: string;
}

export interface KeypadFailedCondition {
  type: 'keypad_failed';
  keypadId: string;
}

/** Manual trigger (host-only button) */
export interface ManualCondition {
  type: 'manual';
}

/** Signal condition (append-only signal feed) */
export interface SignalReceivedCondition {
  type: 'signal_received';
  /** Optional channel filter; if omitted, any channel matches */
  channel?: string;
}

/** All possible trigger conditions */
export type TriggerCondition =
  | StepStartedCondition
  | StepCompletedCondition
  | PhaseStartedCondition
  | PhaseCompletedCondition
  | DecisionResolvedCondition
  | TimerEndedCondition
  | ArtifactUnlockedCondition
  | KeypadCorrectCondition
  | KeypadFailedCondition
  | ManualCondition
  | SignalReceivedCondition;

/** Condition types for UI dropdowns */
export type TriggerConditionType = TriggerCondition['type'];

// ============================================================================
// Trigger Actions (THEN)
// ============================================================================

/** Reveal a hidden artifact */
export interface RevealArtifactAction {
  type: 'reveal_artifact';
  artifactId: string;
}

/** Hide a visible artifact */
export interface HideArtifactAction {
  type: 'hide_artifact';
  artifactId: string;
}

/** Unlock a decision for voting */
export interface UnlockDecisionAction {
  type: 'unlock_decision';
  decisionId: string;
}

/** Lock a decision */
export interface LockDecisionAction {
  type: 'lock_decision';
  decisionId: string;
}

/** Advance to the next step */
export interface AdvanceStepAction {
  type: 'advance_step';
}

/** Advance to the next phase */
export interface AdvancePhaseAction {
  type: 'advance_phase';
}

/** Start a timer */
export interface StartTimerAction {
  type: 'start_timer';
  duration: number;
  name: string;
}

/** Send a message to the wall/board */
export interface SendMessageAction {
  type: 'send_message';
  message: string;
  style: 'normal' | 'dramatic' | 'typewriter';
}

/** Play a sound effect */
export interface PlaySoundAction {
  type: 'play_sound';
  soundId: string;
}

/** Show countdown overlay */
export interface ShowCountdownAction {
  type: 'show_countdown';
  duration: number;
  message: string;
}

/** Reset a keypad to locked state */
export interface ResetKeypadAction {
  type: 'reset_keypad';
  keypadId: string;
}

/** Send a signal into the session signal feed */
export interface SendSignalAction {
  type: 'send_signal';
  channel: string;
  message: string;
}

/** Apply a delta to the session time bank */
export interface TimeBankApplyDeltaAction {
  type: 'time_bank_apply_delta';
  deltaSeconds: number;
  reason: string;
  minBalanceSeconds?: number;
  maxBalanceSeconds?: number;
}

/** All possible trigger actions */
export type TriggerAction =
  | RevealArtifactAction
  | HideArtifactAction
  | UnlockDecisionAction
  | LockDecisionAction
  | AdvanceStepAction
  | AdvancePhaseAction
  | StartTimerAction
  | SendMessageAction
  | PlaySoundAction
  | ShowCountdownAction
  | ResetKeypadAction
  | SendSignalAction
  | TimeBankApplyDeltaAction;

/** Action types for UI dropdowns */
export type TriggerActionType = TriggerAction['type'];

// ============================================================================
// Trigger Definition
// ============================================================================

/** Status of a trigger */
export type TriggerStatus = 'armed' | 'fired' | 'disabled';

/** A complete trigger definition */
export interface Trigger {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Whether the trigger is enabled */
  enabled: boolean;
  /** Current status */
  status: TriggerStatus;
  
  /** Condition that activates this trigger */
  when: TriggerCondition;
  /** Actions to execute when triggered (in order) */
  then: TriggerAction[];
  
  /** Only fire once, then disable automatically */
  executeOnce: boolean;
  /** Optional delay in seconds before executing actions */
  delaySeconds?: number;
  
  /** Timestamp when trigger last fired */
  firedAt?: Date;
  /** Number of times this trigger has fired */
  firedCount: number;
  
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/** Configuration for creating a new trigger */
export interface TriggerConfig {
  name: string;
  enabled?: boolean;
  when: TriggerCondition;
  then: TriggerAction[];
  executeOnce?: boolean;
  delaySeconds?: number;
}

// ============================================================================
// Trigger Validation
// ============================================================================

export interface TriggerValidationError {
  field: string;
  message: string;
}

export interface TriggerValidationResult {
  valid: boolean;
  errors: TriggerValidationError[];
  warnings: string[];
}

// ============================================================================
// UI Helper Types
// ============================================================================

/** Condition metadata for UI display */
export interface ConditionMeta {
  type: TriggerConditionType;
  label: string;
  icon: string;
  description: string;
  requiresSelection: boolean;
}

/** Action metadata for UI display */
export interface ActionMeta {
  type: TriggerActionType;
  label: string;
  icon: string;
  description: string;
}

/** Condition options for dropdown */
export const CONDITION_OPTIONS: ConditionMeta[] = [
  { type: 'step_started', label: 'Step starts', icon: '📍', description: 'When a specific step begins', requiresSelection: true },
  { type: 'step_completed', label: 'Step completes', icon: '✅', description: 'When a specific step ends', requiresSelection: true },
  { type: 'phase_started', label: 'Phase starts', icon: '🎭', description: 'When a phase begins', requiresSelection: true },
  { type: 'phase_completed', label: 'Phase ends', icon: '🏁', description: 'When a phase completes', requiresSelection: true },
  { type: 'decision_resolved', label: 'Decision is made', icon: '🗳️', description: 'When participants vote', requiresSelection: true },
  { type: 'timer_ended', label: 'Timer ends', icon: '⏱️', description: 'When a timer runs out', requiresSelection: true },
  { type: 'artifact_unlocked', label: 'Artifact unlocked', icon: '📦', description: 'When an artifact is revealed', requiresSelection: true },
  { type: 'keypad_correct', label: 'Keypad solved', icon: '🔐', description: 'When correct code entered', requiresSelection: true },
  { type: 'keypad_failed', label: 'Keypad failed', icon: '🚫', description: 'When max attempts reached', requiresSelection: true },
  { type: 'signal_received', label: 'Signal received', icon: '📡', description: 'When a signal is emitted on a channel', requiresSelection: false },
  { type: 'manual', label: 'Manual trigger', icon: '🎯', description: 'Host presses a button', requiresSelection: false },
];

/** Action options for dropdown */
export const ACTION_OPTIONS: ActionMeta[] = [
  { type: 'reveal_artifact', label: 'Reveal artifact', icon: '📦', description: 'Show a hidden artifact' },
  { type: 'hide_artifact', label: 'Hide artifact', icon: '🙈', description: 'Hide a visible artifact' },
  { type: 'unlock_decision', label: 'Unlock decision', icon: '🗳️', description: 'Enable voting on a decision' },
  { type: 'lock_decision', label: 'Lock decision', icon: '🔒', description: 'Disable voting on a decision' },
  { type: 'advance_step', label: 'Advance step', icon: '⏭️', description: 'Move to the next step' },
  { type: 'advance_phase', label: 'Advance phase', icon: '🎭', description: 'Move to the next phase' },
  { type: 'start_timer', label: 'Start timer', icon: '⏱️', description: 'Begin a countdown timer' },
  { type: 'send_message', label: 'Send message', icon: '💬', description: 'Post to the wall/board' },
  { type: 'send_signal', label: 'Send signal', icon: '📡', description: 'Emit a signal on a channel' },
  { type: 'time_bank_apply_delta', label: 'Time bank delta', icon: '⏳', description: 'Add/remove seconds from the session time bank' },
  { type: 'play_sound', label: 'Play sound', icon: '🔊', description: 'Play an audio effect' },
  { type: 'show_countdown', label: 'Show countdown', icon: '⏳', description: 'Display countdown overlay' },
  { type: 'reset_keypad', label: 'Reset keypad', icon: '🔄', description: 'Reset keypad to locked state' },
];

/** Helper to get condition label */
export function getConditionLabel(type: TriggerConditionType): string {
  return CONDITION_OPTIONS.find(c => c.type === type)?.label ?? type;
}

/** Helper to get action label */
export function getActionLabel(type: TriggerActionType): string {
  return ACTION_OPTIONS.find(a => a.type === type)?.label ?? type;
}

/** Helper to get condition icon */
export function getConditionIcon(type: TriggerConditionType): string {
  return CONDITION_OPTIONS.find(c => c.type === type)?.icon ?? '⚡';
}

/** Helper to get action icon */
export function getActionIcon(type: TriggerActionType): string {
  return ACTION_OPTIONS.find(a => a.type === type)?.icon ?? '▶️';
}
