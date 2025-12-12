'use client';

import { useState, useCallback, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface AdminConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  description: string | ReactNode;
  /** Text for confirm button */
  confirmLabel?: string;
  /** Text for cancel button */
  cancelLabel?: string;
  /** Visual variant */
  variant?: ConfirmVariant;
  /** Callback when confirmed */
  onConfirm: () => void | Promise<void>;
  /** 
   * If provided, user must type this text exactly to enable confirm button.
   * Use for destructive actions like deleting tenants.
   */
  confirmText?: string;
  /** Placeholder for confirm text input */
  confirmPlaceholder?: string;
  /** Whether confirm action is in progress */
  isLoading?: boolean;
}

const variantStyles: Record<ConfirmVariant, { icon: string; button: 'destructive' | 'default' }> = {
  danger: { icon: 'text-destructive', button: 'destructive' },
  warning: { icon: 'text-amber-500', button: 'default' },
  info: { icon: 'text-blue-500', button: 'default' },
};

/**
 * Confirmation dialog for admin actions, especially destructive ones.
 * 
 * @example
 * // Simple confirm
 * <AdminConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Ta bort användare"
 *   description="Är du säker på att du vill ta bort denna användare?"
 *   onConfirm={handleDelete}
 *   variant="danger"
 * />
 * 
 * @example
 * // With text confirmation
 * <AdminConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Ta bort organisation"
 *   description="Detta kommer permanent ta bort organisationen och all data."
 *   confirmText="DELETE"
 *   confirmPlaceholder="Skriv DELETE för att bekräfta"
 *   onConfirm={handleDeleteTenant}
 *   variant="danger"
 * />
 */
export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Bekräfta',
  cancelLabel = 'Avbryt',
  variant = 'danger',
  onConfirm,
  confirmText,
  confirmPlaceholder,
  isLoading = false,
}: AdminConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const styles = variantStyles[variant];
  
  // Check if confirm is enabled
  const isConfirmEnabled = confirmText 
    ? inputValue === confirmText 
    : true;

  const handleConfirm = useCallback(async () => {
    if (!isConfirmEnabled) return;
    
    setIsConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
      setInputValue('');
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsConfirming(false);
    }
  }, [isConfirmEnabled, onConfirm, onOpenChange]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    setInputValue('');
  }, [onOpenChange]);

  const loading = isLoading || isConfirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-muted ${styles.icon}`}>
              <ExclamationTriangleIcon className="h-5 w-5" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        {confirmText && (
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">
              Skriv <code className="px-1 py-0.5 bg-muted rounded text-destructive font-mono">{confirmText}</code> för att bekräfta:
            </label>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmPlaceholder ?? `Skriv ${confirmText}`}
              autoComplete="off"
              disabled={loading}
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={styles.button}
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || loading}
          >
            {loading ? 'Vänta...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing confirm dialog state
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void | Promise<void>) | null>(null);

  const confirm = useCallback((action: () => void | Promise<void>) => {
    setPendingAction(() => action);
    setIsOpen(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (pendingAction) {
      await pendingAction();
    }
    setPendingAction(null);
  }, [pendingAction]);

  const handleClose = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setPendingAction(null);
    }
  }, []);

  return {
    isOpen,
    setIsOpen: handleClose,
    confirm,
    handleConfirm,
  };
}
