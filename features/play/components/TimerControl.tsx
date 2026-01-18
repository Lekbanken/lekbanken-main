/**
 * TimerControl Component
 * 
 * Timer display and controls for facilitators.
 * Shows remaining time with visual feedback and control buttons.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { 
  PlayIcon, 
  PauseIcon, 
  ArrowPathIcon,
  ClockIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLiveTimer } from '@/features/play/hooks/useLiveSession';
import { formatTime, getTrafficLightColor } from '@/lib/utils/timer-utils';
import type { TimerState } from '@/types/play-runtime';

// =============================================================================
// Types
// =============================================================================

export interface TimerControlProps {
  /** Current timer state */
  timerState: TimerState | null;
  /** Called when timer should start */
  onStart: (durationSeconds: number) => void;
  /** Called when timer should pause */
  onPause: () => void;
  /** Called when timer should resume */
  onResume: () => void;
  /** Called when timer should reset */
  onReset: () => void;
  /** Default duration in seconds for new timers */
  defaultDuration?: number;
  /** Whether controls are disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// =============================================================================
// Component
// =============================================================================

export function TimerControl({
  timerState,
  onStart,
  onPause,
  onResume,
  onReset,
  defaultDuration = 300, // 5 minutes
  disabled = false,
  size = 'md',
}: TimerControlProps) {
  const t = useTranslations('play.timerControl');
  // Input for setting timer duration
  const [inputMinutes, setInputMinutes] = useState(Math.floor(defaultDuration / 60));
  const [inputSeconds, setInputSeconds] = useState(defaultDuration % 60);
  
  // Calculate display from timer state
  const timerDisplay = useLiveTimer({ timerState });
  
  // Handle start
  const handleStart = useCallback(() => {
    const totalSeconds = (inputMinutes * 60) + inputSeconds;
    if (totalSeconds > 0) {
      onStart(totalSeconds);
    }
  }, [inputMinutes, inputSeconds, onStart]);
  
  // Handle quick time buttons
  const handleQuickTime = useCallback((minutes: number) => {
    setInputMinutes(minutes);
    setInputSeconds(0);
    onStart(minutes * 60);
  }, [onStart]);
  
  // Traffic light color
  const trafficColor = timerState 
    ? getTrafficLightColor(timerDisplay)
    : 'green';
  
  // Size classes
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };
  
  const colorClasses = {
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
  };

  return (
    <div className="space-y-4">
      {/* Timer Display */}
      <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/50 p-6">
        {timerState ? (
          <>
            {/* Active timer display */}
            <div className={`font-mono font-bold tabular-nums ${sizeClasses[size]} ${colorClasses[trafficColor]}`}>
              {formatTime(timerDisplay.remaining)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <ClockIcon className="h-4 w-4" />
              {timerDisplay.isPaused ? t('status.paused') : timerDisplay.isFinished ? t('status.finished') : t('status.running')}
            </div>
            
            {/* Progress bar */}
            <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  trafficColor === 'green' ? 'bg-green-500' :
                  trafficColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${timerDisplay.progress * 100}%` }}
              />
            </div>
          </>
        ) : (
          <>
            {/* Timer input when no active timer */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={99}
                value={inputMinutes}
                onChange={(e) => setInputMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 text-center text-2xl font-mono"
                disabled={disabled}
              />
              <span className="text-2xl font-bold text-muted-foreground">:</span>
              <Input
                type="number"
                min={0}
                max={59}
                value={inputSeconds.toString().padStart(2, '0')}
                onChange={(e) => setInputSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                className="w-16 text-center text-2xl font-mono"
                disabled={disabled}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t('inputs.minutesSeconds')}</p>
            
            {/* Quick time buttons */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[1, 2, 3, 5, 10, 15].map((min) => (
                <Button
                  key={min}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickTime(min)}
                  disabled={disabled}
                  className="text-xs"
                >
                  {t('quickMinutes', { count: min })}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
      
      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3">
        {!timerState ? (
          // Start button
          <Button
            size="lg"
            onClick={handleStart}
            disabled={disabled || (inputMinutes === 0 && inputSeconds === 0)}
            className="gap-2"
          >
            <PlayIcon className="h-5 w-5" />
            {t('startTimer')}
          </Button>
        ) : (
          <>
            {/* Pause/Resume */}
            {timerDisplay.isPaused ? (
              <Button
                size="lg"
                onClick={onResume}
                disabled={disabled}
                className="gap-2"
              >
                <PlayIcon className="h-5 w-5" />
                {t('resume')}
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                onClick={onPause}
                disabled={disabled || timerDisplay.isFinished}
                className="gap-2"
              >
                <PauseIcon className="h-5 w-5" />
                {t('pause')}
              </Button>
            )}
            
            {/* Reset */}
            <Button
              size="lg"
              variant="outline"
              onClick={onReset}
              disabled={disabled}
              className="gap-2"
            >
              <ArrowPathIcon className="h-5 w-5" />
              {t('reset')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
