'use client';

import { useCallback, useEffect } from 'react';

type KeyboardShortcutsOptions = {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onReset?: () => void;
  enabled?: boolean;
};

/**
 * Hook for managing keyboard shortcuts in the badge editor.
 * Provides Ctrl+Z (undo), Ctrl+Y/Ctrl+Shift+Z (redo), Ctrl+S (save).
 */
export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onSave,
  onReset,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Still allow Ctrl+S to prevent browser save dialog
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault();
          onSave?.();
        }
        return;
      }

      // Ctrl+Z - Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z - Redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Ctrl+S - Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Ctrl+R - Reset (with confirmation via the handler)
      if (e.ctrlKey && e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        onReset?.();
        return;
      }
    },
    [enabled, onUndo, onRedo, onSave, onReset]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
