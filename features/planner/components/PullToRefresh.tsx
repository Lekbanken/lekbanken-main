'use client';

/**
 * PullToRefresh Component
 * 
 * Wrapper component that adds pull-to-refresh functionality.
 */

import { type ReactNode } from 'react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import styles from '../styles/animations.module.css';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  enabled?: boolean;
  className?: string;
  /** Custom refresh indicator */
  indicator?: ReactNode;
}

export function PullToRefresh({
  children,
  onRefresh,
  enabled = true,
  className,
  indicator,
}: PullToRefreshProps) {
  const {
    containerRef,
    pullDistance,
    isRefreshing,
    progress,
    thresholdReached,
  } = usePullToRefresh({
    onRefresh,
    enabled,
  });

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex items-center justify-center transition-opacity',
          pullDistance > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          height: pullDistance,
          top: 0,
        }}
      >
        {indicator || (
          <DefaultPullIndicator
            progress={progress}
            isRefreshing={isRefreshing}
            thresholdReached={thresholdReached}
          />
        )}
      </div>

      {/* Content container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overscroll-contain"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Default pull indicator with spinner
 */
interface DefaultPullIndicatorProps {
  progress: number;
  isRefreshing: boolean;
  thresholdReached: boolean;
}

function DefaultPullIndicator({
  progress,
  isRefreshing,
  thresholdReached,
}: DefaultPullIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'h-8 w-8 rounded-full border-2 border-primary/30',
          isRefreshing && styles.spin
        )}
        style={{
          borderTopColor: thresholdReached || isRefreshing 
            ? 'hsl(var(--primary))' 
            : undefined,
          transform: `rotate(${progress * 360}deg)`,
          transition: 'border-color 0.2s ease',
        }}
      />
      {!isRefreshing && (
        <span className="text-xs text-muted-foreground">
          {thresholdReached ? 'Släpp för att uppdatera' : 'Dra för att uppdatera'}
        </span>
      )}
    </div>
  );
}
