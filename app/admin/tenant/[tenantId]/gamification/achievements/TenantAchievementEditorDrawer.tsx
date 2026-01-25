'use client';

import { useState, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Textarea } from '@/components/ui';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import type { TenantAchievementRow } from '@/app/actions/tenant-achievements-admin';
import { createTenantAchievement, updateTenantAchievement } from '@/app/actions/tenant-achievements-admin';

interface TenantAchievementEditorDrawerProps {
  open: boolean;
  tenantId: string;
  achievement: TenantAchievementRow | null;
  onClose: () => void;
  onSave: () => void;
}

const CONDITION_TYPES = [
  { value: 'manual', label: 'Manuell', description: 'Tilldelas manuellt av admin' },
  { value: 'games_played', label: 'Spelade spel', description: 'Efter ett antal spelade spel' },
  { value: 'score_reached', label: 'Poäng uppnådd', description: 'När en viss poängnivå nås' },
  { value: 'streak', label: 'Streak', description: 'Efter ett antal dagar i rad' },
  { value: 'first_game', label: 'Första spelet', description: 'När användaren spelar sitt första spel' },
  { value: 'perfect_score', label: 'Perfekt poäng', description: 'När användaren får max poäng' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Utkast', description: 'Ej synlig eller delbar' },
  { value: 'active', label: 'Aktiv', description: 'Synlig och kan delas ut' },
  { value: 'archived', label: 'Arkiverad', description: 'Dold från listor' },
];

// Inner form component that resets when key changes
function AchievementForm({
  open,
  tenantId,
  achievement,
  onClose,
  onSave,
}: {
  open: boolean;
  tenantId: string;
  achievement: TenantAchievementRow | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const t = useTranslations('admin.achievements');
  const isEditing = !!achievement;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state with initial values from achievement
  const [name, setName] = useState(achievement?.name ?? '');
  const [description, setDescription] = useState(achievement?.description ?? '');
  const [achievementKey, setAchievementKey] = useState(achievement?.achievement_key ?? '');
  const [conditionType, setConditionType] = useState(achievement?.condition_type ?? 'manual');
  const [conditionValue, setConditionValue] = useState(
    achievement?.condition_value !== null && achievement?.condition_value !== undefined
      ? String(achievement.condition_value)
      : ''
  );
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>(achievement?.status ?? 'draft');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = {
      name,
      description: description || null,
      achievement_key: achievementKey || null,
      condition_type: conditionType,
      condition_value: conditionValue ? parseInt(conditionValue, 10) : null,
      status,
    };

    startTransition(async () => {
      try {
        if (isEditing && achievement) {
          const result = await updateTenantAchievement(tenantId, achievement.id, formData);
          if (!result.success) {
            setError(result.error || t('errors.couldNotUpdate'));
            return;
          }
        } else {
          const result = await createTenantAchievement(tenantId, formData);
          if (!result.success) {
            setError(result.error || t('errors.couldNotCreate'));
            return;
          }
        }
        onSave();
      } catch (err) {
        setError(t('errors.unexpected'));
        console.error(err);
      }
    });
  };

  const showConditionValue = !['manual', 'first_game', 'perfect_score'].includes(conditionType);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? t('drawer.editTitle') : t('drawer.createTitle')}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? t('drawer.editDescription')
              : t('drawer.createDescription')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('labels.name')} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('drawer.namePlaceholder')}
              required
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('labels.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('drawer.descriptionPlaceholder')}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Achievement Key */}
          <div className="space-y-2">
            <Label htmlFor="achievementKey">{t('labels.key')}</Label>
            <Input
              id="achievementKey"
              value={achievementKey}
              onChange={(e) => setAchievementKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              placeholder={t('labels.keyPlaceholder')}
              maxLength={50}
            />
            <p className="text-xs text-slate-500">
              {t('labels.keyHelper')}
            </p>
          </div>

          {/* Condition Type */}
          <div className="space-y-2">
            <Label>{t('labels.condition')} *</Label>
            <div className="grid gap-2">
              {CONDITION_TYPES.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    conditionType === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="conditionType"
                    value={option.value}
                    checked={conditionType === option.value}
                    onChange={(e) => setConditionType(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-slate-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Condition Value */}
          {showConditionValue && (
            <div className="space-y-2">
              <Label htmlFor="conditionValue">{t('labels.threshold')}</Label>
              <Input
                id="conditionValue"
                type="number"
                min="1"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder={t('drawer.thresholdPlaceholder')}
              />
              <p className="text-xs text-slate-500">
                {t('labels.thresholdHelper')}
              </p>
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label>{t('labels.status')} *</Label>
            <div className="grid gap-2">
              {STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    status === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={status === option.value}
                    onChange={(e) => setStatus(e.target.value as 'draft' | 'active' | 'archived')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-slate-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Footer */}
          <SheetFooter className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? t('actions.saving') : isEditing ? t('actions.saveChanges') : t('actions.create')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// Exported wrapper that uses key prop to reset form state
export function TenantAchievementEditorDrawer({
  open,
  tenantId,
  achievement,
  onClose,
  onSave,
}: TenantAchievementEditorDrawerProps) {
  // Use key prop to reset internal form state when achievement changes
  const formKey = useMemo(
    () => `${achievement?.id ?? 'new'}-${open}`,
    [achievement?.id, open]
  );

  return (
    <AchievementForm
      key={formKey}
      open={open}
      tenantId={tenantId}
      achievement={achievement}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
