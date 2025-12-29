/**
 * TriggerDryRunPanel Component
 * 
 * Simulates trigger events in lobby/builder without affecting live session.
 * Shows which triggers would fire for simulated events.
 * 
 * Task 5.5 - Session Cockpit Architecture
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  BoltIcon,
  PlayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CursorArrowRaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { Trigger, TriggerCondition, TriggerAction } from '@/types/trigger';

// =============================================================================
// Types
// =============================================================================

export interface TriggerDryRunPanelProps {
  /** All triggers to test */
  triggers: Trigger[];
  /** Available artifacts for event simulation */
  artifacts?: Array<{ id: string; name: string; type: string }>;
  /** Available steps for event simulation */
  steps?: Array<{ id: string; name: string }>;
  /** Available phases for event simulation */
  phases?: Array<{ id: string; name: string }>;
  /** Optional className */
  className?: string;
}

export interface SimulationEvent {
  type: string;
  [key: string]: unknown;
}

export interface SimulationResult {
  event: SimulationEvent;
  matchingTriggers: Trigger[];
  timestamp: Date;
}

// =============================================================================
// Constants: Event types that can be simulated
// =============================================================================

const EVENT_TYPES: Array<{
  value: string;
  label: string;
  targetType?: 'step' | 'phase' | 'artifact' | 'custom';
  targetField?: string;
}> = [
  { value: 'step_started', label: 'Steg startat', targetType: 'step', targetField: 'stepId' },
  { value: 'step_completed', label: 'Steg klart', targetType: 'step', targetField: 'stepId' },
  { value: 'phase_started', label: 'Fas startad', targetType: 'phase', targetField: 'phaseId' },
  { value: 'phase_completed', label: 'Fas klar', targetType: 'phase', targetField: 'phaseId' },
  { value: 'keypad_correct', label: 'Rätt kod', targetType: 'artifact', targetField: 'keypadId' },
  { value: 'keypad_failed', label: 'Fel kod', targetType: 'artifact', targetField: 'keypadId' },
  { value: 'artifact_unlocked', label: 'Artefakt upplåst', targetType: 'artifact', targetField: 'artifactId' },
  { value: 'timer_ended', label: 'Timer slut', targetType: 'custom', targetField: 'timerId' },
  { value: 'counter_reached', label: 'Räknare nådd', targetType: 'artifact', targetField: 'counterKey' },
  { value: 'riddle_correct', label: 'Gåta löst', targetType: 'artifact', targetField: 'riddleId' },
  { value: 'signal_received', label: 'Signal mottagen', targetType: 'custom', targetField: 'channel' },
  { value: 'time_bank_expired', label: 'Tidsbank slut', targetType: undefined },
  { value: 'hotspot_found', label: 'Hotspot hittad', targetType: 'artifact', targetField: 'hotspotHuntId' },
  { value: 'tile_puzzle_complete', label: 'Pussel löst', targetType: 'artifact', targetField: 'tilePuzzleId' },
  { value: 'cipher_decoded', label: 'Chiffer avkodat', targetType: 'artifact', targetField: 'cipherId' },
  { value: 'logic_grid_solved', label: 'Logikrutnät löst', targetType: 'artifact', targetField: 'gridId' },
];

// =============================================================================
// Helper: Check if condition matches event
// =============================================================================

function conditionMatches(condition: TriggerCondition, event: SimulationEvent): boolean {
  if (condition.type !== event.type) return false;

  // Check type-specific field matching
  switch (condition.type) {
    case 'step_started':
    case 'step_completed':
      return !('stepId' in condition) || condition.stepId === event.stepId;

    case 'phase_started':
    case 'phase_completed':
      return !('phaseId' in condition) || condition.phaseId === event.phaseId;

    case 'keypad_correct':
    case 'keypad_failed':
      return !('keypadId' in condition) || condition.keypadId === event.keypadId;

    case 'artifact_unlocked':
      return !('artifactId' in condition) || condition.artifactId === event.artifactId;

    case 'timer_ended':
      return !('timerId' in condition) || condition.timerId === event.timerId;

    case 'signal_received':
      // If no channel specified, matches any signal
      if (!('channel' in condition) || !condition.channel) return true;
      return condition.channel === event.channel;

    case 'counter_reached':
      return !('counterKey' in condition) || condition.counterKey === event.counterKey;

    case 'riddle_correct':
      return !('riddleId' in condition) || condition.riddleId === event.riddleId;

    case 'time_bank_expired':
      // Matches if no specific time bank or matches ID
      if (!('timeBankId' in condition) || !condition.timeBankId) return true;
      return condition.timeBankId === event.timeBankId;

    case 'hotspot_found':
    case 'hotspot_hunt_complete':
      return !('hotspotHuntId' in condition) || condition.hotspotHuntId === event.hotspotHuntId;

    case 'tile_puzzle_complete':
      return !('tilePuzzleId' in condition) || condition.tilePuzzleId === event.tilePuzzleId;

    case 'cipher_decoded':
      return !('cipherId' in condition) || condition.cipherId === event.cipherId;

    case 'logic_grid_solved':
      return !('gridId' in condition) || condition.gridId === event.gridId;

    case 'manual':
      // Manual triggers don't match simulated events
      return false;

    default:
      return true;
  }
}

// =============================================================================
// Helper: Get action description
// =============================================================================

function getActionDescription(action: TriggerAction): string {
  switch (action.type) {
    case 'show_countdown':
      return `Visa nedräkning: ${action.duration}s`;
    case 'reveal_artifact':
      return `Visa artefakt`;
    case 'hide_artifact':
      return `Dölj artefakt`;
    case 'advance_step':
      return `Gå till nästa steg`;
    case 'advance_phase':
      return `Gå till nästa fas`;
    case 'start_timer':
      return `Starta timer: ${action.name}`;
    case 'send_message':
      return `Skicka meddelande`;
    case 'send_signal':
      return `Skicka signal: ${action.channel}`;
    case 'time_bank_apply_delta':
      return `Justera tidsbank: ${action.deltaSeconds > 0 ? '+' : ''}${action.deltaSeconds}s`;
    case 'show_leader_script':
      return `Visa ledarscript`;
    case 'trigger_signal':
      return `Aktivera signalgenerator`;
    case 'time_bank_pause':
      return action.pause ? 'Pausa tidsbank' : 'Återuppta tidsbank';
    default:
      return action.type;
  }
}

// =============================================================================
// Sub-Component: SimulationResultCard
// =============================================================================

interface SimulationResultCardProps {
  result: SimulationResult;
}

function SimulationResultCard({ result }: SimulationResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(result.matchingTriggers.length > 0);
  const hasMatches = result.matchingTriggers.length > 0;

  return (
    <Card className={hasMatches ? 'border-green-500/50' : 'border-muted'}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
                {hasMatches ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <InformationCircleIcon className="h-4 w-4 text-muted-foreground" />
                )}
                <CardTitle className="text-sm font-medium">
                  {EVENT_TYPES.find((e) => e.value === result.event.type)?.label || result.event.type}
                </CardTitle>
              </div>
              <Badge variant={hasMatches ? 'default' : 'outline'}>
                {result.matchingTriggers.length} träffar
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {hasMatches ? (
              <div className="space-y-2">
                {result.matchingTriggers.map((trigger) => (
                  <div
                    key={trigger.id}
                    className="p-2 rounded bg-green-500/10 border border-green-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{trigger.name}</span>
                      {trigger.executeOnce && (
                        <Badge variant="outline" className="text-xs">
                          1×
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {trigger.delaySeconds && trigger.delaySeconds > 0 && (
                        <span className="inline-flex items-center gap-1 mr-2">
                          <ClockIcon className="h-3 w-3" />
                          {trigger.delaySeconds}s fördröjning
                        </span>
                      )}
                      <span>
                        {trigger.then.length} åtgärd{trigger.then.length !== 1 ? 'er' : ''}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      {trigger.then.map((action, i) => (
                        <div
                          key={i}
                          className="text-xs bg-background px-2 py-1 rounded flex items-center gap-2"
                        >
                          <CursorArrowRaysIcon className="h-3 w-3 text-muted-foreground" />
                          {getActionDescription(action)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                Ingen trigger matchar denna händelse
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TriggerDryRunPanel({
  triggers,
  artifacts = [],
  steps = [],
  phases = [],
  className,
}: TriggerDryRunPanelProps) {
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [customValue, setCustomValue] = useState<string>('');
  const [results, setResults] = useState<SimulationResult[]>([]);

  const selectedEvent = EVENT_TYPES.find((e) => e.value === selectedEventType);

  // Get target options based on event type
  const targetOptions = useMemo(() => {
    if (!selectedEvent?.targetType) return [];

    switch (selectedEvent.targetType) {
      case 'step':
        return steps.map((s) => ({ value: s.id, label: s.name }));
      case 'phase':
        return phases.map((p) => ({ value: p.id, label: p.name }));
      case 'artifact':
        // Filter artifacts by type if event is specific
        let filteredArtifacts = artifacts;
        if (selectedEventType === 'keypad_correct' || selectedEventType === 'keypad_failed') {
          filteredArtifacts = artifacts.filter((a) => a.type === 'keypad');
        }
        if (selectedEventType === 'riddle_correct') {
          filteredArtifacts = artifacts.filter((a) => a.type === 'riddle');
        }
        if (selectedEventType === 'counter_reached') {
          filteredArtifacts = artifacts.filter((a) => a.type === 'counter');
        }
        if (selectedEventType === 'hotspot_found') {
          filteredArtifacts = artifacts.filter((a) => a.type === 'hotspot');
        }
        if (selectedEventType === 'tile_puzzle_complete') {
          filteredArtifacts = artifacts.filter((a) => a.type === 'tile_puzzle');
        }
        if (selectedEventType === 'cipher_decoded') {
          filteredArtifacts = artifacts.filter((a) => a.type === 'cipher');
        }
        if (selectedEventType === 'logic_grid_solved') {
          filteredArtifacts = artifacts.filter((a) => a.type === 'logic_grid');
        }
        return filteredArtifacts.map((a) => ({ value: a.id, label: a.name }));
      default:
        return [];
    }
  }, [selectedEvent, selectedEventType, artifacts, steps, phases]);

  // Simulate event
  const handleSimulate = useCallback(() => {
    if (!selectedEventType) return;

    const event: SimulationEvent = { type: selectedEventType };

    // Add target field if applicable
    if (selectedEvent?.targetField) {
      if (selectedEvent.targetType === 'custom') {
        event[selectedEvent.targetField] = customValue;
      } else {
        event[selectedEvent.targetField] = targetId;
      }
    }

    // Find matching triggers
    const matchingTriggers = triggers.filter(
      (t) => t.enabled && t.status === 'armed' && conditionMatches(t.when, event)
    );

    const result: SimulationResult = {
      event,
      matchingTriggers,
      timestamp: new Date(),
    };

    setResults((prev) => [result, ...prev].slice(0, 10));
  }, [selectedEventType, selectedEvent, targetId, customValue, triggers]);

  // Count armed triggers
  const armedCount = triggers.filter((t) => t.status === 'armed' && t.enabled).length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BoltIcon className="h-5 w-5" />
          Trigger Dry-Run
        </CardTitle>
        <CardDescription>
          Testa vilka triggers som aktiveras av olika händelser ({armedCount} aktiva)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Event selector */}
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label>Händelsetyp</Label>
            <Select
              value={selectedEventType}
              onChange={(e) => {
                setSelectedEventType(e.target.value);
                setTargetId('');
                setCustomValue('');
              }}
              options={[
                { value: '', label: 'Välj händelse att simulera' },
                ...EVENT_TYPES.map((event) => ({
                  value: event.value,
                  label: event.label,
                })),
              ]}
            />
          </div>

          {/* Target selector */}
          {selectedEvent?.targetType === 'step' && (
            <div className="space-y-2">
              <Label>Steg</Label>
              <Select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                options={[
                  { value: '', label: 'Välj steg' },
                  ...targetOptions,
                ]}
              />
            </div>
          )}

          {selectedEvent?.targetType === 'phase' && (
            <div className="space-y-2">
              <Label>Fas</Label>
              <Select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                options={[
                  { value: '', label: 'Välj fas' },
                  ...targetOptions,
                ]}
              />
            </div>
          )}

          {selectedEvent?.targetType === 'artifact' && (
            <div className="space-y-2">
              <Label>Artefakt</Label>
              <Select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                options={[
                  { value: '', label: 'Välj artefakt' },
                  ...targetOptions,
                ]}
              />
            </div>
          )}

          {selectedEvent?.targetType === 'custom' && (
            <div className="space-y-2">
              <Label>{selectedEvent.targetField}</Label>
              <Input
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder={`Ange ${selectedEvent.targetField}`}
              />
            </div>
          )}

          <Button
            onClick={handleSimulate}
            disabled={
              !selectedEventType ||
              (selectedEvent?.targetType === 'step' && !targetId && steps.length > 0) ||
              (selectedEvent?.targetType === 'phase' && !targetId && phases.length > 0) ||
              (selectedEvent?.targetType === 'artifact' && !targetId && targetOptions.length > 0) ||
              (selectedEvent?.targetType === 'custom' && !customValue)
            }
            className="w-full"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Simulera händelse
          </Button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Resultat</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResults([])}
                className="h-7 text-xs"
              >
                Rensa
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.map((result, i) => (
                <SimulationResultCard key={i} result={result} />
              ))}
            </div>
          </div>
        )}

        {/* Warning if no triggers */}
        {triggers.length === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-600 text-sm">
            <ExclamationTriangleIcon className="h-4 w-4" />
            Inga triggers definierade för detta spel
          </div>
        )}
      </CardContent>
    </Card>
  );
}
