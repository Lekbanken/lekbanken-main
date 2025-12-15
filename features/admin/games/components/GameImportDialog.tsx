'use client';

import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Textarea } from '@/components/ui';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import type { ImportableGame } from '../types';

type GameImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (payload: ImportableGame[]) => Promise<void>;
};

export function GameImportDialog({ open, onOpenChange, onImport }: GameImportDialogProps) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImport = async () => {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setError('Kunde inte tolka JSON. Klistra in en giltig JSON-array.');
      return;
    }

    if (!Array.isArray(parsed)) {
      setError('Formatet måste vara en array av spelobjekt.');
      return;
    }

    const cleaned: ImportableGame[] = parsed
      .map((item) => {
        const status: ImportableGame['status'] = item.status === 'published' ? 'published' : 'draft';
        return {
        name: typeof item.name === 'string' ? item.name.trim() : '',
        short_description: typeof item.short_description === 'string' ? item.short_description.trim() : '',
        main_purpose_id: typeof item.main_purpose_id === 'string' ? item.main_purpose_id : '',
        description: typeof item.description === 'string' ? item.description : '',
        category: typeof item.category === 'string' ? item.category : null,
        energy_level: item.energy_level ?? null,
        location_type: item.location_type ?? null,
        time_estimate_min: typeof item.time_estimate_min === 'number' ? item.time_estimate_min : null,
        min_players: typeof item.min_players === 'number' ? item.min_players : null,
        max_players: typeof item.max_players === 'number' ? item.max_players : null,
        age_min: typeof item.age_min === 'number' ? item.age_min : null,
        age_max: typeof item.age_max === 'number' ? item.age_max : null,
        owner_tenant_id: typeof item.owner_tenant_id === 'string' ? item.owner_tenant_id : null,
        product_id: typeof item.product_id === 'string' ? item.product_id : null,
        status,
      };
      })
      .filter((g) => g.name && g.short_description && g.main_purpose_id);

    if (cleaned.length === 0) {
      setError('Inga giltiga spel hittades. Se till att namn, kort beskrivning och main_purpose_id finns.');
      return;
    }

    setIsProcessing(true);
    try {
      await onImport(cleaned);
      setRaw('');
      onOpenChange(false);
    } catch (err) {
      console.error('Import failed', err);
      setError('Importen misslyckades. Kontrollera data och försök igen.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <ArrowUpTrayIcon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Importera spel</DialogTitle>
          <DialogDescription>
            Klistra in en JSON-array med spel. Minimikrav per rad: <code>name</code>, <code>short_description</code>,{' '}
            <code>main_purpose_id</code>. Status sätts till utkast om inget anges.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            rows={14}
            placeholder='[{"name":"Lek","short_description":"Kort text","main_purpose_id":"..."}]'
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleImport} disabled={isProcessing || raw.trim().length === 0}>
            {isProcessing ? 'Importerar...' : 'Importera'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
