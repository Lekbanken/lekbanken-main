'use client';

import { useMemo, useState, useTransition } from 'react';
import { TrophyIcon } from '@heroicons/react/24/outline';
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
import type { AchievementRow, TenantOption } from '@/app/actions/achievements-admin';
import { createAchievement, updateAchievement } from '@/app/actions/achievements-admin';
import { BadgePicker, type BadgeExportItem } from '@/components/admin/BadgePicker';
import { BadgePreviewEnhanced } from '@/features/admin/achievements/editor/components/BadgePreviewEnhanced';
import type { AchievementIconConfig } from '@/features/admin/achievements/types';

interface AchievementEditorDrawerProps {
  open: boolean;
  achievement: AchievementRow | null;
  tenants: TenantOption[];
  onClose: () => void;
  onSave: () => void;
}

export function AchievementEditorDrawer({
  open,
  achievement,
  tenants,
  onClose,
  onSave,
}: AchievementEditorDrawerProps) {
  const t = useTranslations('admin.gamification.achievements.editor');
  const isEditing = !!achievement;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [badgePickerOpen, setBadgePickerOpen] = useState(false);

  const scopeOptions = useMemo(
    () => [
      { value: 'global', label: t('scope.global.label'), description: t('scope.global.description') },
      { value: 'tenant', label: t('scope.tenant.label'), description: t('scope.tenant.description') },
      { value: 'private', label: t('scope.private.label'), description: t('scope.private.description') },
    ],
    [t]
  );

  const conditionTypes = useMemo(
    () => [
      { value: 'manual', label: t('conditions.manual.label'), description: t('conditions.manual.description') },
      { value: 'games_played', label: t('conditions.gamesPlayed.label'), description: t('conditions.gamesPlayed.description') },
      { value: 'score_reached', label: t('conditions.scoreReached.label'), description: t('conditions.scoreReached.description') },
      { value: 'streak', label: t('conditions.streak.label'), description: t('conditions.streak.description') },
      { value: 'first_game', label: t('conditions.firstGame.label'), description: t('conditions.firstGame.description') },
      { value: 'perfect_score', label: t('conditions.perfectScore.label'), description: t('conditions.perfectScore.description') },
    ],
    [t]
  );

  const statusOptions = useMemo(
    () => [
      { value: 'draft', label: t('status.draft') },
      { value: 'active', label: t('status.active') },
      { value: 'archived', label: t('status.archived') },
    ],
    [t]
  );

  // Form state - initialized based on whether editing or creating
  const [name, setName] = useState(achievement?.name ?? '');
  const [description, setDescription] = useState(achievement?.description ?? '');
  const [scope, setScope] = useState<'global' | 'tenant' | 'private'>(achievement?.scope ?? 'global');
  const [tenantId, setTenantId] = useState(achievement?.tenant_id ?? '');
  const [conditionType, setConditionType] = useState(achievement?.condition_type ?? 'manual');
  const [conditionValue, setConditionValue] = useState(
    achievement?.condition_value !== null && achievement?.condition_value !== undefined
      ? String(achievement.condition_value)
      : ''
  );
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>(achievement?.status ?? 'draft');
  const [selectedBadge, setSelectedBadge] = useState<BadgeExportItem | null>(null);
  const [iconConfig, setIconConfig] = useState<AchievementIconConfig | null>(
    achievement?.icon_config as AchievementIconConfig | null ?? null
  );

  const handleBadgeSelect = (badge: BadgeExportItem) => {
    setSelectedBadge(badge);
    setIconConfig(badge.icon);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = {
      name,
      description: description || null,
      scope,
      tenant_id: scope === 'tenant' ? tenantId : null,
      condition_type: conditionType,
      condition_value: conditionValue ? parseInt(conditionValue, 10) : null,
      status,
      icon_config: iconConfig,
    };

    startTransition(async () => {
      try {
        if (isEditing && achievement) {
          const result = await updateAchievement({ id: achievement.id, ...formData });
          if (!result.success) {
            setError(result.error || t('errors.updateFailed'));
            return;
          }
        } else {
          const result = await createAchievement(formData);
          if (!result.success) {
            setError(result.error || t('errors.createFailed'));
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

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? t('title.edit') : t('title.create')}
          </SheetTitle>
          <SheetDescription>
            {isEditing ? t('description.edit') : t('description.create')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('fields.name.label')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('fields.name.placeholder')}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('fields.description.label')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('fields.description.placeholder')}
              rows={3}
            />
          </div>

          {/* Badge/Icon */}
          <div className="space-y-2">
            <Label>{t('fields.badge.label')}</Label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
                {iconConfig ? (
                  <BadgePreviewEnhanced icon={iconConfig} size="sm" showGlow={false} />
                ) : (
                  <TrophyIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBadgePickerOpen(true)}
                >
                  {iconConfig ? t('fields.badge.change') : t('fields.badge.select')}
                </Button>
                {selectedBadge && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedBadge.title}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label>{t('fields.scope.label')}</Label>
            <div className="grid gap-2">
              {scopeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    scope === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={option.value}
                    checked={scope === option.value}
                    onChange={(e) => setScope(e.target.value as typeof scope)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Tenant (conditional) */}
          {scope === 'tenant' && (
            <div className="space-y-2">
              <Label htmlFor="tenant">{t('fields.tenant.label')}</Label>
              <select
                id="tenant"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="">{t('fields.tenant.placeholder')}</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Condition Type */}
          <div className="space-y-2">
            <Label htmlFor="conditionType">{t('fields.conditionType.label')}</Label>
            <select
              id="conditionType"
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {conditionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground">
              {conditionTypes.find((type) => type.value === conditionType)?.description}
            </p>
          </div>

          {/* Condition Value (conditional) */}
          {['games_played', 'score_reached', 'streak'].includes(conditionType) && (
            <div className="space-y-2">
              <Label htmlFor="conditionValue">
                {conditionType === 'games_played' && t('fields.conditionValue.gamesPlayed')}
                {conditionType === 'score_reached' && t('fields.conditionValue.scoreReached')}
                {conditionType === 'streak' && t('fields.conditionValue.streak')}
              </Label>
              <Input
                id="conditionValue"
                type="number"
                min="1"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder={t('fields.conditionValue.placeholder')}
              />
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">{t('fields.status.label')}</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}

          <SheetFooter className="flex-row justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isPending || !name}>
              {isPending ? t('actions.saving') : isEditing ? t('actions.update') : t('actions.create')}
            </Button>
          </SheetFooter>
        </form>

        {/* Badge Picker Dialog */}
        <BadgePicker
          open={badgePickerOpen}
          onClose={() => setBadgePickerOpen(false)}
          onSelect={handleBadgeSelect}
          currentBadgeId={selectedBadge?.id}
        />
      </SheetContent>
    </Sheet>
  );
}
