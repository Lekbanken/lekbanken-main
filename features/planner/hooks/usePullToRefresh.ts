'use client';

/**
 * usePullToRefresh Hook
 * 
 * Implements pull-to-refresh gesture for mobile.
 */

import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';

interface UsePullToRefreshOptions {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Threshold in pixels to trigger refresh */
  threshold?: number;
  /** Maximum pull distance */
  maxPull?: number;
  /** Whether pull-to-refresh is enabled */
  enabled?: boolean;
}

interface UsePullToRefreshReturn {
  /** Ref to attach to the scrollable container */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Current pull distance (0 when not pulling) */
  pullDistance: number;
  /** Whether currently refreshing */
  isRefreshing: boolean;
  /** Whether currently pulling */
  isPulling: boolean;
  /** Progress towards threshold (0-1) */
  progress: number;
  /** Whether threshold is reached */
  thresholdReached: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Only start pull if at top of scroll
    if (container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing || !isPulling) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setPullDistance(0);
      return;
    }
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0) {
      // Apply resistance to pull
      const resistance = 0.5;
      const resistedPull = Math.min(diff * resistance, maxPull);
      setPullDistance(resistedPull);
      
      // Prevent default scroll when pulling
      if (resistedPull > 10) {
        e.preventDefault();
      }
    }
  }, [enabled, isRefreshing, isPulling, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || isRefreshing) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6); // Settle at loading position
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [enabled, isRefreshing, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enabled]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    isPulling,
    progress: Math.min(pullDistance / threshold, 1),
    thresholdReached: pullDistance >= threshold,
  };
}
