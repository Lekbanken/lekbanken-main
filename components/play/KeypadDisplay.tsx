'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface KeypadDisplayProps extends HTMLAttributes<HTMLDivElement> {
  /** Total code length */
  codeLength: number;
  /** Current input length */
  filledCount: number;
  /** Whether to show shake animation */
  isShaking?: boolean;
  /** Whether code was correct (success state) */
  isSuccess?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * KeypadDisplay - Visual code dot display
 * 
 * Shows filled/empty dots for PIN entry with shake animation on error
 */
export const KeypadDisplay = forwardRef<HTMLDivElement, KeypadDisplayProps>(
  (
    {
      codeLength,
      filledCount,
      isShaking = false,
      isSuccess = false,
      size = 'md',
      className,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'h-3 w-3 gap-2',
      md: 'h-4 w-4 gap-3',
      lg: 'h-5 w-5 gap-4',
    };

    const containerSizeStyles = {
      sm: 'py-3 px-4',
      md: 'py-4 px-6',
      lg: 'py-5 px-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center rounded-lg bg-muted border border-border',
          containerSizeStyles[size],
          isShaking && 'animate-shake',
          className
        )}
        role="status"
        aria-label={`${filledCount} av ${codeLength} siffror inmatade`}
        {...props}
      >
        <div className={cn('flex items-center', sizeStyles[size].split(' ').pop())}>
          {Array.from({ length: codeLength }).map((_, index) => {
            const isFilled = index < filledCount;
            
            return (
              <div
                key={index}
                className={cn(
                  'rounded-full transition-all duration-150',
                  sizeStyles[size].split(' ').slice(0, 2).join(' '),
                  isFilled
                    ? isSuccess
                      ? 'bg-success scale-110'
                      : 'bg-primary'
                    : 'bg-border',
                  isSuccess && isFilled && 'animate-pulse'
                )}
                aria-hidden="true"
              />
            );
          })}
        </div>
      </div>
    );
  }
);

KeypadDisplay.displayName = 'KeypadDisplay';
