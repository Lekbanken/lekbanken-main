'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, Button, Select, HelpText } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { TriggerFormData, GamePhase, GameStep, GameArtifact } from '@/types/games';
import type { TriggerCondition, TriggerAction } from '@/types/trigger';
import { getActionLabel } from '@/types/trigger';

// =============================================================================
// Types
// =============================================================================

type SimulationEvent = {
  id: string;
  timestamp: Date;
  type: 'event_fired' | 'trigger_matched' | 'action_executed' | 'trigger_skipped';
  label: string;
  details?: string;
  triggerId?: string;
};

type SimulationState = {
  currentStepIndex: number;
  currentPhaseIndex: number;
  unlockedArtifacts: Set<string>;
  firedTriggers: Set<string>;
  timeBankSeconds: number;
  events: SimulationEvent[];
};

type TriggerSimulatorProps = {
  triggers: TriggerFormData[];
  phases: GamePhase[];
  steps: GameStep[];
  artifacts: GameArtifact[];
  isOpen: boolean;
  onClose: () => void;
};

// =============================================================================
// Condition Matching (simplified for simulation)
// =============================================================================

function conditionMatchesEvent(
  condition: TriggerCondition,
  eventType: string,
  targetId: string
): boolean {
  if (condition.type !== eventType) return false;

  switch (condition.type) {
    case 'step_started':
    case 'step_completed':
      return 'stepId' in condition && condition.stepId === targetId;
    case 'phase_started':
    case 'phase_completed':
      return 'phaseId' in condition && condition.phaseId === targetId;
    case 'keypad_correct':
    case 'keypad_failed':
      return 'keypadId' in condition && condition.keypadId === targetId;
    case 'artifact_unlocked':
      return 'artifactId' in condition && condition.artifactId === targetId;
    case 'manual':
      return false;
    case 'signal_received':
      return true; // Signal matching is simulated differently
    default:
      return false;
  }
}

// =============================================================================
// Event Selector Options
// =============================================================================

type EventOption = {
  value: string;
  label: string;
  type: string;
  targetId: string;
};

function buildEventOptions(
  steps: GameStep[],
  phases: GamePhase[],
  artifacts: GameArtifact[]
): EventOption[] {
  const options: EventOption[] = [];

  // Step events
  steps.forEach((s) => {
    const name = s.title || `Steg ${s.step_order + 1}`;
    options.push({
      value: `step_started:${s.id}`,
      label: `🚀 Steg startar: ${name}`,
      type: 'step_started',
      targetId: s.id,
    });
    options.push({
      value: `step_completed:${s.id}`,
      label: `✅ Steg klart: ${name}`,
      type: 'step_completed',
      targetId: s.id,
    });
  });

  // Phase events
  phases.forEach((p) => {
    options.push({
      value: `phase_started:${p.id}`,
      label: `🎬 Fas startar: ${p.name}`,
      type: 'phase_started',
      targetId: p.id,
    });
    options.push({
      value: `phase_completed:${p.id}`,
      label: `🏁 Fas klar: ${p.name}`,
      type: 'phase_completed',
      targetId: p.id,
    });
  });

  // Keypad events
  const keypads = artifacts.filter((a) => a.artifact_type === 'keypad');
  keypads.forEach((k) => {
    options.push({
      value: `keypad_correct:${k.id}`,
      label: `🔓 Keypad rätt: ${k.title}`,
      type: 'keypad_correct',
      targetId: k.id,
    });
    options.push({
      value: `keypad_failed:${k.id}`,
      label: `❌ Keypad fel: ${k.title}`,
      type: 'keypad_failed',
      targetId: k.id,
    });
  });

  // Artifact unlock events
  artifacts.forEach((a) => {
    options.push({
      value: `artifact_unlocked:${a.id}`,
      label: `📦 Artefakt upplåst: ${a.title}`,
      type: 'artifact_unlocked',
      targetId: a.id,
    });
  });

  return options;
}

// =============================================================================
// Main Component
// =============================================================================

const makeId = () => `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export function TriggerSimulator({
  triggers,
  phases,
  steps,
  artifacts,
  isOpen,
  onClose,
}: TriggerSimulatorProps) {
  const [state, setState] = useState<SimulationState>({
    currentStepIndex: 0,
    currentPhaseIndex: 0,
    unlockedArtifacts: new Set(),
    firedTriggers: new Set(),
    timeBankSeconds: 300, // Start with 5 minutes
    events: [],
  });

  const [selectedEvent, setSelectedEvent] = useState('');

  const eventOptions = useMemo(
    () => buildEventOptions(steps, phases, artifacts),
    [steps, phases, artifacts]
  );

  const addEvent = useCallback((event: Omit<SimulationEvent, 'id' | 'timestamp'>) => {
    setState((prev) => ({
      ...prev,
      events: [
        ...prev.events,
        { ...event, id: makeId(), timestamp: new Date() },
      ],
    }));
  }, []);

  const simulateActions = useCallback((actions: TriggerAction[], triggerName: string) => {
    actions.forEach((action) => {
      const label = getActionLabel(action.type);
      let details = '';

      switch (action.type) {
        case 'reveal_artifact':
          details = `Visar artefakt: ${action.artifactId}`;
          setState((prev) => ({
            ...prev,
            unlockedArtifacts: new Set([...prev.unlockedArtifacts, action.artifactId]),
          }));
          break;
        case 'hide_artifact':
          details = `Döljer artefakt: ${action.artifactId}`;
          setState((prev) => {
            const next = new Set(prev.unlockedArtifacts);
            next.delete(action.artifactId);
            return { ...prev, unlockedArtifacts: next };
          });
          break;
        case 'time_bank_apply_delta':
          details = `${action.deltaSeconds > 0 ? '+' : ''}${action.deltaSeconds}s (${action.reason})`;
          setState((prev) => ({
            ...prev,
            timeBankSeconds: Math.max(0, prev.timeBankSeconds + action.deltaSeconds),
          }));
          break;
        case 'send_message':
          details = `"${action.message}" (${action.style})`;
          break;
        case 'show_countdown':
          details = `${action.duration}s: "${action.message}"`;
          break;
        case 'advance_step':
          details = 'Går till nästa steg';
          setState((prev) => ({
            ...prev,
            currentStepIndex: Math.min(prev.currentStepIndex + 1, steps.length - 1),
          }));
          break;
        case 'advance_phase':
          details = 'Går till nästa fas';
          setState((prev) => ({
            ...prev,
            currentPhaseIndex: Math.min(prev.currentPhaseIndex + 1, phases.length - 1),
          }));
          break;
        case 'send_signal':
          details = `Kanal: ${action.channel}`;
          break;
        default:
          details = JSON.stringify(action);
      }

      addEvent({
        type: 'action_executed',
        label: `↳ ${label}`,
        details,
        triggerId: triggerName,
      });
    });
  }, [addEvent, steps.length, phases.length]);

  const fireEvent = useCallback(() => {
    if (!selectedEvent) return;

    const option = eventOptions.find((o) => o.value === selectedEvent);
    if (!option) return;

    // Log the event
    addEvent({
      type: 'event_fired',
      label: `⚡ ${option.label}`,
    });

    // Check which triggers match
    triggers.forEach((trigger) => {
      if (!trigger.enabled) return;

      // Skip if already fired and execute_once
      if (trigger.execute_once && state.firedTriggers.has(trigger.id ?? '')) {
        addEvent({
          type: 'trigger_skipped',
          label: `⏭️ ${trigger.name}`,
          details: 'Redan avfyrad (execute_once)',
          triggerId: trigger.id,
        });
        return;
      }

      const matches = conditionMatchesEvent(trigger.condition, option.type, option.targetId);

      if (matches) {
        addEvent({
          type: 'trigger_matched',
          label: `🎯 Trigger matchad: ${trigger.name}`,
          details: trigger.delay_seconds > 0 ? `Fördröjning: ${trigger.delay_seconds}s` : undefined,
          triggerId: trigger.id,
        });

        // Mark as fired
        if (trigger.id) {
          setState((prev) => ({
            ...prev,
            firedTriggers: new Set([...prev.firedTriggers, trigger.id!]),
          }));
        }

        // Simulate actions (with delay indication)
        if (trigger.delay_seconds > 0) {
          setTimeout(() => {
            simulateActions(trigger.actions, trigger.name);
          }, 100); // Instant in simulation, just show delay info
        } else {
          simulateActions(trigger.actions, trigger.name);
        }
      }
    });

    setSelectedEvent('');
  }, [selectedEvent, eventOptions, triggers, state.firedTriggers, addEvent, simulateActions]);

  const fireManualTrigger = useCallback((trigger: TriggerFormData) => {
    addEvent({
      type: 'trigger_matched',
      label: `🖱️ Manuell: ${trigger.name}`,
      triggerId: trigger.id,
    });

    if (trigger.id) {
      setState((prev) => ({
        ...prev,
        firedTriggers: new Set([...prev.firedTriggers, trigger.id!]),
      }));
    }

    simulateActions(trigger.actions, trigger.name);
  }, [addEvent, simulateActions]);

  const resetSimulation = useCallback(() => {
    setState({
      currentStepIndex: 0,
      currentPhaseIndex: 0,
      unlockedArtifacts: new Set(),
      firedTriggers: new Set(),
      timeBankSeconds: 300,
      events: [],
    });
  }, []);

  const manualTriggers = useMemo(
    () => triggers.filter((t) => t.condition.type === 'manual' && t.enabled),
    [triggers]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-5xl max-h-[90vh] bg-background rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <PlayIcon className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold">Trigger Simulator</h2>
            <Badge variant="outline">Dry-run läge</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetSimulation}>
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Återställ
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <StopIcon className="h-4 w-4 mr-1" />
              Stäng
            </Button>
          </div>
        </div>

        {/* Intro help */}
        <div className="px-4 pt-3">
          <HelpText variant="tip">
            Testa dina triggers utan att starta en riktig session. Välj en händelse eller klicka på en manuell trigger för att se vad som händer.
          </HelpText>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Controls */}
          <div className="w-80 border-r p-4 space-y-4 overflow-y-auto">
            {/* State Overview */}
            <Card className="p-3 bg-surface-secondary">
              <h3 className="text-sm font-medium mb-2">Aktuellt tillstånd</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Steg:</span>
                  <span>{steps[state.currentStepIndex]?.title || `${state.currentStepIndex + 1}/${steps.length}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Fas:</span>
                  <span>{phases[state.currentPhaseIndex]?.name || `${state.currentPhaseIndex + 1}/${phases.length}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Tidsbank:</span>
                  <span className={state.timeBankSeconds < 60 ? 'text-red-500' : ''}>
                    {Math.floor(state.timeBankSeconds / 60)}:{(state.timeBankSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Avfyrade triggers:</span>
                  <span>{state.firedTriggers.size}/{triggers.length}</span>
                </div>
              </div>
            </Card>

            {/* Event Simulator */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Simulera händelse</h3>
              <Select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                options={[
                  { value: '', label: 'Välj händelse...' },
                  ...eventOptions.map((o) => ({ value: o.value, label: o.label })),
                ]}
              />
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={fireEvent}
                disabled={!selectedEvent}
              >
                <BoltIcon className="h-4 w-4 mr-1" />
                Avfyra händelse
              </Button>
            </div>

            {/* Manual Triggers */}
            {manualTriggers.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Manuella triggers</h3>
                <div className="space-y-1">
                  {manualTriggers.map((trigger) => {
                    const isFired = state.firedTriggers.has(trigger.id ?? '');
                    return (
                      <Button
                        key={trigger.id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => fireManualTrigger(trigger)}
                        disabled={trigger.execute_once && isFired}
                      >
                        {isFired ? (
                          <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <BoltIcon className="h-4 w-4 mr-2" />
                        )}
                        {trigger.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trigger Status */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Trigger-status</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {triggers.map((trigger) => {
                  const isFired = state.firedTriggers.has(trigger.id ?? '');
                  return (
                    <div
                      key={trigger.id}
                      className="flex items-center justify-between text-sm p-2 rounded bg-surface-secondary"
                    >
                      <span className={!trigger.enabled ? 'text-foreground-secondary' : ''}>
                        {trigger.name}
                      </span>
                      {!trigger.enabled ? (
                        <Badge variant="secondary" size="sm">Inaktiv</Badge>
                      ) : isFired ? (
                        <Badge variant="default" size="sm" className="bg-green-500">Avfyrad</Badge>
                      ) : (
                        <Badge variant="outline" size="sm">Redo</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Event Log */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              Händelselogg
            </h3>
            
            {state.events.length === 0 ? (
              <div className="text-center text-foreground-secondary py-8">
                <BoltIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Inga händelser ännu.</p>
                <p className="text-xs mt-1">Välj en händelse att simulera i panelen till vänster.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {state.events.map((event) => (
                  <div
                    key={event.id}
                    className={`p-2 rounded text-sm ${
                      event.type === 'event_fired'
                        ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                        : event.type === 'trigger_matched'
                        ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
                        : event.type === 'action_executed'
                        ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800'
                        : 'bg-gray-50 border border-gray-200 dark:bg-gray-900 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{event.label}</span>
                      <span className="text-xs text-foreground-secondary">
                        {event.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {event.details && (
                      <p className="text-xs text-foreground-secondary mt-1">{event.details}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
