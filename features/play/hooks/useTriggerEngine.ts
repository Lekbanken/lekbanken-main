'use client';

import { useCallback, useRef, useEffect } from 'react';
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
  | { type: 'manual'; triggerId: string };

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
  onTriggerStatusUpdate?: (triggerId: string, status: 'armed' | 'fired' | 'disabled') => Promise<void>;
  /** Whether the engine is enabled */
  enabled?: boolean;
}

export interface UseTriggerEngineReturn {
  /** Process an event and fire matching triggers */
  processEvent: (event: TriggerEvent) => Promise<void>;
  /** Manually fire a specific trigger */
  fireTrigger: (triggerId: string) => Promise<void>;
  /** Get triggers that match a condition type */
  getTriggersForCondition: (conditionType: TriggerConditionType) => SessionTrigger[];
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
  enabled = true,
}: UseTriggerEngineOptions): UseTriggerEngineReturn {
  // Keep a ref to triggers to avoid stale closures
  const triggersRef = useRef(triggers);
  useEffect(() => {
    triggersRef.current = triggers;
  }, [triggers]);

  // Execute a trigger's actions with optional delay
  const executeTrigger = useCallback(
    async (trigger: SessionTrigger) => {
      const executeActions = async () => {
        console.log(`[TriggerEngine] Firing trigger: ${trigger.name}`);

        // Execute actions in sequence
        for (const action of trigger.actions) {
          try {
            await executeAction(action, actionContext);
          } catch (error) {
            console.error(`[TriggerEngine] Action failed:`, action, error);
          }
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
    [actionContext, onTriggerFired, onTriggerStatusUpdate]
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
  };
}

export default useTriggerEngine;
