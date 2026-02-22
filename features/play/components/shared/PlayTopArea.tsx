/**
 * PlayTopArea — Composable top section for both Director and Participant views.
 *
 * Orders the fixed "above-the-fold" area consistently:
 *
 *   PlayHeader  (always)
 *   ├─ NowSummaryRow slot  (optional — fixed in Director, scrollable in Participant)
 *   └─ ChipLane slot       (optional — Director chips, Participant trigger chips)
 *
 * Each slot is a ReactNode passed by the host view. This component only
 * enforces ordering and shared wrapper styling — it never imports
 * NowSummaryRow or ChipLane directly.
 *
 * Usage:
 *   <PlayTopArea header={<PlayHeader ... />}>
 *     <NowSummaryRow ... />
 *     <ChipLane ... />
 *   </PlayTopArea>
 */

'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface PlayTopAreaProps {
  /** The PlayHeader element */
  header: ReactNode;
  /** Optional rows below the header (NowSummaryRow, ChipLane, etc.) */
  children?: ReactNode;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function PlayTopArea({ header, children, className }: PlayTopAreaProps) {
  return (
    <div className={cn('flex flex-col shrink-0', className)}>
      {header}
      {children}
    </div>
  );
}
