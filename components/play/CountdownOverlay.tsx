'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { useCountdown } from './hooks/useCountdown';
import { Button } from '@/components/ui/button';
import { ForwardIcon } from '@heroicons/react/24/solid';

export interface CountdownOverlayProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Duration in seconds */
  duration: number;
  /** Message to display above countdown */
  message?: string;
  /** Callback when countdown completes */
  onComplete: () => void;
  /** Allow host to skip */
  allowHostSkip?: boolean;
  /** Callback when skipped */
  onSkip?: () => void;
  /** Visual variant */
  variant?: 'default' | 'dramatic';
  /** Whether the overlay is visible */
  isOpen?: boolean;
}

/**
 * CountdownOverlay - Full-screen countdown before state transitions
 * 
 * Creates anticipation and prevents cognitive whiplash
 * Mobile-first with reduced-motion support
 */
export const CountdownOverlay = forwardRef<HTMLDivElement, CountdownOverlayProps>(
  (
    {
      duration,
      message = 'Nästa steg startar om',
      onComplete,
      allowHostSkip = false,
      onSkip,
      variant = 'default',
      isOpen = true,
      className,
      ...props
    },
    ref
  ) => {
    // Check for reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const { secondsRemaining, isComplete, skip } = useCountdown({
      duration,
      autoStart: isOpen,
      onComplete,
    });

    const handleSkip = () => {
      skip();
      onSkip?.();
    };

    // Don't render if not open or complete
    if (!isOpen || isComplete) {
      return null;
    }

    const variantStyles = {
      default: {
        overlay: 'bg-background/80 backdrop-blur-sm',
        number: 'text-foreground',
        message: 'text-muted-foreground',
      },
      dramatic: {
        overlay: 'bg-black/90 backdrop-blur-md',
        number: 'text-primary',
        message: 'text-white/80',
      },
    };

    const styles = variantStyles[variant];

    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-50 flex flex-col items-center justify-center',
          styles.overlay,
          className
        )}
        role="alertdialog"
        aria-modal="true"
        aria-label={`${message} ${secondsRemaining}`}
        {...props}
      >
        {/* Message */}
        <p className={cn('text-lg md:text-xl font-medium mb-6', styles.message)}>
          {message}
        </p>

        {/* Countdown Number */}
        <div
          className={cn(
            'relative flex items-center justify-center',
            'w-32 h-32 md:w-40 md:h-40',
            'rounded-full border-4 border-border',
            'bg-card shadow-lg'
          )}
        >
          <span
            className={cn(
              'text-6xl md:text-7xl font-bold tabular-nums',
              styles.number,
              // Pulse animation (disabled for reduced motion)
              !prefersReducedMotion && 'animate-pulse'
            )}
            key={secondsRemaining} // Key change triggers re-render for animation
          >
            {secondsRemaining}
          </span>
        </div>

        {/* Screen reader announcement */}
        <span className="sr-only" aria-live="assertive">
          {secondsRemaining} sekunder kvar
        </span>

        {/* Host Skip Button */}
        {allowHostSkip && (
          <Button
            variant="ghost"
            size="lg"
            onClick={handleSkip}
            className={cn(
              'mt-8 gap-2',
              variant === 'dramatic' && 'text-white/70 hover:text-white hover:bg-white/10'
            )}
          >
            <ForwardIcon className="h-5 w-5" />
            Hoppa över
          </Button>
        )}
      </div>
    );
  }
);

CountdownOverlay.displayName = 'CountdownOverlay';
