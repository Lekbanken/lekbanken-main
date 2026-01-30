'use client';

/**
 * useAppNotifications Hook
 *
 * Fetches and manages notifications for the current user.
 * Reads from notification_deliveries table via RLS.
 *
 * @example
 * ```tsx
 * const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useAppNotifications();
 * ```
 */

import { useState, useEffect, useCallback, useTransition } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

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

export function useAppNotifications(limit = 20): UseAppNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Client components can still render on the server in Next.js; avoid
  // calling `createBrowserClient()` when `window` is not available.
  const supabase = typeof window !== 'undefined' ? createBrowserClient() : null;

  // Fetch notifications via RPC
  const fetchNotifications = useCallback(async () => {
    if (!supabase) return;
    try {
      setError(null);

      // Use RPC function for clean typed result
      // Note: RPC cast needed until types are regenerated after migration
      const { data, error: fetchError } = await (supabase.rpc as AnyRpc)(
        'get_user_notifications',
        { p_limit: limit }
      ) as { data: NotificationRow[] | null; error: Error | null };

      if (fetchError) {
        console.error('[useAppNotifications] Fetch error:', fetchError);
        setError(fetchError.message);
        return;
      }

      // Map to AppNotification format
      const mapped: AppNotification[] = (data || []).map((d) => ({
        id: d.id,
        notificationId: d.notification_id,
        title: d.title || 'Notification',
        message: d.message || '',
        type: (d.type as AppNotification['type']) || 'info',
        category: d.category ?? undefined,
        actionUrl: d.action_url ?? undefined,
        actionLabel: d.action_label ?? undefined,
        deliveredAt: new Date(d.delivered_at),
        readAt: d.read_at ? new Date(d.read_at) : null,
        dismissedAt: d.dismissed_at ? new Date(d.dismissed_at) : null,
      }));

      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.readAt).length);
    } catch (err) {
      console.error('[useAppNotifications] Error:', err);
      setError('Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, limit]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark as read
  const markAsRead = useCallback(
    async (deliveryId: string) => {
      if (!supabase) return;
      startTransition(async () => {
        const { error: rpcError } = await (supabase.rpc as AnyRpc)(
          'mark_notification_read',
          { p_delivery_id: deliveryId }
        );

        if (rpcError) {
          console.error('[useAppNotifications] Mark read error:', rpcError);
          return;
        }

        // Optimistic update
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === deliveryId ? { ...n, readAt: new Date() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      });
    },
    [supabase]
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!supabase) return;
    startTransition(async () => {
      const { error: rpcError } = await (supabase.rpc as AnyRpc)(
        'mark_all_notifications_read'
      );

      if (rpcError) {
        console.error('[useAppNotifications] Mark all read error:', rpcError);
        return;
      }

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date() }))
      );
      setUnreadCount(0);
    });
  }, [supabase]);

  // Dismiss
  const dismiss = useCallback(
    async (deliveryId: string) => {
      if (!supabase) return;
      startTransition(async () => {
        const { error: rpcError } = await (supabase.rpc as AnyRpc)(
          'dismiss_notification',
          { p_delivery_id: deliveryId }
        );

        if (rpcError) {
          console.error('[useAppNotifications] Dismiss error:', rpcError);
          return;
        }

        // Remove from list
        setNotifications((prev) => prev.filter((n) => n.id !== deliveryId));
        // Update unread count if it was unread
        const notification = notifications.find((n) => n.id === deliveryId);
        if (notification && !notification.readAt) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      });
    },
    [supabase, notifications]
  );

  return {
    notifications,
    unreadCount,
    isLoading: isLoading || isPending,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    refresh: fetchNotifications,
  };
}
