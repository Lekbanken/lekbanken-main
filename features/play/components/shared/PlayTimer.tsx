'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { PlayIcon, PauseIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface PlayTimerProps {
  /** Initial time in seconds (for countdown) or 0 for count-up */
  initialSeconds?: number;
  /** Countdown mode (true) or count-up mode (false) */
  countdown?: boolean;
  /** Auto-start the timer */
  autoStart?: boolean;
  /** Called when timer changes */
  onTick?: (seconds: number) => void;
  /** Called when countdown reaches 0 */
  onComplete?: () => void;
  /** Called when timer state changes */
  onStateChange?: (isRunning: boolean, seconds: number) => void;
  /** Show controls */
  showControls?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface PlayTimerRef {
  start: () => void;
  pause: () => void;
  reset: () => void;
  getTime: () => number;
  isRunning: () => boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PlayTimer({
  initialSeconds = 0,
  countdown = false,
  autoStart = false,
  onTick,
  onComplete,
  onStateChange,
  showControls = true,
  size = 'md',
  className,
}: PlayTimerProps) {
  const t = useTranslations('play.playTimer');
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format time as MM:SS or HH:MM:SS
  const formatTime = (secs: number): string => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const next = countdown ? prev - 1 : prev + 1;

          if (countdown && next <= 0) {
            setIsRunning(false);
            onComplete?.();
            return 0;
          }

          onTick?.(next);
          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, countdown, onTick, onComplete]);

  // Notify state changes
  useEffect(() => {
    onStateChange?.(isRunning, seconds);
  }, [isRunning, seconds, onStateChange]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  // Size classes
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const buttonSize = size === 'lg' ? 'md' : 'sm';

  // Progress for countdown
  const progress = countdown && initialSeconds > 0
    ? (seconds / initialSeconds) * 100
    : 0;

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Timer display */}
      <div
        className={cn(
          'relative flex items-center justify-center font-mono font-bold tabular-nums',
          sizeClasses[size],
          isRunning ? 'text-primary' : 'text-foreground',
          countdown && seconds <= 10 && seconds > 0 && 'animate-pulse text-destructive'
        )}
      >
        {/* Progress ring for countdown */}
        {countdown && initialSeconds > 0 && (
          <svg
            className="absolute -inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)] -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted/30"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              className={cn(
                'transition-all duration-1000',
                seconds <= 10 ? 'text-destructive' : 'text-primary'
              )}
              strokeLinecap="round"
            />
          </svg>
        )}
        <span className="relative">{formatTime(seconds)}</span>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button
              variant="outline"
              size={buttonSize}
              onClick={handlePause}
              className="gap-1.5"
            >
              <PauseIcon className="h-4 w-4" />
              {t('pause')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size={buttonSize}
              onClick={handleStart}
              className="gap-1.5"
            >
              <PlayIcon className="h-4 w-4" />
              {seconds === initialSeconds ? t('start') : t('continue')}
            </Button>
          )}
          <Button
            variant="ghost"
            size={buttonSize}
            onClick={handleReset}
            className="gap-1.5"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {t('reset')}
          </Button>
        </div>
      )}
    </div>
  );
}
