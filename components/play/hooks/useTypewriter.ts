'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type TypewriterSpeed = 'fast' | 'normal' | 'dramatic' | 'instant';

interface UseTypewriterOptions {
  /** Text to reveal character by character */
  text: string;
  /** Speed preset: fast (80cps), normal (40cps), dramatic (15cps), instant */
  speed?: TypewriterSpeed;
  /** Start automatically when text changes */
  autoStart?: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  /** Currently visible text */
  displayedText: string;
  /** Progress from 0 to 1 */
  progress: number;
  /** Whether animation is currently running */
  isAnimating: boolean;
  /** Whether animation has completed */
  isComplete: boolean;
  /** Skip to end (reveal all text immediately) */
  skip: () => void;
  /** Pause animation */
  pause: () => void;
  /** Resume animation */
  resume: () => void;
  /** Reset and start from beginning */
  reset: () => void;
}

const SPEED_CPS: Record<TypewriterSpeed, number> = {
  fast: 80,
  normal: 40,
  dramatic: 15,
  instant: Infinity,
};

/**
 * Hook for typewriter text reveal animation
 * Respects prefers-reduced-motion automatically
 */
export function useTypewriter({
  text,
  speed = 'normal',
  autoStart = true,
  onComplete,
}: UseTypewriterOptions): UseTypewriterReturn {
  const [charIndex, setCharIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(!autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated - using useEffect to avoid ref access during render
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const effectiveSpeed = prefersReducedMotion ? 'instant' : speed;
  const cps = SPEED_CPS[effectiveSpeed];
  const intervalMs = cps === Infinity ? 0 : 1000 / cps;

  const isComplete = charIndex >= text.length;
  const isAnimating = !isPaused && !isComplete;
  const progress = text.length > 0 ? charIndex / text.length : 1;
  const displayedText = text.slice(0, charIndex);

  // Handle instant speed
  useEffect(() => {
    if (effectiveSpeed === 'instant' && autoStart) {
      const id = requestAnimationFrame(() => {
        setCharIndex(text.length);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [effectiveSpeed, text.length, autoStart]);

  // Animation loop
  useEffect(() => {
    if (isPaused || isComplete || effectiveSpeed === 'instant') {
      return;
    }

    intervalRef.current = setInterval(() => {
      setCharIndex((prev) => {
        const next = prev + 1;
        if (next >= text.length) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          // Call onComplete on next tick to ensure state is updated
          setTimeout(() => onCompleteRef.current?.(), 0);
          return text.length;
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, isComplete, intervalMs, text.length, effectiveSpeed]);

  // Reset when text changes
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setCharIndex(0);
      setIsPaused(!autoStart);
    });
    return () => cancelAnimationFrame(id);
  }, [text, autoStart]);

  const skip = useCallback(() => {
    setCharIndex(text.length);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onCompleteRef.current?.();
  }, [text.length]);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    setCharIndex(0);
    setIsPaused(!autoStart);
  }, [autoStart]);

  return {
    displayedText,
    progress,
    isAnimating,
    isComplete,
    skip,
    pause,
    resume,
    reset,
  };
}
