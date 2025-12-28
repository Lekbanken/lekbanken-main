'use client';

import { useEffect, useCallback, useMemo, useState } from 'react';
import {
  prefersReducedMotion,
  prefersHighContrast,
  announceToScreenReader,
  registerShortcut,
  KEYBOARD_SHORTCUTS,
  createLiveRegion,
} from './a11y-utils';

// =============================================================================
// useReducedMotion Hook
// =============================================================================

/**
 * Hook to detect reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

// =============================================================================
// useHighContrast Hook
// =============================================================================

/**
 * Hook to detect high contrast preference
 */
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    setHighContrast(prefersHighContrast());

    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return highContrast;
}

// =============================================================================
// useAnnounce Hook
// =============================================================================

/**
 * Hook for screen reader announcements
 */
export function useAnnounce() {
  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      announceToScreenReader(message, priority);
    },
    []
  );

  return announce;
}

// =============================================================================
// useLiveRegion Hook
// =============================================================================

/**
 * Hook for managing a live region
 */
export function useLiveRegion(priority: 'polite' | 'assertive' = 'polite') {
  const [region, setRegion] = useState<ReturnType<typeof createLiveRegion> | null>(null);

  useEffect(() => {
    const liveRegion = createLiveRegion(priority);
    setRegion(liveRegion);
    return () => liveRegion.destroy();
  }, [priority]);

  const announce = useCallback(
    (message: string) => {
      region?.announce(message);
    },
    [region]
  );

  return announce;
}

// =============================================================================
// useKeyboardShortcuts Hook
// =============================================================================

type ShortcutKey = keyof typeof KEYBOARD_SHORTCUTS;
type ShortcutHandler = () => void;

interface ShortcutOptions {
  requireCtrl?: boolean;
  requireShift?: boolean;
  enabled?: boolean;
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Partial<Record<ShortcutKey, ShortcutHandler | [ShortcutHandler, ShortcutOptions]>>
) {
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    for (const [key, value] of Object.entries(shortcuts)) {
      if (!value) continue;

      const [handler, options] = Array.isArray(value) ? value : [value, {}];
      if (options?.enabled === false) continue;

      cleanups.push(
        registerShortcut(
          key as ShortcutKey,
          handler,
          options
        )
      );
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [shortcuts]);
}

// =============================================================================
// useFocusReturn Hook
// =============================================================================

/**
 * Hook to return focus when a component unmounts (e.g., modal closing)
 */
export function useFocusReturn() {
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);
}

// =============================================================================
// useRoving Tabindex Hook
// =============================================================================

interface RovingTabIndexOptions {
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
}

/**
 * Hook for roving tabindex pattern (for toolbars, menus, etc.)
 */
export function useRovingTabIndex<T extends HTMLElement>(
  items: T[],
  options: RovingTabIndexOptions = {}
) {
  const { orientation = 'horizontal', loop = true } = options;
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';
      const isVertical = orientation === 'vertical' || orientation === 'both';

      let nextIndex = activeIndex;

      if ((e.key === 'ArrowRight' && isHorizontal) || (e.key === 'ArrowDown' && isVertical)) {
        nextIndex = activeIndex + 1;
      } else if ((e.key === 'ArrowLeft' && isHorizontal) || (e.key === 'ArrowUp' && isVertical)) {
        nextIndex = activeIndex - 1;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = items.length - 1;
      } else {
        return;
      }

      e.preventDefault();

      if (loop) {
        nextIndex = (nextIndex + items.length) % items.length;
      } else {
        nextIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
      }

      setActiveIndex(nextIndex);
      items[nextIndex]?.focus();
    },
    [activeIndex, items, orientation, loop]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown: handleKeyDown,
      onFocus: () => setActiveIndex(index),
    }),
    [activeIndex, handleKeyDown]
  );

  return { activeIndex, setActiveIndex, getItemProps };
}

// =============================================================================
// useAriaLive Hook for Timer Updates
// =============================================================================

/**
 * Hook for announcing timer updates at appropriate intervals
 */
export function useTimerAnnouncements(
  seconds: number,
  isPaused: boolean,
  enabled: boolean = true
) {
  const announce = useAnnounce();

  useEffect(() => {
    if (!enabled || isPaused) return;

    // Announce at specific intervals
    const announceIntervals = [300, 60, 30, 10, 5, 4, 3, 2, 1];

    if (announceIntervals.includes(seconds)) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;

      let message: string;
      if (seconds >= 60) {
        message = `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
      } else {
        message = `${secs} second${secs !== 1 ? 's' : ''} remaining`;
      }

      announce(message, seconds <= 10 ? 'assertive' : 'polite');
    }
  }, [seconds, isPaused, enabled, announce]);
}

// =============================================================================
// Accessible Component Props Helpers
// =============================================================================

/**
 * Generate props for an accessible modal
 */
export function useModalA11y(
  isOpen: boolean,
  titleId: string,
  descriptionId?: string
) {
  useFocusReturn();

  return useMemo(
    () => ({
      role: 'dialog' as const,
      'aria-modal': true,
      'aria-labelledby': titleId,
      'aria-describedby': descriptionId,
      'aria-hidden': !isOpen,
    }),
    [isOpen, titleId, descriptionId]
  );
}

/**
 * Generate props for an accessible alert
 */
export function useAlertA11y(type: 'info' | 'warning' | 'error' | 'success') {
  return useMemo(
    () => ({
      role: type === 'error' || type === 'warning' ? 'alert' : 'status',
      'aria-live': type === 'error' ? 'assertive' : 'polite',
    }),
    [type]
  );
}
