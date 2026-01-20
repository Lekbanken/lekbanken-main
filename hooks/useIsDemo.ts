/**
 * Client-side Demo Detection Hook
 * Usage: const { isDemoMode, tier, timeRemaining, showWarning } = useIsDemo();
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface DemoStatus {
  isDemoMode: boolean;
  tier?: 'free' | 'premium';
  expiresAt?: string;
  timeRemaining?: number; // milliseconds
  tenantName?: string;
  userName?: string;
  sessionId?: string;
}

export interface UseDemoReturn extends DemoStatus {
  showTimeoutWarning: boolean;
  isLoading: boolean;
  error?: string;
  refresh: () => Promise<void>;
}

/**
 * Hook to check if user is in demo mode
 * Also handles session timeout warnings and expiry redirects
 *
 * @returns Demo status and utilities
 */
export function useIsDemo(): UseDemoReturn {
  const router = useRouter();
  const [demoStatus, setDemoStatus] = useState<DemoStatus>({
    isDemoMode: false,
  });
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Fetch demo status from API
  const fetchDemoStatus = async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      const res = await fetch('/api/demo/status', {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to fetch demo status');
      }

      const data = await res.json();
      setDemoStatus(data);
    } catch (err) {
      console.error('[useIsDemo] Error fetching status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setDemoStatus({ isDemoMode: false });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchDemoStatus();
  }, []);

  // Poll for status updates every minute
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDemoStatus();
    }, 60 * 1000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle timeout warning and expiry
  useEffect(() => {
    if (!demoStatus.isDemoMode || !demoStatus.expiresAt) {
      return;
    }

    // Check time remaining every second
    const interval = setInterval(() => {
      const now = Date.now();
      const expiresAt = new Date(demoStatus.expiresAt!).getTime();
      const remaining = expiresAt - now;

      // Show warning at 10 minutes remaining
      if (remaining < 10 * 60 * 1000 && remaining > 0) {
        setShowTimeoutWarning(true);
      }

      // Redirect when expired
      if (remaining <= 0) {
        clearInterval(interval);
        console.log('[useIsDemo] Demo session expired, redirecting...');
        router.push('/demo-expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [demoStatus.isDemoMode, demoStatus.expiresAt, router]);

  return {
    ...demoStatus,
    showTimeoutWarning,
    isLoading,
    error,
    refresh: fetchDemoStatus,
  };
}

/**
 * Simplified hook to just check if in demo mode
 * For components that only need boolean check
 */
export function useIsDemoMode(): boolean {
  const { isDemoMode } = useIsDemo();
  return isDemoMode;
}

/**
 * Hook to get demo tier
 * Returns 'free', 'premium', or null if not in demo
 */
export function useDemoTier(): 'free' | 'premium' | null {
  const { isDemoMode, tier } = useIsDemo();
  return isDemoMode ? tier || 'free' : null;
}

/**
 * Format milliseconds to human-readable time
 * e.g., 5400000 → "1h 30m"
 */
export function formatTimeRemaining(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${minutes}m`;
}

/**
 * Hook to track feature usage in demo
 * Call this when user interacts with a feature
 *
 * @param feature - Feature name to track
 */
export function useTrackDemoFeature() {
  const { isDemoMode } = useIsDemo();

  return async (feature: string, metadata?: Record<string, unknown>) => {
    if (!isDemoMode) {
      return;
    }

    try {
      await fetch('/api/demo/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feature, metadata }),
        credentials: 'include',
      });
    } catch (error) {
      console.error('[useTrackDemoFeature] Error:', error);
      // Non-critical, don't throw
    }
  };
}

/**
 * Hook to mark demo as converted
 * Call this when user clicks "Sign Up" or "Contact Sales"
 *
 * @param type - Conversion type ('signup' or 'contact_sales')
 * @param plan - Selected plan (optional)
 */
export function useConvertDemo() {
  return async (
    type: 'signup' | 'contact_sales',
    plan?: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      const res = await fetch('/api/demo/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, plan, metadata }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to track conversion');
      }

      console.log(`[useConvertDemo] Demo converted: ${type}`);
    } catch (error) {
      console.error('[useConvertDemo] Error:', error);
      // Non-critical, don't throw
    }
  };
}
