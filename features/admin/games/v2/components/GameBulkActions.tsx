'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircleIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  TrashIcon,
  ArchiveBoxIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui';
import { AdminConfirmDialog } from '@/components/admin/shared/AdminConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { GameAdminRow, BulkOperationType, BulkOperationResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

type BulkActionConfig = {
  id: BulkOperationType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline';
  requiresConfirmation?: boolean;
  confirmTitle?: string;
  confirmDescription?: string | ((count: number) => string);
  confirmLabel?: string;
  disabled?: (games: GameAdminRow[]) => boolean;
  disabledReason?: string;
};

// ============================================================================
// BULK ACTION CONFIGURATIONS
// ============================================================================

const BULK_ACTIONS: BulkActionConfig[] = [
  {
    id: 'publish',
    label: 'Publicera',
    icon: CheckCircleIcon,
    variant: 'default',
    requiresConfirmation: true,
    confirmTitle: 'Publicera spel?',
    confirmDescription: (count) => `${count} spel kommer att publiceras och bli synliga.`,
    confirmLabel: 'Publicera',
  },
  {
    id: 'unpublish',
    label: 'Avpublicera',
    icon: EyeSlashIcon,
    variant: 'outline',
    requiresConfirmation: true,
    confirmTitle: 'Avpublicera spel?',
    confirmDescription: (count) => `${count} spel kommer att döljas från publika vyer.`,
    confirmLabel: 'Avpublicera',
  },
  {
    id: 'revalidate',
    label: 'Validera om',
    icon: ArrowPathIcon,
    variant: 'outline',
  },
  {
    id: 'export',
    label: 'Exportera',
    icon: ArrowDownTrayIcon,
    variant: 'outline',
  },
  {
    id: 'archive',
    label: 'Arkivera',
    icon: ArchiveBoxIcon,
    variant: 'outline',
    requiresConfirmation: true,
    confirmTitle: 'Arkivera spel?',
    confirmDescription: (count) => `${count} spel kommer att arkiveras.`,
    confirmLabel: 'Arkivera',
  },
  {
    id: 'delete',
    label: 'Ta bort',
    icon: TrashIcon,
    variant: 'destructive',
    requiresConfirmation: true,
    confirmTitle: 'Ta bort spel permanent?',
    confirmDescription: (count) => `${count} spel kommer att tas bort permanent. Denna åtgärd kan inte ångras.`,
    confirmLabel: 'Ta bort permanent',
  },
];

// ============================================================================
// BULK ACTION EXECUTOR
// ============================================================================

async function executeBulkAction(
  operation: BulkOperationType,
  gameIds: string[],
  params?: Record<string, unknown>
): Promise<BulkOperationResult> {
  const response = await fetch('/api/admin/games/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, gameIds, params }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    return {
      success: false,
      affected: 0,
      failed: gameIds.length,
      errors: [{ gameId: 'all', error: error.error || 'Request failed' }],
    };
  }

  return await response.json();
}

// ============================================================================
// BULK ACTIONS BAR COMPONENT
// ============================================================================

type GameBulkActionsBarProps = {
  selectedGames: GameAdminRow[];
  totalGames: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  allSelected: boolean;
  onActionComplete: (result: BulkOperationResult) => void;
  className?: string;
};

export function GameBulkActionsBar({
  selectedGames,
  totalGames,
  onClearSelection,
  onSelectAll,
  allSelected,
  onActionComplete,
  className = '',
}: GameBulkActionsBarProps) {  const t = useTranslations('admin.games.bulk');  const { success, warning, error: showError } = useToast();
  const [confirmAction, setConfirmAction] = useState<BulkActionConfig | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSessionsWarning, setActiveSessionsWarning] = useState<{
    gameIds: string[];
    details: Array<{ gameId: string; gameName: string; sessionCount: number }>;
  } | null>(null);

  const selectedCount = selectedGames.length;

  const executeAction = useCallback(async (action: BulkActionConfig, params?: Record<string, unknown>) => {
    setIsProcessing(true);
    
    try {
      const gameIds = selectedGames.map(g => g.id);
      const result = await executeBulkAction(action.id, gameIds, params);

      if (result.success) {
        success(`${action.label}: ${result.affected} spel påverkade`);
        onClearSelection();
      } else if (result.errors?.length) {
        // Check if any errors are ACTIVE_SESSIONS
        const sessionErrors = result.errors.filter(e => e.error.startsWith('ACTIVE_SESSIONS:'));
        
        if (sessionErrors.length > 0 && action.id === 'delete') {
          // Parse session info and show dialog
          const details = sessionErrors.map(e => {
            const parts = e.error.split(':');
            return {
              gameId: e.gameId,
              gameName: parts[2] || 'Okänt spel',
              sessionCount: parseInt(parts[1], 10) || 0,
            };
          });
          
          setActiveSessionsWarning({
            gameIds: sessionErrors.map(e => e.gameId),
            details,
          });
          return; // Don't call onActionComplete yet
        }
        
        warning(`${action.label}: ${result.failed} misslyckades`);
      }

      onActionComplete(result);
    } catch {
      showError('Ett fel uppstod vid utförande av åtgärden');
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  }, [selectedGames, success, warning, showError, onClearSelection, onActionComplete]);

  const handleForceDelete = useCallback(async () => {
    if (!activeSessionsWarning) return;
    
    setIsProcessing(true);
    try {
      const result = await executeBulkAction('delete', activeSessionsWarning.gameIds, { force: true });
      
      if (result.success) {
        success(`Ta bort: ${result.affected} spel och deras sessioner borttagna`);
        onClearSelection();
      } else {
        warning(`Ta bort: ${result.failed} misslyckades`);
      }
      
      onActionComplete(result);
    } catch {
      showError('Ett fel uppstod vid borttagning');
    } finally {
      setIsProcessing(false);
      setActiveSessionsWarning(null);
    }
  }, [activeSessionsWarning, success, warning, showError, onClearSelection, onActionComplete]);

  const handleAction = useCallback(async (action: BulkActionConfig) => {
    if (action.requiresConfirmation) {
      setConfirmAction(action);
      return;
    }

    await executeAction(action);
  }, [executeAction]);

  const confirmDescription = useMemo(() => {
    if (!confirmAction) return '';
    if (typeof confirmAction.confirmDescription === 'function') {
      return confirmAction.confirmDescription(selectedCount);
    }
    return confirmAction.confirmDescription || '';
  }, [confirmAction, selectedCount]);

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div
        className={`flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 ${className}`}
        role="toolbar"
        aria-label="Bulk actions"
      >
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <Badge variant="default" className="text-sm">
            {t('selectedCount', { count: selectedCount })}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {t('ofTotal', { total: totalGames })}
          </span>
          {!allSelected && selectedCount < totalGames && (
            <Button variant="link" size="sm" onClick={onSelectAll} className="h-auto p-0">
              {t('selectAll', { count: totalGames })}
            </Button>
          )}
          <Button variant="link" size="sm" onClick={onClearSelection} className="h-auto p-0 text-muted-foreground">
            {t('deselect')}
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {BULK_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isDisabled = action.disabled?.(selectedGames) || isProcessing;
            
            return (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size="sm"
                disabled={isDisabled}
                onClick={() => handleAction(action)}
                title={isDisabled && action.disabledReason ? action.disabledReason : undefined}
              >
                <Icon className="mr-1.5 h-4 w-4" />
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AdminConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.confirmTitle || ''}
        description={confirmDescription}
        confirmLabel={confirmAction?.confirmLabel || 'Bekräfta'}
        variant={confirmAction?.variant === 'destructive' ? 'danger' : undefined}
        onConfirm={() => { if (confirmAction) void executeAction(confirmAction); }}
      />

      {/* Active Sessions Warning Dialog */}
      <AdminConfirmDialog
        open={Boolean(activeSessionsWarning)}
        onOpenChange={(open) => !open && setActiveSessionsWarning(null)}
        title="Spel har aktiva sessioner"
        description={
          activeSessionsWarning
            ? `${activeSessionsWarning.details.length} spel har aktiva sessioner (totalt ${activeSessionsWarning.details.reduce((sum, d) => sum + d.sessionCount, 0)} sessioner). Om du fortsätter avslutas alla sessioner och spelen tas bort permanent.`
            : ''
        }
        confirmLabel="Avsluta sessioner och ta bort"
        variant="danger"
        onConfirm={handleForceDelete}
        isLoading={isProcessing}
      />
    </>
  );
}

// ============================================================================
// EXPORT DIALOG COMPONENT
// ============================================================================

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedGames: GameAdminRow[];
  onExport: (format: 'csv' | 'json', includeRelations: boolean) => Promise<void>;
};

export function GameExportDialog({
  open,
  onOpenChange,
  selectedGames,
  onExport,
}: ExportDialogProps) {
  const t = useTranslations('admin.games.bulk.export');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [includeRelations, setIncludeRelations] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(format, includeRelations);
      onOpenChange(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description', { count: selectedGames.length })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('formatLabel')}</label>
            <div className="flex gap-2">
              <Button
                variant={format === 'csv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('csv')}
              >
                CSV
              </Button>
              <Button
                variant={format === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('json')}
              >
                JSON
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeRelations"
              checked={includeRelations}
              onChange={(e) => setIncludeRelations(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="includeRelations" className="text-sm">
              {t('includeRelations')}
            </label>
          </div>

          {format === 'json' && (
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                {t('jsonNote')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? t('exporting') : t('exportButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// HOOK: USE BULK SELECTION
// ============================================================================

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedItems = useMemo(() => {
    return items.filter(item => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const isSelected = useCallback((item: T) => {
    return selectedIds.has(item.id);
  }, [selectedIds]);

  const toggle = useCallback((item: T) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(item => item.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectPage = useCallback((pageItems: T[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      pageItems.forEach(item => next.add(item.id));
      return next;
    });
  }, []);

  const deselectPage = useCallback((pageItems: T[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      pageItems.forEach(item => next.delete(item.id));
      return next;
    });
  }, []);

  const allSelected = selectedIds.size === items.length && items.length > 0;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    isSelected,
    toggle,
    selectAll,
    clearSelection,
    selectPage,
    deselectPage,
    allSelected,
    someSelected,
  };
}
