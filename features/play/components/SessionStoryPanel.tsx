/**
 * SessionStoryPanel Component
 *
 * Session-local editor for story content (steps + phases).
 * Writes overrides to participant_sessions.settings.admin_overrides.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ArrowPathIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { usePlayBroadcast } from '@/features/play/hooks/usePlayBroadcast';
import {
  getSessionOverrides,
  updateSessionOverrides,
  type StepInfo,
  type PhaseInfo,
  type AdminOverrides,
} from '@/features/play/api/session-api';

type StepDraft = {
  title?: string;
  description?: string;
  durationMinutes?: number;
  display_mode?: 'instant' | 'typewriter' | 'dramatic' | null;
};

type PhaseDraft = {
  name?: string;
  description?: string;
  duration?: number | null;
};

export interface SessionStoryPanelProps {
  sessionId: string;
  className?: string;
  onPreview?: () => void;
}

export function SessionStoryPanel({ sessionId, className, onPreview }: SessionStoryPanelProps) {
  const t = useTranslations('play.sessionStoryPanel');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { connected: broadcastConnected, broadcastCountdown, broadcastStoryOverlay } = usePlayBroadcast({
    sessionId,
    enabled: Boolean(sessionId),
  });

  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [phases, setPhases] = useState<PhaseInfo[]>([]);
  const [overrides, setOverrides] = useState<AdminOverrides | null>(null);

  const [stepDrafts, setStepDrafts] = useState<Record<string, StepDraft>>({});
  const [phaseDrafts, setPhaseDrafts] = useState<Record<string, PhaseDraft>>({});

  const [countdownDuration, setCountdownDuration] = useState(5);
  const [countdownMessage, setCountdownMessage] = useState('');
  const [countdownVariant, setCountdownVariant] = useState<'default' | 'dramatic'>('default');

  const [storySource, setStorySource] = useState<'step' | 'phase' | 'custom'>('step');
  const [storyStepId, setStoryStepId] = useState('');
  const [storyPhaseId, setStoryPhaseId] = useState('');
  const [storyTitle, setStoryTitle] = useState('');
  const [storyText, setStoryText] = useState('');
  const [storySpeed, setStorySpeed] = useState<'fast' | 'normal' | 'dramatic' | 'instant'>('dramatic');
  const [storyTheme, setStoryTheme] = useState<'dark' | 'light' | 'dramatic'>('dramatic');
  const [storyShowProgress, setStoryShowProgress] = useState(true);
  const [storyAllowSkip, setStoryAllowSkip] = useState(true);
  const [storyAllowParticipantSkip, setStoryAllowParticipantSkip] = useState(false);
  const [storyAllowClose, setStoryAllowClose] = useState(true);

  const displayModeLabels = useMemo(
    () => ({
      instant: t('displayModes.instant'),
      typewriter: t('displayModes.typewriter'),
      dramatic: t('displayModes.dramatic'),
    }),
    [t]
  );

  const stepOverrideMap = useMemo(
    () => new Map((overrides?.steps ?? []).map((o) => [o.id, o])),
    [overrides]
  );
  const phaseOverrideMap = useMemo(
    () => new Map((overrides?.phases ?? []).map((o) => [o.id, o])),
    [overrides]
  );

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [gameRes, overridesRes] = await Promise.all([
        fetch(`/api/play/sessions/${sessionId}/game`, { cache: 'no-store' }),
        getSessionOverrides(sessionId),
      ]);

      if (!gameRes.ok) {
        throw new Error(t('errors.loadFailed'));
      }

      const data = (await gameRes.json()) as {
        steps?: StepInfo[];
        phases?: PhaseInfo[];
      };

      const nextSteps = data.steps ?? [];
      const nextPhases = data.phases ?? [];

      setSteps(nextSteps);
      setPhases(nextPhases);
      setOverrides(overridesRes ?? null);

      const nextStepDrafts: Record<string, StepDraft> = {};
      nextSteps.forEach((step) => {
        nextStepDrafts[step.id] = {
          title: step.title,
          description: step.description,
          durationMinutes: step.durationMinutes,
          display_mode: step.display_mode ?? null,
        };
      });
      setStepDrafts(nextStepDrafts);

      const nextPhaseDrafts: Record<string, PhaseDraft> = {};
      nextPhases.forEach((phase) => {
        nextPhaseDrafts[phase.id] = {
          name: phase.name,
          description: phase.description ?? '',
          duration: phase.duration ?? null,
        };
      });
      setPhaseDrafts(nextPhaseDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [sessionId, t]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  useEffect(() => {
    if (!storyStepId && steps.length > 0) {
      setStoryStepId(steps[0].id);
    }
  }, [steps, storyStepId]);

  useEffect(() => {
    if (!storyPhaseId && phases.length > 0) {
      setStoryPhaseId(phases[0].id);
    }
  }, [phases, storyPhaseId]);

  useEffect(() => {
    if (storySource !== 'step') return;
    const step = steps.find((item) => item.id === storyStepId);
    if (!step) return;
    setStoryTitle(step.title ?? '');
    setStoryText(step.description ?? '');
  }, [storySource, storyStepId, steps]);

  useEffect(() => {
    if (storySource !== 'phase') return;
    const phase = phases.find((item) => item.id === storyPhaseId);
    if (!phase) return;
    setStoryTitle(phase.name ?? '');
    setStoryText(phase.description ?? '');
  }, [storySource, storyPhaseId, phases]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: AdminOverrides = {
        steps: steps.map((step, index) => {
          const draft = stepDrafts[step.id] ?? {};
          const existing = stepOverrideMap.get(step.id);

          return {
            id: step.id,
            title: draft.title,
            description: draft.description,
            durationMinutes: typeof draft.durationMinutes === 'number' ? draft.durationMinutes : undefined,
            order: existing?.order ?? index,
            display_mode: draft.display_mode ?? null,
          };
        }),
        phases: phases.map((phase, index) => {
          const draft = phaseDrafts[phase.id] ?? {};
          const existing = phaseOverrideMap.get(phase.id);

          return {
            id: phase.id,
            name: draft.name,
            description: draft.description,
            duration: draft.duration ?? undefined,
            order: existing?.order ?? index,
          };
        }),
        safety: overrides?.safety,
      };

      const ok = await updateSessionOverrides(sessionId, payload);
      if (!ok) throw new Error(t('errors.saveFailed'));

      await loadContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [
    sessionId,
    steps,
    phases,
    stepDrafts,
    phaseDrafts,
    overrides?.safety,
    stepOverrideMap,
    phaseOverrideMap,
    loadContent,
    t,
  ]);

  const handleReset = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const ok = await updateSessionOverrides(sessionId, {});
      if (!ok) throw new Error(t('errors.resetFailed'));
      await loadContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.resetFailed'));
    } finally {
      setSaving(false);
    }
  }, [sessionId, loadContent, t]);

  return (
    <div className={cn('space-y-6', className)}>
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">{t('title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onPreview && (
              <Button variant="outline" size="sm" onClick={onPreview} disabled={loading || saving}>
                {t('actions.previewStory')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => void loadContent()} disabled={loading || saving}>
              <ArrowPathIcon className={cn('h-4 w-4', loading ? 'animate-spin' : '')} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleReset()} disabled={loading || saving}>
              {t('actions.resetOverrides')}
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={loading || saving}>
              {t('actions.saveChanges')}
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-destructive bg-destructive/10 text-destructive">
          {error}
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t('countdown.title')}</h4>
            <p className="text-xs text-muted-foreground">{t('countdown.description')}</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {broadcastConnected ? t('status.live') : t('status.offline')}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs text-muted-foreground space-y-1">
            {t('countdown.durationLabel')}
            <Input
              type="number"
              value={countdownDuration}
              onChange={(e) => {
                const value = Number(e.target.value);
                setCountdownDuration(Number.isFinite(value) ? value : 5);
              }}
              min={1}
            />
          </label>
          <label className="text-xs text-muted-foreground space-y-1 md:col-span-2">
            {t('countdown.messageLabel')}
            <Input
              value={countdownMessage}
              onChange={(e) => setCountdownMessage(e.target.value)}
              placeholder={t('countdown.messagePlaceholder')}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Select
            label={t('countdown.variantLabel')}
            value={countdownVariant}
            onChange={(e) => setCountdownVariant(e.target.value as 'default' | 'dramatic')}
            options={[
              { value: 'default', label: t('countdown.variantDefault') },
              { value: 'dramatic', label: t('countdown.variantDramatic') },
            ]}
          />
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                void broadcastCountdown(
                  'show',
                  countdownDuration,
                  countdownMessage.trim() ? countdownMessage.trim() : undefined,
                  countdownVariant
                )
              }
              disabled={!broadcastConnected}
            >
              {t('actions.show')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void broadcastCountdown('skip', 0)}
              disabled={!broadcastConnected}
            >
              {t('actions.skip')}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t('storyOverlay.title')}</h4>
            <p className="text-xs text-muted-foreground">{t('storyOverlay.description')}</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {broadcastConnected ? t('status.live') : t('status.offline')}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Select
            label={t('storyOverlay.sourceLabel')}
            value={storySource}
            onChange={(e) => setStorySource(e.target.value as 'step' | 'phase' | 'custom')}
            options={[
              { value: 'step', label: t('storyOverlay.sourceStep') },
              { value: 'phase', label: t('storyOverlay.sourcePhase') },
              { value: 'custom', label: t('storyOverlay.sourceCustom') },
            ]}
          />

          {storySource === 'step' && (
            <div className="md:col-span-2">
              <Select
                label={t('storyOverlay.stepLabel')}
                value={storyStepId}
                onChange={(e) => setStoryStepId(e.target.value)}
                options={steps.map((step, index) => ({ value: step.id, label: `${index + 1}. ${step.title}` }))}
              />
            </div>
          )}

          {storySource === 'phase' && (
            <div className="md:col-span-2">
              <Select
                label={t('storyOverlay.phaseLabel')}
                value={storyPhaseId}
                onChange={(e) => setStoryPhaseId(e.target.value)}
                options={phases.map((phase, index) => ({ value: phase.id, label: `${index + 1}. ${phase.name}` }))}
              />
            </div>
          )}
        </div>

        <label className="text-xs text-muted-foreground space-y-1">
          {t('storyOverlay.titleLabel')}
          <Input
            value={storyTitle}
            onChange={(e) => setStoryTitle(e.target.value)}
            placeholder={t('storyOverlay.titlePlaceholder')}
          />
        </label>

        <label className="text-xs text-muted-foreground space-y-1">
          {t('storyOverlay.textLabel')}
          <Textarea
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            placeholder={t('storyOverlay.textPlaceholder')}
            rows={4}
          />
        </label>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <Select
            label={t('storyOverlay.speedLabel')}
            value={storySpeed}
            onChange={(e) =>
              setStorySpeed(e.target.value as 'fast' | 'normal' | 'dramatic' | 'instant')
            }
            options={[
              { value: 'instant', label: t('storyOverlay.speedInstant') },
              { value: 'fast', label: t('storyOverlay.speedFast') },
              { value: 'normal', label: t('storyOverlay.speedNormal') },
              { value: 'dramatic', label: t('storyOverlay.speedDramatic') },
            ]}
          />
          <Select
            label={t('storyOverlay.themeLabel')}
            value={storyTheme}
            onChange={(e) => setStoryTheme(e.target.value as 'dark' | 'light' | 'dramatic')}
            options={[
              { value: 'dark', label: t('storyOverlay.themeDark') },
              { value: 'light', label: t('storyOverlay.themeLight') },
              { value: 'dramatic', label: t('storyOverlay.themeDramatic') },
            ]}
          />
          <div className="flex items-center gap-2">
            <Switch
              id="story-progress"
              checked={storyShowProgress}
              onCheckedChange={(value) => setStoryShowProgress(Boolean(value))}
            />
            <Label htmlFor="story-progress" className="text-xs">
              {t('storyOverlay.showProgress')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="story-skip"
              checked={storyAllowSkip}
              onCheckedChange={(value) => setStoryAllowSkip(Boolean(value))}
            />
            <Label htmlFor="story-skip" className="text-xs">
              {t('storyOverlay.allowSkip')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="story-participant-skip"
              checked={storyAllowParticipantSkip}
              onCheckedChange={(value) => setStoryAllowParticipantSkip(Boolean(value))}
            />
            <Label htmlFor="story-participant-skip" className="text-xs">
              {t('storyOverlay.participantSkip')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="story-close"
              checked={storyAllowClose}
              onCheckedChange={(value) => setStoryAllowClose(Boolean(value))}
            />
            <Label htmlFor="story-close" className="text-xs">
              {t('storyOverlay.allowClose')}
            </Label>
          </div>

          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                void broadcastStoryOverlay({
                  action: 'show',
                  text: storyText.trim() ? storyText.trim() : undefined,
                  title: storyTitle.trim() ? storyTitle.trim() : undefined,
                  speed: storySpeed,
                  theme: storyTheme,
                  showProgress: storyShowProgress,
                  allowSkip: storyAllowSkip,
                  allowParticipantSkip: storyAllowParticipantSkip,
                  allowClose: storyAllowClose,
                })
              }
              disabled={!broadcastConnected || !storyText.trim()}
            >
              {t('actions.show')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void broadcastStoryOverlay({ action: 'close' })}
              disabled={!broadcastConnected}
            >
              {t('actions.close')}
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t('phases.title')}</h4>
            <p className="text-xs text-muted-foreground">{t('phases.description')}</p>
          </div>
        </div>
        <div className="space-y-3">
          {phases.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">{t('phases.empty')}</Card>
          )}
          {phases.map((phase, index) => {
            const draft = phaseDrafts[phase.id] ?? {};
            return (
              <Card key={phase.id} className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <PencilSquareIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{t('phases.phaseLabel', { index: index + 1 })}</span>
                </div>
                <Input
                  value={draft.name ?? ''}
                  onChange={(e) =>
                    setPhaseDrafts((prev) => ({
                      ...prev,
                      [phase.id]: { ...prev[phase.id], name: e.target.value },
                    }))
                  }
                  placeholder={phase.name}
                />
                <Textarea
                  value={draft.description ?? ''}
                  onChange={(e) =>
                    setPhaseDrafts((prev) => ({
                      ...prev,
                      [phase.id]: { ...prev[phase.id], description: e.target.value },
                    }))
                  }
                  placeholder={phase.description ?? ''}
                  rows={2}
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{t('phases.durationLabel')}</span>
                  <Input
                    type="number"
                    className="w-24"
                    value={draft.duration ?? ''}
                    placeholder={phase.duration?.toString() ?? ''}
                    onChange={(e) => {
                      const value = e.target.value === '' ? null : Number(e.target.value);
                      setPhaseDrafts((prev) => ({
                        ...prev,
                        [phase.id]: {
                          ...prev[phase.id],
                          duration: value !== null && Number.isFinite(value) ? value : null,
                        },
                      }));
                    }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t('steps.title')}</h4>
            <p className="text-xs text-muted-foreground">{t('steps.description')}</p>
          </div>
        </div>
        <div className="space-y-3">
          {steps.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">{t('steps.empty')}</Card>
          )}
          {steps.map((step, index) => {
            const draft = stepDrafts[step.id] ?? {};
            const displayMode = draft.display_mode ?? step.display_mode ?? 'instant';
            return (
              <Card key={step.id} className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <PencilSquareIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{t('steps.stepLabel', { index: index + 1 })}</span>
                </div>
                <Input
                  value={draft.title ?? ''}
                  onChange={(e) =>
                    setStepDrafts((prev) => ({
                      ...prev,
                      [step.id]: { ...prev[step.id], title: e.target.value },
                    }))
                  }
                  placeholder={step.title}
                />
                <Textarea
                  value={draft.description ?? ''}
                  onChange={(e) =>
                    setStepDrafts((prev) => ({
                      ...prev,
                      [step.id]: { ...prev[step.id], description: e.target.value },
                    }))
                  }
                  placeholder={step.description}
                  rows={3}
                />
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <label className="flex items-center gap-2">
                    {t('steps.durationLabel')}
                    <Input
                      type="number"
                      className="w-20"
                      value={draft.durationMinutes ?? ''}
                      placeholder={step.durationMinutes?.toString() ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : Number(e.target.value);
                        setStepDrafts((prev) => ({
                          ...prev,
                          [step.id]: {
                            ...prev[step.id],
                            durationMinutes: Number.isFinite(value as number) ? (value as number) : undefined,
                          },
                        }));
                      }}
                    />
                  </label>
                  <Select
                    label={t('steps.displayLabel')}
                    value={displayMode ?? 'instant'}
                    onChange={(e) =>
                      setStepDrafts((prev) => ({
                        ...prev,
                        [step.id]: {
                          ...prev[step.id],
                          display_mode: e.target.value as StepDraft['display_mode'],
                        },
                      }))
                    }
                    options={Object.entries(displayModeLabels).map(([value, label]) => ({ value, label }))}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SessionStoryPanel;
