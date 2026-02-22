'use client';

/**
 * useDrawerDiscipline
 *
 * Shared hook for non-blocking drawer discipline:
 * - ESC closes drawer
 * - Body scroll lock while drawer is open
 * - Focus trap: auto-focus first focusable element on open
 *
 * Used by ParticipantOverlayStack and DirectorModePanel.
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Lock body scroll while `locked` is true.
 * Saves & restores previous overflow + overscroll-behavior.
 */
function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    const prevOSB = (document.body.style as unknown as { overscrollBehavior?: string }).overscrollBehavior;
    document.body.style.overflow = 'hidden';
    (document.body.style as unknown as { overscrollBehavior?: string }).overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prev;
      (document.body.style as unknown as { overscrollBehavior?: string }).overscrollBehavior = prevOSB ?? '';
    };
  }, [locked]);
}

export interface UseDrawerDisciplineOptions {
  /** Is the drawer currently open? */
  open: boolean;
  /** Called when user presses ESC or backdrop click (close the drawer) */
  onClose: () => void;
}

/**
 * Returns a ref to attach to the drawer card/container element.
 * Handles ESC, scroll lock, and auto-focus on open.
 */
export function useDrawerDiscipline({ open, onClose }: UseDrawerDisciplineOptions) {
  const cardRef = useRef<HTMLDivElement>(null);

  // --- Body scroll lock ---
  useBodyScrollLock(open);

  // --- ESC to close ---
  const stableOnClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        stableOnClose();
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true } as unknown as boolean);
  }, [open, stableOnClose]);

  // --- Focus first interactive element on open ---
  useEffect(() => {
    if (!open) return;
    // Small delay to let animation start before focusing
    const raf = requestAnimationFrame(() => {
      const el = cardRef.current;
      if (!el) return;
      const focusable = el.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  return cardRef;
}
