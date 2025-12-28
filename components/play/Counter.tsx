'use client';

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircleIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/solid';
import type { CounterState } from '@/types/puzzle-modules';

// =============================================================================
// Counter Display Component
// =============================================================================

export interface CounterDisplayProps extends HTMLAttributes<HTMLDivElement> {
  /** Current counter value */
  value: number;
  /** Target to reach */
  target: number;
  /** Display label */
  label?: string;
  /** Show as complete */
  isComplete?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Visual style */
  variant?: 'default' | 'progress' | 'minimal';
}

/**
 * CounterDisplay - Read-only display of a counter's progress
 */
export function CounterDisplay({
  value,
  target,
  label,
  isComplete = false,
  size = 'md',
  variant = 'default',
  className,
  ...props
}: CounterDisplayProps) {
  const progress = Math.min((value / target) * 100, 100);
  
  const sizeStyles = {
    sm: { text: 'text-lg', icon: 'h-4 w-4', padding: 'px-3 py-2' },
    md: { text: 'text-2xl', icon: 'h-5 w-5', padding: 'px-4 py-3' },
    lg: { text: 'text-3xl', icon: 'h-6 w-6', padding: 'px-5 py-4' },
  };

  const styles = sizeStyles[size];

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)} {...props}>
        <span className={cn('font-bold tabular-nums', styles.text)}>
          {value}/{target}
        </span>
        {isComplete && (
          <CheckCircleIcon className={cn('text-green-500', styles.icon)} />
        )}
      </div>
    );
  }

  if (variant === 'progress') {
    return (
      <div className={cn('space-y-2', className)} {...props}>
        {label && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium tabular-nums">
              {value}/{target}
            </span>
          </div>
        )}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out rounded-full',
              isComplete ? 'bg-green-500' : 'bg-primary'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 rounded-lg border',
        isComplete ? 'border-green-500/30 bg-green-500/10' : 'border-border bg-muted/50',
        styles.padding,
        className
      )}
      {...props}
    >
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
      <span className={cn('font-bold tabular-nums', styles.text)}>
        {value}
        <span className="text-muted-foreground font-normal">/{target}</span>
      </span>
      {isComplete && (
        <CheckCircleIcon className={cn('text-green-500', styles.icon)} />
      )}
    </div>
  );
}

// =============================================================================
// Interactive Counter Component (for Lobby/Admin)
// =============================================================================

export interface InteractiveCounterProps extends Omit<CounterDisplayProps, 'value'> {
  /** Counter state */
  state: CounterState;
  /** Increment callback */
  onIncrement?: () => void;
  /** Decrement callback (if allowed) */
  onDecrement?: () => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Allow decrement */
  allowDecrement?: boolean;
}

/**
 * InteractiveCounter - Counter with +/- buttons for host/admin control
 */
export function InteractiveCounter({
  state,
  onIncrement,
  onDecrement,
  disabled = false,
  allowDecrement = false,
  size = 'md',
  className,
  ...props
}: InteractiveCounterProps) {
  const sizeStyles = {
    sm: { button: 'h-8 w-8', icon: 'h-4 w-4' },
    md: { button: 'h-10 w-10', icon: 'h-5 w-5' },
    lg: { button: 'h-12 w-12', icon: 'h-6 w-6' },
  };

  const styles = sizeStyles[size];
  const canDecrement = allowDecrement && state.currentValue > 0;
  const canIncrement = !state.isComplete;

  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      {allowDecrement && (
        <button
          type="button"
          onClick={onDecrement}
          disabled={disabled || !canDecrement}
          className={cn(
            'rounded-full border border-border bg-background',
            'flex items-center justify-center',
            'transition-colors hover:bg-muted',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            styles.button
          )}
          aria-label="Minska"
        >
          <MinusIcon className={styles.icon} />
        </button>
      )}
      
      <CounterDisplay
        value={state.currentValue}
        target={state.target}
        label={props.label}
        isComplete={state.isComplete}
        size={size}
        variant="default"
      />
      
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled || !canIncrement}
        className={cn(
          'rounded-full border border-primary bg-primary text-primary-foreground',
          'flex items-center justify-center',
          'transition-colors hover:bg-primary/90',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          styles.button
        )}
        aria-label="Öka"
      >
        <PlusIcon className={styles.icon} />
      </button>
    </div>
  );
}

// =============================================================================
// Hook for Counter State Management
// =============================================================================

export interface UseCounterOptions {
  key: string;
  target: number;
  initialValue?: number;
  onTargetReached?: () => void;
  onChange?: (value: number) => void;
}

export interface UseCounterReturn {
  state: CounterState;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  setValue: (value: number) => void;
}
