'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input, Textarea, Select, Button, HelpText } from '@/components/ui';

type StepForm = {
  title: string;
  body: string;
  duration_seconds: number | null;
};

type MaterialsForm = {
  items: string[];
  safety_notes: string;
  preparation: string;
};

type CoreForm = {
  name: string;
  short_description: string;
  description: string;
  status: string;
  play_mode: string;
  main_purpose_id: string;
  product_id: string | null;
  energy_level: string | null;
  location_type: string | null;
  time_estimate_min: number | null;
  duration_max: number | null;
  min_players: number | null;
  max_players: number | null;
  age_min: number | null;
  age_max: number | null;
  difficulty: string | null;
  accessibility_notes: string;
  space_requirements: string;
  leader_tips: string;
};

const defaultCore: CoreForm = {
  name: '',
  short_description: '',
  description: '',
  status: 'draft',
  play_mode: 'basic',
  main_purpose_id: '',
  product_id: null,
  energy_level: null,
  location_type: null,
  time_estimate_min: null,
  duration_max: null,
  min_players: null,
  max_players: null,
  age_min: null,
  age_max: null,
  difficulty: null,
  accessibility_notes: '',
  space_requirements: '',
  leader_tips: '',
};

export function GameBuilderForm({ gameId }: { gameId?: string }) {
  const router = useRouter();
  const t = useTranslations('admin.games.builder.form');
  const [core, setCore] = useState<CoreForm>(defaultCore);
  const [steps, setSteps] = useState<StepForm[]>([{ title: '', body: '', duration_seconds: null }]);
  const [materials, setMaterials] = useState<MaterialsForm>({
    items: [],
    safety_notes: '',
    preparation: '',
  });
  const [loading, setLoading] = useState(Boolean(gameId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    void (async () => {
      setError(null);
      try {
        const res = await fetch(`/api/games/builder/${gameId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t('errors.loadFailed'));
        const g = data.game;
        setCore({
          ...defaultCore,
          name: g.name || '',
          short_description: g.short_description || '',
          description: g.description || '',
          status: g.status || 'draft',
          play_mode: g.play_mode || 'basic',
          main_purpose_id: g.main_purpose_id || '',
          product_id: g.product_id,
          energy_level: g.energy_level,
          location_type: g.location_type,
          time_estimate_min: g.time_estimate_min,
          duration_max: g.duration_max,
          min_players: g.min_players,
          max_players: g.max_players,
          age_min: g.age_min,
          age_max: g.age_max,
          difficulty: g.difficulty,
          accessibility_notes: g.accessibility_notes || '',
          space_requirements: g.space_requirements || '',
          leader_tips: g.leader_tips || '',
        });
        const incomingSteps = (data.steps as Partial<StepForm>[] | undefined) ?? [];
        setSteps(
          incomingSteps.length
            ? incomingSteps.map((s) => ({
                title: s.title || '',
                body: s.body || '',
                duration_seconds: s.duration_seconds ?? null,
              }))
            : [{ title: '', body: '', duration_seconds: null }]
        );
        if (data.materials) {
          setMaterials({
            items: data.materials.items || [],
            safety_notes: data.materials.safety_notes || '',
            preparation: data.materials.preparation || '',
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunde inte ladda data');
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId]);

  const updateStep = (index: number, patch: Partial<StepForm>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addStep = () => setSteps((prev) => [...prev, { title: '', body: '', duration_seconds: null }]);
  const removeStep = (index: number) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        core: {
          ...core,
          name: core.name.trim(),
          short_description: core.short_description.trim(),
          description: core.description || null,
        },
        steps: steps.map((s, idx) => ({
          ...s,
          step_order: idx,
        })),
        materials: {
          items: materials.items,
          safety_notes: materials.safety_notes || null,
          preparation: materials.preparation || null,
        },
      };
      const res = await fetch(gameId ? `/api/games/builder/${gameId}` : '/api/games/builder', {
        method: gameId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('errors.saveFailed'));
      setMessage(t('messages.saved'));
      if (!gameId && data.gameId) {
        router.replace(`/admin/games/${data.gameId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unexpected'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('core.nameLabel')}</label>
            <Input value={core.name} onChange={(e) => setCore({ ...core, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('core.statusLabel')}</label>
            <Select
              value={core.status}
              onChange={(e) => setCore({ ...core, status: e.target.value })}
              options={[
                { value: 'draft', label: t('core.statusDraft') },
                { value: 'published', label: t('core.statusPublished') },
              ]}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('core.shortDescriptionLabel')}</label>
          <Textarea
            value={core.short_description}
            onChange={(e) => setCore({ ...core, short_description: e.target.value })}
            rows={2}
          />
          <HelpText>{t('core.shortDescriptionHelp')}</HelpText>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('core.fullDescriptionLabel')}</label>
          <Textarea
            value={core.description}
            onChange={(e) => setCore({ ...core, description: e.target.value })}
            rows={4}
          />
          <HelpText>{t('core.fullDescriptionHelp')}</HelpText>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">{t('core.timeMinutesLabel')}</label>
            <Input
              type="number"
              value={core.time_estimate_min ?? ''}
              onChange={(e) => setCore({ ...core, time_estimate_min: e.target.value ? Number(e.target.value) : null })}
            />
            <HelpText>{t('core.timeMinutesHelp')}</HelpText>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">{t('core.minPlayersLabel')}</label>
            <Input
              type="number"
              value={core.min_players ?? ''}
              onChange={(e) => setCore({ ...core, min_players: e.target.value ? Number(e.target.value) : null })}
            />
            <HelpText>{t('core.minPlayersHelp')}</HelpText>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">{t('core.maxPlayersLabel')}</label>
            <Input
              type="number"
              value={core.max_players ?? ''}
              onChange={(e) => setCore({ ...core, max_players: e.target.value ? Number(e.target.value) : null })}
            />
            <HelpText>{t('core.maxPlayersHelp')}</HelpText>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('materials.title')}</h2>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('materials.itemsLabel')}</label>
          <Textarea
            value={materials.items.join('\n')}
            onChange={(e) => setMaterials({ ...materials, items: e.target.value.split('\n').filter(Boolean) })}
            rows={4}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('materials.safetyLabel')}</label>
            <Textarea
              value={materials.safety_notes}
              onChange={(e) => setMaterials({ ...materials, safety_notes: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('materials.preparationLabel')}</label>
            <Textarea
              value={materials.preparation}
              onChange={(e) => setMaterials({ ...materials, preparation: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('steps.title')}</h2>
          <Button type="button" size="sm" onClick={addStep}>
            {t('steps.addStep')}
          </Button>
        </div>
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={idx} className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{t('steps.stepLabel', { index: idx + 1 })}</p>
                {steps.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-destructive"
                    onClick={() => removeStep(idx)}
                  >
                    {t('steps.remove')}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('steps.titleLabel')}</label>
                <Input
                  value={step.title}
                  onChange={(e) => updateStep(idx, { title: e.target.value })}
                  placeholder={t('steps.titlePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('steps.descriptionLabel')}</label>
                <Textarea
                  value={step.body}
                  onChange={(e) => updateStep(idx, { body: e.target.value })}
                  rows={3}
                  placeholder={t('steps.descriptionPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('steps.durationLabel')}</label>
                <Input
                  type="number"
                  value={step.duration_seconds ?? ''}
                  onChange={(e) =>
                    updateStep(idx, { duration_seconds: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder={t('steps.durationPlaceholder')}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? t('actions.saving') : t('actions.save')}
        </Button>
      </div>
    </form>
  );
}
