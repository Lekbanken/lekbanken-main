'use client';

import { useState, useTransition } from 'react';
import { TrophyIcon } from '@heroicons/react/24/outline';
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

const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global', description: 'Synlig för alla användare' },
  { value: 'tenant', label: 'Tenant', description: 'Synlig inom en specifik organisation' },
  { value: 'private', label: 'Privat', description: 'Endast synlig för tilldelade användare' },
];

const CONDITION_TYPES = [
  { value: 'manual', label: 'Manuell', description: 'Tilldelas manuellt av admin' },
  { value: 'games_played', label: 'Spelade spel', description: 'Efter ett antal spelade spel' },
  { value: 'score_reached', label: 'Poäng uppnådd', description: 'När en viss poängnivå nås' },
  { value: 'streak', label: 'Streak', description: 'Efter ett antal dagar i rad' },
  { value: 'first_game', label: 'Första spelet', description: 'När användaren spelar sitt första spel' },
  { value: 'perfect_score', label: 'Perfekt poäng', description: 'När användaren får max poäng' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Utkast' },
  { value: 'active', label: 'Aktiv' },
  { value: 'archived', label: 'Arkiverad' },
];

export function AchievementEditorDrawer({
  open,
  achievement,
  tenants,
  onClose,
  onSave,
}: AchievementEditorDrawerProps) {
  const isEditing = !!achievement;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [badgePickerOpen, setBadgePickerOpen] = useState(false);

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
            setError(result.error || 'Kunde inte uppdatera achievement');
            return;
          }
        } else {
          const result = await createAchievement(formData);
          if (!result.success) {
            setError(result.error || 'Kunde inte skapa achievement');
            return;
          }
        }
        onSave();
      } catch (err) {
        setError('Ett oväntat fel uppstod');
        console.error(err);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Redigera achievement' : 'Skapa nytt achievement'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Uppdatera achievement-inställningar nedan.'
              : 'Fyll i informationen nedan för att skapa ett nytt achievement.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Namn *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="T.ex. Första spelet"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskriv hur man uppnår detta achievement..."
              rows={3}
            />
          </div>

          {/* Badge/Icon */}
          <div className="space-y-2">
            <Label>Badge/Ikon</Label>
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
                  {iconConfig ? 'Byt Badge' : 'Välj Badge'}
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
            <Label>Scope *</Label>
            <div className="grid gap-2">
              {SCOPE_OPTIONS.map((option) => (
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
              <Label htmlFor="tenant">Organisation *</Label>
              <select
                id="tenant"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                required
              >
                <option value="">Välj organisation</option>
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
            <Label htmlFor="conditionType">Trigger *</Label>
            <select
              id="conditionType"
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {CONDITION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground">
              {CONDITION_TYPES.find(t => t.value === conditionType)?.description}
            </p>
          </div>

          {/* Condition Value (conditional) */}
          {['games_played', 'score_reached', 'streak'].includes(conditionType) && (
            <div className="space-y-2">
              <Label htmlFor="conditionValue">
                {conditionType === 'games_played' && 'Antal spel'}
                {conditionType === 'score_reached' && 'Poäng att nå'}
                {conditionType === 'streak' && 'Antal dagar'}
              </Label>
              <Input
                id="conditionValue"
                type="number"
                min="1"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder="Ange värde..."
              />
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {STATUS_OPTIONS.map((option) => (
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
              Avbryt
            </Button>
            <Button type="submit" disabled={isPending || !name}>
              {isPending ? 'Sparar...' : isEditing ? 'Uppdatera' : 'Skapa'}
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
