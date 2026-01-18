'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Button, Input, Textarea, Select, Switch } from '@/components/ui';
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

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;

function createOption(order: number, t: ReturnType<typeof useTranslations>): DecisionOption {
  return {
    key: `opt-${makeId().slice(0, 6)}`,
    label: t('decision.defaults.optionLabel', { index: order + 1 }),
    order,
  };
}

function createDecision(t: ReturnType<typeof useTranslations>): DecisionFormData {
  return {
    id: makeId(),
    title: t('decision.defaults.newTitle'),
    prompt: '',
    decision_type: 'poll',
    options: [createOption(0, t), createOption(1, t)],
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
  const t = useTranslations('admin.games.builder');
  const [showTemplates, setShowTemplates] = useState(false);

  const decisionTypeOptions = useMemo(() => [
    { value: 'poll' as const, label: t('decision.types.poll') },
    { value: 'vote' as const, label: t('decision.types.vote') },
    { value: 'quiz' as const, label: t('decision.types.quiz') },
    { value: 'rating' as const, label: t('decision.types.rating') },
    { value: 'ranking' as const, label: t('decision.types.ranking') },
  ], [t]);

  const decisionTemplates = useMemo(
    () => [
      {
        name: t('decision.templates.yesNo.name'),
        type: 'poll' as const,
        icon: '👍',
        decision: {
          title: t('decision.templates.yesNo.title'),
          prompt: t('decision.templates.yesNo.prompt'),
          decision_type: 'poll' as const,
          options: [
            { key: 'yes', label: t('decision.templates.yesNo.optionYes'), order: 0 },
            { key: 'no', label: t('decision.templates.yesNo.optionNo'), order: 1 },
          ],
          allow_multiple: false,
          max_choices: 1,
        },
      },
      {
        name: t('decision.templates.multipleChoice.name'),
        type: 'poll' as const,
        icon: '📋',
        decision: {
          title: t('decision.templates.multipleChoice.title'),
          prompt: t('decision.templates.multipleChoice.prompt'),
          decision_type: 'poll' as const,
          options: [
            { key: 'a', label: t('decision.templates.multipleChoice.optionA'), order: 0 },
            { key: 'b', label: t('decision.templates.multipleChoice.optionB'), order: 1 },
            { key: 'c', label: t('decision.templates.multipleChoice.optionC'), order: 2 },
          ],
          allow_multiple: false,
          max_choices: 1,
        },
      },
      {
        name: t('decision.templates.groupVote.name'),
        type: 'vote' as const,
        icon: '✅',
        decision: {
          title: t('decision.templates.groupVote.title'),
          prompt: t('decision.templates.groupVote.prompt'),
          decision_type: 'vote' as const,
          options: [
            { key: 'opt1', label: t('decision.templates.groupVote.option1'), order: 0 },
            { key: 'opt2', label: t('decision.templates.groupVote.option2'), order: 1 },
            { key: 'opt3', label: t('decision.templates.groupVote.option3'), order: 2 },
            { key: 'opt4', label: t('decision.templates.groupVote.option4'), order: 3 },
          ],
          allow_multiple: true,
          max_choices: 3,
        },
      },
      {
        name: t('decision.templates.quiz.name'),
        type: 'quiz' as const,
        icon: '❓',
        decision: {
          title: t('decision.templates.quiz.title'),
          prompt: t('decision.templates.quiz.prompt'),
          decision_type: 'quiz' as const,
          options: [
            { key: 'a', label: t('decision.templates.quiz.optionA'), correct: false, order: 0 },
            { key: 'b', label: t('decision.templates.quiz.optionB'), correct: true, order: 1 },
            { key: 'c', label: t('decision.templates.quiz.optionC'), correct: false, order: 2 },
          ],
          allow_multiple: false,
          max_choices: 1,
          reveal_on_close: true,
        },
      },
      {
        name: t('decision.templates.rating.name'),
        type: 'rating' as const,
        icon: '⭐',
        decision: {
          title: t('decision.templates.rating.title'),
          prompt: t('decision.templates.rating.prompt'),
          decision_type: 'rating' as const,
          options: [
            { key: '1', label: t('decision.templates.rating.option1'), order: 0 },
            { key: '2', label: t('decision.templates.rating.option2'), order: 1 },
            { key: '3', label: t('decision.templates.rating.option3'), order: 2 },
            { key: '4', label: t('decision.templates.rating.option4'), order: 3 },
            { key: '5', label: t('decision.templates.rating.option5'), order: 4 },
          ],
          allow_multiple: false,
          max_choices: 1,
        },
      },
      {
        name: t('decision.templates.anonymous.name'),
        type: 'poll' as const,
        icon: '🎭',
        decision: {
          title: t('decision.templates.anonymous.title'),
          prompt: t('decision.templates.anonymous.prompt'),
          decision_type: 'poll' as const,
          options: [
            { key: 'opt1', label: t('decision.templates.anonymous.option1'), order: 0 },
            { key: 'opt2', label: t('decision.templates.anonymous.option2'), order: 1 },
          ],
          allow_anonymous: true,
          allow_multiple: false,
          max_choices: 1,
        },
      },
    ],
    [t]
  );

  const addDecision = (template?: Partial<DecisionFormData>) => {
    const base = createDecision(t);
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
    options.push(createOption(options.length, t));
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
          <h3 className="text-lg font-semibold">{t('decision.header.title', { count: decisions.length })}</h3>
          <p className="text-sm text-muted-foreground">{t('decision.header.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            <SparklesIcon className="h-4 w-4 mr-1" />
            {t('decision.header.templates')}
          </Button>
          <Button size="sm" onClick={() => addDecision()}>
            <PlusIcon className="h-4 w-4 mr-1" />
            {t('decision.header.add')}
          </Button>
        </div>
      </div>

      {/* Template picker */}
      {showTemplates && (
        <Card className="p-4 border-dashed border-2 border-primary/30 bg-primary/5">
          <p className="text-sm font-semibold mb-3">{t('decision.templatesTitle')}</p>
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
                  <p className="text-xs text-muted-foreground capitalize">{t(`decision.types.${tpl.type}`)}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {decisions.length === 0 && !showTemplates && (
        <Card className="p-6 text-center text-muted-foreground">
          <p className="text-sm">{t('decision.empty.title')}</p>
          <p className="text-xs mt-1">{t('decision.empty.description')}</p>
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
                placeholder={t('decision.fields.titlePlaceholder')}
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
              <label className="text-sm font-medium text-foreground">{t('decision.fields.typeLabel')}</label>
              <Select
                value={decision.decision_type}
                onChange={(e) => updateDecision(idx, { decision_type: e.target.value as DecisionType })}
                options={decisionTypeOptions}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('decision.fields.maxChoicesLabel')}</label>
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
            <label className="text-sm font-medium text-foreground">{t('decision.fields.promptLabel')}</label>
            <Textarea
              value={decision.prompt}
              onChange={(e) => updateDecision(idx, { prompt: e.target.value })}
              rows={2}
              placeholder={t('decision.fields.promptPlaceholder')}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{t('decision.options.title', { count: decision.options.length })}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => addOption(idx)}
              >
                <PlusIcon className="h-4 w-4 mr-1" /> {t('decision.options.add')}
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
                    placeholder={t('decision.options.placeholder')}
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
                      title={t('decision.options.markCorrect')}
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
              {t('decision.advanced.title')}
            </summary>
            <div className="mt-3 space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t('decision.advanced.anonymousLabel')}</p>
                    <p className="text-xs text-muted-foreground">{t('decision.advanced.anonymousHelp')}</p>
                  </div>
                  <Switch
                    checked={decision.allow_anonymous}
                    onCheckedChange={(checked) => updateDecision(idx, { allow_anonymous: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t('decision.advanced.multipleLabel')}</p>
                    <p className="text-xs text-muted-foreground">{t('decision.advanced.multipleHelp')}</p>
                  </div>
                  <Switch
                    checked={decision.allow_multiple}
                    onCheckedChange={(checked) => updateDecision(idx, { allow_multiple: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t('decision.advanced.revealLabel')}</p>
                    <p className="text-xs text-muted-foreground">{t('decision.advanced.revealHelp')}</p>
                  </div>
                  <Switch
                    checked={decision.reveal_on_close}
                    onCheckedChange={(checked) => updateDecision(idx, { reveal_on_close: checked })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('decision.advanced.autoCloseLabel')}</label>
                  <Input
                    type="number"
                    min={0}
                    value={decision.auto_close_seconds ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10) || 0);
                      updateDecision(idx, { auto_close_seconds: val });
                    }}
                    placeholder={t('decision.advanced.autoClosePlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">{t('decision.advanced.autoCloseHelp')}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('decision.advanced.stepLabel')}</label>
                  <Input
                    type="number"
                    min={0}
                    max={Math.max(0, stepCount - 1)}
                    value={decision.step_index ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      updateDecision(idx, { step_index: Number.isFinite(val) ? val : null });
                    }}
                    placeholder={t('decision.advanced.stepPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{t('decision.advanced.phaseLabel')}</label>
                  <Input
                    type="number"
                    min={0}
                    max={Math.max(0, phaseCount - 1)}
                    value={decision.phase_index ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      updateDecision(idx, { phase_index: Number.isFinite(val) ? val : null });
                    }}
                    placeholder={t('decision.advanced.phasePlaceholder')}
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
