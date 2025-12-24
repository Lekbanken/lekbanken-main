'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCountdownOptions {
  /** Duration in seconds */
  duration: number;
  /** Start automatically */
  autoStart?: boolean;
  /** Callback when countdown reaches 0 */
  onComplete?: () => void;
  /** Callback on each second tick */
  onTick?: (secondsRemaining: number) => void;
}

interface UseCountdownReturn {
  /** Seconds remaining */
  secondsRemaining: number;
  /** Progress from 1 to 0 (1 = full, 0 = done) */
  progress: number;
  /** Whether countdown is running */
  isRunning: boolean;
  /** Whether countdown has completed */
  isComplete: boolean;
  /** Start or resume countdown */
  start: () => void;
  /** Pause countdown */
  pause: () => void;
  /** Skip to end immediately */
  skip: () => void;
  /** Reset to initial duration */
  reset: () => void;
}

/**
 * Hook for countdown timer functionality
 * Used for transition overlays and timed events
 */
export function useCountdown({
  duration,
  autoStart = true,
  onComplete,
  onTick,
}: UseCountdownOptions): UseCountdownReturn {
  const [secondsRemaining, setSecondsRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);

  // Keep refs updated - using useEffect to avoid ref access during render
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTickRef.current = onTick;
  }, [onComplete, onTick]);

  const isComplete = secondsRemaining <= 0;
  const progress = duration > 0 ? secondsRemaining / duration : 0;

  // Countdown loop
  useEffect(() => {
    if (!isRunning || isComplete) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1;
        
        if (next <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setIsRunning(false);
          setTimeout(() => onCompleteRef.current?.(), 0);
          return 0;
        }
        
        onTickRef.current?.(next);
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isComplete]);

  // Reset when duration changes
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setSecondsRemaining(duration);
      setIsRunning(autoStart);
    });
    return () => cancelAnimationFrame(id);
  }, [duration, autoStart]);

  const start = useCallback(() => {
    if (!isComplete) {
      setIsRunning(true);
    }
  }, [isComplete]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const skip = useCallback(() => {
    setSecondsRemaining(0);
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onCompleteRef.current?.();
  }, []);

  const reset = useCallback(() => {
    setSecondsRemaining(duration);
    setIsRunning(autoStart);
  }, [duration, autoStart]);

  return {
    secondsRemaining,
    progress,
    isRunning,
    isComplete,
    start,
    pause,
    skip,
    reset,
  };
}
