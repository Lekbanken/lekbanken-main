'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  Trigger,
  TriggerConfig,
  TriggerCondition,
  TriggerStatus,
  TriggerValidationResult,
  TriggerValidationError,
} from '@/types/trigger';

// ============================================================================
// Types
// ============================================================================

export interface UseTriggerOptions {
  /** Initial triggers to load */
  initialTriggers?: Trigger[];
  /** Callback when a trigger fires */
  onTriggerFired?: (trigger: Trigger) => void;
  /** Callback when triggers change */
  onTriggersChange?: (triggers: Trigger[]) => void;
}

export interface UseTriggerReturn {
  /** Current list of triggers */
  triggers: Trigger[];
  /** Add a new trigger */
  addTrigger: (config: TriggerConfig) => Trigger;
  /** Update an existing trigger */
  updateTrigger: (id: string, updates: Partial<TriggerConfig>) => void;
  /** Remove a trigger */
  removeTrigger: (id: string) => void;
  /** Enable a trigger */
  enableTrigger: (id: string) => void;
  /** Disable a trigger */
  disableTrigger: (id: string) => void;
  /** Manually fire a trigger (for manual type) */
  fireTrigger: (id: string) => void;
  /** Reset a trigger's fired state */
  resetTrigger: (id: string) => void;
  /** Validate a trigger configuration */
  validateTrigger: (config: TriggerConfig, allTriggers?: Trigger[]) => TriggerValidationResult;
  /** Get triggers by status */
  getTriggersByStatus: (status: TriggerStatus) => Trigger[];
  /** Get trigger by ID */
  getTriggerById: (id: string) => Trigger | undefined;
  /** Check if a condition should fire any triggers */
  checkCondition: (condition: TriggerCondition) => Trigger[];
  /** Summary counts */
  summary: {
    total: number;
    armed: number;
    fired: number;
    disabled: number;
  };
}

// ============================================================================
// Validation Logic
// ============================================================================

function validateTriggerConfig(
  config: TriggerConfig,
  allTriggers: Trigger[] = []
): TriggerValidationResult {
  const errors: TriggerValidationError[] = [];
  const warnings: string[] = [];

  // Name validation
  if (!config.name || config.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Trigger name is required' });
  } else if (config.name.length > 50) {
    errors.push({ field: 'name', message: 'Name must be 50 characters or less' });
  }

  // Condition validation
  if (!config.when) {
    errors.push({ field: 'when', message: 'A trigger condition is required' });
  } else {
    // Check for required selection fields
    const conditionsNeedingSelection = [
      'step_started', 'step_completed', 'phase_started', 'phase_completed',
      'decision_resolved', 'timer_ended', 'artifact_unlocked', 'keypad_correct', 'keypad_failed'
    ];
    
    if (conditionsNeedingSelection.includes(config.when.type)) {
      const condition = config.when as { type: string; [key: string]: unknown };
      const hasRequiredId = Object.keys(condition).some(key => 
        key !== 'type' && condition[key] !== undefined && condition[key] !== ''
      );
      
      if (!hasRequiredId) {
        errors.push({ field: 'when', message: 'Please select a target for this condition' });
      }
    }
  }

  // Actions validation
  if (!config.then || config.then.length === 0) {
    errors.push({ field: 'then', message: 'At least one action is required' });
  } else {
    // Validate each action
    config.then.forEach((action, index) => {
      if (action.type === 'send_message') {
        const sendAction = action as { type: 'send_message'; message: string };
        if (!sendAction.message || sendAction.message.trim().length === 0) {
          errors.push({ field: `then[${index}]`, message: 'Message content is required' });
        }
      }
      
      if (action.type === 'start_timer') {
        const timerAction = action as { type: 'start_timer'; duration: number; name: string };
        if (!timerAction.duration || timerAction.duration <= 0) {
          errors.push({ field: `then[${index}]`, message: 'Timer duration must be positive' });
        }
        if (!timerAction.name || timerAction.name.trim().length === 0) {
          errors.push({ field: `then[${index}]`, message: 'Timer name is required' });
        }
      }
      
      if (action.type === 'show_countdown') {
        const countdownAction = action as { type: 'show_countdown'; duration: number };
        if (!countdownAction.duration || countdownAction.duration <= 0) {
          errors.push({ field: `then[${index}]`, message: 'Countdown duration must be positive' });
        }
      }
    });
  }

  // Loop detection (basic)
  const potentiallyLoopingCombinations: Array<{ condition: string; action: string }> = [
    { condition: 'step_started', action: 'advance_step' },
    { condition: 'step_completed', action: 'advance_step' },
    { condition: 'phase_started', action: 'advance_phase' },
    { condition: 'phase_completed', action: 'advance_phase' },
  ];

  if (config.when && config.then) {
    const hasLoopRisk = potentiallyLoopingCombinations.some(
      combo => config.when.type === combo.condition && 
        config.then.some(a => a.type === combo.action)
    );
    
    if (hasLoopRisk) {
      warnings.push('This trigger might cause an infinite loop. Consider adding executeOnce: true.');
    }
  }

  // Conflict detection
  if (config.when && allTriggers.length > 0) {
    const conflictingTriggers = allTriggers.filter(
      t => t.enabled && JSON.stringify(t.when) === JSON.stringify(config.when)
    );
    
    if (conflictingTriggers.length > 0) {
      warnings.push(`${conflictingTriggers.length} other trigger(s) use the same condition.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

let triggerIdCounter = 0;

function generateTriggerId(): string {
  triggerIdCounter += 1;
  return `trigger_${Date.now()}_${triggerIdCounter}`;
}

export function useTrigger(options: UseTriggerOptions = {}): UseTriggerReturn {
  const { initialTriggers = [], onTriggerFired, onTriggersChange } = options;
  
  const [triggers, setTriggers] = useState<Trigger[]>(initialTriggers);

  // Update triggers and notify
  const updateTriggers = useCallback((newTriggers: Trigger[]) => {
    setTriggers(newTriggers);
    onTriggersChange?.(newTriggers);
  }, [onTriggersChange]);

  // Add a new trigger
  const addTrigger = useCallback((config: TriggerConfig): Trigger => {
    const now = new Date();
    const newTrigger: Trigger = {
      id: generateTriggerId(),
      name: config.name,
      enabled: config.enabled ?? true,
      status: config.enabled !== false ? 'armed' : 'disabled',
      when: config.when,
      then: config.then,
      executeOnce: config.executeOnce ?? false,
      delaySeconds: config.delaySeconds,
      firedCount: 0,
      errorCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    updateTriggers([...triggers, newTrigger]);
    return newTrigger;
  }, [triggers, updateTriggers]);

  // Update an existing trigger
  const updateTrigger = useCallback((id: string, updates: Partial<TriggerConfig>) => {
    updateTriggers(triggers.map(t => {
      if (t.id !== id) return t;
      
      return {
        ...t,
        ...updates,
        status: updates.enabled === false ? 'disabled' : (t.status === 'disabled' ? 'armed' : t.status),
        updatedAt: new Date(),
      };
    }));
  }, [triggers, updateTriggers]);

  // Remove a trigger
  const removeTrigger = useCallback((id: string) => {
    updateTriggers(triggers.filter(t => t.id !== id));
  }, [triggers, updateTriggers]);

  // Enable a trigger
  const enableTrigger = useCallback((id: string) => {
    updateTriggers(triggers.map(t => 
      t.id === id ? { ...t, enabled: true, status: 'armed' as TriggerStatus, updatedAt: new Date() } : t
    ));
  }, [triggers, updateTriggers]);

  // Disable a trigger
  const disableTrigger = useCallback((id: string) => {
    updateTriggers(triggers.map(t => 
      t.id === id ? { ...t, enabled: false, status: 'disabled' as TriggerStatus, updatedAt: new Date() } : t
    ));
  }, [triggers, updateTriggers]);

  // Manually fire a trigger
  const fireTrigger = useCallback((id: string) => {
    updateTriggers(triggers.map(t => {
      if (t.id !== id || !t.enabled) return t;
      
      const firedTrigger: Trigger = {
        ...t,
        status: 'fired',
        firedAt: new Date(),
        firedCount: t.firedCount + 1,
        enabled: t.executeOnce ? false : t.enabled,
        updatedAt: new Date(),
      };
      
      onTriggerFired?.(firedTrigger);
      return firedTrigger;
    }));
  }, [triggers, updateTriggers, onTriggerFired]);

  // Reset a trigger's fired state
  const resetTrigger = useCallback((id: string) => {
    updateTriggers(triggers.map(t => 
      t.id === id ? { 
        ...t, 
        status: t.enabled ? 'armed' as TriggerStatus : 'disabled' as TriggerStatus,
        updatedAt: new Date() 
      } : t
    ));
  }, [triggers, updateTriggers]);

  // Validate a trigger configuration
  const validateTrigger = useCallback((config: TriggerConfig, allTriggers?: Trigger[]) => {
    return validateTriggerConfig(config, allTriggers ?? triggers);
  }, [triggers]);

  // Get triggers by status
  const getTriggersByStatus = useCallback((status: TriggerStatus) => {
    return triggers.filter(t => t.status === status);
  }, [triggers]);

  // Get trigger by ID
  const getTriggerById = useCallback((id: string) => {
    return triggers.find(t => t.id === id);
  }, [triggers]);

  // Check if a condition should fire any triggers
  const checkCondition = useCallback((condition: TriggerCondition): Trigger[] => {
    const matchingTriggers = triggers.filter(t => {
      if (!t.enabled || t.status !== 'armed') return false;
      
      // Compare condition type and key fields
      if (t.when.type !== condition.type) return false;
      
      // For conditions with IDs, compare the ID field
      const conditionWithId = condition as { type: string; [key: string]: unknown };
      const triggerConditionWithId = t.when as { type: string; [key: string]: unknown };
      
      const idFields = ['stepId', 'phaseId', 'decisionId', 'timerId', 'artifactId', 'keypadId'];
      for (const field of idFields) {
        if (field in conditionWithId && conditionWithId[field] !== triggerConditionWithId[field]) {
          return false;
        }
      }
      
      // For decision_resolved, also check outcome if specified
      if (condition.type === 'decision_resolved') {
        const decisionCondition = condition as { type: 'decision_resolved'; outcome?: string };
        const triggerDecisionCondition = t.when as { type: 'decision_resolved'; outcome?: string };
        
        if (triggerDecisionCondition.outcome && 
            triggerDecisionCondition.outcome !== decisionCondition.outcome) {
          return false;
        }
      }
      
      return true;
    });
    
    // Fire matching triggers
    matchingTriggers.forEach(t => fireTrigger(t.id));
    
    return matchingTriggers;
  }, [triggers, fireTrigger]);

  // Summary counts
  const summary = useMemo(() => ({
    total: triggers.length,
    armed: triggers.filter(t => t.status === 'armed').length,
    fired: triggers.filter(t => t.status === 'fired').length,
    disabled: triggers.filter(t => t.status === 'disabled').length,
  }), [triggers]);

  return {
    triggers,
    addTrigger,
    updateTrigger,
    removeTrigger,
    enableTrigger,
    disableTrigger,
    fireTrigger,
    resetTrigger,
    validateTrigger,
    getTriggersByStatus,
    getTriggerById,
    checkCondition,
    summary,
  };
}

export default useTrigger;
