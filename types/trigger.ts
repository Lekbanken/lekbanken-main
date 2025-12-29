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

/** Counter reached target condition */
export interface CounterReachedCondition {
  type: 'counter_reached';
  /** Counter key to watch */
  counterKey: string;
  /** Target value (optional - uses counter's target if not set) */
  targetValue?: number;
}

/** Riddle answered correctly condition */
export interface RiddleCorrectCondition {
  type: 'riddle_correct';
  /** Riddle artifact ID */
  riddleId: string;
}

/** Audio acknowledged condition */
export interface AudioAcknowledgedCondition {
  type: 'audio_acknowledged';
  /** Audio artifact ID */
  audioId: string;
}

/** Multi-answer verification complete condition */
export interface MultiAnswerCompleteCondition {
  type: 'multi_answer_complete';
  /** Multi-answer artifact ID */
  multiAnswerId: string;
}

/** QR/NFC scan verified condition */
export interface ScanVerifiedCondition {
  type: 'scan_verified';
  /** Scan gate artifact ID */
  scanGateId: string;
}

/** Hint requested condition */
export interface HintRequestedCondition {
  type: 'hint_requested';
  /** Optional specific hint ID */
  hintId?: string;
}

/** Hotspot found condition */
export interface HotspotFoundCondition {
  type: 'hotspot_found';
  /** Hotspot hunt artifact ID */
  hotspotHuntId: string;
  /** Specific hotspot ID (optional - any hotspot if not set) */
  hotspotId?: string;
}

/** Hotspot hunt complete condition */
export interface HotspotHuntCompleteCondition {
  type: 'hotspot_hunt_complete';
  /** Hotspot hunt artifact ID */
  hotspotHuntId: string;
}

/** Tile puzzle completed condition */
export interface TilePuzzleCompleteCondition {
  type: 'tile_puzzle_complete';
  /** Tile puzzle artifact ID */
  tilePuzzleId: string;
}

/** Cipher decoded condition */
export interface CipherDecodedCondition {
  type: 'cipher_decoded';
  /** Cipher puzzle artifact ID */
  cipherId: string;
}

/** Prop confirmed condition */
export interface PropConfirmedCondition {
  type: 'prop_confirmed';
  /** Prop confirmation artifact ID */
  propId: string;
}

/** Prop rejected condition */
export interface PropRejectedCondition {
  type: 'prop_rejected';
  /** Prop confirmation artifact ID */
  propId: string;
}

/** Location verified condition */
export interface LocationVerifiedCondition {
  type: 'location_verified';
  /** Location check artifact ID */
  locationId: string;
}

/** Logic grid solved condition */
export interface LogicGridSolvedCondition {
  type: 'logic_grid_solved';
  /** Logic grid artifact ID */
  gridId: string;
}

/** Sound level triggered condition */
export interface SoundLevelTriggeredCondition {
  type: 'sound_level_triggered';
  /** Sound level meter artifact ID */
  soundMeterId: string;
}

/** Replay marker added condition */
export interface ReplayMarkerAddedCondition {
  type: 'replay_marker_added';
  /** Optional marker type filter */
  markerType?: string;
}

/** Time bank expired condition (Task 2.2) */
export interface TimeBankExpiredCondition {
  type: 'time_bank_expired';
  /** Time bank artifact ID (optional - default session time bank) */
  timeBankId?: string;
}

/** Signal generator triggered condition (Task 2.1) */
export interface SignalGeneratorTriggeredCondition {
  type: 'signal_generator_triggered';
  /** Signal generator artifact ID */
  signalGeneratorId: string;
  /** Signal key to match */
  signalKey?: string;
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
  | SignalReceivedCondition
  | CounterReachedCondition
  | RiddleCorrectCondition
  | AudioAcknowledgedCondition
  | MultiAnswerCompleteCondition
  | ScanVerifiedCondition
  | HintRequestedCondition
  | HotspotFoundCondition
  | HotspotHuntCompleteCondition
  | TilePuzzleCompleteCondition
  | CipherDecodedCondition
  | PropConfirmedCondition
  | PropRejectedCondition
  | LocationVerifiedCondition
  | LogicGridSolvedCondition
  | SoundLevelTriggeredCondition
  | ReplayMarkerAddedCondition
  | TimeBankExpiredCondition
  | SignalGeneratorTriggeredCondition;

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

/** Increment a counter */
export interface IncrementCounterAction {
  type: 'increment_counter';
  counterKey: string;
  amount?: number; // default: 1
}

/** Reset a counter to initial value */
export interface ResetCounterAction {
  type: 'reset_counter';
  counterKey: string;
}

/** Reset a riddle to allow new attempts */
export interface ResetRiddleAction {
  type: 'reset_riddle';
  riddleId: string;
}

/** Send a hint to participants */
export interface SendHintAction {
  type: 'send_hint';
  /** Hint ID to reveal, or 'next' for next available */
  hintId: string;
  /** Skip cooldown */
  skipCooldown?: boolean;
}

/** Reset scan gate state */
export interface ResetScanGateAction {
  type: 'reset_scan_gate';
  scanGateId: string;
}

/** Reset hotspot hunt state */
export interface ResetHotspotHuntAction {
  type: 'reset_hotspot_hunt';
  hotspotHuntId: string;
}

/** Reset tile puzzle to shuffled state */
export interface ResetTilePuzzleAction {
  type: 'reset_tile_puzzle';
  tilePuzzleId: string;
}

/** Reset cipher decoder state */
export interface ResetCipherAction {
  type: 'reset_cipher';
  cipherId: string;
}

/** Reset prop confirmation state */
export interface ResetPropAction {
  type: 'reset_prop';
  propId: string;
}

/** Reset location check state */
export interface ResetLocationAction {
  type: 'reset_location';
  locationId: string;
}

/** Reset logic grid state */
export interface ResetLogicGridAction {
  type: 'reset_logic_grid';
  gridId: string;
}

/** Reset sound level meter state */
export interface ResetSoundMeterAction {
  type: 'reset_sound_meter';
  soundMeterId: string;
}

/** Add replay marker action */
export interface AddReplayMarkerAction {
  type: 'add_replay_marker';
  markerType: string;
  label: string;
}

/** Show leader script panel with specific content (Task 2.5) */
export interface ShowLeaderScriptAction {
  type: 'show_leader_script';
  /** Step ID to show script for (optional - current step if not set) */
  stepId?: string;
  /** Custom script content (optional - uses step's leader_script if not set) */
  customScript?: string;
  /** Auto-dismiss after seconds (optional) */
  autoDismissSeconds?: number;
}

/** Trigger a signal generator artifact (Task 2.1) */
export interface TriggerSignalAction {
  type: 'trigger_signal';
  /** Signal generator artifact ID */
  signalGeneratorId: string;
}

/** Pause/resume time bank (Task 2.2) */
export interface TimeBankPauseAction {
  type: 'time_bank_pause';
  /** Pause (true) or resume (false) */
  pause: boolean;
  /** Time bank artifact ID (optional - default session time bank) */
  timeBankId?: string;
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
  | TimeBankApplyDeltaAction
  | IncrementCounterAction
  | ResetCounterAction
  | ResetRiddleAction
  | SendHintAction
  | ResetScanGateAction
  | ResetHotspotHuntAction
  | ResetTilePuzzleAction
  | ResetCipherAction
  | ResetPropAction
  | ResetLocationAction
  | ResetLogicGridAction
  | ResetSoundMeterAction
  | AddReplayMarkerAction
  | ShowLeaderScriptAction
  | TriggerSignalAction
  | TimeBankPauseAction;

/** Action types for UI dropdowns */
export type TriggerActionType = TriggerAction['type'];

// ============================================================================
// Trigger Definition
// ============================================================================

/** Status of a trigger */
export type TriggerStatus = 'armed' | 'fired' | 'disabled' | 'error';

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
  
  /** Last error message (if status is 'error') */
  lastError?: string;
  /** Timestamp of last error */
  lastErrorAt?: Date;
  /** Number of times this trigger has errored */
  errorCount: number;
  
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
