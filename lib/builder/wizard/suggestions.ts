/**
 * Trigger Suggestions
 *
 * Smart suggestions for trigger conditions and actions.
 * Uses the registry from lib/domain/enums.ts.
 *
 * @see docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md
 */

import {
  TRIGGER_CONDITION_TYPES,
  TRIGGER_ACTION_TYPES,
  type TriggerConditionType,
  type TriggerActionType,
} from '@/lib/domain/enums';

// =============================================================================
// CONDITION → ACTION MAPPING
// =============================================================================

/**
 * Map condition types to their commonly paired action types.
 * This helps wizard suggest relevant actions when a condition is selected.
 */
const CONDITION_TO_ACTIONS: Partial<Record<TriggerConditionType, TriggerActionType[]>> = {
  // Core navigation events
  step_started: ['reveal_artifact', 'start_timer', 'play_sound', 'show_leader_script'],
  step_completed: ['advance_step', 'reveal_artifact', 'send_message', 'play_sound'],
  phase_started: ['reveal_artifact', 'start_timer', 'send_message', 'show_leader_script'],
  phase_completed: ['advance_phase', 'reveal_artifact', 'send_message', 'play_sound'],

  // Timer events
  timer_ended: ['advance_step', 'advance_phase', 'send_message', 'play_sound', 'reveal_artifact'],

  // Decision events
  decision_resolved: ['advance_step', 'reveal_artifact', 'send_message', 'unlock_decision'],

  // Artifact events
  artifact_unlocked: ['reveal_artifact', 'send_message', 'unlock_decision', 'advance_step'],

  // Puzzle - keypad
  keypad_correct: ['reveal_artifact', 'advance_step', 'play_sound', 'send_message', 'unlock_decision'],
  keypad_failed: ['send_message', 'play_sound', 'send_hint', 'reset_keypad'],

  // Puzzle - riddle
  riddle_correct: ['reveal_artifact', 'advance_step', 'play_sound', 'send_message'],

  // Manual & signals
  manual: ['reveal_artifact', 'advance_step', 'advance_phase', 'send_message', 'play_sound'],
  signal_received: ['reveal_artifact', 'advance_step', 'send_message', 'play_sound'],

  // Counter events
  counter_reached: ['reveal_artifact', 'advance_step', 'send_message', 'play_sound'],

  // Audio events
  audio_acknowledged: ['advance_step', 'reveal_artifact'],

  // Scan events
  scan_verified: ['reveal_artifact', 'advance_step', 'play_sound', 'send_message'],

  // Hint events
  hint_requested: ['send_hint', 'send_message'],

  // Hotspot events
  hotspot_found: ['reveal_artifact', 'send_message', 'increment_counter'],
  hotspot_hunt_complete: ['reveal_artifact', 'advance_step', 'play_sound', 'send_message'],

  // Puzzle completion events
  tile_puzzle_complete: ['reveal_artifact', 'advance_step', 'play_sound'],
  cipher_decoded: ['reveal_artifact', 'advance_step', 'play_sound'],
  logic_grid_solved: ['reveal_artifact', 'advance_step', 'play_sound'],

  // Prop events
  prop_confirmed: ['reveal_artifact', 'advance_step', 'play_sound'],
  prop_rejected: ['send_message', 'send_hint', 'reset_prop'],

  // Location events
  location_verified: ['reveal_artifact', 'advance_step', 'play_sound'],

  // Sound level events
  sound_level_triggered: ['send_message', 'play_sound', 'advance_step'],

  // Signal generator
  signal_generator_triggered: ['reveal_artifact', 'send_signal', 'send_message'],

  // Time bank
  time_bank_expired: ['advance_step', 'advance_phase', 'send_message', 'play_sound'],
};

// =============================================================================
// ACTION → CONDITION MAPPING (reverse)
// =============================================================================

/**
 * Map action types to conditions that commonly trigger them.
 * Useful when user picks an action first and needs condition suggestions.
 */
const ACTION_TO_CONDITIONS: Partial<Record<TriggerActionType, TriggerConditionType[]>> = {
  reveal_artifact: [
    'step_started',
    'step_completed',
    'keypad_correct',
    'riddle_correct',
    'timer_ended',
    'manual',
    'signal_received',
    'scan_verified',
    'hotspot_hunt_complete',
    'tile_puzzle_complete',
    'cipher_decoded',
    'logic_grid_solved',
  ],
  advance_step: [
    'step_completed',
    'timer_ended',
    'keypad_correct',
    'riddle_correct',
    'manual',
    'decision_resolved',
    'hotspot_hunt_complete',
  ],
  advance_phase: ['phase_completed', 'timer_ended', 'manual', 'time_bank_expired'],
  send_message: [
    'step_started',
    'step_completed',
    'keypad_failed',
    'manual',
    'hint_requested',
    'prop_rejected',
  ],
  play_sound: [
    'step_completed',
    'phase_completed',
    'keypad_correct',
    'timer_ended',
    'manual',
  ],
  send_hint: ['hint_requested', 'keypad_failed', 'prop_rejected'],
  start_timer: ['step_started', 'phase_started'],
  show_leader_script: ['step_started', 'phase_started'],
  unlock_decision: ['artifact_unlocked', 'keypad_correct', 'step_completed'],
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get suggested actions for a given condition type.
 */
export function getSuggestedActionsForCondition(
  conditionType: TriggerConditionType
): TriggerActionType[] {
  // Return mapped suggestions or common defaults
  return CONDITION_TO_ACTIONS[conditionType] ?? [
    'reveal_artifact',
    'send_message',
    'advance_step',
  ];
}

/**
 * Get suggested conditions for a given action type.
 */
export function getSuggestedConditionsForAction(
  actionType: TriggerActionType
): TriggerConditionType[] {
  // Return mapped suggestions or common defaults
  return ACTION_TO_CONDITIONS[actionType] ?? ['manual', 'step_started', 'step_completed'];
}

/**
 * Get all condition types.
 */
export function getAllConditionTypes(): readonly TriggerConditionType[] {
  return TRIGGER_CONDITION_TYPES;
}

/**
 * Get all action types.
 */
export function getAllActionTypes(): readonly TriggerActionType[] {
  return TRIGGER_ACTION_TYPES;
}

/**
 * Check if a condition is a puzzle-related condition.
 */
export function isPuzzleCondition(conditionType: TriggerConditionType): boolean {
  const puzzleConditions: TriggerConditionType[] = [
    'keypad_correct',
    'keypad_failed',
    'riddle_correct',
    'hotspot_found',
    'hotspot_hunt_complete',
    'tile_puzzle_complete',
    'cipher_decoded',
    'logic_grid_solved',
    'scan_verified',
  ];
  return puzzleConditions.includes(conditionType);
}

/**
 * Check if an action is a reset action.
 */
export function isResetAction(actionType: TriggerActionType): boolean {
  return actionType.startsWith('reset_');
}

/**
 * Get human-readable label for condition type.
 */
export function getConditionLabel(conditionType: TriggerConditionType): string {
  const labels: Partial<Record<TriggerConditionType, string>> = {
    step_started: 'Steg startat',
    step_completed: 'Steg avslutat',
    phase_started: 'Fas startad',
    phase_completed: 'Fas avslutad',
    decision_resolved: 'Beslut taget',
    timer_ended: 'Timer slut',
    artifact_unlocked: 'Artefakt upplåst',
    keypad_correct: 'Korrekt kod',
    keypad_failed: 'Fel kod',
    riddle_correct: 'Rätt svar på gåta',
    manual: 'Manuell trigger',
    signal_received: 'Signal mottagen',
    counter_reached: 'Räknare nådd',
    hint_requested: 'Ledtråd efterfrågad',
    hotspot_found: 'Hotspot hittad',
    hotspot_hunt_complete: 'Alla hotspots hittade',
    tile_puzzle_complete: 'Plattor klara',
    cipher_decoded: 'Chiffer löst',
    logic_grid_solved: 'Logikpussel löst',
    prop_confirmed: 'Prop bekräftad',
    prop_rejected: 'Prop avvisad',
    location_verified: 'Plats verifierad',
    sound_level_triggered: 'Ljudnivå nådd',
    scan_verified: 'Scan verifierad',
  };
  return labels[conditionType] ?? conditionType.replace(/_/g, ' ');
}

/**
 * Get human-readable label for action type.
 */
export function getActionLabel(actionType: TriggerActionType): string {
  const labels: Partial<Record<TriggerActionType, string>> = {
    reveal_artifact: 'Visa artefakt',
    hide_artifact: 'Dölj artefakt',
    unlock_decision: 'Lås upp beslut',
    lock_decision: 'Lås beslut',
    advance_step: 'Gå till nästa steg',
    advance_phase: 'Gå till nästa fas',
    start_timer: 'Starta timer',
    send_message: 'Skicka meddelande',
    play_sound: 'Spela ljud',
    show_countdown: 'Visa nedräkning',
    send_signal: 'Skicka signal',
    send_hint: 'Skicka ledtråd',
    show_leader_script: 'Visa ledarmanus',
    reset_keypad: 'Återställ knappsats',
    reset_riddle: 'Återställ gåta',
    increment_counter: 'Öka räknare',
    reset_counter: 'Återställ räknare',
  };
  return labels[actionType] ?? actionType.replace(/_/g, ' ');
}

// =============================================================================
// WIZARD-SPECIFIC HELPERS
// =============================================================================

/**
 * Get beginner-friendly conditions (for simple mode).
 */
export function getBeginnerConditions(): TriggerConditionType[] {
  return ['step_started', 'step_completed', 'timer_ended', 'manual'];
}

/**
 * Get beginner-friendly actions (for simple mode).
 */
export function getBeginnerActions(): TriggerActionType[] {
  return [
    'reveal_artifact',
    'advance_step',
    'send_message',
    'play_sound',
    'start_timer',
  ];
}

/**
 * Suggest a trigger template for common use cases.
 */
export function suggestTriggerTemplate(useCase: 'reveal-on-start' | 'advance-on-timer' | 'puzzle-reward'): {
  conditionType: TriggerConditionType;
  actionTypes: TriggerActionType[];
} {
  switch (useCase) {
    case 'reveal-on-start':
      return {
        conditionType: 'step_started',
        actionTypes: ['reveal_artifact'],
      };
    case 'advance-on-timer':
      return {
        conditionType: 'timer_ended',
        actionTypes: ['advance_step', 'send_message'],
      };
    case 'puzzle-reward':
      return {
        conditionType: 'keypad_correct',
        actionTypes: ['reveal_artifact', 'play_sound', 'send_message'],
      };
  }
}
