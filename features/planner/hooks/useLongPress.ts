'use client';

/**
 * useLongPress Hook
 * 
 * Detects long press gestures for context menus and reorder mode.
 */

import { useState, useRef, useCallback } from 'react';

interface UseLongPressOptions {
  /** Callback when long press is detected */
  onLongPress: () => void;
  /** Callback for regular click/tap */
  onClick?: () => void;
  /** Duration in ms before long press triggers */
  duration?: number;
  /** Whether long press is enabled */
  enabled?: boolean;
}

interface UseLongPressReturn {
  /** Props to spread on the element */
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onTouchMove: () => void;
    onClick: (e: React.MouseEvent) => void;
  };
  /** Whether currently in long press detection */
  isPressed: boolean;
  /** Progress towards long press (0-1) */
  progress: number;
}

export function useLongPress({
  onLongPress,
  onClick,
  duration = 500,
  enabled = true,
}: UseLongPressOptions): UseLongPressReturn {
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const startTimeRef = useRef(0);

  const startProgress = useCallback(() => {
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);
      
      if (newProgress < 1) {
        progressTimerRef.current = setTimeout(updateProgress, 16); // ~60fps
      }
    };
    updateProgress();
  }, [duration]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!enabled) return;
    
    setIsPressed(true);
    setProgress(0);
    isLongPressRef.current = false;
    startTimeRef.current = Date.now();
    
    startProgress();
    
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsPressed(false);
      setProgress(0);
      onLongPress();
    }, duration);
  }, [enabled, duration, onLongPress, startProgress]);

  const cancel = useCallback(() => {
    clearTimers();
    setIsPressed(false);
    setProgress(0);
  }, [clearTimers]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isLongPressRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressRef.current = false;
      return;
    }
    onClick?.();
  }, [onClick]);

  return {
    handlers: {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchMove: cancel, // Cancel on movement
      onClick: handleClick,
    },
    isPressed,
    progress,
  };
}
