'use client';

import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { 
  TrashIcon, 
  PencilIcon, 
  ArchiveBoxIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { AdminConfirmDialog } from './AdminConfirmDialog';

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'destructive' | 'outline';
  /** Confirmation dialog settings */
  confirm?: {
    title: string;
    description: string;
    confirmLabel?: string;
  };
  /** Handler receives selected items */
  onAction: (selectedItems: T[]) => void | Promise<void>;
}

interface AdminBulkActionsProps<T> {
  /** Selected items */
  selectedItems: T[];
  /** Total number of items in the table */
  totalItems: number;
  /** Available bulk actions */
  actions: BulkAction<T>[];
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Callback to select all items */
  onSelectAll?: () => void;
  /** Whether all items are selected */
  allSelected?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Bulk actions toolbar that appears when items are selected.
 * Provides common actions like delete, archive, etc.
 */
export function AdminBulkActions<T>({
  selectedItems,
  totalItems,
  actions,
  onClearSelection,
  onSelectAll,
  allSelected = false,
  className = '',
}: AdminBulkActionsProps<T>) {
  const t = useTranslations('admin.bulk');
  const [confirmAction, setConfirmAction] = useState<BulkAction<T> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = useCallback(async (action: BulkAction<T>) => {
    if (action.confirm) {
      setConfirmAction(action);
      return;
    }

    setIsProcessing(true);
    try {
      await action.onAction(selectedItems);
      onClearSelection();
    } finally {
      setIsProcessing(false);
    }
  }, [selectedItems, onClearSelection]);

  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return;

    setIsProcessing(true);
    try {
      await confirmAction.onAction(selectedItems);
      onClearSelection();
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  }, [confirmAction, selectedItems, onClearSelection]);

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <>
      <div 
        className={`flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 ${className}`}
        role="toolbar"
        aria-label="Bulk actions"
      >
        {/* Selection info */}
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
            {selectedItems.length}
          </span>
          <span className="text-sm font-medium text-foreground">
            {selectedItems.length === 1 ? t('oneSelected') : t('multipleSelected', { count: selectedItems.length })}
            {totalItems > selectedItems.length && (
              <span className="text-muted-foreground"> {t('ofTotal', { total: totalItems })}</span>
            )}
          </span>

          {onSelectAll && !allSelected && selectedItems.length < totalItems && (
            <button
              onClick={onSelectAll}
              className="text-sm text-primary hover:underline"
            >
              {t('selectAll', { count: totalItems })}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant === 'destructive' ? 'outline' : action.variant || 'outline'}
              size="sm"
              onClick={() => handleAction(action)}
              disabled={isProcessing}
              className={action.variant === 'destructive' ? 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10' : ''}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}

          <div className="mx-2 h-5 w-px bg-border" aria-hidden="true" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
            className="text-muted-foreground"
          >
            <XMarkIcon className="mr-1 h-4 w-4" />
            {t('deselect')}
          </Button>
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmAction?.confirm && (
        <AdminConfirmDialog
          open={!!confirmAction}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={confirmAction.confirm.title}
          description={confirmAction.confirm.description}
          confirmLabel={confirmAction.confirm.confirmLabel || 'Bekräfta'}
          onConfirm={handleConfirm}
          variant={confirmAction.variant === 'destructive' ? 'danger' : 'warning'}
          isLoading={isProcessing}
        />
      )}
    </>
  );
}

// Preset bulk actions for common use cases
export const bulkActionPresets = {
  delete: <T,>(onDelete: (items: T[]) => void | Promise<void>): BulkAction<T> => ({
    id: 'delete',
    label: 'Ta bort',
    icon: <TrashIcon className="mr-1.5 h-4 w-4" />,
    variant: 'destructive',
    confirm: {
      title: 'Ta bort valda objekt?',
      description: 'Denna åtgärd kan inte ångras. Alla valda objekt kommer att tas bort permanent.',
      confirmLabel: 'Ta bort',
    },
    onAction: onDelete,
  }),

  archive: <T,>(onArchive: (items: T[]) => void | Promise<void>): BulkAction<T> => ({
    id: 'archive',
    label: 'Arkivera',
    icon: <ArchiveBoxIcon className="mr-1.5 h-4 w-4" />,
    variant: 'outline',
    onAction: onArchive,
  }),

  activate: <T,>(onActivate: (items: T[]) => void | Promise<void>): BulkAction<T> => ({
    id: 'activate',
    label: 'Aktivera',
    icon: <CheckIcon className="mr-1.5 h-4 w-4" />,
    variant: 'outline',
    onAction: onActivate,
  }),

  edit: <T,>(onEdit: (items: T[]) => void | Promise<void>): BulkAction<T> => ({
    id: 'edit',
    label: 'Redigera',
    icon: <PencilIcon className="mr-1.5 h-4 w-4" />,
    variant: 'outline',
    onAction: onEdit,
  }),
};

// Hook to manage selection state
export function useTableSelection<T>(
  data: T[],
  keyAccessor: keyof T | ((row: T) => string)
) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const getKey = useCallback((row: T): string => {
    if (typeof keyAccessor === 'function') {
      return keyAccessor(row);
    }
    return String(row[keyAccessor]);
  }, [keyAccessor]);

  const selectedItems = useMemo(() => {
    return data.filter((row) => selectedKeys.has(getKey(row)));
  }, [data, selectedKeys, getKey]);

  const isSelected = useCallback((row: T): boolean => {
    return selectedKeys.has(getKey(row));
  }, [selectedKeys, getKey]);

  const toggle = useCallback((row: T) => {
    const key = getKey(row);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, [getKey]);

  const selectAll = useCallback(() => {
    setSelectedKeys(new Set(data.map(getKey)));
  }, [data, getKey]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedKeys.size === data.length) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [selectedKeys.size, data.length, clearSelection, selectAll]);

  const allSelected = selectedKeys.size === data.length && data.length > 0;
  const someSelected = selectedKeys.size > 0 && selectedKeys.size < data.length;

  return {
    selectedItems,
    selectedKeys,
    isSelected,
    toggle,
    selectAll,
    clearSelection,
    toggleAll,
    allSelected,
    someSelected,
    selectedCount: selectedKeys.size,
  };
}
