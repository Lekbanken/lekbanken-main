'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  TagIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  TrashIcon,
  ArchiveBoxIcon,
  EyeIcon,
  EyeSlashIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { AdminConfirmDialog } from '@/components/admin/shared/AdminConfirmDialog';
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
}: GameBulkActionsBarProps) {
  const { success, warning, error: showError } = useToast();
  const [confirmAction, setConfirmAction] = useState<BulkActionConfig | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedCount = selectedGames.length;

  const handleAction = useCallback(async (action: BulkActionConfig) => {
    if (action.requiresConfirmation) {
      setConfirmAction(action);
      return;
    }

    await executeAction(action);
  }, []);

  const executeAction = useCallback(async (action: BulkActionConfig) => {
    setIsProcessing(true);
    
    try {
      const gameIds = selectedGames.map(g => g.id);
      const result = await executeBulkAction(action.id, gameIds);

      if (result.success) {
        success(`${action.label}: ${result.affected} spel påverkade`);
        onClearSelection();
      } else if (result.errors?.length) {
        warning(`${action.label}: ${result.failed} misslyckades`);
      }

      onActionComplete(result);
    } catch (err) {
      showError('Ett fel uppstod vid utförande av åtgärden');
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  }, [selectedGames, success, warning, showError, onClearSelection, onActionComplete]);

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
            {selectedCount} valda
          </Badge>
          <span className="text-sm text-muted-foreground">
            av {totalGames} spel
          </span>
          {!allSelected && selectedCount < totalGames && (
            <Button variant="link" size="sm" onClick={onSelectAll} className="h-auto p-0">
              Välj alla {totalGames}
            </Button>
          )}
          <Button variant="link" size="sm" onClick={onClearSelection} className="h-auto p-0 text-muted-foreground">
            Avmarkera
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
        variant={confirmAction?.variant === 'destructive' ? 'danger' : 'default'}
        onConfirm={() => confirmAction && executeAction(confirmAction)}
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
    <AdminConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Exportera spel"
      description={`Exportera ${selectedGames.length} valda spel.`}
      confirmLabel={isExporting ? 'Exporterar...' : 'Exportera'}
      variant="default"
      onConfirm={handleExport}
    >
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Format</label>
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
            Inkludera relationer (steg, faser, roller)
          </label>
        </div>

        {format === 'json' && (
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              JSON-export inkluderar fullständig data och är kompatibel med 
              Legendary-import för återställning.
            </p>
          </div>
        )}
      </div>
    </AdminConfirmDialog>
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
