/**
 * StepHeaderRow — Shared step header bar
 *
 * Renders the number badge, "Step X of Y" counter, and a trailing slot
 * inside a bordered header row. Used by both Participant and Director step cards.
 *
 * Differences handled:
 * - Badge colour: participant uses theme-derived, director uses bg-primary
 *   → Consumer passes `badgeClassName`
 * - Right-side content: participant shows tag badge, director shows duration
 *   → Consumer passes `trailing` ReactNode slot
 * - i18n: consumer pre-resolves the "Step X of Y" label string
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface StepHeaderRowProps {
  /** 1-based step number */
  stepNumber: number;
  /** Pre-resolved "Step X of Y" label from i18n */
  stepOfLabel: string;
  /** Override badge colour (defaults to bg-primary text-primary-foreground) */
  badgeClassName?: string;
  /** Right-side slot (tag badge, duration badge, etc.) */
  trailing?: React.ReactNode;
  /** Outer wrapper override */
  className?: string;
}

export function StepHeaderRow({
  stepNumber,
  stepOfLabel,
  badgeClassName = 'bg-primary text-primary-foreground',
  trailing,
  className,
}: StepHeaderRowProps) {
  return (
    <div className={cn('border-b border-border bg-muted/50 px-4 py-2.5', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm',
              badgeClassName,
            )}
          >
            {stepNumber}
          </span>
          <span className="text-xs font-medium text-muted-foreground font-mono tabular-nums">
            {stepOfLabel}
          </span>
        </div>
        {trailing}
      </div>
    </div>
  );
}
