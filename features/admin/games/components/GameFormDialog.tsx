'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { PuzzlePieceIcon } from '@heroicons/react/24/outline';
import type { GameFormValues, SelectOption, GameWithRelations } from '../types';

type GameFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GameFormValues) => Promise<void> | void;
  tenants: SelectOption[];
  purposes: SelectOption[];
  products: SelectOption[];
  initialGame?: GameWithRelations | null;
};

const defaultValues: GameFormValues = {
  name: '',
  short_description: '',
  description: '',
  main_purpose_id: '',
  product_id: null,
  owner_tenant_id: null,
  category: null,
  energy_level: null,
  location_type: null,
  time_estimate_min: null,
  min_players: null,
  max_players: null,
  age_min: null,
  age_max: null,
  status: 'draft',
};

export function GameFormDialog({
  open,
  onOpenChange,
  onSubmit,
  tenants,
  purposes,
  products,
  initialGame,
}: GameFormDialogProps) {
  const t = useTranslations('admin.games.form');
  const [values, setValues] = useState<GameFormValues>(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const energyOptions: SelectOption[] = useMemo(() => [
    { value: 'low', label: t('energyLow') },
    { value: 'medium', label: t('energyMedium') },
    { value: 'high', label: t('energyHigh') },
  ], [t]);

  const locationOptions: SelectOption[] = useMemo(() => [
    { value: 'indoor', label: t('locationIndoor') },
    { value: 'outdoor', label: t('locationOutdoor') },
    { value: 'both', label: t('locationBoth') },
  ], [t]);

  const statusOptions: SelectOption[] = useMemo(() => [
    { value: 'draft', label: t('statusDraft') },
    { value: 'published', label: t('statusPublished') },
  ], [t]);

  useEffect(() => {
    if (initialGame) {
      setValues({
        name: initialGame.name || '',
        short_description: initialGame.short_description || '',
        description: initialGame.description || '',
        main_purpose_id: initialGame.main_purpose_id || '',
        product_id: initialGame.product_id || null,
        owner_tenant_id: initialGame.owner_tenant_id || null,
        category: initialGame.category || null,
        energy_level: initialGame.energy_level || null,
        location_type: initialGame.location_type || null,
        time_estimate_min: initialGame.time_estimate_min ?? null,
        min_players: initialGame.min_players ?? null,
        max_players: initialGame.max_players ?? null,
        age_min: initialGame.age_min ?? null,
        age_max: initialGame.age_max ?? null,
        status: initialGame.status,
      });
    } else {
      setValues((prev) => ({
        ...defaultValues,
        main_purpose_id: prev.main_purpose_id || purposes[0]?.value || '',
      }));
    }
    setError(null);
    setIsSubmitting(false);
  }, [initialGame, purposes]);

  const hasRequiredFields = useMemo(() => {
    return Boolean(values.name.trim()) && Boolean(values.short_description.trim()) && Boolean(values.main_purpose_id);
  }, [values.name, values.short_description, values.main_purpose_id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasRequiredFields) {
      setError(t('requiredError'));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err) {
      console.error('Game form submit failed', err);
      setError(t('saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof GameFormValues>(key: K, value: GameFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <PuzzlePieceIcon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>{initialGame ? t('editTitle') : t('createTitle')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <form className="grid max-h-[70vh] grid-cols-1 gap-6 overflow-y-auto pr-1 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="game-name">
                {t('name')} <span className="text-destructive">*</span>
              </label>
              <Input
                id="game-name"
                value={values.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder={t('namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="game-short">
                {t('shortDescription')} <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="game-short"
                value={values.short_description}
                onChange={(event) => updateField('short_description', event.target.value)}
                rows={2}
                placeholder={t('shortDescriptionPlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="game-description">
                {t('fullDescription')}
              </label>
              <Textarea
                id="game-description"
                value={values.description}
                onChange={(event) => updateField('description', event.target.value)}
                rows={6}
                placeholder={t('fullDescriptionPlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('status')}</label>
                <Select
                  value={values.status}
                  onChange={(event) => updateField('status', event.target.value as GameFormValues['status'])}
                  options={statusOptions}
                  placeholder={t('statusPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('owner')}</label>
                <Select
                  value={values.owner_tenant_id ?? 'global'}
                  onChange={(event) => updateField('owner_tenant_id', event.target.value === 'global' ? null : event.target.value)}
                  options={[{ value: 'global', label: t('ownerGlobal') }, ...tenants]}
                  placeholder={t('ownerPlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t('purpose')} <span className="text-destructive">*</span>
                </label>
                <Select
                  value={values.main_purpose_id}
                  onChange={(event) => updateField('main_purpose_id', event.target.value)}
                  options={purposes}
                  placeholder={t('purposePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('product')}</label>
                <Select
                  value={values.product_id ?? ''}
                  onChange={(event) => updateField('product_id', event.target.value || null)}
                  options={[{ value: '', label: t('productNone') }, ...products]}
                  placeholder={t('productPlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('category')}</label>
                <Input
                  value={values.category || ''}
                  onChange={(event) => updateField('category', event.target.value || null)}
                  placeholder={t('categoryPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('energy')}</label>
                <Select
                  value={values.energy_level ?? ''}
                  onChange={(event) =>
                    updateField('energy_level', (event.target.value || null) as GameFormValues['energy_level'])
                  }
                  options={[{ value: '', label: t('energyNone') }, ...energyOptions]}
                  placeholder={t('energyPlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('location')}</label>
                <Select
                  value={values.location_type ?? ''}
                  onChange={(event) =>
                    updateField('location_type', (event.target.value || null) as GameFormValues['location_type'])
                  }
                  options={[{ value: '', label: t('locationUnknown') }, ...locationOptions]}
                  placeholder={t('locationPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('timeEstimate')}</label>
                <Input
                  type="number"
                  min={0}
                  value={values.time_estimate_min ?? ''}
                  onChange={(event) =>
                    updateField('time_estimate_min', event.target.value ? Number(event.target.value) : null)
                  }
                  placeholder={t('timeEstimatePlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('players')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={values.min_players ?? ''}
                    onChange={(event) =>
                      updateField('min_players', event.target.value ? Number(event.target.value) : null)
                    }
                    placeholder={t('playersMin')}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={values.max_players ?? ''}
                    onChange={(event) =>
                      updateField('max_players', event.target.value ? Number(event.target.value) : null)
                    }
                    placeholder={t('playersMax')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('age')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={values.age_min ?? ''}
                    onChange={(event) => updateField('age_min', event.target.value ? Number(event.target.value) : null)}
                    placeholder={t('ageMin')}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={values.age_max ?? ''}
                    onChange={(event) => updateField('age_max', event.target.value ? Number(event.target.value) : null)}
                    placeholder={t('ageMax')}
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="col-span-1 sm:col-span-2">
            <div className="flex w-full items-center justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={!hasRequiredFields || isSubmitting}>
                {isSubmitting ? t('saving') : initialGame ? t('saveChanges') : t('create')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
