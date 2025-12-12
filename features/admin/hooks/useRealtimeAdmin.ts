'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName =
  | 'users'
  | 'organizations'
  | 'products'
  | 'games'
  | 'achievements'
  | 'tenant_admin_users'
  | 'sessions'
  | 'participants';

interface RealtimeEvent<T> {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  old: T | null;
  new: T | null;
}

interface UseRealtimeTableOptions<T> {
  /** Table name to subscribe to */
  table: TableName;
  /** Schema (defaults to 'public') */
  schema?: string;
  /** Filter for specific rows (e.g., 'organization_id=eq.123') */
  filter?: string;
  /** Callback when data changes */
  onEvent?: (event: RealtimeEvent<T>) => void;
  /** Callback specifically for inserts */
  onInsert?: (record: T) => void;
  /** Callback specifically for updates */
  onUpdate?: (oldRecord: T, newRecord: T) => void;
  /** Callback specifically for deletes */
  onDelete?: (record: T) => void;
  /** Whether the subscription is enabled */
  enabled?: boolean;
}

/**
 * Hook to subscribe to real-time changes on a Supabase table.
 * 
 * @example
 * // Subscribe to all user changes
 * useRealtimeTable<User>({
 *   table: 'users',
 *   onInsert: (user) => toast.success(`Ny användare: ${user.email}`),
 *   onUpdate: (old, new) => refetch(),
 *   onDelete: (user) => toast.info(`Användare borttagen: ${user.email}`),
 * });
 * 
 * @example
 * // Subscribe to changes for a specific organization
 * useRealtimeTable<Product>({
 *   table: 'products',
 *   filter: `organization_id=eq.${orgId}`,
 *   onEvent: (event) => refetchProducts(),
 * });
 */
export function useRealtimeTable<T extends Record<string, unknown>>({
  table,
  schema = 'public',
  filter,
  onEvent,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeTableOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = useMemo(() => createBrowserClient(), []);

  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      const event: RealtimeEvent<T> = {
        type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
        old: (payload.old as T) || null,
        new: (payload.new as T) || null,
      };

      // Call generic event handler
      onEvent?.(event);

      // Call specific handlers
      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new && onInsert) {
            onInsert(payload.new as T);
          }
          break;
        case 'UPDATE':
          if (payload.old && payload.new && onUpdate) {
            onUpdate(payload.old as T, payload.new as T);
          }
          break;
        case 'DELETE':
          if (payload.old && onDelete) {
            onDelete(payload.old as T);
          }
          break;
      }
    },
    [onEvent, onInsert, onUpdate, onDelete]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const channelName = `admin-${table}${filter ? `-${filter}` : ''}`;
    
    // Build the subscription options
    const subscriptionFilter: {
      event: '*';
      schema: string;
      table: string;
      filter?: string;
    } = {
      event: '*',
      schema,
      table,
    };

    if (filter) {
      subscriptionFilter.filter = filter;
    }

    // Create channel and subscribe
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        subscriptionFilter,
        handleChange as (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`Realtime subscription error for ${table}`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, table, schema, filter, enabled, handleChange]);

  // Manual unsubscribe function
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, [supabase]);

  return { unsubscribe };
}

/**
 * Hook for subscribing to multiple tables at once.
 */
export function useRealtimeTables<T extends Record<string, unknown>>(
  subscriptions: UseRealtimeTableOptions<T>[]
) {
  subscriptions.forEach((sub) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRealtimeTable(sub);
  });
}

interface UseRealtimePresenceOptions {
  /** Channel name for presence */
  channel: string;
  /** Current user state to track */
  userState?: Record<string, unknown>;
  /** Callback when presence state changes */
  onSync?: (presenceState: Record<string, unknown[]>) => void;
  /** Callback when a user joins */
  onJoin?: (key: string, currentPresences: unknown[], newPresences: unknown[]) => void;
  /** Callback when a user leaves */
  onLeave?: (key: string, currentPresences: unknown[], leftPresences: unknown[]) => void;
  /** Whether the subscription is enabled */
  enabled?: boolean;
}

/**
 * Hook to track presence (who is online) in a channel.
 * Useful for showing who else is viewing an admin page.
 * 
 * @example
 * const { presenceState } = useRealtimePresence({
 *   channel: 'admin:users',
 *   userState: { id: userId, name: userName },
 *   onJoin: (key, current, new) => console.log('User joined:', key),
 * });
 */
export function useRealtimePresence({
  channel: channelName,
  userState,
  onSync,
  onJoin,
  onLeave,
  enabled = true,
}: UseRealtimePresenceOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase.channel(channelName);

    if (onSync) {
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        onSync(state);
      });
    }

    if (onJoin) {
      channel.on('presence', { event: 'join' }, ({ key, currentPresences, newPresences }: { key: string; currentPresences: unknown[]; newPresences: unknown[] }) => {
        onJoin(key, currentPresences, newPresences);
      });
    }

    if (onLeave) {
      channel.on('presence', { event: 'leave' }, ({ key, currentPresences, leftPresences }: { key: string; currentPresences: unknown[]; leftPresences: unknown[] }) => {
        onLeave(key, currentPresences, leftPresences);
      });
    }

    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED' && userState) {
        await channel.track(userState);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, channelName, userState, onSync, onJoin, onLeave, enabled]);

  return { channelRef };
}
