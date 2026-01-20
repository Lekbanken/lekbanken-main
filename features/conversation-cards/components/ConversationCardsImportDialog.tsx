'use client';

import { useState, useRef, useCallback } from 'react';
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
  const t = useTranslations('admin.conversationCards.importDialog');
  const tActions = useTranslations('common.actions');
  const tImportPage = useTranslations('admin.conversationCards.importPage');

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
      setError(t('errors.readFileFailed'));
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
        setError(result.error || tImportPage('validationErrorFallback'));
        setState('idle');
        return;
      }

      setDryRunResult(result as DryRunResult);
      setState('validated');
    } catch (err) {
      console.error('Validation failed:', err);
      setError(t('errors.validateFailed'));
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
        setError(result.error || t('errors.importFailed'));
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
      setError(t('errors.importFailed'));
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
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scope selector */}
          <div className="space-y-2">
            <Label>{t('scopeLabel')}</Label>
            <Select
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value as ScopeType)}
              disabled={!isSystemAdmin || state !== 'idle'}
              options={[
                { value: 'global', label: t('scope.global') },
                { value: 'tenant', label: t('scope.tenant') },
              ]}
            />
            {!isSystemAdmin && (
              <p className="text-xs text-muted-foreground">
                {t('scope.tenantOnlyHint')}
              </p>
            )}
          </div>

          {/* File upload or paste */}
          <div className="space-y-2">
            <Label>{t('csvDataLabel')}</Label>
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
                {t('chooseFile')}
              </Button>
              {fileName && (
                <Badge variant="secondary">{fileName}</Badge>
              )}
            </div>

            <Textarea
              placeholder={t('textareaPlaceholder', { csvHeader })}
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
              <strong>{t('expectedHeaderLabel')}</strong> {csvHeader}
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
                  {dryRunResult.valid ? t('validation.success') : t('validation.failed')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('summary.collectionLabel')}</span>{' '}
                  <span className="font-medium">{dryRunResult.collection_title || t('summary.untitledCollection')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('summary.cardsCountLabel')}</span>{' '}
                  <span className="font-medium">{dryRunResult.cards_count}</span>
                </div>
                <div className="col-span-2">
                  {dryRunResult.will_create_collection ? (
                    <Badge variant="secondary">{t('summary.badges.willCreateCollection')}</Badge>
                  ) : (
                    <Badge variant="outline">{t('summary.badges.willAppendToExisting')}</Badge>
                  )}
                </div>
              </div>

              {dryRunResult.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">{t('issues.errorsTitle')}</p>
                  <ul className="text-xs space-y-1">
                    {dryRunResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <XCircleIcon className="h-3 w-3 mt-0.5 flex-shrink-0 text-destructive" />
                        <span>
                          {err.column
                            ? tImportPage('issueRowWithColumn', {
                                row: err.row,
                                column: err.column,
                                message: err.message,
                              })
                            : tImportPage('issueRowWithoutColumn', {
                                row: err.row,
                                message: err.message,
                              })}
                        </span>
                      </li>
                    ))}
                    {dryRunResult.errors.length > 5 && (
                      <li className="text-muted-foreground">
                        {t('issues.moreErrors', { count: dryRunResult.errors.length - 5 })}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {dryRunResult.warnings.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-600">{t('issues.warningsTitle')}</p>
                  <ul className="text-xs space-y-1">
                    {dryRunResult.warnings.slice(0, 3).map((warn, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <ExclamationTriangleIcon className="h-3 w-3 mt-0.5 flex-shrink-0 text-yellow-600" />
                        <span>
                          {warn.column
                            ? tImportPage('issueRowWithColumn', {
                                row: warn.row,
                                column: warn.column,
                                message: warn.message,
                              })
                            : tImportPage('issueRowWithoutColumn', {
                                row: warn.row,
                                message: warn.message,
                              })}
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
                {t('doneMessage')}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {state === 'done' ? tActions('close') : tActions('cancel')}
          </Button>

          {state === 'idle' && (
            <Button
              onClick={handleValidate}
              disabled={!raw.trim()}
            >
              {t('validate')}
            </Button>
          )}

          {state === 'validating' && (
            <Button disabled>
              {t('validating')}
            </Button>
          )}

          {state === 'validated' && dryRunResult?.valid && (
            <Button onClick={handleImport}>
              {t('importCards', { count: dryRunResult.cards_count })}
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
              {t('editAndTryAgain')}
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
