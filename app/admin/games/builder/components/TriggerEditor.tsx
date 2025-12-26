'use client';

import { useState, useMemo } from 'react';
import { Card, Button, Input, Select } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import type { TriggerFormData, GamePhase, GameStep, GameArtifact } from '@/types/games';
import type { TriggerCondition, TriggerAction, TriggerConditionType, TriggerActionType } from '@/types/trigger';
import { CONDITION_OPTIONS, ACTION_OPTIONS, getConditionLabel, getActionLabel } from '@/types/trigger';

type TriggerEditorProps = {
  triggers: TriggerFormData[];
  phases: GamePhase[];
  steps: GameStep[];
  artifacts: GameArtifact[];
  onChange: (triggers: TriggerFormData[]) => void;
};

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;

function createTrigger(): TriggerFormData {
  return {
    id: makeId(),
    name: 'Ny trigger',
    description: '',
    enabled: true,
    condition: { type: 'manual' },
    actions: [],
    execute_once: true,
    delay_seconds: 0,
  };
}

// ============================================================================
// Condition Editor (inline)
// ============================================================================

function ConditionEditor({
  condition,
  phases,
  steps,
  artifacts,
  onChange,
}: {
  condition: TriggerCondition;
  phases: GamePhase[];
  steps: GameStep[];
  artifacts: GameArtifact[];
  onChange: (c: TriggerCondition) => void;
}) {
  const keypads = useMemo(
    () => artifacts.filter((a) => a.artifact_type === 'keypad'),
    [artifacts]
  );

  const conditionTypeOptions = CONDITION_OPTIONS.map((c) => ({
    value: c.type,
    label: `${c.icon} ${c.label}`,
  }));

  const getTargetOptions = (type: TriggerConditionType): { value: string; label: string }[] => {
    switch (type) {
      case 'step_started':
      case 'step_completed':
        return steps.map((s) => ({ value: s.id, label: s.title || `Steg ${s.step_order + 1}` }));
      case 'phase_started':
      case 'phase_completed':
        return phases.map((p) => ({ value: p.id, label: p.name }));
      case 'keypad_correct':
      case 'keypad_failed':
        return keypads.map((k) => ({ value: k.id, label: k.title }));
      case 'artifact_unlocked':
        return artifacts.map((a) => ({ value: a.id, label: a.title }));
      default:
        return [];
    }
  };

  const needsTarget = condition.type !== 'manual';
  const targetOptions = getTargetOptions(condition.type);
  const currentTargetId =
    'stepId' in condition ? condition.stepId :
    'phaseId' in condition ? condition.phaseId :
    'keypadId' in condition ? condition.keypadId :
    'artifactId' in condition ? condition.artifactId :
    '';

  const handleConditionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as TriggerConditionType;
    if (newType === 'manual') {
      onChange({ type: 'manual' });
    } else if (newType === 'step_started' || newType === 'step_completed') {
      onChange({ type: newType, stepId: '' });
    } else if (newType === 'phase_started' || newType === 'phase_completed') {
      onChange({ type: newType, phaseId: '' });
    } else if (newType === 'keypad_correct' || newType === 'keypad_failed') {
      onChange({ type: newType, keypadId: '' });
    } else if (newType === 'artifact_unlocked') {
      onChange({ type: newType, artifactId: '' });
    } else if (newType === 'timer_ended') {
      onChange({ type: newType, timerId: '' });
    } else if (newType === 'decision_resolved') {
      onChange({ type: newType, decisionId: '' });
    }
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if ('stepId' in condition) {
      onChange({ ...condition, stepId: id });
    } else if ('phaseId' in condition) {
      onChange({ ...condition, phaseId: id });
    } else if ('keypadId' in condition) {
      onChange({ ...condition, keypadId: id });
    } else if ('artifactId' in condition) {
      onChange({ ...condition, artifactId: id });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-foreground-secondary uppercase font-medium w-12">När</span>
      <Select
        className="w-48"
        value={condition.type}
        options={conditionTypeOptions}
        onChange={handleConditionTypeChange}
        placeholder="Välj villkor..."
      />
      {needsTarget && targetOptions.length > 0 && (
        <Select
          className="w-48"
          value={currentTargetId}
          options={targetOptions}
          onChange={handleTargetChange}
          placeholder="Välj mål..."
        />
      )}
    </div>
  );
}

// ============================================================================
// Action Editor (inline)
// ============================================================================

function ActionEditor({
  actions,
  artifacts,
  onChange,
}: {
  actions: TriggerAction[];
  artifacts: GameArtifact[];
  onChange: (a: TriggerAction[]) => void;
}) {
  const actionTypeOptions = ACTION_OPTIONS.map((a) => ({
    value: a.type,
    label: `${a.icon} ${a.label}`,
  }));

  const artifactOptions = artifacts.map((a) => ({ value: a.id, label: a.title }));
  const styleOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'typewriter', label: 'Skrivmaskin' },
    { value: 'dramatic', label: 'Dramatisk' },
  ];

  const addAction = (type: TriggerActionType) => {
    let newAction: TriggerAction;
    switch (type) {
      case 'reveal_artifact':
        newAction = { type: 'reveal_artifact', artifactId: '' };
        break;
      case 'hide_artifact':
        newAction = { type: 'hide_artifact', artifactId: '' };
        break;
      case 'show_countdown':
        newAction = { type: 'show_countdown', duration: 5, message: 'Gör er redo...' };
        break;
      case 'send_message':
        newAction = { type: 'send_message', message: '', style: 'normal' };
        break;
      case 'advance_step':
        newAction = { type: 'advance_step' };
        break;
      case 'advance_phase':
        newAction = { type: 'advance_phase' };
        break;
      case 'start_timer':
        newAction = { type: 'start_timer', duration: 60, name: 'Timer' };
        break;
      case 'reset_keypad':
        newAction = { type: 'reset_keypad', keypadId: '' };
        break;
      default:
        return;
    }
    onChange([...actions, newAction]);
  };

  const updateAction = (index: number, updated: TriggerAction) => {
    const next = [...actions];
    next[index] = updated;
    onChange(next);
  };

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const handleAddAction = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      addAction(e.target.value as TriggerActionType);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-foreground-secondary uppercase font-medium w-12">Gör</span>
        <Select
          className="w-48"
          value=""
          options={actionTypeOptions}
          onChange={handleAddAction}
          placeholder="+ Lägg till åtgärd..."
        />
      </div>
      
      {actions.map((action, idx) => (
        <div key={idx} className="ml-14 flex items-center gap-2 p-2 bg-surface-secondary rounded flex-wrap">
          <span className="text-sm font-medium">{getActionLabel(action.type)}</span>
          
          {/* Action-specific fields */}
          {action.type === 'reveal_artifact' && (
            <Select
              className="w-40"
              value={action.artifactId}
              options={artifactOptions}
              onChange={(e) => updateAction(idx, { ...action, artifactId: e.target.value })}
              placeholder="Välj artefakt..."
            />
          )}
          
          {action.type === 'hide_artifact' && (
            <Select
              className="w-40"
              value={action.artifactId}
              options={artifactOptions}
              onChange={(e) => updateAction(idx, { ...action, artifactId: e.target.value })}
              placeholder="Välj artefakt..."
            />
          )}
          
          {action.type === 'show_countdown' && (
            <>
              <Input
                type="number"
                className="w-16"
                value={action.duration}
                onChange={(e) => updateAction(idx, { ...action, duration: parseInt(e.target.value) || 5 })}
                min={1}
                max={60}
              />
              <span className="text-xs text-foreground-secondary">sek</span>
              <Input
                className="w-40"
                value={action.message}
                onChange={(e) => updateAction(idx, { ...action, message: e.target.value })}
                placeholder="Meddelande..."
              />
            </>
          )}
          
          {action.type === 'send_message' && (
            <>
              <Input
                className="flex-1 min-w-32"
                value={action.message}
                onChange={(e) => updateAction(idx, { ...action, message: e.target.value })}
                placeholder="Skriv meddelande..."
              />
              <Select
                className="w-28"
                value={action.style}
                options={styleOptions}
                onChange={(e) => updateAction(idx, { ...action, style: e.target.value as 'normal' | 'dramatic' | 'typewriter' })}
                placeholder="Stil"
              />
            </>
          )}
          
          {action.type === 'start_timer' && (
            <>
              <Input
                className="w-24"
                value={action.name}
                onChange={(e) => updateAction(idx, { ...action, name: e.target.value })}
                placeholder="Namn..."
              />
              <Input
                type="number"
                className="w-16"
                value={action.duration}
                onChange={(e) => updateAction(idx, { ...action, duration: parseInt(e.target.value) || 60 })}
                min={1}
              />
              <span className="text-xs text-foreground-secondary">sek</span>
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeAction(idx)}
            className="ml-auto"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main TriggerEditor Component
// ============================================================================

export function TriggerEditor({
  triggers,
  phases,
  steps,
  artifacts,
  onChange,
}: TriggerEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const updateTrigger = (index: number, next: Partial<TriggerFormData>) => {
    const draft = [...triggers];
    draft[index] = { ...draft[index], ...next };
    onChange(draft);
  };

  const moveTrigger = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= triggers.length) return;
    const draft = [...triggers];
    const [item] = draft.splice(index, 1);
    draft.splice(target, 0, item);
    onChange(draft);
  };

  const removeTrigger = (index: number) => {
    onChange(triggers.filter((_, i) => i !== index));
  };

  const addTrigger = () => {
    const newTrigger = createTrigger();
    onChange([...triggers, newTrigger]);
    setExpandedId(newTrigger.id ?? null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BoltIcon className="h-5 w-5 text-yellow-500" />
          Triggers ({triggers.length})
        </h3>
        <Button variant="outline" size="sm" onClick={addTrigger}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Lägg till trigger
        </Button>
      </div>

      {triggers.length === 0 && (
        <Card className="p-6 text-center text-foreground-secondary">
          <BoltIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Inga triggers ännu.</p>
          <p className="text-xs mt-1">
            Triggers automatiserar leken: &quot;När X händer, gör Y&quot;
          </p>
        </Card>
      )}

      {triggers.map((trigger, index) => {
        const isExpanded = expandedId === trigger.id;
        
        return (
          <Card key={trigger.id} className="p-4">
            {/* Header row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : trigger.id ?? null)}
                className="flex-1 flex items-center gap-2 text-left"
              >
                <BoltIcon className={`h-4 w-4 ${trigger.enabled ? 'text-yellow-500' : 'text-foreground-secondary'}`} />
                <span className="font-medium">{trigger.name || 'Namnlös trigger'}</span>
                {!trigger.enabled && (
                  <Badge variant="secondary" size="sm">Inaktiv</Badge>
                )}
                {trigger.execute_once && (
                  <Badge variant="outline" size="sm">En gång</Badge>
                )}
              </button>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveTrigger(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUpIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveTrigger(index, 1)}
                  disabled={index === triggers.length - 1}
                >
                  <ArrowDownIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTrigger(index)}
                  className="text-red-500 hover:text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Summary when collapsed */}
            {!isExpanded && (
              <div className="mt-2 text-sm text-foreground-secondary">
                {getConditionLabel(trigger.condition.type)} → {trigger.actions.length} åtgärd(er)
              </div>
            )}

            {/* Expanded editor */}
            {isExpanded && (
              <div className="mt-4 space-y-4 border-t pt-4">
                {/* Name */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium w-20">Namn</label>
                  <Input
                    value={trigger.name}
                    onChange={(e) => updateTrigger(index, { name: e.target.value })}
                    placeholder="Triggernamn..."
                    className="flex-1"
                  />
                </div>

                {/* Enabled */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium w-20">Aktiv</label>
                  <input
                    type="checkbox"
                    checked={trigger.enabled}
                    onChange={(e) => updateTrigger(index, { enabled: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>

                {/* Execute once */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium w-20">En gång</label>
                  <input
                    type="checkbox"
                    checked={trigger.execute_once}
                    onChange={(e) => updateTrigger(index, { execute_once: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-xs text-foreground-secondary">
                    Inaktiveras automatiskt efter första körningen
                  </span>
                </div>

                {/* Delay */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium w-20">Fördröjning</label>
                  <Input
                    type="number"
                    value={trigger.delay_seconds}
                    onChange={(e) => updateTrigger(index, { delay_seconds: parseInt(e.target.value) || 0 })}
                    className="w-20"
                    min={0}
                  />
                  <span className="text-xs text-foreground-secondary">sekunder</span>
                </div>

                {/* Condition */}
                <ConditionEditor
                  condition={trigger.condition}
                  phases={phases}
                  steps={steps}
                  artifacts={artifacts}
                  onChange={(condition) => updateTrigger(index, { condition })}
                />

                {/* Actions */}
                <ActionEditor
                  actions={trigger.actions}
                  artifacts={artifacts}
                  onChange={(actions) => updateTrigger(index, { actions })}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export default TriggerEditor;
