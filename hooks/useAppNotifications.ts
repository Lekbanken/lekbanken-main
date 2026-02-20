'use client';

/**
 * useAppNotifications Hook
 *
 * Fetches and manages notifications for the current user.
 * Reads from notification_deliveries table via RPC.
 *
 * Features:
 * - Supabase Realtime subscription for instant updates
 * - 30 s fallback polling
 * - Per-instance state (safe when multiple components use the hook)
 *
 * @example
 * ```tsx
 * const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useAppNotifications();
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/withTimeout';
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
// HOOK
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
 * Timeout for the main notifications fetch.
 *
 * This is a SAFETY NET above the per-endpoint timeouts in fetch-with-timeout.
 * The Supabase client may resolve the auth session (including Web Lock
 * acquisition + JWT refresh at ~5 s) BEFORE making the actual HTTP request
 * (REST timeout ~8 s). The outer timeout must exceed auth + fetch combined
 * so that it never fires before the real timeout.
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

export function useAppNotifications(limit = 20): UseAppNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-instance refs — no shared module-level state
  const hasLoadedOnce = useRef(false);
  const mountedRef = useRef(true);

  // AbortController for the current in-flight fetch.
  // New fetches abort the previous one so that timed-out HTTP requests
  // don't pile up and exhaust the browser's connection pool (~6/origin).
  const abortRef = useRef<AbortController | null>(null);

  // Consecutive failure counter for exponential backoff on polling
  const consecutiveFailures = useRef(0);

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
  // Fetch — cancels previous in-flight request, uses AbortController to
  // properly terminate stale HTTP connections.
  // Two strategies: RPC first, direct PostgREST query as fallback.
  // Each strategy gets its own child AbortController so that a timed-out
  // strategy can be cancelled without aborting the fallback attempt.
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
    // If there's no session, the Supabase client will try to refresh the token
    // (acquiring a Web Lock → hitting /auth/v1/token), which can block for
    // seconds before the actual REST call even starts.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[useAppNotifications] No active session — skipping fetch');
        }
        return;
      }
    } catch {
      // getSession failed — skip this cycle
      return;
    }

    // Cancel any previous in-flight request (frees browser connections)
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setError(null);

      let mapped: AppNotification[] | null = null;

      // --- Strategy 1: RPC (fast, SECURITY DEFINER — bypasses RLS) ---
      if (!ac.signal.aborted) {
        const rpcAc = childAbort(ac);

        try {
          const rpc = (supabase.rpc as AnyRpc)(
            'get_user_notifications',
            { p_limit: limit }
          );
          attachSignal(rpc, rpcAc.signal);

          const { data, error: fetchError } = await withTimeout(
            rpc as Promise<{ data: NotificationRow[] | null; error: Error | null }>,
            FETCH_TIMEOUT_MS,
            'rpc:get_user_notifications'
          );

          if (ac.signal.aborted || !mountedRef.current) return;

          if (fetchError) {
            console.warn('[useAppNotifications] RPC error, trying direct query:', fetchError.message);
          } else {
            mapped = mapRows(data || []);
          }
        } catch (rpcErr) {
          // Abort the RPC HTTP request to free the connection
          rpcAc.abort();

          if (ac.signal.aborted || !mountedRef.current) return;
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
            .limit(limit);
          attachSignal(query, directAc.signal);

          const { data: directData, error: directError } = await withTimeout(
            query as Promise<{ data: DirectQueryRow[] | null; error: Error | null }>,
            FETCH_TIMEOUT_MS,
            'direct:notification_deliveries'
          );

          if (ac.signal.aborted || !mountedRef.current) return;

          if (directError) {
            throw new Error(directError.message);
          }

          mapped = mapDirectRows(directData || []);
        } catch (directErr) {
          directAc.abort(); // Free the HTTP connection

          if (ac.signal.aborted || !mountedRef.current) return;
          console.warn(
            '[useAppNotifications] Direct query also failed:',
            directErr instanceof Error ? directErr.message : directErr
          );
        }
      }

      // --- Apply result ---
      if (!ac.signal.aborted && mountedRef.current) {
        if (mapped) {
          consecutiveFailures.current = 0; // Reset backoff on success
          setNotifications(mapped);
          setUnreadCount(mapped.filter((n) => !n.readAt).length);
          hasLoadedOnce.current = true;
        } else {
          consecutiveFailures.current += 1;
          if (!hasLoadedOnce.current) {
            setNotifications([]);
            setUnreadCount(0);
            setError('Kunde inte hämta notifikationer');
          }
        }
      }
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
      }
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [supabase, limit]);

  // =========================================================================
  // Lifecycle: mount/unmount tracking + abort cleanup
  // =========================================================================
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel any in-flight HTTP requests on unmount
      abortRef.current?.abort();
    };
  }, []);

  // =========================================================================
  // Initial fetch
  // =========================================================================
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // =========================================================================
  // Refetch on client-side navigation (admin → app, etc.)
  // Next.js client navigation keeps the singleton Supabase client alive but
  // a new layout tree mounts. Pathname change = reliable navigation signal.
  // =========================================================================
  const pathname = usePathname();
  useEffect(() => {
    // Skip the very first render (covered by initial fetch above)
    if (!hasLoadedOnce.current) return;
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Ref so the visibility handler can restart polling after circuit breaker
  const restartPollingRef = useRef<(() => void) | null>(null);

  // =========================================================================
  // Refetch when tab becomes visible (user switches back to this tab)
  // Also resets backoff + circuit breaker since the user is actively looking.
  // =========================================================================
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const wasCircuitOpen = consecutiveFailures.current >= MAX_CONSECUTIVE_FAILURES;
        consecutiveFailures.current = 0; // Reset backoff + circuit breaker
        setError(null);
        fetchNotifications();
        // If polling had stopped (circuit breaker), restart it
        if (wasCircuitOpen && restartPollingRef.current) {
          restartPollingRef.current();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchNotifications]);

  // =========================================================================
  // Realtime subscription — instant bell updates when deliveries change
  // =========================================================================
  useEffect(() => {
    if (!supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id || !mountedRef.current) return;

      channel = supabase
        .channel(`notif_deliveries_${user.id}_${limit}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notification_deliveries',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, fetchNotifications, limit]);

  // =========================================================================
  // Fallback polling — keeps bell correct even if realtime misses.
  // Visibility-gated: skips fetch when tab is hidden to avoid wasting
  // connections. Uses exponential backoff on consecutive failures.
  // =========================================================================
  useEffect(() => {
    if (!supabase) return;

    let timerId: ReturnType<typeof setTimeout> | null = null;

    const schedulePoll = () => {
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
        // Skip fetch when tab is hidden — visibility handler will catch up
        if (document.visibilityState === 'visible') {
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
