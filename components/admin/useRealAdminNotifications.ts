'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotification,
} from '@/app/actions/notifications-user'
import type { AdminNotification } from './AdminNotificationsCenter'

// Map notification category to AdminNotification type
function mapCategoryToType(category?: string): 'info' | 'warning' | 'error' | 'success' {
  switch (category) {
    case 'alert':
    case 'system_alert':
      return 'warning'
    case 'error':
      return 'error'
    case 'success':
    case 'achievement':
      return 'success'
    default:
      return 'info'
  }
}

/**
 * Hook to fetch and manage real notifications from the database.
 * Replaces the demo notifications in AdminTopbarV2.
 */
export function useRealAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Fetch notifications on mount
  const fetchNotifications = useCallback(async () => {
    try {
      const [notifResult, countResult] = await Promise.all([
        getUserNotifications({ limit: 20 }),
        getUnreadNotificationCount(),
      ])

      if (notifResult.success && notifResult.data) {
        const mapped: AdminNotification[] = notifResult.data.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message ?? '',
          type: mapCategoryToType(n.category ?? undefined),
          timestamp: new Date(n.created_at),
          read: n.is_read,
          actionUrl: n.action_url ?? undefined,
          actionLabel: n.action_label ?? undefined,
        }))
        setNotifications(mapped)
      }

      if (countResult.success) {
        setUnreadCount(countResult.count ?? 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = useCallback((notificationId: string) => {
    startTransition(async () => {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      const result = await markNotificationAsRead(notificationId)
      if (!result.success) {
        // Revert on failure
        fetchNotifications()
      }
    })
  }, [fetchNotifications])

  const markAllAsRead = useCallback(() => {
    startTransition(async () => {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)

      const result = await markAllNotificationsAsRead()
      if (!result.success) {
        // Revert on failure
        fetchNotifications()
      }
    })
  }, [fetchNotifications])

  const dismiss = useCallback((notificationId: string) => {
    startTransition(async () => {
      // Optimistic update - remove from local state immediately
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      
      // Try to delete from database (works for personal notifications)
      // For broadcast notifications, this will fail silently (RLS won't allow delete)
      // but the notification is already removed from local state
      const result = await deleteNotification(notificationId)
      if (!result.success) {
        // For broadcast notifications, mark as read instead
        await markNotificationAsRead(notificationId)
      }
    })
  }, [])

  return {
    notifications,
    unreadCount,
    isLoading,
    isPending,
    markAsRead,
    markAllAsRead,
    dismiss,
    refresh: fetchNotifications,
  }
}
