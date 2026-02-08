'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
  Switch,
  Badge,
} from '@/components/ui';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  ArrowUpTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { ImportableGame } from '../types';
import type { ImportError, DryRunResult, ImportResult, CoverStatsByPurpose } from '@/types/csv-import';
import { PhotoIcon } from '@heroicons/react/24/outline';

type ImportFormat = 'csv' | 'json';

type GameImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (payload: ImportableGame[]) => Promise<void>;
};

type ImportState = 'idle' | 'validating' | 'validated' | 'importing' | 'done';

type Product = {
  id: string;
  name: string;
};

export function GameImportDialog({ open, onOpenChange, onImport }: GameImportDialogProps) {
  // DEBUG: Log when dialog opens to verify correct component is being used
  console.log('[GameImportDialog] Dialog opened, using NEW import dialog with API route');
  
  const t = useTranslations('admin.games.import');
  const [format, setFormat] = useState<ImportFormat>('csv');
  const [raw, setRaw] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ImportState>('idle');
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [upsertMode, setUpsertMode] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch products when dialog opens
  useEffect(() => {
    if (!open) return;
    
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setProductsLoading(false);
      }
    };
    
    loadProducts();
  }, [open]);

  const resetDialog = useCallback(() => {
    setRaw('');
    setFileName(null);
    setError(null);
    setState('idle');
    setDryRunResult(null);
    setImportResult(null);
    setSelectedProductId('');
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Auto-detect format from extension
    if (file.name.endsWith('.csv')) {
      setFormat('csv');
    } else if (file.name.endsWith('.json')) {
      setFormat('json');
    }

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
      setError(t('couldNotReadFile'));
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    setError(null);
    setState('validating');

    try {
      const response = await fetch('/api/games/csv-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: raw,
          format,
          dry_run: true,
          upsert: upsertMode,
          product_id: selectedProductId || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || t('validationError'));
        setState('idle');
        return;
      }

      setDryRunResult(result as DryRunResult);
      setState('validated');
    } catch (err) {
      console.error('Validation failed:', err);
      setError(t('couldNotValidate'));
      setState('idle');
    }
  };

  const handleImport = async () => {
    setError(null);
    setState('importing');

    try {
      const response = await fetch('/api/games/csv-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: raw,
          format,
          dry_run: false,
          upsert: upsertMode,
          product_id: selectedProductId || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || t('importFailed'));
        setState('validated');
        return;
      }

      // CHECK FOR BLOCKING ERRORS (fail-fast: game was NOT created)
      // These are preflight failures where import was blocked entirely
      const blockingErrors = (result.errors || []).filter(
        (e: { severity?: string }) => e.severity === 'error'
      );
      const warnings = (result.errors || []).filter(
        (e: { severity?: string }) => e.severity === 'warning' || !e.severity
      );
      
      // Count failed games (games that were NOT created due to preflight errors)
      const failedCount = result.stats?.failed ?? 0;
      const createdCount = result.stats?.created ?? 0;
      const updatedCount = result.stats?.updated ?? 0;
      
      // Show blocking errors prominently
      if (blockingErrors.length > 0 || failedCount > 0) {
        const errorMessages = blockingErrors
          .slice(0, 5)  // Show max 5 errors
          .map((e: { message?: string; column?: string }) => 
            e.column ? `[${e.column}] ${e.message}` : e.message
          )
          .join('\n');
        
        const summary = failedCount > 0
          ? `❌ ${failedCount} spel blockerades pga fel. ${createdCount} skapades, ${updatedCount} uppdaterades.`
          : 'Import hade blockerande fel.';
        
        setError(`${summary}\n\n${errorMessages || 'Se konsolen för detaljer.'}`);
        setImportResult(result as ImportResult);
        setState('validated');  // Stay in validated state to show errors
        return;
      }
      
      // Warnings don't block import but should be noted
      if (warnings.length > 0) {
        console.log(`[GameImportDialog] Import completed with ${warnings.length} warnings`);
      }

      // Store the import result for displaying coverStats
      setImportResult(result as ImportResult);
      setState('done');

      // Call original onImport callback with empty array (data already saved via API)
      // This triggers the parent to refresh the game list
      await onImport([]);
      
      // Close dialog after short delay
      setTimeout(() => {
        resetDialog();
        onOpenChange(false);
      }, 1500);

    } catch (err) {
      console.error('Import failed:', err);
      setError(t('importFailed'));
      setState('validated');
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <ArrowUpTrayIcon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">
              {t('description')}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t('formatNote')}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">{t('format')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                  format === 'csv'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                <TableCellsIcon className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-muted-foreground">{t('csvDescription')}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormat('json')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                  format === 'json'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                <DocumentTextIcon className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <div className="font-medium">JSON</div>
                  <div className="text-xs text-muted-foreground">{t('jsonDescription')}</div>
                </div>
              </button>
            </div>
          </div>

          {/* File upload */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">{t('fileOrData')}</label>
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0"
              >
                <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                {t('selectFile')}
              </Button>
              {fileName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DocumentTextIcon className="h-4 w-4" />
                  {fileName}
                </div>
              )}
            </div>
            <Textarea
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value);
                setState('idle');
                setDryRunResult(null);
              }}
              rows={10}
              placeholder={format === 'csv' 
                ? 'game_key,name,short_description,play_mode,status,...'
                : '[{"game_key":"...", "name":"...", ...}]'
              }
              className="font-mono text-xs"
            />
          </div>

          {/* Options */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="upsertMode" className="cursor-pointer font-medium">
                {t('upsertMode')}
              </Label>
              <p className="text-xs text-muted-foreground max-w-md">
                {t('upsertModeDescription')}
              </p>
            </div>
            <Switch
              id="upsertMode"
              checked={upsertMode}
              onCheckedChange={setUpsertMode}
            />
          </div>

          {/* Product selection */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div>
              <Label htmlFor="productSelect" className="font-medium">
                {t('productSelect', { defaultValue: 'Koppla till produkt' })}
              </Label>
              <p className="text-xs text-muted-foreground max-w-md">
                {t('productSelectDescription', { defaultValue: 'Spelen kopplas till vald produkt. Påverkar vilken standardbild som tilldelas.' })}
              </p>
            </div>
            <Select
              id="productSelect"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={productsLoading}
              options={[
                { value: '', label: t('productSelectNone', { defaultValue: 'Ingen produkt (global)' }) },
                ...products.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <XCircleIcon className="h-5 w-5" />
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Validation result preview */}
          {dryRunResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                {dryRunResult.valid ? (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <span className="text-green-600">{t('validationSuccess')}</span>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                    <span className="text-amber-600">{t('validationErrors')}</span>
                  </>
                )}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-border p-3 text-center">
                  <div className="text-2xl font-bold">{dryRunResult.total_rows}</div>
                  <div className="text-xs text-muted-foreground">{t('total')}</div>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{dryRunResult.valid_count}</div>
                  <div className="text-xs text-green-600">{t('valid')}</div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                  <div className="text-2xl font-bold text-amber-700">{dryRunResult.warning_count}</div>
                  <div className="text-xs text-amber-600">{t('warnings')}</div>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{dryRunResult.error_count}</div>
                  <div className="text-xs text-red-600">{t('errors')}</div>
                </div>
              </div>

              {/* Game preview */}
              {dryRunResult.games && dryRunResult.games.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">{t('preview')}</div>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">{t('tableHeaders.row')}</th>
                          <th className="px-3 py-2 text-left font-medium">game_key</th>
                          <th className="px-3 py-2 text-left font-medium">{t('tableHeaders.name')}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('tableHeaders.mode')}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('tableHeaders.status')}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('tableHeaders.steps')}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('tableHeaders.phases', { defaultMessage: 'Faser' })}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('tableHeaders.artifacts', { defaultMessage: 'Artefakter' })}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('tableHeaders.triggers', { defaultMessage: 'Triggers' })}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('tableHeaders.roles', { defaultMessage: 'Roller' })}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('tableHeaders.artifactTypes', { defaultMessage: 'Artefakt-typer' })}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dryRunResult.games.slice(0, 10).map((game) => (
                          <tr key={game.row_number} className="border-t border-border">
                            <td className="px-3 py-2">{game.row_number}</td>
                            <td className="px-3 py-2 font-mono text-xs">{game.game_key || '-'}</td>
                            <td className="px-3 py-2">{game.name}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-xs">
                                {game.play_mode}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <Badge 
                                variant={game.status === 'published' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {game.status === 'published' ? t('statusPublished') : t('statusDraft')}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">{game.steps?.length || 0}</td>
                            <td className="px-3 py-2">{game.phases_count || 0}</td>
                            <td className="px-3 py-2">{game.artifacts_count || 0}</td>
                            <td className="px-3 py-2">{game.triggers_count || 0}</td>
                            <td className="px-3 py-2">{game.roles_count || 0}</td>
                            <td className="px-3 py-2 max-w-[120px]">
                              {game.artifact_types && game.artifact_types.length > 0 ? (
                                <span className="font-mono text-xs text-muted-foreground truncate block" title={game.artifact_types.join(', ')}>
                                  {game.artifact_types.slice(0, 3).join(', ')}
                                  {game.artifact_types.length > 3 && ` +${game.artifact_types.length - 3}`}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {dryRunResult.games.length > 10 && (
                      <div className="border-t border-border bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
                        ... och {dryRunResult.games.length - 10} till
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Errors list */}
              {dryRunResult.errors && dryRunResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-destructive">Fel</div>
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <ul className="space-y-1 text-sm">
                      {dryRunResult.errors.slice(0, 10).map((err: ImportError, idx: number) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-muted-foreground">Rad {err.row}:</span>
                          <span className="text-destructive">{err.column ? `${err.column}: ` : ''}{err.message}</span>
                        </li>
                      ))}
                      {dryRunResult.errors.length > 10 && (
                        <li className="text-muted-foreground">
                          ... och {dryRunResult.errors.length - 10} fel till
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Warnings list */}
              {dryRunResult.warnings && dryRunResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-amber-600">Varningar</div>
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <ul className="space-y-1 text-sm">
                      {dryRunResult.warnings.slice(0, 5).map((warn: ImportError, idx: number) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-muted-foreground">Rad {warn.row}:</span>
                          <span className="text-amber-700">{warn.column ? `${warn.column}: ` : ''}{warn.message}</span>
                        </li>
                      ))}
                      {dryRunResult.warnings.length > 5 && (
                        <li className="text-muted-foreground">
                          ... och {dryRunResult.warnings.length - 5} varningar till
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success state */}
          {state === 'done' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="font-medium">{t('importComplete')}</span>
                </div>
              </div>

              {/* Cover Stats - only show if coverStats exists */}
              {importResult?.coverStats && (
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <PhotoIcon className="h-5 w-5 text-muted-foreground" />
                    <span>Standardbilder</span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {importResult.coverStats.assigned > 0 && (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>{importResult.coverStats.assigned} spel fick standardbild</span>
                      </div>
                    )}
                    
                    {importResult.coverStats.skippedExisting > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="ml-6">ℹ {importResult.coverStats.skippedExisting} spel hade redan standardbild</span>
                      </div>
                    )}
                    
                    {importResult.coverStats.missingTemplates > 0 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        <span>{importResult.coverStats.missingTemplates} spel saknar standardbilder</span>
                      </div>
                    )}
                  </div>

                  {/* Missing templates by purpose */}
                  {importResult.coverStats.missingTemplatesByPurpose.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground mb-1">Saknade standardbilder per syfte:</div>
                      <ul className="text-xs space-y-0.5">
                        {importResult.coverStats.missingTemplatesByPurpose.map((item: CoverStatsByPurpose, idx: number) => (
                          <li key={idx} className="text-amber-700 flex items-center gap-1">
                            <span>•</span>
                            <span>
                              {item.purposeName 
                                ? item.purposeName 
                                : item.purposeId 
                                  ? <span className="font-mono text-xs" title={item.purposeId}>{item.purposeId.slice(0, 8)}...</span>
                                  : 'Inget syfte'}
                            </span>
                            <span className="text-muted-foreground">({item.count})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            {t('cancel')}
          </Button>
          
          {state === 'idle' && (
            <Button 
              onClick={handleValidate} 
              disabled={raw.trim().length === 0}
            >
              {t('validate')}
            </Button>
          )}

          {state === 'validating' && (
            <Button disabled>
              {t('validating')}
            </Button>
          )}

          {state === 'validated' && dryRunResult && (
            <Button 
              onClick={handleImport}
              disabled={!dryRunResult.valid || dryRunResult.error_count > 0}
            >
              {t('importGames', { count: dryRunResult.valid_count })}
            </Button>
          )}

          {state === 'importing' && (
            <Button disabled>
              {t('importing')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
