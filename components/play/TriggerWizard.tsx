'use client';

import { forwardRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type {
  TriggerConfig,
  TriggerCondition,
  TriggerAction,
  TriggerConditionType,
  TriggerActionType,
  TriggerValidationResult,
} from '@/types/trigger';
import { CONDITION_OPTIONS, ACTION_OPTIONS, getActionIcon } from '@/types/trigger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';

// ============================================================================
// Types
// ============================================================================

export interface TriggerWizardProps {
  /** Called when wizard is completed */
  onComplete: (config: TriggerConfig) => void;
  /** Called when wizard is cancelled */
  onCancel: () => void;
  /** Validation function */
  validateTrigger?: (config: TriggerConfig) => TriggerValidationResult;
  /** Available step IDs for selection */
  steps?: Array<{ id: string; name: string }>;
  /** Available phase IDs for selection */
  phases?: Array<{ id: string; name: string }>;
  /** Available decision IDs for selection */
  decisions?: Array<{ id: string; name: string }>;
  /** Available timer IDs for selection */
  timers?: Array<{ id: string; name: string }>;
  /** Available artifact IDs for selection */
  artifacts?: Array<{ id: string; name: string }>;
  /** Available keypad IDs for selection */
  keypads?: Array<{ id: string; name: string }>;
  /** Initial config (for editing) */
  initialConfig?: Partial<TriggerConfig>;
  /** Additional class names */
  className?: string;
}

type WizardStep = 'name' | 'condition' | 'actions' | 'options' | 'review';

// ============================================================================
// Step Indicator
// ============================================================================

const WIZARD_STEPS: Array<{ key: WizardStep; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'condition', label: 'When' },
  { key: 'actions', label: 'Then' },
  { key: 'options', label: 'Options' },
  { key: 'review', label: 'Review' },
];

function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = WIZARD_STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {WIZARD_STEPS.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div
            className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
              index < currentIndex && 'bg-primary text-white',
              index === currentIndex && 'bg-primary text-white ring-4 ring-primary/20',
              index > currentIndex && 'bg-surface-secondary text-foreground-secondary'
            )}
          >
            {index < currentIndex ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              index + 1
            )}
          </div>
          {index < WIZARD_STEPS.length - 1 && (
            <div
              className={cn(
                'w-8 h-0.5 mx-1',
                index < currentIndex ? 'bg-primary' : 'bg-surface-secondary'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Option Card
// ============================================================================

interface OptionCardProps {
  icon: string;
  label: string;
  description?: string;
  selected?: boolean;
  onClick: () => void;
}

function OptionCard({ icon, label, description, selected, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all',
        'hover:border-primary/50 hover:bg-surface-secondary',
        selected && 'border-primary bg-primary/5 ring-1 ring-primary'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <div className="font-medium text-foreground">{label}</div>
          {description && (
            <div className="text-sm text-foreground-secondary">{description}</div>
          )}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// TriggerWizard Component
// ============================================================================

export const TriggerWizard = forwardRef<HTMLDivElement, TriggerWizardProps>(
  (
    {
      onComplete,
      onCancel,
      validateTrigger,
      steps = [],
      phases = [],
      decisions = [],
      timers = [],
      artifacts = [],
      keypads = [],
      initialConfig,
      className,
    },
    ref
  ) => {
    const [currentStep, setCurrentStep] = useState<WizardStep>('name');
    const [name, setName] = useState(initialConfig?.name ?? '');
    const [conditionType, setConditionType] = useState<TriggerConditionType | null>(
      initialConfig?.when?.type ?? null
    );
    const [conditionTargetId, setConditionTargetId] = useState('');
    const [actions, setActions] = useState<TriggerAction[]>(initialConfig?.then ?? []);
    const [executeOnce, setExecuteOnce] = useState(initialConfig?.executeOnce ?? true);
    const [delaySeconds, setDelaySeconds] = useState(initialConfig?.delaySeconds ?? 0);
    const [validationResult, setValidationResult] = useState<TriggerValidationResult | null>(null);

    // Build condition from state
    const buildCondition = useCallback((): TriggerCondition | null => {
      if (!conditionType) return null;

      switch (conditionType) {
        case 'step_started':
        case 'step_completed':
          return { type: conditionType, stepId: conditionTargetId };
        case 'phase_started':
        case 'phase_completed':
          return { type: conditionType, phaseId: conditionTargetId };
        case 'decision_resolved':
          return { type: conditionType, decisionId: conditionTargetId };
        case 'timer_ended':
          return { type: conditionType, timerId: conditionTargetId };
        case 'artifact_unlocked':
          return { type: conditionType, artifactId: conditionTargetId };
        case 'keypad_correct':
        case 'keypad_failed':
          return { type: conditionType, keypadId: conditionTargetId };
        case 'manual':
          return { type: 'manual' };
        default:
          return null;
      }
    }, [conditionType, conditionTargetId]);

    // Build full config
    const buildConfig = useCallback((): TriggerConfig | null => {
      const condition = buildCondition();
      if (!condition || actions.length === 0) return null;

      return {
        name,
        when: condition,
        then: actions,
        executeOnce,
        delaySeconds: delaySeconds > 0 ? delaySeconds : undefined,
      };
    }, [name, buildCondition, actions, executeOnce, delaySeconds]);

    // Get options for condition target
    const getTargetOptions = useCallback(() => {
      switch (conditionType) {
        case 'step_started':
        case 'step_completed':
          return steps;
        case 'phase_started':
        case 'phase_completed':
          return phases;
        case 'decision_resolved':
          return decisions;
        case 'timer_ended':
          return timers;
        case 'artifact_unlocked':
          return artifacts;
        case 'keypad_correct':
        case 'keypad_failed':
          return keypads;
        default:
          return [];
      }
    }, [conditionType, steps, phases, decisions, timers, artifacts, keypads]);

    // Check if condition needs target selection
    const conditionNeedsTarget = conditionType && conditionType !== 'manual';

    // Navigation
    const goNext = () => {
      const stepIndex = WIZARD_STEPS.findIndex(s => s.key === currentStep);
      if (stepIndex < WIZARD_STEPS.length - 1) {
        setCurrentStep(WIZARD_STEPS[stepIndex + 1].key);
      }
    };

    const goBack = () => {
      const stepIndex = WIZARD_STEPS.findIndex(s => s.key === currentStep);
      if (stepIndex > 0) {
        setCurrentStep(WIZARD_STEPS[stepIndex - 1].key);
      }
    };

    // Add action
    const addAction = (type: TriggerActionType) => {
      let newAction: TriggerAction;

      switch (type) {
        case 'send_message':
          newAction = { type: 'send_message', message: '', style: 'normal' };
          break;
        case 'start_timer':
          newAction = { type: 'start_timer', duration: 60, name: 'Timer' };
          break;
        case 'show_countdown':
          newAction = { type: 'show_countdown', duration: 5, message: 'Get ready...' };
          break;
        case 'play_sound':
          newAction = { type: 'play_sound', soundId: '' };
          break;
        case 'reveal_artifact':
          newAction = { type: 'reveal_artifact', artifactId: '' };
          break;
        case 'hide_artifact':
          newAction = { type: 'hide_artifact', artifactId: '' };
          break;
        case 'unlock_decision':
          newAction = { type: 'unlock_decision', decisionId: '' };
          break;
        case 'lock_decision':
          newAction = { type: 'lock_decision', decisionId: '' };
          break;
        case 'reset_keypad':
          newAction = { type: 'reset_keypad', keypadId: '' };
          break;
        case 'advance_step':
          newAction = { type: 'advance_step' };
          break;
        case 'advance_phase':
          newAction = { type: 'advance_phase' };
          break;
        default:
          return;
      }

      setActions([...actions, newAction]);
    };

    // Remove action
    const removeAction = (index: number) => {
      setActions(actions.filter((_, i) => i !== index));
    };

    // Handle complete
    const handleComplete = () => {
      const config = buildConfig();
      if (!config) return;

      if (validateTrigger) {
        const result = validateTrigger(config);
        setValidationResult(result);
        if (!result.valid) return;
      }

      onComplete(config);
    };

    // Can proceed to next step?
    const canProceed = () => {
      switch (currentStep) {
        case 'name':
          return name.trim().length > 0;
        case 'condition':
          return conditionType && (!conditionNeedsTarget || conditionTargetId);
        case 'actions':
          return actions.length > 0;
        case 'options':
          return true;
        case 'review':
          return true;
        default:
          return false;
      }
    };

    return (
      <div ref={ref} className={cn('max-w-lg mx-auto', className)}>
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Step Content */}
        <div className="min-h-[300px]">
          {/* Step 1: Name */}
          {currentStep === 'name' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground text-center">
                Name your trigger
              </h2>
              <p className="text-foreground-secondary text-center text-sm">
                Give this trigger a clear, descriptive name
              </p>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Unlock the vault door"
                className="text-center text-lg"
                autoFocus
              />
            </div>
          )}

          {/* Step 2: Condition */}
          {currentStep === 'condition' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground text-center">
                When should it trigger?
              </h2>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {CONDITION_OPTIONS.map(option => (
                  <OptionCard
                    key={option.type}
                    icon={option.icon}
                    label={option.label}
                    description={option.description}
                    selected={conditionType === option.type}
                    onClick={() => {
                      setConditionType(option.type);
                      setConditionTargetId('');
                    }}
                  />
                ))}
              </div>

              {/* Target Selection */}
              {conditionNeedsTarget && (
                <div className="mt-4 p-4 bg-surface-secondary rounded-lg">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Select target:
                  </label>
                  {getTargetOptions().length > 0 ? (
                    <select
                      value={conditionTargetId}
                      onChange={(e) => setConditionTargetId(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-primary border border-border rounded-md text-foreground"
                    >
                      <option value="">Choose...</option>
                      {getTargetOptions().map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={conditionTargetId}
                      onChange={(e) => setConditionTargetId(e.target.value)}
                      placeholder="Enter ID..."
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Actions */}
          {currentStep === 'actions' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground text-center">
                What should happen?
              </h2>

              {/* Current actions */}
              {actions.length > 0 && (
                <div className="space-y-2 mb-4">
                  {actions.map((action, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getActionIcon(action.type)}</span>
                        <span className="text-foreground">
                          {ACTION_OPTIONS.find(a => a.type === action.type)?.label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAction(index)}
                        className="p-1 text-error hover:bg-error/10 rounded"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add action */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {ACTION_OPTIONS.map(option => (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => addAction(option.type)}
                    className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-dashed border-border hover:border-primary hover:bg-surface-secondary transition-colors"
                  >
                    <PlusIcon className="h-4 w-4 text-foreground-secondary" />
                    <span className="text-lg">{option.icon}</span>
                    <span className="text-foreground-secondary">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Options */}
          {currentStep === 'options' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground text-center">
                Additional options
              </h2>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-surface-secondary rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={executeOnce}
                    onChange={(e) => setExecuteOnce(e.target.checked)}
                    className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="font-medium text-foreground">Execute once only</div>
                    <div className="text-sm text-foreground-secondary">
                      Disable this trigger after it fires
                    </div>
                  </div>
                </label>

                <div className="p-4 bg-surface-secondary rounded-lg">
                  <label className="block font-medium text-foreground mb-2">
                    Delay before action (seconds)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 0)}
                    className="w-24"
                  />
                  <p className="text-sm text-foreground-secondary mt-1">
                    0 = immediate execution
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground text-center">
                Review your trigger
              </h2>

              <div className="p-4 bg-surface-secondary rounded-lg space-y-3">
                <div>
                  <span className="text-sm font-medium text-foreground-secondary uppercase">
                    Name
                  </span>
                  <p className="text-foreground font-medium">{name}</p>
                </div>

                <div>
                  <span className="text-sm font-medium text-foreground-secondary uppercase">
                    When
                  </span>
                  <p className="text-foreground">
                    {CONDITION_OPTIONS.find(c => c.type === conditionType)?.icon}{' '}
                    {CONDITION_OPTIONS.find(c => c.type === conditionType)?.label}
                    {conditionTargetId && ` (${conditionTargetId})`}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-foreground-secondary uppercase">
                    Then
                  </span>
                  <ul className="text-foreground space-y-1">
                    {actions.map((action, i) => (
                      <li key={i}>
                        {getActionIcon(action.type)}{' '}
                        {ACTION_OPTIONS.find(a => a.type === action.type)?.label}
                      </li>
                    ))}
                  </ul>
                </div>

                {(executeOnce || delaySeconds > 0) && (
                  <div>
                    <span className="text-sm font-medium text-foreground-secondary uppercase">
                      Options
                    </span>
                    <ul className="text-foreground text-sm space-y-1">
                      {executeOnce && <li>• Execute once only</li>}
                      {delaySeconds > 0 && <li>• {delaySeconds}s delay</li>}
                    </ul>
                  </div>
                )}
              </div>

              {/* Validation errors */}
              {validationResult && !validationResult.valid && (
                <div className="p-3 bg-error/10 border border-error rounded-lg">
                  <ul className="text-error text-sm space-y-1">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>• {err.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {validationResult?.warnings && validationResult.warnings.length > 0 && (
                <div className="p-3 bg-warning/10 border border-warning rounded-lg">
                  <ul className="text-warning text-sm space-y-1">
                    {validationResult.warnings.map((warn, i) => (
                      <li key={i}>⚠️ {warn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          {currentStep === 'name' ? (
            <Button variant="outline" onClick={onCancel}>
              <XMarkIcon className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          ) : (
            <Button variant="outline" onClick={goBack}>
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}

          {currentStep === 'review' ? (
            <Button variant="primary" onClick={handleComplete} disabled={!canProceed()}>
              <CheckIcon className="h-4 w-4 mr-1" />
              Create Trigger
            </Button>
          ) : (
            <Button variant="primary" onClick={goNext} disabled={!canProceed()}>
              Next
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    );
  }
);

TriggerWizard.displayName = 'TriggerWizard';

export default TriggerWizard;
