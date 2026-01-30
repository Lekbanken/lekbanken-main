'use client'

import { useMemo } from 'react'
import { useAppNotifications } from '@/hooks/useAppNotifications'
import type { AdminNotification } from './AdminNotificationsCenter'

/**
 * Hook to fetch and manage real notifications from the database.
 * Replaces the demo notifications in AdminTopbarV2.
 */
export function useRealAdminNotifications() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markDeliveryAsRead,
    markAllAsRead,
    dismiss,
    refresh,
  } = useAppNotifications(20)

  const mapped = useMemo<AdminNotification[]>(
    () =>
      notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message ?? '',
        type: n.type,
        timestamp: n.deliveredAt,
        read: Boolean(n.readAt),
        actionUrl: n.actionUrl,
        actionLabel: n.actionLabel,
      })),
    [notifications]
  )

  return {
    notifications: mapped,
    unreadCount,
    isLoading,
    isPending: false,
    markAsRead: markDeliveryAsRead,
    markAllAsRead,
    dismiss,
    refresh,
  }
}
