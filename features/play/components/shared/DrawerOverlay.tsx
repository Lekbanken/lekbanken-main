'use client';

/**
 * DrawerOverlay — Shared responsive drawer wrapper
 *
 * Renders a non-blocking drawer as:
 * - **Bottom sheet** on mobile (< lg): slide-up, drag handle, rounded top
 * - **Centered modal** on desktop (≥ lg): zoom-in, rounded, shadow
 *
 * Includes backdrop (tap-to-close), ESC key, scroll lock, and auto-focus
 * via `useDrawerDiscipline`.
 *
 * Used by both ParticipantOverlayStack and DirectorModePanel.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useDrawerDiscipline } from '@/features/play/hooks/useDrawerDiscipline';
import {
  MOTION_DRAWER_BACKDROP,
  MOTION_DRAWER_CONTAINER,
  MOTION_DRAWER_CARD_BASE,
  MOTION_DRAWER_SIZE_SM,
  MOTION_DRAWER_SIZE_LG,
  MOTION_DRAWER_HANDLE,
  MOTION_DRAWER_HANDLE_BAR,
  MOTION_DRAWER_CONTENT,
} from './motion-tokens';

// =============================================================================
// Types
// =============================================================================

export type DrawerSize = 'sm' | 'lg';

export interface DrawerOverlayProps {
  /** Is the drawer currently open? */
  open: boolean;
  /** Called when user taps backdrop, presses ESC, etc. */
  onClose: () => void;
  /** Desktop modal width — 'sm' for participant, 'lg' for director */
  size?: DrawerSize;
  /** Show drag handle on mobile (default true) */
  showHandle?: boolean;
  /** Additional className on the card */
  className?: string;
  /** Drawer content */
  children: ReactNode;
}

// =============================================================================
// Size mapping
// =============================================================================

const SIZE_CLASS: Record<DrawerSize, string> = {
  sm: MOTION_DRAWER_SIZE_SM,
  lg: MOTION_DRAWER_SIZE_LG,
};

// =============================================================================
// Component
// =============================================================================

export function DrawerOverlay({
  open,
  onClose,
  size = 'sm',
  showHandle = true,
  className,
  children,
}: DrawerOverlayProps) {
  const cardRef = useDrawerDiscipline({ open, onClose });

  if (!open) return null;

  return (
    <>
      {/* Backdrop — tap to close */}
      <div
        className={MOTION_DRAWER_BACKDROP}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Container: bottom-pinned (mobile) → centered (desktop) */}
      <div className={MOTION_DRAWER_CONTAINER}>
        <div
          ref={cardRef}
          className={cn(MOTION_DRAWER_CARD_BASE, SIZE_CLASS[size], className)}
        >
          {/* Drag handle — mobile only */}
          {showHandle && (
            <div className={MOTION_DRAWER_HANDLE}>
              <div className={MOTION_DRAWER_HANDLE_BAR} />
            </div>
          )}
          <div className={MOTION_DRAWER_CONTENT}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
