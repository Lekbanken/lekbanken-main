'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
  Badge,
  Select,
} from '@/components/ui';
import { Label } from '@/components/ui/label';
import {
  ArrowUpTrayIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { CONVERSATION_CARDS_CSV_HEADERS } from '@/features/conversation-cards/csv-format';

type ScopeType = 'global' | 'tenant';

type ImportError = {
  row: number;
  column?: string;
  message: string;
};

type DryRunResult = {
  valid: boolean;
  collection_title: string;
  cards_count: number;
  will_create_collection: boolean;
  existing_collection_id?: string;
  errors: ImportError[];
  warnings: ImportError[];
};

type ImportState = 'idle' | 'validating' | 'validated' | 'importing' | 'done';

type ConversationCardsImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  currentTenantId?: string | null;
  isSystemAdmin: boolean;
};

export function ConversationCardsImportDialog({
  open,
  onOpenChange,
  onImportComplete,
  currentTenantId,
  isSystemAdmin,
}: ConversationCardsImportDialogProps) {
  const [scopeType, setScopeType] = useState<ScopeType>(isSystemAdmin ? 'global' : 'tenant');
  const [raw, setRaw] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ImportState>('idle');
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetDialog = useCallback(() => {
    setRaw('');
    setFileName(null);
    setError(null);
    setState('idle');
    setDryRunResult(null);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setState('idle');
    setDryRunResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setRaw(content);
    };
    reader.onerror = () => {
      setError('Kunde inte läsa filen');
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    setError(null);
    setState('validating');

    try {
      const response = await fetch('/api/admin/toolbelt/conversation-cards/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv: raw,
          scope_type: scopeType,
          tenant_id: scopeType === 'tenant' ? currentTenantId : null,
          dry_run: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Valideringsfel');
        setState('idle');
        return;
      }

      setDryRunResult(result as DryRunResult);
      setState('validated');
    } catch (err) {
      console.error('Validation failed:', err);
      setError('Kunde inte validera data');
      setState('idle');
    }
  };

  const handleImport = async () => {
    setError(null);
    setState('importing');

    try {
      const response = await fetch('/api/admin/toolbelt/conversation-cards/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv: raw,
          scope_type: scopeType,
          tenant_id: scopeType === 'tenant' ? currentTenantId : null,
          dry_run: false,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Import misslyckades');
        setState('validated');
        return;
      }

      setState('done');
      onImportComplete();

      // Close dialog after short delay
      setTimeout(() => {
        resetDialog();
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      console.error('Import failed:', err);
      setError('Import misslyckades');
      setState('validated');
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const csvHeader = CONVERSATION_CARDS_CSV_HEADERS.join(',');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpTrayIcon className="h-5 w-5" />
            Importera samtalskort
          </DialogTitle>
          <DialogDescription>
            Importera samtalskort via CSV. Om samlingen inte finns skapas den automatiskt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scope selector */}
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value as ScopeType)}
              disabled={!isSystemAdmin || state !== 'idle'}
              options={[
                { value: 'global', label: 'Global (alla kan se)' },
                { value: 'tenant', label: 'Tenant (endast din organisation)' },
              ]}
            />
            {!isSystemAdmin && (
              <p className="text-xs text-muted-foreground">
                Du kan endast importera till din organisation.
              </p>
            )}
          </div>

          {/* File upload or paste */}
          <div className="space-y-2">
            <Label>CSV-data</Label>
            <div className="flex gap-2 mb-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={state !== 'idle'}
              >
                <DocumentTextIcon className="mr-2 h-4 w-4" />
                Välj fil
              </Button>
              {fileName && (
                <Badge variant="secondary">{fileName}</Badge>
              )}
            </div>

            <Textarea
              placeholder={`Klistra in CSV här...\n\nFörväntad header:\n${csvHeader}`}
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setError(null);
                setState('idle');
                setDryRunResult(null);
              }}
              rows={10}
              className="font-mono text-xs"
              disabled={state !== 'idle'}
            />

            <p className="text-xs text-muted-foreground">
              <strong>Förväntad header:</strong> {csvHeader}
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <XCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Dry run result */}
          {dryRunResult && (
            <div className={cn(
              'rounded-lg border p-4 space-y-3',
              dryRunResult.valid ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
            )}>
              <div className="flex items-center gap-2">
                {dryRunResult.valid ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                )}
                <span className="font-medium">
                  {dryRunResult.valid ? 'Validering lyckades' : 'Validering misslyckades'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Samling:</span>{' '}
                  <span className="font-medium">{dryRunResult.collection_title || '(Ingen titel)'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Antal kort:</span>{' '}
                  <span className="font-medium">{dryRunResult.cards_count}</span>
                </div>
                <div className="col-span-2">
                  {dryRunResult.will_create_collection ? (
                    <Badge variant="secondary">Ny samling skapas</Badge>
                  ) : (
                    <Badge variant="outline">Läggs till i befintlig samling</Badge>
                  )}
                </div>
              </div>

              {dryRunResult.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">Fel:</p>
                  <ul className="text-xs space-y-1">
                    {dryRunResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <XCircleIcon className="h-3 w-3 mt-0.5 flex-shrink-0 text-destructive" />
                        <span>
                          Rad {err.row}
                          {err.column && ` (${err.column})`}: {err.message}
                        </span>
                      </li>
                    ))}
                    {dryRunResult.errors.length > 5 && (
                      <li className="text-muted-foreground">
                        ...och {dryRunResult.errors.length - 5} fler fel
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {dryRunResult.warnings.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-600">Varningar:</p>
                  <ul className="text-xs space-y-1">
                    {dryRunResult.warnings.slice(0, 3).map((warn, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <ExclamationTriangleIcon className="h-3 w-3 mt-0.5 flex-shrink-0 text-yellow-600" />
                        <span>
                          Rad {warn.row}
                          {warn.column && ` (${warn.column})`}: {warn.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Done state */}
          {state === 'done' && (
            <div className="rounded-lg border border-green-500 bg-green-50 dark:bg-green-950/20 p-4 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-400">
                Import slutförd!
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {state === 'done' ? 'Stäng' : 'Avbryt'}
          </Button>

          {state === 'idle' && (
            <Button
              onClick={handleValidate}
              disabled={!raw.trim()}
            >
              Validera
            </Button>
          )}

          {state === 'validating' && (
            <Button disabled>
              Validerar...
            </Button>
          )}

          {state === 'validated' && dryRunResult?.valid && (
            <Button onClick={handleImport}>
              Importera {dryRunResult.cards_count} kort
            </Button>
          )}

          {state === 'validated' && !dryRunResult?.valid && (
            <Button
              variant="outline"
              onClick={() => {
                setState('idle');
                setDryRunResult(null);
              }}
            >
              Redigera och försök igen
            </Button>
          )}

          {state === 'importing' && (
            <Button disabled>
              Importerar...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
