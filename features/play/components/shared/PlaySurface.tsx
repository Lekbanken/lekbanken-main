/**
 * PlaySurface — Shared desktop container for both Director and Participant.
 *
 * UI-law: Desktop layout has ONE border on the surface/container level — never
 * on sub-components (header / stage / rows). Sub-components only use `border-b`
 * as separators.
 *
 * This component owns: lg:max-w, lg:rounded, lg:border, bg, overflow.
 * Children (PlayTopArea, Stage, BottomBar) must NOT add their own lg:border.
 */

'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface PlaySurfaceProps {
  children: ReactNode;
  /** Surface sizing variant */
  size?: 'md' | 'lg';
  /** Additional classes */
  className?: string;
}

const SIZE_CLASSES = {
  md: 'lg:max-w-4xl',
  lg: 'lg:max-w-5xl',
} as const;

// =============================================================================
// Component
// =============================================================================

export function PlaySurface({ children, size = 'lg', className }: PlaySurfaceProps) {
  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden',
        // Desktop: centred modal card with single border
        'lg:mx-auto lg:my-8 lg:max-h-[calc(100vh-4rem)]',
        SIZE_CLASSES[size],
        'lg:rounded-2xl lg:border lg:border-border lg:bg-background',
        className,
      )}
    >
      {children}
    </div>
  );
}
