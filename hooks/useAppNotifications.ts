'use client';

/**
 * useAppNotifications Hook
 *
 * Fetches and manages notifications for the current user.
 * Reads from notification_deliveries table via RPC with direct-query fallback.
 *
 * Features:
 * - **Single-flight dedup** — module-level Map keyed by userId; superset-aware
 *   (a limit=100 fetch satisfies a limit=20 consumer via `.slice()`)
 * - **Per-user RPC cooldown** — on RPC timeout, skips RPC for 60→120→300s
 *   and goes straight to direct query. Auth/permission errors don't trigger cooldown.
 * - **Supabase Realtime** subscription for instant updates (debounced 300ms)
 * - **30s fallback polling** with exponential backoff + circuit breaker
 * - **Visibility + online gating** — no fetches when tab hidden or offline
 * - **Focus refetch** — replaces per-pathname refetch (notifications are ambient)
 *
 * @example
 * ```tsx
 * const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useAppNotifications();
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/withTimeout';
import { TimeoutError } from '@/lib/utils/withTimeout';
import { parseDbTimestamp } from '@/lib/utils/parseDbTimestamp';

// =============================================================================
// TYPES
// =============================================================================

export interface AppNotification {
  /** Delivery ID (for marking read/dismissed) */
  id: string;
  /** Notification ID */
  notificationId: string;
  /** Title */
  title: string;
  /** Message body */
  message: string;
  /** Type for styling */
  type: 'info' | 'success' | 'warning' | 'error';
  /** Category for filtering */
  category?: string;
  /** Deep link URL */
  actionUrl?: string;
  /** CTA label */
  actionLabel?: string;
  /** When delivered */
  deliveredAt: Date;
  /** When read (null = unread) */
  readAt: Date | null;
  /** When dismissed */
  dismissedAt: Date | null;
}

export interface UseAppNotificationsResult {
  /** List of notifications */
  notifications: AppNotification[];
  /** Number of unread notifications */
  unreadCount: number;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Mark a notification as read */
  markAsRead: (deliveryId: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
  /** Dismiss a notification */
  dismiss: (deliveryId: string) => Promise<void>;
  /** Refresh notifications */
  refresh: () => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** RPC response row type */
interface NotificationRow {
  id: string;
  notification_id: string;
  delivered_at: string;
  read_at: string | null;
  dismissed_at: string | null;
  title: string;
  message: string;
  type: string;
  category: string | null;
  action_url: string | null;
  action_label: string | null;
}

// Helper to call RPC functions not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRpc = any;

/**
 * Timeout for the main notifications fetch (RPC or direct query).
 * Covers auth session resolution (~5s) + HTTP request (~8s) with margin.
 */
const FETCH_TIMEOUT_MS = 20_000;
/** Timeout for user-initiated actions (mark read, dismiss) */
const ACTION_TIMEOUT_MS = 10_000;
/** Fallback polling interval (ms) */
const POLL_INTERVAL_MS = 30_000;
/** Max backoff interval on consecutive failures (ms) */
const MAX_BACKOFF_MS = 120_000;
/** How many consecutive failures before we start backing off */
const BACKOFF_THRESHOLD = 2;
/** Stop polling entirely after this many consecutive failures */
const MAX_CONSECUTIVE_FAILURES = 6;
/** Max age of an in-flight entry before it's considered stale (ms) */
const MAX_INFLIGHT_AGE_MS = 60_000;
/** Max RPC cooldown duration (ms) */
const MAX_RPC_COOLDOWN_MS = 300_000;
/** Base RPC cooldown duration on first timeout (ms) */
const BASE_RPC_COOLDOWN_MS = 60_000;
/** Debounce delay for Realtime-triggered refetch (ms) */
const REALTIME_DEBOUNCE_MS = 300;

// =============================================================================
// MODULE-LEVEL SHARED STATE
// =============================================================================

/**
 * Single-flight dedup map — keyed by userId.
 * Superset-aware: a limit=100 fetch can satisfy a limit=20 consumer.
 */
interface InFlightEntry {
  limit: number;
  promise: Promise<AppNotification[]>;
  abortController: AbortController;
  startedAt: number;
}
const inFlightRequests = new Map<string, InFlightEntry>();

/**
 * Per-user RPC cooldown state.
 * When RPC times out, we skip RPC and go straight to direct query
 * for a period. Auth/permission errors don't trigger cooldown.
 */
interface RpcCooldownState {
  cooldownUntil: number;
  consecutiveTimeouts: number;
}
const rpcStateByUser = new Map<string, RpcCooldownState>();

/** Check if RPC is available (not in cooldown) for a user */
function isRpcAvailable(userId: string): boolean {
  const state = rpcStateByUser.get(userId);
  if (!state) return true;
  if (Date.now() >= state.cooldownUntil) {
    // Cooldown expired — reset
    rpcStateByUser.delete(userId);
    return true;
  }
  return false;
}

/** Record an RPC timeout for a user — activates/extends cooldown */
function recordRpcTimeout(userId: string): void {
  const state = rpcStateByUser.get(userId) ?? { cooldownUntil: 0, consecutiveTimeouts: 0 };
  state.consecutiveTimeouts += 1;
  const cooldownMs = Math.min(
    BASE_RPC_COOLDOWN_MS * Math.pow(2, state.consecutiveTimeouts - 1),
    MAX_RPC_COOLDOWN_MS
  );
  state.cooldownUntil = Date.now() + cooldownMs;
  rpcStateByUser.set(userId, state);

  if (process.env.NODE_ENV === 'development') {
    console.info('[useAppNotifications] RPC cooldown activated', {
      userId: userId.slice(0, 8),
      cooldownMs,
      consecutiveTimeouts: state.consecutiveTimeouts,
    });
  }
}

/** Record an RPC success for a user — resets cooldown */
function recordRpcSuccess(userId: string): void {
  if (rpcStateByUser.has(userId)) {
    rpcStateByUser.delete(userId);
  }
}

/**
 * Clean up all module-level state for a user.
 * Called when the last instance for a user unmounts, or on user switch.
 */
function cleanupUser(userId: string): void {
  const entry = inFlightRequests.get(userId);
  if (entry) {
    entry.abortController.abort();
    inFlightRequests.delete(userId);
  }
  rpcStateByUser.delete(userId);
}

/**
 * Refcount per userId — prevents one instance's unmount from cleaning up
 * shared module-level state while other instances (e.g. bell + page) are
 * still mounted. cleanupUser only runs when the LAST instance releases.
 */
const userRefCounts = new Map<string, number>();

function retainUser(userId: string): void {
  userRefCounts.set(userId, (userRefCounts.get(userId) ?? 0) + 1);
}

function releaseUser(userId: string): void {
  const next = (userRefCounts.get(userId) ?? 0) - 1;
  if (next <= 0) {
    userRefCounts.delete(userId);
    cleanupUser(userId);
  } else {
    userRefCounts.set(userId, next);
  }
}

/**
 * Minimum interval between trigger-initiated refetches (ms).
 * Prevents double-fire when Chrome sends both visibilitychange + focus
 * back-to-back (common on alt-tab).
 */
const TRIGGER_COOLDOWN_MS = 2_000;

// =============================================================================
// MAP HELPERS
// =============================================================================

/** Map RPC rows → AppNotification[] */
function mapRows(rows: NotificationRow[]): AppNotification[] {
  return rows.map((d) => ({
    id: d.id,
    notificationId: d.notification_id,
    title: d.title || 'Notification',
    message: d.message || '',
    type: (d.type as AppNotification['type']) || 'info',
    category: d.category ?? undefined,
    actionUrl: d.action_url ?? undefined,
    actionLabel: d.action_label ?? undefined,
    deliveredAt: parseDbTimestamp(d.delivered_at) ?? new Date(),
    readAt: parseDbTimestamp(d.read_at),
    dismissedAt: parseDbTimestamp(d.dismissed_at),
  }));
}

/** Map rows from a direct PostgREST query (nested notifications object) */
interface DirectQueryRow {
  id: string;
  notification_id: string;
  delivered_at: string;
  read_at: string | null;
  dismissed_at: string | null;
  notifications: {
    title: string;
    message: string;
    type: string;
    category: string | null;
    action_url: string | null;
    action_label: string | null;
  } | null;
}

function mapDirectRows(rows: DirectQueryRow[]): AppNotification[] {
  return rows.map((d) => ({
    id: d.id,
    notificationId: d.notification_id,
    title: d.notifications?.title || 'Notification',
    message: d.notifications?.message || '',
    type: (d.notifications?.type as AppNotification['type']) || 'info',
    category: d.notifications?.category ?? undefined,
    actionUrl: d.notifications?.action_url ?? undefined,
    actionLabel: d.notifications?.action_label ?? undefined,
    deliveredAt: parseDbTimestamp(d.delivered_at) ?? new Date(),
    readAt: parseDbTimestamp(d.read_at),
    dismissedAt: parseDbTimestamp(d.dismissed_at),
  }));
}

// =============================================================================
// HOOK
// =============================================================================

export function useAppNotifications(limit = 20): UseAppNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-instance refs
  const hasLoadedOnce = useRef(false);
  const mountedRef = useRef(false);

  // AbortController for the current in-flight fetch.
  // New fetches abort the previous one so that timed-out HTTP requests
  // don't pile up and exhaust the browser's connection pool (~6/origin).
  const abortRef = useRef<AbortController | null>(null);

  // Consecutive failure counter for exponential backoff on polling
  const consecutiveFailures = useRef(0);

  // Cached userId so we can key the dedup map without re-fetching session.
  // On userId change (logout / account switch), we release the old user's
  // refcount and retain the new one.
  const userIdRef = useRef<string | null>(null);

  // Per-instance trigger cooldown (not module-level — avoids one instance
  // throttling another when both react to focus/visibility events).
  const lastTriggerFetchRef = useRef(0);

  // Client components can still render on the server in Next.js; avoid
  // calling `createBrowserClient()` when `window` is not available.
  const supabase = typeof window !== 'undefined' ? createBrowserClient() : null;

  // =========================================================================
  // Helpers: attach AbortSignal to PostgREST builders (if method exists)
  // =========================================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attachSignal = (builder: any, signal: AbortSignal) => {
    if (builder && typeof builder.abortSignal === 'function') {
      builder.abortSignal(signal);
    }
    return builder;
  };

  // Create a child AbortController that auto-aborts when parent aborts.
  const childAbort = (parent: AbortController): AbortController => {
    const child = new AbortController();
    if (parent.signal.aborted) {
      child.abort();
    } else {
      parent.signal.addEventListener('abort', () => child.abort(), { once: true });
    }
    return child;
  };

  // =========================================================================
  // Core fetch — the actual RPC + direct-query logic.
  // Called by fetchNotifications (which handles dedup) and always gets
  // a fresh AbortController + the limit to use.
  // =========================================================================
  const executeFetch = useCallback(async (
    ac: AbortController,
    fetchLimit: number,
    userId: string,
  ): Promise<AppNotification[] | null> => {
    if (!supabase) return null;

    let mapped: AppNotification[] | null = null;

    // --- Strategy 1: RPC (fast, SECURITY DEFINER — bypasses RLS) ---
    // Skip if RPC is in cooldown for this user (recent timeouts).
    const rpcOk = isRpcAvailable(userId);

    if (rpcOk && !ac.signal.aborted) {
      const rpcAc = childAbort(ac);

      try {
        const rpc = (supabase.rpc as AnyRpc)(
          'get_user_notifications',
          { p_limit: fetchLimit }
        );
        attachSignal(rpc, rpcAc.signal);

        const { data, error: fetchError } = await withTimeout(
          rpc as Promise<{ data: NotificationRow[] | null; error: Error | null }>,
          FETCH_TIMEOUT_MS,
          'rpc:get_user_notifications',
          { signal: ac.signal }
        );

        if (ac.signal.aborted) return null;

        if (fetchError) {
          // RPC returned an error (not a timeout) — don't cooldown, just fallback
          console.warn('[useAppNotifications] RPC error, trying direct query:', fetchError.message);
        } else {
          recordRpcSuccess(userId);
          mapped = mapRows(data || []);
        }
      } catch (rpcErr) {
        // Abort the RPC HTTP request to free the connection
        rpcAc.abort();

        if (ac.signal.aborted) return null;

        // Distinguish timeout from other errors for cooldown
        if (rpcErr instanceof TimeoutError) {
          recordRpcTimeout(userId);
        }
        // Auth/permission errors → no cooldown (logic error, not capacity)

        console.warn(
          '[useAppNotifications] RPC failed/timed-out, trying direct query:',
          rpcErr instanceof Error ? rpcErr.message : rpcErr
        );
      }
    }

    // --- Strategy 2: Direct PostgREST query (goes through RLS) ---
    if (!mapped && !ac.signal.aborted) {
      const directAc = childAbort(ac);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query = (supabase as any)
          .from('notification_deliveries')
          .select(
            `id, notification_id, delivered_at, read_at, dismissed_at,
             notifications!inner ( title, message, type, category, action_url, action_label )`
          )
          .is('dismissed_at', null)
          .order('delivered_at', { ascending: false })
          .limit(fetchLimit);
        attachSignal(query, directAc.signal);

        const { data: directData, error: directError } = await withTimeout(
          query as Promise<{ data: DirectQueryRow[] | null; error: Error | null }>,
          FETCH_TIMEOUT_MS,
          'direct:notification_deliveries',
          { signal: ac.signal }
        );

        if (ac.signal.aborted) return null;

        if (directError) {
          throw new Error(directError.message);
        }

        mapped = mapDirectRows(directData || []);
      } catch (directErr) {
        directAc.abort(); // Free the HTTP connection

        if (ac.signal.aborted) return null;
        console.warn(
          '[useAppNotifications] Direct query also failed:',
          directErr instanceof Error ? directErr.message : directErr
        );
      }
    }

    return mapped;
  }, [supabase]);

  // =========================================================================
  // Fetch — single-flight dedup with superset-aware reuse.
  //
  // Dedup key: userId. If an in-flight entry exists with limit >= ours,
  // we reuse it and slice. If our limit is larger, we abort the old entry
  // and start a fresh fetch with our limit (the old reusers get our result
  // through the promise chain).
  // =========================================================================
  const fetchNotifications = useCallback(async () => {
    if (!supabase) return;

    // ---- Circuit breaker: stop trying after too many consecutive failures ----
    if (consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(
          '[useAppNotifications] Circuit breaker open — skipping fetch after',
          consecutiveFailures.current,
          'consecutive failures'
        );
      }
      return;
    }

    // ---- Session pre-check (reads localStorage, no network call) ----
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[useAppNotifications] No active session — skipping fetch');
        }
        return;
      }
      const newUserId = session.user.id;
      // If userId changed (account switch), release old user + retain new
      if (userIdRef.current && userIdRef.current !== newUserId) {
        releaseUser(userIdRef.current);
        retainUser(newUserId);
      } else if (!userIdRef.current) {
        // First time seeing this user — retain
        retainUser(newUserId);
      }
      userIdRef.current = newUserId;
    } catch {
      return;
    }

    const userId = userIdRef.current!;

    // ---- Single-flight dedup (superset-aware) ----
    const existing = inFlightRequests.get(userId);
    if (existing) {
      const isStale = Date.now() - existing.startedAt > MAX_INFLIGHT_AGE_MS;
      const isAborted = existing.abortController.signal.aborted;

      if (!isStale && !isAborted && existing.limit >= limit) {
        // Reuse: existing fetch has enough data for us
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[useAppNotifications] Reusing in-flight (limit=${existing.limit} >= ${limit})`);
        }
        try {
          const result = await existing.promise;
          if (!mountedRef.current) return;
          const sliced = existing.limit > limit ? result.slice(0, limit) : result;
          consecutiveFailures.current = 0;
          setNotifications(sliced);
          setUnreadCount(sliced.filter((n) => !n.readAt).length);
          setError(null);
          hasLoadedOnce.current = true;
          return;
        } catch {
          // Existing fetch failed — fall through to start our own
          if (!mountedRef.current) return;
        } finally {
          // Only clear loading if we actually set it (SWR: first load only)
          if (mountedRef.current && !hasLoadedOnce.current) {
            setIsLoading(false);
          }
        }
      } else if (!isStale && !isAborted) {
        // Existing has smaller limit — abort it and take over.
        // The old entry's reusers will get our (larger) result via the
        // promise chain since we replace the Map entry.
        existing.abortController.abort();
        inFlightRequests.delete(userId);
      } else {
        // Stale or aborted — clean up
        inFlightRequests.delete(userId);
      }
    }

    // ---- Start our own fetch ----
    // Cancel any previous per-instance in-flight request
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    // Master timeout: abort the entire fetch cycle (RPC + fallback combined)
    // after the computed timeout. This prevents the 40s worst-case where RPC
    // times out and direct query gets another full timeout independently.
    // Dynamic: bell (limit ≤ 20) gets 12s, page (limit > 20) gets 20s.
    const masterTimeoutMs = limit > 20 ? FETCH_TIMEOUT_MS : 12_000;
    const masterTimer = setTimeout(() => {
      if (!ac.signal.aborted) {
        ac.abort();
      }
    }, masterTimeoutMs);

    // Stale-while-revalidate: only show loading spinner on first load.
    // After that, keep showing stale data while fetching fresh data.
    if (!hasLoadedOnce.current) {
      setIsLoading(true);
    }
    setError(null);

    // Create the deduped promise
    const fetchPromise = executeFetch(ac, limit, userId).then((mapped) => {
      if (mapped) return mapped;
      throw new Error('All strategies failed');
    });

    // Self-cleaning wrapper
    const selfCleaningPromise = fetchPromise.finally(() => {
      clearTimeout(masterTimer);
      const entry = inFlightRequests.get(userId);
      if (entry?.promise === selfCleaningPromise) {
        inFlightRequests.delete(userId);
      }
      if (process.env.NODE_ENV === 'development') {
        console.info('[useAppNotifications] inFlight size', inFlightRequests.size);
      }
    });

    inFlightRequests.set(userId, {
      limit,
      promise: selfCleaningPromise,
      abortController: ac,
      startedAt: Date.now(),
    });

    try {
      const result = await selfCleaningPromise;

      if (!mountedRef.current || ac.signal.aborted) return;

      consecutiveFailures.current = 0;
      setNotifications(result);
      setUnreadCount(result.filter((n) => !n.readAt).length);
      hasLoadedOnce.current = true;
    } catch {
      if (!mountedRef.current || ac.signal.aborted) return;

      consecutiveFailures.current += 1;
      if (!hasLoadedOnce.current) {
        setNotifications([]);
        setUnreadCount(0);
        setError('Kunde inte hämta notifikationer');
      }
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
      }
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [supabase, limit, executeFetch]);

  // =========================================================================
  // Lifecycle: mount/unmount tracking + abort cleanup + user refcount
  // =========================================================================
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel any in-flight HTTP requests on unmount
      abortRef.current?.abort();
      // Release refcount — only cleans up module-level Maps when the
      // LAST instance for this user unmounts.
      if (userIdRef.current) {
        releaseUser(userIdRef.current);
      }
    };
  }, []);

  // =========================================================================
  // Initial fetch
  // =========================================================================
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Ref so the visibility handler can restart polling after circuit breaker
  const restartPollingRef = useRef<(() => void) | null>(null);

  // =========================================================================
  // Refetch on visibility change (tab becomes visible) and window focus.
  // Replaces per-pathname refetch — notifications are ambient data and
  // don't need to refetch on every sub-page navigation.
  // Also resets backoff + circuit breaker since the user is actively looking.
  // =========================================================================
  useEffect(() => {
    // Per-instance trigger with cooldown — prevents double-fire when Chrome
    // sends both visibilitychange + focus back-to-back on alt-tab.
    const triggerFetch = () => {
      const now = Date.now();
      if (now - lastTriggerFetchRef.current < TRIGGER_COOLDOWN_MS) return;
      lastTriggerFetchRef.current = now;

      const wasCircuitOpen = consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES;
      consecutiveFailures.current = 0;
      setError(null);
      fetchNotifications();
      if (wasCircuitOpen && restartPollingRef.current) {
        restartPollingRef.current();
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        triggerFetch();
      }
    };

    const onFocus = () => {
      // Only refetch on focus if the tab is already visible (avoids
      // double-fetch when switching tabs, since visibilitychange fires first).
      // The TRIGGER_COOLDOWN_MS guard prevents the double-fire scenario.
      if (document.visibilityState === 'visible') {
        triggerFetch();
      }
    };

    const onOnline = () => {
      // Coming back online — reset failures and fetch immediately
      consecutiveFailures.current = 0;
      setError(null);
      lastTriggerFetchRef.current = Date.now();
      fetchNotifications();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [fetchNotifications]);

  // =========================================================================
  // Realtime subscription — instant bell updates when deliveries change.
  // Debounced: multiple rapid changes (e.g. bulk delivery) collapse into
  // one fetch after 300ms of quiet.
  // =========================================================================
  useEffect(() => {
    if (!supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id || !mountedRef.current) return;

      channel = supabase
        .channel(`notif_deliveries_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notification_deliveries',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Debounce: collapse rapid-fire changes into one fetch
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
              fetchNotifications();
            }, REALTIME_DEBOUNCE_MS);
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, fetchNotifications]);

  // =========================================================================
  // Fallback polling — keeps bell correct even if realtime misses.
  // Gated by visibility + online status.
  // Uses exponential backoff on consecutive failures.
  // =========================================================================
  useEffect(() => {
    if (!supabase) return;

    let timerId: ReturnType<typeof setTimeout> | null = null;

    const schedulePoll = () => {
      // Clear any existing timer to prevent duplicate poll loops
      // (can happen when visibility handler restarts polling via restartPollingRef)
      if (timerId) clearTimeout(timerId);

      // Exponential backoff: double interval for each failure past threshold
      const failCount = consecutiveFailures.current;
      const delay =
        failCount < BACKOFF_THRESHOLD
          ? POLL_INTERVAL_MS
          : Math.min(
              POLL_INTERVAL_MS * Math.pow(2, failCount - BACKOFF_THRESHOLD),
              MAX_BACKOFF_MS
            );

      timerId = setTimeout(async () => {
        // Skip fetch when tab is hidden or offline
        if (document.visibilityState === 'visible' && navigator.onLine) {
          await fetchNotifications();
        }
        // Circuit breaker: stop polling entirely if too many failures
        if (consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              '[useAppNotifications] Polling stopped — circuit breaker open after',
              consecutiveFailures.current,
              'consecutive failures. Will retry on next tab focus.'
            );
          }
          setError('Notifikationer kunde inte laddas. Prova att ladda om sidan.');
          return; // Don't schedule another poll
        }
        // Schedule next poll (recursive setTimeout instead of setInterval
        // ensures we wait for the current fetch to complete before starting
        // the next timer, preventing pile-up on slow connections)
        if (mountedRef.current) {
          schedulePoll();
        }
      }, delay);
    };

    schedulePoll();

    // Expose restart function so the visibility handler can resume polling
    // after a circuit breaker reset.
    restartPollingRef.current = schedulePoll;

    return () => {
      if (timerId) clearTimeout(timerId);
      restartPollingRef.current = null;
    };
  }, [supabase, fetchNotifications]);

  // =========================================================================
  // Actions — optimistic-first: update UI instantly, fire RPC in background.
  // On RPC failure we refetch to reconcile instead of leaving stale state.
  // =========================================================================

  const markAsRead = useCallback(
    async (deliveryId: string) => {
      if (!supabase) return;

      // Optimistic update — instant UI
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === deliveryId ? { ...n, readAt: new Date() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Fire RPC in background
      try {
        const { error: rpcError } = await withTimeout(
          (supabase.rpc as AnyRpc)(
            'mark_notification_read',
            { p_delivery_id: deliveryId }
          ) as Promise<{ error: Error | null }>,
          ACTION_TIMEOUT_MS,
          'rpc:mark_notification_read'
        );
        if (rpcError) {
          console.error('[useAppNotifications] Mark read error:', rpcError);
          fetchNotifications(); // reconcile
        }
      } catch (err) {
        console.warn('[useAppNotifications] Mark read timed out, reconciling:', err);
        fetchNotifications();
      }
    },
    [supabase, fetchNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    if (!supabase) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt || new Date() }))
    );
    setUnreadCount(0);

    try {
      const { error: rpcError } = await withTimeout(
        (supabase.rpc as AnyRpc)(
          'mark_all_notifications_read'
        ) as Promise<{ error: Error | null }>,
        ACTION_TIMEOUT_MS,
        'rpc:mark_all_notifications_read'
      );
      if (rpcError) {
        console.error('[useAppNotifications] Mark all read error:', rpcError);
        fetchNotifications();
      }
    } catch (err) {
      console.warn('[useAppNotifications] Mark all read timed out, reconciling:', err);
      fetchNotifications();
    }
  }, [supabase, fetchNotifications]);

  const dismiss = useCallback(
    async (deliveryId: string) => {
      if (!supabase) return;

      // Optimistic update — remove from list instantly
      let removedNotification: AppNotification | undefined;
      setNotifications((prev) => {
        removedNotification = prev.find((n) => n.id === deliveryId);
        if (removedNotification && !removedNotification.readAt) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== deliveryId);
      });

      // Fire RPC in background
      try {
        const { error: rpcError } = await withTimeout(
          (supabase.rpc as AnyRpc)(
            'dismiss_notification',
            { p_delivery_id: deliveryId }
          ) as Promise<{ error: Error | null }>,
          ACTION_TIMEOUT_MS,
          'rpc:dismiss_notification'
        );
        if (rpcError) {
          console.error('[useAppNotifications] Dismiss error:', rpcError);
          fetchNotifications(); // reconcile — will restore if dismiss didn't persist
        }
      } catch (err) {
        console.warn('[useAppNotifications] Dismiss timed out, reconciling:', err);
        fetchNotifications();
      }
    },
    [supabase, fetchNotifications]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    refresh: fetchNotifications,
  };
}
