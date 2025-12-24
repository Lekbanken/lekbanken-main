'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { ReadinessLevel } from '@/types/lobby';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/solid';

// ============================================================================
// Types
// ============================================================================

export interface ReadinessBadgeProps {
  /** Readiness level to display */
  level: ReadinessLevel;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show label text */
  showLabel?: boolean;
  /** Custom label (overrides default) */
  label?: string;
  /** Show as a pill/badge or just an icon */
  variant?: 'icon' | 'badge' | 'pill';
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Config
// ============================================================================

interface ReadinessConfig {
  icon: typeof CheckCircleIcon;
  label: string;
  colorClasses: string;
  bgClasses: string;
}

const READINESS_CONFIG: Record<ReadinessLevel, ReadinessConfig> = {
  ready: {
    icon: CheckCircleIcon,
    label: 'Ready',
    colorClasses: 'text-success',
    bgClasses: 'bg-success/10 text-success',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    label: 'Warning',
    colorClasses: 'text-warning',
    bgClasses: 'bg-warning/10 text-warning',
  },
  error: {
    icon: XCircleIcon,
    label: 'Error',
    colorClasses: 'text-error',
    bgClasses: 'bg-error/10 text-error',
  },
  unknown: {
    icon: QuestionMarkCircleIcon,
    label: 'Unknown',
    colorClasses: 'text-foreground-secondary',
    bgClasses: 'bg-surface-secondary text-foreground-secondary',
  },
};

const SIZE_CONFIG = {
  sm: {
    icon: 'h-4 w-4',
    text: 'text-xs',
    padding: 'px-2 py-0.5',
    gap: 'gap-1',
  },
  md: {
    icon: 'h-5 w-5',
    text: 'text-sm',
    padding: 'px-2.5 py-1',
    gap: 'gap-1.5',
  },
  lg: {
    icon: 'h-6 w-6',
    text: 'text-base',
    padding: 'px-3 py-1.5',
    gap: 'gap-2',
  },
};

// ============================================================================
// ReadinessBadge Component
// ============================================================================

export const ReadinessBadge = forwardRef<HTMLDivElement, ReadinessBadgeProps>(
  (
    {
      level,
      size = 'md',
      showLabel = false,
      label,
      variant = 'icon',
      className,
    },
    ref
  ) => {
    const config = READINESS_CONFIG[level];
    const sizeConfig = SIZE_CONFIG[size];
    const Icon = config.icon;
    const displayLabel = label ?? config.label;

    // Icon only variant
    if (variant === 'icon') {
      return (
        <div
          ref={ref}
          className={cn('inline-flex items-center', className)}
          aria-label={displayLabel}
        >
          <Icon className={cn(sizeConfig.icon, config.colorClasses)} />
          {showLabel && (
            <span className={cn('ml-1', sizeConfig.text, config.colorClasses)}>
              {displayLabel}
            </span>
          )}
        </div>
      );
    }

    // Badge variant (compact with background)
    if (variant === 'badge') {
      return (
        <div
          ref={ref}
          className={cn(
            'inline-flex items-center rounded-full',
            sizeConfig.padding,
            sizeConfig.gap,
            config.bgClasses,
            className
          )}
        >
          <Icon className={sizeConfig.icon} />
          {showLabel && (
            <span className={cn('font-medium', sizeConfig.text)}>
              {displayLabel}
            </span>
          )}
        </div>
      );
    }

    // Pill variant (larger, more prominent)
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-lg border',
          sizeConfig.padding,
          sizeConfig.gap,
          config.bgClasses,
          level === 'ready' && 'border-success/20',
          level === 'warning' && 'border-warning/20',
          level === 'error' && 'border-error/20',
          level === 'unknown' && 'border-border',
          className
        )}
      >
        <Icon className={sizeConfig.icon} />
        <span className={cn('font-medium', sizeConfig.text)}>
          {displayLabel}
        </span>
      </div>
    );
  }
);

ReadinessBadge.displayName = 'ReadinessBadge';

export default ReadinessBadge;
