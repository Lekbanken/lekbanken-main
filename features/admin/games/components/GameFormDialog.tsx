'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
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

const energyOptions: SelectOption[] = [
  { value: 'low', label: 'Låg' },
  { value: 'medium', label: 'Medel' },
  { value: 'high', label: 'Hög' },
];

const locationOptions: SelectOption[] = [
  { value: 'indoor', label: 'Inomhus' },
  { value: 'outdoor', label: 'Utomhus' },
  { value: 'both', label: 'Både och' },
];

const statusOptions: SelectOption[] = [
  { value: 'draft', label: 'Utkast' },
  { value: 'published', label: 'Publicerad' },
];

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
  const [values, setValues] = useState<GameFormValues>(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('Namn, kort beskrivning och syfte måste anges.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err) {
      console.error('Game form submit failed', err);
      setError('Kunde inte spara spelet. Försök igen.');
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
          <DialogTitle>{initialGame ? 'Redigera lek' : 'Skapa ny lek'}</DialogTitle>
          <DialogDescription>
            Hantera grunddata för lekbanken. Minimikrav: namn, kort beskrivning och huvudsyfte.
          </DialogDescription>
        </DialogHeader>

        <form className="grid max-h-[70vh] grid-cols-1 gap-6 overflow-y-auto pr-1 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="game-name">
                Namn <span className="text-destructive">*</span>
              </label>
              <Input
                id="game-name"
                value={values.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Ex. Samarbetsstafett"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="game-short">
                Kort beskrivning <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="game-short"
                value={values.short_description}
                onChange={(event) => updateField('short_description', event.target.value)}
                rows={2}
                placeholder="1-2 meningar som sammanfattar leken."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="game-description">
                Full beskrivning
              </label>
              <Textarea
                id="game-description"
                value={values.description}
                onChange={(event) => updateField('description', event.target.value)}
                rows={6}
                placeholder="Instruktioner, tips och säkerhetsnotiser."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select
                  value={values.status}
                  onChange={(event) => updateField('status', event.target.value as GameFormValues['status'])}
                  options={statusOptions}
                  placeholder="Välj status"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Ägare</label>
                <Select
                  value={values.owner_tenant_id ?? 'global'}
                  onChange={(event) => updateField('owner_tenant_id', event.target.value === 'global' ? null : event.target.value)}
                  options={[{ value: 'global', label: 'Global (Lekbanken)' }, ...tenants]}
                  placeholder="Välj ägare"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Syfte <span className="text-destructive">*</span>
                </label>
                <Select
                  value={values.main_purpose_id}
                  onChange={(event) => updateField('main_purpose_id', event.target.value)}
                  options={purposes}
                  placeholder="Välj syfte"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Produkt</label>
                <Select
                  value={values.product_id ?? ''}
                  onChange={(event) => updateField('product_id', event.target.value || null)}
                  options={[{ value: '', label: 'Ingen' }, ...products]}
                  placeholder="Välj produkt"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Kategori</label>
                <Input
                  value={values.category || ''}
                  onChange={(event) => updateField('category', event.target.value || null)}
                  placeholder="Ex. Samarbete, Uppvärmning"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Energi</label>
                <Select
                  value={values.energy_level ?? ''}
                  onChange={(event) =>
                    updateField('energy_level', (event.target.value || null) as GameFormValues['energy_level'])
                  }
                  options={[{ value: '', label: 'Ingen' }, ...energyOptions]}
                  placeholder="Välj energinivå"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Spelplats</label>
                <Select
                  value={values.location_type ?? ''}
                  onChange={(event) =>
                    updateField('location_type', (event.target.value || null) as GameFormValues['location_type'])
                  }
                  options={[{ value: '', label: 'Okänt' }, ...locationOptions]}
                  placeholder="Välj spelplats"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Beräknad tid (min)</label>
                <Input
                  type="number"
                  min={0}
                  value={values.time_estimate_min ?? ''}
                  onChange={(event) =>
                    updateField('time_estimate_min', event.target.value ? Number(event.target.value) : null)
                  }
                  placeholder="Ex. 15"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Spelare (min-max)</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={values.min_players ?? ''}
                    onChange={(event) =>
                      updateField('min_players', event.target.value ? Number(event.target.value) : null)
                    }
                    placeholder="Min"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={values.max_players ?? ''}
                    onChange={(event) =>
                      updateField('max_players', event.target.value ? Number(event.target.value) : null)
                    }
                    placeholder="Max"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Ålder (min-max)</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={values.age_min ?? ''}
                    onChange={(event) => updateField('age_min', event.target.value ? Number(event.target.value) : null)}
                    placeholder="Min"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={values.age_max ?? ''}
                    onChange={(event) => updateField('age_max', event.target.value ? Number(event.target.value) : null)}
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="col-span-1 sm:col-span-2">
            <div className="flex w-full items-center justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={!hasRequiredFields || isSubmitting}>
                {isSubmitting ? 'Sparar...' : initialGame ? 'Spara ändringar' : 'Skapa lek'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
