/**
 * Client-side Demo Detection Hook
 * Usage: const { isDemoMode, tier, timeRemaining, showWarning } = useIsDemo();
 *
 * Architecture: **Module-level shared store** — a single fetch and a single
 * polling interval serve all mounted consumers simultaneously.  No matter how
 * many components call useIsDemo() / useIsDemoMode() / useDemoTier(), only one
 * HTTP request to /api/demo/status is ever in-flight at a time, and only one
 * per-second expiry-countdown timer is active.
 */

'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

// =============================================================================
// TYPES
// =============================================================================

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

// =============================================================================
// CONSTANTS
// =============================================================================

/** How often to poll /api/demo/status (ms) */
const POLL_INTERVAL_MS = 60_000;
/** Show timeout warning when this many ms remain */
const WARN_THRESHOLD_MS = 10 * 60 * 1000;

// =============================================================================
// MODULE-LEVEL SHARED STORE
// =============================================================================

interface StoreState {
  status: DemoStatus;
  showTimeoutWarning: boolean;
  isLoading: boolean;
  error?: string;
}

const INITIAL_STATE: StoreState = {
  status: { isDemoMode: false },
  showTimeoutWarning: false,
  isLoading: true,
  error: undefined,
};

type Listener = () => void;

class DemoStore {
  private state: StoreState = { ...INITIAL_STATE };
  private listeners = new Set<Listener>();

  getSnapshot = (): StoreState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.state = { ...this.state };
    this.listeners.forEach((l) => l());
  }

  applyStatus(data: DemoStatus) {
    this.state = {
      ...this.state,
      status: data,
      isLoading: false,
      error: undefined,
    };
    this.emit();
  }

  setLoading(loading: boolean) {
    if (this.state.isLoading === loading) return;
    this.state = { ...this.state, isLoading: loading };
    this.emit();
  }

  setError(error: string) {
    this.state = {
      ...this.state,
      status: { isDemoMode: false },
      isLoading: false,
      error,
    };
    this.emit();
  }

  setShowTimeoutWarning(show: boolean) {
    if (this.state.showTimeoutWarning === show) return;
    this.state = { ...this.state, showTimeoutWarning: show };
    this.emit();
  }
}

/** Singleton store — shared by every hook instance on the page */
const demoStore = new DemoStore();

/** Server-side snapshot — never changes so React skips hydration re-renders */
const SERVER_SNAPSHOT: StoreState = { ...INITIAL_STATE };

// =============================================================================
// MODULE-LEVEL FETCH + POLLING (single in-flight request, single interval)
// =============================================================================

/** Number of mounted hook instances that need the data */
let consumerCount = 0;
let pollTimerId: ReturnType<typeof setInterval> | null = null;
let inFlightFetch: Promise<void> | null = null;

async function fetchDemoStatus(): Promise<void> {
  if (inFlightFetch) return inFlightFetch;

  inFlightFetch = (async () => {
    try {
      const res = await fetch('/api/demo/status', {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to fetch demo status');
      }

      const data: DemoStatus = await res.json();
      demoStore.applyStatus(data);
    } catch (err) {
      console.error('[useIsDemo] Error fetching status:', err);
      demoStore.setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}

function startPolling(): void {
  if (pollTimerId !== null) return;
  pollTimerId = setInterval(fetchDemoStatus, POLL_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollTimerId === null) return;
  clearInterval(pollTimerId);
  pollTimerId = null;
}

// =============================================================================
// MODULE-LEVEL EXPIRY TIMER (single timer, driven from store state)
// =============================================================================

/** Number of mounted hooks that care about expiry redirects */
let expiryListenerCount = 0;
let expiryTimerId: ReturnType<typeof setInterval> | null = null;
/**
 * Set of all active router.push functions — one per mounted useIsDemo() instance.
 * The expiry timer picks an arbitrary live one when it needs to redirect.
 * Using a Set ensures there is always a valid function available as long as
 * at least one instance is still mounted.
 */
const activeRouterPushFns = new Set<(href: string) => void>();

function startExpiryTimer(): void {
  if (expiryTimerId !== null) return;
  expiryTimerId = setInterval(() => {
    const { status } = demoStore.getSnapshot();
    if (!status.isDemoMode || !status.expiresAt) return;

    const remaining = new Date(status.expiresAt).getTime() - Date.now();

    if (remaining < WARN_THRESHOLD_MS && remaining > 0) {
      demoStore.setShowTimeoutWarning(true);
    }

    if (remaining <= 0) {
      console.log('[useIsDemo] Demo session expired, redirecting...');
      stopExpiryTimer();
      const push = activeRouterPushFns.values().next().value;
      push?.('/demo-expired');
    }
  }, 1_000);
}

function stopExpiryTimer(): void {
  if (expiryTimerId === null) return;
  clearInterval(expiryTimerId);
  expiryTimerId = null;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to check if user is in demo mode.
 * Also handles session timeout warnings and expiry redirects.
 *
 * All instances share a single HTTP fetch, a single polling interval, and a
 * single per-second expiry countdown — regardless of how many components call
 * this hook simultaneously.
 *
 * @returns Demo status and utilities
 */
export function useIsDemo(): UseDemoReturn {
  const router = useRouter();

  const snap = useSyncExternalStore(
    demoStore.subscribe,
    demoStore.getSnapshot,
    () => SERVER_SNAPSHOT
  );

  // Register as a consumer: start fetch + polling on first mount, stop on last unmount
  useEffect(() => {
    consumerCount += 1;
    if (consumerCount === 1) {
      // First consumer: kick off initial load + polling
      fetchDemoStatus();
      startPolling();
    }
    return () => {
      consumerCount -= 1;
      if (consumerCount === 0) {
        stopPolling();
        inFlightFetch = null;
      }
    };
  }, []);

  // Register as an expiry listener (adds router.push to the active set)
  useEffect(() => {
    const push = router.push;
    activeRouterPushFns.add(push);
    expiryListenerCount += 1;
    startExpiryTimer();
    return () => {
      activeRouterPushFns.delete(push);
      expiryListenerCount -= 1;
      if (expiryListenerCount === 0) {
        stopExpiryTimer();
      }
    };
  }, [router]);

  return {
    ...snap.status,
    showTimeoutWarning: snap.showTimeoutWarning,
    isLoading: snap.isLoading,
    error: snap.error,
    refresh: fetchDemoStatus,
  };
}

/**
 * Simplified hook to just check if in demo mode.
 * Reads from the shared store — does NOT initiate its own network request.
 * For components that only need a boolean check.
 */
export function useIsDemoMode(): boolean {
  const snap = useSyncExternalStore(
    demoStore.subscribe,
    demoStore.getSnapshot,
    () => SERVER_SNAPSHOT
  );
  return snap.status.isDemoMode;
}

/**
 * Hook to get demo tier.
 * Reads from the shared store — does NOT initiate its own network request.
 * Returns 'free', 'premium', or null if not in demo.
 */
export function useDemoTier(): 'free' | 'premium' | null {
  const snap = useSyncExternalStore(
    demoStore.subscribe,
    demoStore.getSnapshot,
    () => SERVER_SNAPSHOT
  );
  const { isDemoMode, tier } = snap.status;
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
  // Read directly from the store — no extra network request
  const isDemoMode = useIsDemoMode();

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
