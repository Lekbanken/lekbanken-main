/**
 * SessionStoryPanel Component
 *
 * Session-local editor for story content (steps + phases).
 * Writes overrides to participant_sessions.settings.admin_overrides.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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

const DISPLAY_MODE_LABELS: Record<'instant' | 'typewriter' | 'dramatic', string> = {
  instant: 'Instant',
  typewriter: 'Typewriter',
  dramatic: 'Dramatic',
};

export interface SessionStoryPanelProps {
  sessionId: string;
  className?: string;
  onPreview?: () => void;
}

export function SessionStoryPanel({ sessionId, className, onPreview }: SessionStoryPanelProps) {
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
        throw new Error('Failed to load story content');
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
      setError(err instanceof Error ? err.message : 'Failed to load story content');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

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
      if (!ok) throw new Error('Failed to save story overrides');

      await loadContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save story overrides');
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
  ]);

  const handleReset = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const ok = await updateSessionOverrides(sessionId, {});
      if (!ok) throw new Error('Failed to reset overrides');
      await loadContent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset overrides');
    } finally {
      setSaving(false);
    }
  }, [sessionId, loadContent]);

  return (
    <div className={cn('space-y-6', className)}>
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Story content</h3>
            <p className="text-sm text-muted-foreground">
              Edit steps and phases for this session only. Changes do not affect the base game.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onPreview && (
              <Button variant="outline" size="sm" onClick={onPreview} disabled={loading || saving}>
                Preview story
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => void loadContent()} disabled={loading || saving}>
              <ArrowPathIcon className={cn('h-4 w-4', loading ? 'animate-spin' : '')} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => void handleReset()} disabled={loading || saving}>
              Reset overrides
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={loading || saving}>
              Save changes
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
            <h4 className="text-sm font-semibold text-foreground">Countdown overlay</h4>
            <p className="text-xs text-muted-foreground">Broadcast a participant countdown from the lobby.</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {broadcastConnected ? 'Live' : 'Offline'}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs text-muted-foreground space-y-1">
            Duration (sec)
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
            Message (optional)
            <Input
              value={countdownMessage}
              onChange={(e) => setCountdownMessage(e.target.value)}
              placeholder="Next moment starts in..."
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-2">
            Variant
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={countdownVariant}
              onChange={(e) => setCountdownVariant(e.target.value as 'default' | 'dramatic')}
            >
              <option value="default">Default</option>
              <option value="dramatic">Dramatic</option>
            </select>
          </label>
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
              Show
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void broadcastCountdown('skip', 0)}
              disabled={!broadcastConnected}
            >
              Skip
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Story overlay</h4>
            <p className="text-xs text-muted-foreground">Send a full-screen story overlay to participants.</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {broadcastConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs text-muted-foreground space-y-1">
            Source
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={storySource}
              onChange={(e) => setStorySource(e.target.value as 'step' | 'phase' | 'custom')}
            >
              <option value="step">Step</option>
              <option value="phase">Phase</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          {storySource === 'step' && (
            <label className="text-xs text-muted-foreground space-y-1 md:col-span-2">
              Step
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value={storyStepId}
                onChange={(e) => setStoryStepId(e.target.value)}
              >
                {steps.map((step, index) => (
                  <option key={step.id} value={step.id}>
                    {index + 1}. {step.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {storySource === 'phase' && (
            <label className="text-xs text-muted-foreground space-y-1 md:col-span-2">
              Phase
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value={storyPhaseId}
                onChange={(e) => setStoryPhaseId(e.target.value)}
              >
                {phases.map((phase, index) => (
                  <option key={phase.id} value={phase.id}>
                    {index + 1}. {phase.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <label className="text-xs text-muted-foreground space-y-1">
          Title
          <Input
            value={storyTitle}
            onChange={(e) => setStoryTitle(e.target.value)}
            placeholder="Optional title"
          />
        </label>

        <label className="text-xs text-muted-foreground space-y-1">
          Text
          <Textarea
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            placeholder="Story text to display"
            rows={4}
          />
        </label>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <label className="flex items-center gap-2">
            Speed
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={storySpeed}
              onChange={(e) =>
                setStorySpeed(e.target.value as 'fast' | 'normal' | 'dramatic' | 'instant')
              }
            >
              <option value="instant">Instant</option>
              <option value="fast">Fast</option>
              <option value="normal">Normal</option>
              <option value="dramatic">Dramatic</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            Theme
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              value={storyTheme}
              onChange={(e) => setStoryTheme(e.target.value as 'dark' | 'light' | 'dramatic')}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="dramatic">Dramatic</option>
            </select>
          </label>
          <div className="flex items-center gap-2">
            <Switch
              id="story-progress"
              checked={storyShowProgress}
              onCheckedChange={(value) => setStoryShowProgress(Boolean(value))}
            />
            <Label htmlFor="story-progress" className="text-xs">
              Show progress
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="story-skip"
              checked={storyAllowSkip}
              onCheckedChange={(value) => setStoryAllowSkip(Boolean(value))}
            />
            <Label htmlFor="story-skip" className="text-xs">
              Allow skip
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="story-participant-skip"
              checked={storyAllowParticipantSkip}
              onCheckedChange={(value) => setStoryAllowParticipantSkip(Boolean(value))}
            />
            <Label htmlFor="story-participant-skip" className="text-xs">
              Participant skip
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="story-close"
              checked={storyAllowClose}
              onCheckedChange={(value) => setStoryAllowClose(Boolean(value))}
            />
            <Label htmlFor="story-close" className="text-xs">
              Allow close
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
              Show
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void broadcastStoryOverlay({ action: 'close' })}
              disabled={!broadcastConnected}
            >
              Close
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Phases</h4>
            <p className="text-xs text-muted-foreground">Name, description, duration</p>
          </div>
        </div>
        <div className="space-y-3">
          {phases.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">No phases defined.</Card>
          )}
          {phases.map((phase, index) => {
            const draft = phaseDrafts[phase.id] ?? {};
            return (
              <Card key={phase.id} className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <PencilSquareIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Phase {index + 1}</span>
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
                  <span>Duration (sec)</span>
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
            <h4 className="text-sm font-semibold text-foreground">Steps</h4>
            <p className="text-xs text-muted-foreground">Title, description, duration, display mode</p>
          </div>
        </div>
        <div className="space-y-3">
          {steps.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">No steps defined.</Card>
          )}
          {steps.map((step, index) => {
            const draft = stepDrafts[step.id] ?? {};
            const displayMode = draft.display_mode ?? step.display_mode ?? 'instant';
            return (
              <Card key={step.id} className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <PencilSquareIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Step {index + 1}</span>
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
                    Duration (min)
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
                  <label className="flex items-center gap-2">
                    Display
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
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
                    >
                      {Object.entries(DISPLAY_MODE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
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
