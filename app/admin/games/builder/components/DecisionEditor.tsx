'use client';

import { useState } from 'react';
import { Card, Button, Input, Textarea, Select, Switch, HelpText } from '@/components/ui';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import type { DecisionFormData, DecisionOption, DecisionType } from '@/types/games';

type DecisionEditorProps = {
  decisions: DecisionFormData[];
  stepCount: number;
  phaseCount: number;
  onChange: (decisions: DecisionFormData[]) => void;
};

const decisionTypeOptions: { value: DecisionType; label: string }[] = [
  { value: 'poll', label: '📊 Omröstning (Poll)' },
  { value: 'vote', label: '🗳️ Röstning (Vote)' },
  { value: 'quiz', label: '❓ Quiz (rätt/fel)' },
  { value: 'rating', label: '⭐ Betyg (Rating)' },
  { value: 'ranking', label: '🏆 Rankning' },
];

const decisionTemplates: { name: string; type: DecisionType; icon: string; decision: Partial<DecisionFormData> }[] = [
  {
    name: 'Ja/Nej-fråga',
    type: 'poll',
    icon: '👍',
    decision: {
      title: 'Ja eller nej?',
      prompt: 'Ställ din fråga här...',
      decision_type: 'poll',
      options: [
        { key: 'yes', label: 'Ja', order: 0 },
        { key: 'no', label: 'Nej', order: 1 },
      ],
      allow_multiple: false,
      max_choices: 1,
    },
  },
  {
    name: 'Flervalsomröstning',
    type: 'poll',
    icon: '📋',
    decision: {
      title: 'Välj ett alternativ',
      prompt: 'Vilken av dessa föredrar du?',
      decision_type: 'poll',
      options: [
        { key: 'a', label: 'Alternativ A', order: 0 },
        { key: 'b', label: 'Alternativ B', order: 1 },
        { key: 'c', label: 'Alternativ C', order: 2 },
      ],
      allow_multiple: false,
      max_choices: 1,
    },
  },
  {
    name: 'Gruppval (välj flera)',
    type: 'vote',
    icon: '✅',
    decision: {
      title: 'Välj dina favoriter',
      prompt: 'Du kan välja upp till 3 alternativ',
      decision_type: 'vote',
      options: [
        { key: 'opt1', label: 'Val 1', order: 0 },
        { key: 'opt2', label: 'Val 2', order: 1 },
        { key: 'opt3', label: 'Val 3', order: 2 },
        { key: 'opt4', label: 'Val 4', order: 3 },
      ],
      allow_multiple: true,
      max_choices: 3,
    },
  },
  {
    name: 'Quizfråga',
    type: 'quiz',
    icon: '❓',
    decision: {
      title: 'Vad är rätt svar?',
      prompt: 'Välj det korrekta alternativet',
      decision_type: 'quiz',
      options: [
        { key: 'a', label: 'Alternativ A', correct: false, order: 0 },
        { key: 'b', label: 'Alternativ B (rätt)', correct: true, order: 1 },
        { key: 'c', label: 'Alternativ C', correct: false, order: 2 },
      ],
      allow_multiple: false,
      max_choices: 1,
      reveal_on_close: true,
    },
  },
  {
    name: 'Betygsättning 1-5',
    type: 'rating',
    icon: '⭐',
    decision: {
      title: 'Hur nöjd är du?',
      prompt: 'Betygsätt på en skala 1-5',
      decision_type: 'rating',
      options: [
        { key: '1', label: '⭐', order: 0 },
        { key: '2', label: '⭐⭐', order: 1 },
        { key: '3', label: '⭐⭐⭐', order: 2 },
        { key: '4', label: '⭐⭐⭐⭐', order: 3 },
        { key: '5', label: '⭐⭐⭐⭐⭐', order: 4 },
      ],
      allow_multiple: false,
      max_choices: 1,
    },
  },
  {
    name: 'Anonym feedback',
    type: 'poll',
    icon: '🎭',
    decision: {
      title: 'Anonym omröstning',
      prompt: 'Din röst är helt anonym',
      decision_type: 'poll',
      options: [
        { key: 'opt1', label: 'Alternativ 1', order: 0 },
        { key: 'opt2', label: 'Alternativ 2', order: 1 },
      ],
      allow_anonymous: true,
      allow_multiple: false,
      max_choices: 1,
    },
  },
];

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;

function createOption(order: number): DecisionOption {
  return {
    key: `opt-${makeId().slice(0, 6)}`,
    label: `Alternativ ${order + 1}`,
    order,
  };
}

function createDecision(): DecisionFormData {
  return {
    id: makeId(),
    title: 'Ny omröstning',
    prompt: '',
    decision_type: 'poll',
    options: [createOption(0), createOption(1)],
    allow_anonymous: false,
    allow_multiple: false,
    max_choices: 1,
    auto_close_seconds: null,
    reveal_on_close: false,
    step_index: null,
    phase_index: null,
  };
}

export function DecisionEditor({
  decisions,
  stepCount,
  phaseCount,
  onChange,
}: DecisionEditorProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  const addDecision = (template?: Partial<DecisionFormData>) => {
    const base = createDecision();
    const decision: DecisionFormData = template
      ? { ...base, ...template, id: base.id }
      : base;
    onChange([...decisions, decision]);
    setShowTemplates(false);
  };

  const updateDecision = (index: number, next: Partial<DecisionFormData>) => {
    const draft = [...decisions];
    draft[index] = { ...draft[index], ...next };
    onChange(draft);
  };

  const removeDecision = (index: number) => {
    const draft = [...decisions];
    draft.splice(index, 1);
    onChange(draft);
  };

  const moveDecision = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= decisions.length) return;
    const draft = [...decisions];
    const [item] = draft.splice(index, 1);
    draft.splice(target, 0, item);
    onChange(draft);
  };

  const updateOption = (decisionIndex: number, optionIndex: number, next: Partial<DecisionOption>) => {
    const draft = [...decisions];
    const options = [...draft[decisionIndex].options];
    options[optionIndex] = { ...options[optionIndex], ...next };
    draft[decisionIndex] = { ...draft[decisionIndex], options };
    onChange(draft);
  };

  const addOption = (decisionIndex: number) => {
    const draft = [...decisions];
    const options = [...draft[decisionIndex].options];
    options.push(createOption(options.length));
    draft[decisionIndex] = { ...draft[decisionIndex], options };
    onChange(draft);
  };

  const removeOption = (decisionIndex: number, optionIndex: number) => {
    const draft = [...decisions];
    const options = [...draft[decisionIndex].options];
    if (options.length <= 2) return; // minimum 2 options
    options.splice(optionIndex, 1);
    // Re-order
    options.forEach((opt, i) => (opt.order = i));
    draft[decisionIndex] = { ...draft[decisionIndex], options };
    onChange(draft);
  };

  const moveOption = (decisionIndex: number, optionIndex: number, direction: -1 | 1) => {
    const target = optionIndex + direction;
    const draft = [...decisions];
    const options = [...draft[decisionIndex].options];
    if (target < 0 || target >= options.length) return;
    const [item] = options.splice(optionIndex, 1);
    options.splice(target, 0, item);
    // Re-order
    options.forEach((opt, i) => (opt.order = i));
    draft[decisionIndex] = { ...draft[decisionIndex], options };
    onChange(draft);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Omröstningar ({decisions.length})</h3>
          <p className="text-sm text-muted-foreground">Polls, röstningar och quiz-frågor för deltagare</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            <SparklesIcon className="h-4 w-4 mr-1" />
            Mallar
          </Button>
          <Button size="sm" onClick={() => addDecision()}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Lägg till
          </Button>
        </div>
      </div>

      {/* Template picker */}
      {showTemplates && (
        <Card className="p-4 border-dashed border-2 border-primary/30 bg-primary/5">
          <p className="text-sm font-semibold mb-3">Välj en mall:</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {decisionTemplates.map((tpl) => (
              <button
                key={tpl.name}
                onClick={() => addDecision(tpl.decision)}
                className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/50 hover:border-primary/50 transition-colors text-left"
              >
                <span className="text-2xl">{tpl.icon}</span>
                <div>
                  <p className="text-sm font-medium">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{tpl.type}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {decisions.length === 0 && !showTemplates && (
        <Card className="p-6 text-center text-muted-foreground">
          <p className="text-sm">Inga omröstningar ännu.</p>
          <p className="text-xs mt-1">Lägg till en omröstning eller välj från mallar.</p>
        </Card>
      )}

      {/* Decision cards */}
      {decisions.map((decision, idx) => (
        <Card key={decision.id} className="p-4 space-y-4 border-border/70">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {decision.decision_type === 'poll' ? '📊' :
                 decision.decision_type === 'vote' ? '🗳️' :
                 decision.decision_type === 'quiz' ? '❓' :
                 decision.decision_type === 'rating' ? '⭐' : '🏆'}
              </span>
              <Input
                value={decision.title}
                onChange={(e) => updateDecision(idx, { title: e.target.value })}
                placeholder="Titel"
                className="font-medium max-w-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => moveDecision(idx, -1)}
                disabled={idx === 0}
              >
                <ArrowUpIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => moveDecision(idx, 1)}
                disabled={idx === decisions.length - 1}
              >
                <ArrowDownIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => removeDecision(idx)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main settings */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Typ</label>
              <Select
                value={decision.decision_type}
                onChange={(e) => updateDecision(idx, { decision_type: e.target.value as DecisionType })}
                options={decisionTypeOptions}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Max val</label>
              <Input
                type="number"
                min={1}
                max={decision.options.length}
                value={decision.max_choices}
                onChange={(e) => updateDecision(idx, { max_choices: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Fråga / Prompt</label>
            <Textarea
              value={decision.prompt}
              onChange={(e) => updateDecision(idx, { prompt: e.target.value })}
              rows={2}
              placeholder="Skriv frågan som visas för deltagarna..."
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Alternativ ({decision.options.length})</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addOption(idx)}
              >
                <PlusIcon className="h-4 w-4 mr-1" /> Lägg till
              </Button>
            </div>

            <div className="space-y-2">
              {decision.options.map((option, oIdx) => (
                <div
                  key={option.key}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-muted/20"
                >
                  <span className="text-xs font-mono text-muted-foreground w-6">{oIdx + 1}</span>
                  <Input
                    value={option.label}
                    onChange={(e) => updateOption(idx, oIdx, { label: e.target.value })}
                    placeholder="Alternativtext"
                    className="flex-1"
                  />
                  
                  {/* Quiz correct marker */}
                  {decision.decision_type === 'quiz' && (
                    <Button
                      type="button"
                      size="sm"
                      variant={option.correct ? 'default' : 'ghost'}
                      className={`h-8 w-8 p-0 ${option.correct ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      onClick={() => {
                        // For quiz, only one correct answer
                        const opts = decision.options.map((o, i) => ({
                          ...o,
                          correct: i === oIdx,
                        }));
                        updateDecision(idx, { options: opts });
                      }}
                      title="Markera som rätt svar"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => moveOption(idx, oIdx, -1)}
                    disabled={oIdx === 0}
                  >
                    <ArrowUpIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => moveOption(idx, oIdx, 1)}
                    disabled={oIdx === decision.options.length - 1}
                  >
                    <ArrowDownIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => removeOption(idx, oIdx)}
                    disabled={decision.options.length <= 2}
                  >
                    <TrashIcon className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced settings */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
              <span className="group-open:rotate-90 transition-transform">▶</span>
              Avancerade inställningar
            </summary>
            <div className="mt-3 space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Anonym röstning</p>
                    <p className="text-xs text-muted-foreground">Dölj vem som röstat</p>
                  </div>
                  <Switch
                    checked={decision.allow_anonymous}
                    onCheckedChange={(checked) => updateDecision(idx, { allow_anonymous: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Tillåt flera val</p>
                    <p className="text-xs text-muted-foreground">Deltagare kan välja flera</p>
                  </div>
                  <Switch
                    checked={decision.allow_multiple}
                    onCheckedChange={(checked) => updateDecision(idx, { allow_multiple: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Visa resultat direkt</p>
                    <p className="text-xs text-muted-foreground">Avslöja när stängd</p>
                  </div>
                  <Switch
                    checked={decision.reveal_on_close}
                    onCheckedChange={(checked) => updateDecision(idx, { reveal_on_close: checked })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Auto-stäng (sek)</label>
                  <Input
                    type="number"
                    min={0}
                    value={decision.auto_close_seconds ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0);
                      updateDecision(idx, { auto_close_seconds: val });
                    }}
                    placeholder="Manuell"
                  />
                  <p className="text-xs text-muted-foreground">0 eller tom = manuell</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Visa vid steg</label>
                  <Input
                    type="number"
                    min={0}
                    max={Math.max(0, stepCount - 1)}
                    value={decision.step_index ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      updateDecision(idx, { step_index: Number.isFinite(val) ? val : null });
                    }}
                    placeholder="Valfritt"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Visa vid fas</label>
                  <Input
                    type="number"
                    min={0}
                    max={Math.max(0, phaseCount - 1)}
                    value={decision.phase_index ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      updateDecision(idx, { phase_index: Number.isFinite(val) ? val : null });
                    }}
                    placeholder="Valfritt"
                  />
                </div>
              </div>
            </div>
          </details>
        </Card>
      ))}
    </div>
  );
}
