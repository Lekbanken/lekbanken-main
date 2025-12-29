'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import type { SessionTrigger } from '@/types/games';
import type { TriggerCondition, TriggerAction, TriggerConditionType } from '@/types/trigger';

// =============================================================================
// Types
// =============================================================================

/** Events that can fire triggers */
export type TriggerEvent =
  | { type: 'step_started'; stepId: string }
  | { type: 'step_completed'; stepId: string }
  | { type: 'phase_started'; phaseId: string }
  | { type: 'phase_completed'; phaseId: string }
  | { type: 'keypad_correct'; keypadId: string }
  | { type: 'keypad_failed'; keypadId: string }
  | { type: 'artifact_unlocked'; artifactId: string }
  | { type: 'timer_ended'; timerId: string }
  | { type: 'decision_resolved'; decisionId: string; outcome?: string }
  | { type: 'signal_received'; channel: string; payload?: unknown; sender_user_id?: string; sender_participant_id?: string }
  | { type: 'manual'; triggerId: string }
  // Puzzle module events (Task 2.4)
  | { type: 'counter_reached'; counterKey: string; value: number }
  | { type: 'riddle_correct'; riddleId: string }
  | { type: 'audio_acknowledged'; audioId: string }
  | { type: 'multi_answer_complete'; multiAnswerId: string }
  | { type: 'scan_verified'; scanGateId: string }
  | { type: 'prop_confirmed'; propId: string }
  | { type: 'prop_rejected'; propId: string }
  | { type: 'location_verified'; locationId: string }
  | { type: 'logic_grid_solved'; gridId: string }
  | { type: 'sound_level_triggered'; soundMeterId: string }
  | { type: 'hotspot_found'; hotspotHuntId: string; hotspotId?: string }
  | { type: 'hotspot_hunt_complete'; hotspotHuntId: string }
  | { type: 'tile_puzzle_complete'; tilePuzzleId: string }
  | { type: 'cipher_decoded'; cipherId: string }
  | { type: 'hint_requested'; hintId?: string }
  | { type: 'replay_marker_added'; markerType?: string }
  // Session Cockpit events (Task 2.1-2.2)
  | { type: 'time_bank_expired'; timeBankId?: string }
  | { type: 'signal_generator_triggered'; signalGeneratorId: string; signalKey?: string };

export interface TriggerActionContext {
  sessionId: string;
  /** Broadcast countdown overlay */
  broadcastCountdown: (action: 'show' | 'hide', duration: number, message?: string) => Promise<boolean>;
  /** Broadcast state change */
  broadcastStateChange: (updates: Record<string, unknown>) => Promise<boolean>;
  /** Update artifact visibility */
  updateArtifactVisibility?: (artifactId: string, visible: boolean) => Promise<void>;
  /** Advance to next step */
  advanceStep?: () => Promise<void>;
  /** Advance to next phase */
  advancePhase?: () => Promise<void>;
  /** Start a timer */
  startTimer?: (duration: number, name: string) => Promise<void>;
  /** Send message to board */
  sendBoardMessage?: (message: string, style: 'normal' | 'dramatic' | 'typewriter') => Promise<void>;

  /** Emit a signal on a channel */
  sendSignal?: (channel: string, payload: unknown) => Promise<void>;

  /** Apply a delta to the session time bank */
  applyTimeBankDelta?: (
    deltaSeconds: number,
    reason: string,
    options?: {
      minBalanceSeconds?: number;
      maxBalanceSeconds?: number;
      metadata?: Record<string, unknown> | null;
    }
  ) => Promise<void>;

  // New action handlers (Task 2.5)
  /** Show leader script panel */
  showLeaderScript?: (stepId?: string, customScript?: string, autoDismissSeconds?: number) => Promise<void>;
  /** Trigger a signal generator artifact */
  triggerSignal?: (signalGeneratorId: string) => Promise<void>;
  /** Pause or resume time bank */
  pauseTimeBank?: (pause: boolean, timeBankId?: string) => Promise<void>;
  /** Add a replay marker */
  addReplayMarker?: (markerType: string, label: string) => Promise<void>;
  /** Increment a counter */
  incrementCounter?: (counterKey: string, amount: number) => Promise<void>;
  /** Send a hint */
  sendHint?: (hintId: string, skipCooldown?: boolean) => Promise<void>;
}

export interface UseTriggerEngineOptions {
  /** Session ID */
  sessionId: string;
  /** Current triggers */
  triggers: SessionTrigger[];
  /** Context for executing actions */
  actionContext: TriggerActionContext;
  /** Called when a trigger fires */
  onTriggerFired?: (trigger: SessionTrigger, actions: TriggerAction[]) => void;
  /** Called to update trigger status in database */
  onTriggerStatusUpdate?: (triggerId: string, status: 'armed' | 'fired' | 'disabled' | 'error') => Promise<void>;
  /** Called when a trigger encounters an error */
  onTriggerError?: (trigger: SessionTrigger, error: Error, action?: TriggerAction) => void;
  /** Whether the engine is enabled */
  enabled?: boolean;
}

export interface TriggerError {
  triggerId: string;
  triggerName: string;
  actionType?: string;
  errorMessage: string;
  timestamp: Date;
}

export interface UseTriggerEngineReturn {
  /** Process an event and fire matching triggers */
  processEvent: (event: TriggerEvent) => Promise<void>;
  /** Manually fire a specific trigger */
  fireTrigger: (triggerId: string) => Promise<void>;
  /** Get triggers that match a condition type */
  getTriggersForCondition: (conditionType: TriggerConditionType) => SessionTrigger[];
  /** Recent trigger errors (kept in memory for display) */
  recentErrors: TriggerError[];
  /** Clear all errors */
  clearErrors: () => void;
}

// =============================================================================
// Condition Matching
// =============================================================================

function conditionMatches(condition: TriggerCondition, event: TriggerEvent): boolean {
  if (condition.type !== event.type) return false;

  switch (condition.type) {
    case 'step_started':
    case 'step_completed':
      return 'stepId' in condition && 'stepId' in event && condition.stepId === event.stepId;

    case 'phase_started':
    case 'phase_completed':
      return 'phaseId' in condition && 'phaseId' in event && condition.phaseId === event.phaseId;

    case 'keypad_correct':
    case 'keypad_failed':
      return 'keypadId' in condition && 'keypadId' in event && condition.keypadId === event.keypadId;

    case 'artifact_unlocked':
      return 'artifactId' in condition && 'artifactId' in event && condition.artifactId === event.artifactId;

    case 'timer_ended':
      return 'timerId' in condition && 'timerId' in event && condition.timerId === event.timerId;

    case 'decision_resolved':
      if (!('decisionId' in condition) || !('decisionId' in event)) return false;
      if (condition.decisionId !== event.decisionId) return false;
      // If outcome is specified, it must match
      if ('outcome' in condition && condition.outcome && 'outcome' in event) {
        return condition.outcome === event.outcome;
      }
      return true;

    case 'manual':
      // Manual triggers are only fired explicitly, not by events
      return false;

    case 'signal_received':
      if (!('channel' in event)) return false;
      if ('channel' in condition && condition.channel && condition.channel.trim().length > 0) {
        return condition.channel === event.channel;
      }
      return true;

    // New conditions (Task 2.4)
    case 'counter_reached':
      return 'counterKey' in condition && 'counterKey' in event && condition.counterKey === event.counterKey;

    case 'riddle_correct':
      return 'riddleId' in condition && 'riddleId' in event && condition.riddleId === event.riddleId;

    case 'audio_acknowledged':
      return 'audioId' in condition && 'audioId' in event && condition.audioId === event.audioId;

    case 'multi_answer_complete':
      return 'multiAnswerId' in condition && 'multiAnswerId' in event && condition.multiAnswerId === event.multiAnswerId;

    case 'scan_verified':
      return 'scanGateId' in condition && 'scanGateId' in event && condition.scanGateId === event.scanGateId;

    case 'prop_confirmed':
    case 'prop_rejected':
      return 'propId' in condition && 'propId' in event && condition.propId === event.propId;

    case 'location_verified':
      return 'locationId' in condition && 'locationId' in event && condition.locationId === event.locationId;

    case 'logic_grid_solved':
      return 'gridId' in condition && 'gridId' in event && condition.gridId === event.gridId;

    case 'sound_level_triggered':
      return 'soundMeterId' in condition && 'soundMeterId' in event && condition.soundMeterId === event.soundMeterId;

    case 'time_bank_expired':
      // Match session time bank or specific time bank artifact
      if ('timeBankId' in condition && condition.timeBankId) {
        return 'timeBankId' in event && condition.timeBankId === event.timeBankId;
      }
      return true; // Any time bank expired event matches if no specific ID

    case 'signal_generator_triggered':
      if (!('signalGeneratorId' in condition) || !('signalGeneratorId' in event)) return false;
      if (condition.signalGeneratorId !== event.signalGeneratorId) return false;
      // Optional signal key match
      if ('signalKey' in condition && condition.signalKey && 'signalKey' in event) {
        return condition.signalKey === event.signalKey;
      }
      return true;

    case 'hotspot_found':
      if (!('hotspotHuntId' in condition) || !('hotspotHuntId' in event)) return false;
      if (condition.hotspotHuntId !== event.hotspotHuntId) return false;
      if ('hotspotId' in condition && condition.hotspotId && 'hotspotId' in event) {
        return condition.hotspotId === event.hotspotId;
      }
      return true;

    case 'hotspot_hunt_complete':
      return 'hotspotHuntId' in condition && 'hotspotHuntId' in event && condition.hotspotHuntId === event.hotspotHuntId;

    case 'tile_puzzle_complete':
      return 'tilePuzzleId' in condition && 'tilePuzzleId' in event && condition.tilePuzzleId === event.tilePuzzleId;

    case 'cipher_decoded':
      return 'cipherId' in condition && 'cipherId' in event && condition.cipherId === event.cipherId;

    case 'hint_requested':
      if ('hintId' in condition && condition.hintId && 'hintId' in event) {
        return condition.hintId === event.hintId;
      }
      return true; // Any hint requested matches if no specific ID

    case 'replay_marker_added':
      if ('markerType' in condition && condition.markerType && 'markerType' in event) {
        return condition.markerType === event.markerType;
      }
      return true;

    default:
      return false;
  }
}

// =============================================================================
// Action Execution
// =============================================================================

async function executeAction(
  action: TriggerAction,
  context: TriggerActionContext
): Promise<void> {
  switch (action.type) {
    case 'show_countdown':
      await context.broadcastCountdown('show', action.duration, action.message);
      break;

    case 'reveal_artifact':
      if (context.updateArtifactVisibility) {
        await context.updateArtifactVisibility(action.artifactId, true);
      }
      break;

    case 'hide_artifact':
      if (context.updateArtifactVisibility) {
        await context.updateArtifactVisibility(action.artifactId, false);
      }
      break;

    case 'advance_step':
      if (context.advanceStep) {
        await context.advanceStep();
      }
      break;

    case 'advance_phase':
      if (context.advancePhase) {
        await context.advancePhase();
      }
      break;

    case 'start_timer':
      if (context.startTimer) {
        await context.startTimer(action.duration, action.name);
      }
      break;

    case 'send_message':
      if (context.sendBoardMessage) {
        await context.sendBoardMessage(action.message, action.style);
      }
      break;

    case 'send_signal':
      if (context.sendSignal) {
        await context.sendSignal(action.channel, { message: action.message });
      } else {
        console.log(`[TriggerEngine] send_signal not yet implemented`, action);
      }
      break;

    case 'time_bank_apply_delta':
      if (context.applyTimeBankDelta) {
        await context.applyTimeBankDelta(action.deltaSeconds, action.reason, {
          minBalanceSeconds: action.minBalanceSeconds,
          maxBalanceSeconds: action.maxBalanceSeconds,
          metadata: null,
        });
      } else {
        console.log(`[TriggerEngine] time_bank_apply_delta not yet implemented`, action);
      }
      break;

    case 'unlock_decision':
    case 'lock_decision':
      // TODO: Implement decision locking when decisions are fully integrated
      console.log(`[TriggerEngine] ${action.type} not yet implemented`, action);
      break;

    case 'play_sound':
      // TODO: Implement sound playback
      console.log(`[TriggerEngine] play_sound not yet implemented`, action);
      break;

    case 'reset_keypad':
      // TODO: Implement keypad reset
      console.log(`[TriggerEngine] reset_keypad not yet implemented`, action);
      break;

    // New actions (Task 2.5)
    case 'show_leader_script':
      if (context.showLeaderScript) {
        await context.showLeaderScript(action.stepId, action.customScript, action.autoDismissSeconds);
      } else {
        console.log(`[TriggerEngine] show_leader_script triggered`, action);
      }
      break;

    case 'trigger_signal':
      if (context.triggerSignal) {
        await context.triggerSignal(action.signalGeneratorId);
      } else {
        console.log(`[TriggerEngine] trigger_signal triggered`, action);
      }
      break;

    case 'time_bank_pause':
      if (context.pauseTimeBank) {
        await context.pauseTimeBank(action.pause, action.timeBankId);
      } else {
        console.log(`[TriggerEngine] time_bank_pause triggered`, action);
      }
      break;

    case 'add_replay_marker':
      if (context.addReplayMarker) {
        await context.addReplayMarker(action.markerType, action.label);
      } else {
        console.log(`[TriggerEngine] add_replay_marker triggered`, action);
      }
      break;

    case 'increment_counter':
      if (context.incrementCounter) {
        await context.incrementCounter(action.counterKey, action.amount ?? 1);
      } else {
        console.log(`[TriggerEngine] increment_counter not yet implemented`, action);
      }
      break;

    case 'reset_counter':
      console.log(`[TriggerEngine] reset_counter not yet implemented`, action);
      break;

    case 'reset_riddle':
      console.log(`[TriggerEngine] reset_riddle not yet implemented`, action);
      break;

    case 'send_hint':
      if (context.sendHint) {
        await context.sendHint(action.hintId, action.skipCooldown);
      } else {
        console.log(`[TriggerEngine] send_hint not yet implemented`, action);
      }
      break;

    default:
      console.warn(`[TriggerEngine] Unknown action type:`, action);
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useTriggerEngine({
  sessionId: _sessionId,
  triggers,
  actionContext,
  onTriggerFired,
  onTriggerStatusUpdate,
  onTriggerError,
  enabled = true,
}: UseTriggerEngineOptions): UseTriggerEngineReturn {
  // Keep a ref to triggers to avoid stale closures
  const triggersRef = useRef(triggers);
  useEffect(() => {
    triggersRef.current = triggers;
  }, [triggers]);

  // Track recent errors in memory
  const [recentErrors, setRecentErrors] = useState<TriggerError[]>([]);
  const MAX_ERRORS = 20;

  const addError = useCallback((trigger: SessionTrigger, error: Error, action?: TriggerAction) => {
    const triggerError: TriggerError = {
      triggerId: trigger.id,
      triggerName: trigger.name,
      actionType: action?.type,
      errorMessage: error.message,
      timestamp: new Date(),
    };
    
    setRecentErrors((prev) => {
      const updated = [triggerError, ...prev].slice(0, MAX_ERRORS);
      return updated;
    });
    
    // Call external error handler
    onTriggerError?.(trigger, error, action);
  }, [onTriggerError]);

  const clearErrors = useCallback(() => {
    setRecentErrors([]);
  }, []);

  // Execute a trigger's actions with optional delay
  const executeTrigger = useCallback(
    async (trigger: SessionTrigger) => {
      const executeActions = async () => {
        console.log(`[TriggerEngine] Firing trigger: ${trigger.name}`);

        let hasError = false;
        let lastError: Error | null = null;

        // Execute actions in sequence
        for (const action of trigger.actions) {
          try {
            await executeAction(action, actionContext);
          } catch (error) {
            hasError = true;
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`[TriggerEngine] Action failed:`, action, error);
            addError(trigger, lastError, action);
            // Continue with other actions even if one fails
          }
        }

        // If any action failed, update status to error
        if (hasError && onTriggerStatusUpdate) {
          try {
            await onTriggerStatusUpdate(trigger.id, 'error');
          } catch (error) {
            console.error(`[TriggerEngine] Failed to update trigger error status:`, error);
          }
          return; // Don't notify as fired if there was an error
        }

        // Notify callback
        onTriggerFired?.(trigger, trigger.actions);

        // Update status
        const newStatus = trigger.execute_once ? 'disabled' : 'fired';
        if (onTriggerStatusUpdate) {
          try {
            await onTriggerStatusUpdate(trigger.id, newStatus);
          } catch (error) {
            console.error(`[TriggerEngine] Failed to update trigger status:`, error);
          }
        }
      };

      // Handle delay
      if (trigger.delay_seconds && trigger.delay_seconds > 0) {
        setTimeout(() => {
          void executeActions();
        }, trigger.delay_seconds * 1000);
      } else {
        await executeActions();
      }
    },
    [actionContext, onTriggerFired, onTriggerStatusUpdate, addError]
  );

  // Process an event and fire matching triggers
  const processEvent = useCallback(
    async (event: TriggerEvent) => {
      if (!enabled) return;

      const currentTriggers = triggersRef.current;

      // Find matching armed triggers
      const matchingTriggers = currentTriggers.filter(
        (t) => t.enabled && t.status === 'armed' && conditionMatches(t.condition, event)
      );

      console.log(
        `[TriggerEngine] Event: ${event.type}, matching triggers: ${matchingTriggers.length}`
      );

      // Execute matching triggers
      for (const trigger of matchingTriggers) {
        await executeTrigger(trigger);
      }
    },
    [enabled, executeTrigger]
  );

  // Manually fire a specific trigger (for manual type)
  const fireTrigger = useCallback(
    async (triggerId: string) => {
      const trigger = triggersRef.current.find((t) => t.id === triggerId);

      if (!trigger) {
        console.warn(`[TriggerEngine] Trigger not found: ${triggerId}`);
        return;
      }

      if (trigger.status !== 'armed') {
        console.warn(`[TriggerEngine] Trigger not armed: ${triggerId}`);
        return;
      }

      await executeTrigger(trigger);
    },
    [executeTrigger]
  );

  // Get triggers for a specific condition type
  const getTriggersForCondition = useCallback(
    (conditionType: TriggerConditionType): SessionTrigger[] => {
      return triggersRef.current.filter((t) => t.condition.type === conditionType);
    },
    []
  );

  return {
    processEvent,
    fireTrigger,
    getTriggersForCondition,
    recentErrors,
    clearErrors,
  };
}

export default useTriggerEngine;
