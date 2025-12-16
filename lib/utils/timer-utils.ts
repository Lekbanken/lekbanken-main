/**
 * Timer Utilities for Play Runtime
 * 
 * Client-side timer calculations from event-driven state.
 * No server round-trips needed for countdown display.
 */

import type { TimerState, TimerDisplay } from '@/types/play-runtime';

/**
 * Calculate current timer display from event-driven state
 */
export function calculateTimerDisplay(timerState: TimerState | null): TimerDisplay {
  if (!timerState) {
    return {
      remaining: 0,
      isRunning: false,
      isPaused: false,
      isFinished: true,
      progress: 1,
    };
  }

  const { started_at, duration_seconds, paused_at } = timerState;
  const startTime = new Date(started_at).getTime();
  const totalMs = duration_seconds * 1000;
  
  let elapsedMs: number;
  
  if (paused_at) {
    // Timer is paused - calculate elapsed at pause time
    const pauseTime = new Date(paused_at).getTime();
    elapsedMs = pauseTime - startTime;
  } else {
    // Timer is running - calculate current elapsed
    elapsedMs = Date.now() - startTime;
  }
  
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const remaining = Math.ceil(remainingMs / 1000);
  const isFinished = remainingMs <= 0;
  const progress = Math.min(1, elapsedMs / totalMs);
  
  return {
    remaining,
    isRunning: !paused_at && !isFinished,
    isPaused: !!paused_at,
    isFinished,
    progress,
  };
}

/**
 * Format seconds as MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Create a new timer state (for starting a timer)
 */
export function createTimerState(durationSeconds: number): TimerState {
  return {
    started_at: new Date().toISOString(),
    duration_seconds: durationSeconds,
    paused_at: null,
  };
}

/**
 * Pause a timer (returns new state)
 */
export function pauseTimer(timerState: TimerState): TimerState {
  if (timerState.paused_at) {
    // Already paused
    return timerState;
  }
  
  return {
    ...timerState,
    paused_at: new Date().toISOString(),
  };
}

/**
 * Resume a paused timer (returns new state)
 * Adjusts started_at to account for pause duration
 */
export function resumeTimer(timerState: TimerState): TimerState {
  if (!timerState.paused_at) {
    // Not paused
    return timerState;
  }
  
  const pauseTime = new Date(timerState.paused_at).getTime();
  const pauseDuration = Date.now() - pauseTime;
  const originalStart = new Date(timerState.started_at).getTime();
  const adjustedStart = new Date(originalStart + pauseDuration);
  
  return {
    ...timerState,
    started_at: adjustedStart.toISOString(),
    paused_at: null,
  };
}

/**
 * Get traffic light color based on progress
 */
export function getTrafficLightColor(display: TimerDisplay): 'green' | 'yellow' | 'red' {
  if (display.isFinished) return 'red';
  if (display.progress < 0.5) return 'green';
  if (display.progress < 0.8) return 'yellow';
  return 'red';
}

/**
 * Hook helper: use with setInterval for countdown display
 */
export function useTimerTick(
  timerState: TimerState | null,
  onTick: (display: TimerDisplay) => void,
  intervalMs: number = 1000
): () => void {
  const tick = () => {
    onTick(calculateTimerDisplay(timerState));
  };
  
  // Initial tick
  tick();
  
  // Set up interval
  const intervalId = setInterval(tick, intervalMs);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}
