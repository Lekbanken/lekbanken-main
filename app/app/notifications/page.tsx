'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button, Card, CardContent } from '@/components/ui'
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  TrophyIcon,
  GiftIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  StarIcon,
  MegaphoneIcon,
  CheckCircleIcon,
  TicketIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  type UserNotification,
} from '@/app/actions/notifications-user'

function getTypeIcon(type: string, category: string | null) {
  // Support-related notifications
  if (category === 'support') {
    return <TicketIcon className="h-5 w-5" />
  }
  
  switch (type) {
    case 'achievement':
    case 'success':
      return <TrophyIcon className="h-5 w-5" />
    case 'event':
      return <CalendarDaysIcon className="h-5 w-5" />
    case 'social':
      return <UserGroupIcon className="h-5 w-5" />
    case 'reward':
      return <GiftIcon className="h-5 w-5" />
    case 'system':
      return <StarIcon className="h-5 w-5" />
    case 'announcement':
      return <MegaphoneIcon className="h-5 w-5" />
    case 'warning':
    case 'error':
      return <ExclamationTriangleIcon className="h-5 w-5" />
    default:
      return <BellIcon className="h-5 w-5" />
  }
}

function getTypeColor(type: string, category: string | null) {
  if (category === 'support') {
    return 'bg-blue-100 text-blue-600'
  }
  
  switch (type) {
    case 'achievement':
    case 'success':
      return 'bg-green-100 text-green-600'
    case 'event':
      return 'bg-purple-100 text-purple-600'
    case 'social':
      return 'bg-blue-100 text-blue-600'
    case 'reward':
      return 'bg-yellow-100 text-yellow-600'
    case 'system':
      return 'bg-muted text-muted-foreground'
    case 'announcement':
      return 'bg-primary/10 text-primary'
    case 'warning':
      return 'bg-yellow-100 text-yellow-600'
    case 'error':
      return 'bg-red-100 text-red-600'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const t = useTranslations('app.notifications')

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return t('timeAgo.minutes', { minutes: diffMins })
    if (diffHours < 24) return t('timeAgo.hours', { hours: diffHours })
    if (diffDays === 1) return t('timeAgo.yesterday')
    return t('timeAgo.days', { days: diffDays })
  }, [t])

  // Manual reload function for use after CRUD operations  
  async function loadNotifications() {
    setLoading(true)
    setError(null)
    
    const result = await getUserNotifications({ limit: 100 })
    
    if (result.success && result.data) {
      setNotifications(result.data)
    } else {
      setError(result.error || t('error.load'))
    }
    
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      
      const result = await getUserNotifications({ limit: 100 })
      
      if (result.success && result.data) {
        setNotifications(result.data)
      } else {
        setError(result.error || t('error.load'))
      }
      
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'read') return n.is_read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  async function handleMarkAsRead(id: string) {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    )
    
    const result = await markNotificationAsRead(id)
    if (!result.success) {
      // Revert on error
      loadNotifications()
    }
  }

  async function handleMarkAllAsRead() {
    setIsMarkingAll(true)
    
    const result = await markAllNotificationsAsRead()
    
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
    }
    
    setIsMarkingAll(false)
  }

  async function handleDelete(id: string) {
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    
    const result = await deleteNotification(id)
    if (!result.success) {
      // Revert on error
      loadNotifications()
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <Card className="border-red-500/30">
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadNotifications}>{t('error.retry')}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? t('unreadCount', { count: unreadCount }) : t('allRead')}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
          >
            {isMarkingAll ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 mr-1" />
            )}
            {t('markAllAsRead')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          {t('filters.all')}
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          {t('filters.unread', { count: unreadCount })}
        </Button>
        <Button
          variant={filter === 'read' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('read')}
        >
          {t('filters.read')}
        </Button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <BellIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {filter === 'unread' ? t('empty.titleUnread') : t('empty.title')}
            </h3>
            <p className="text-muted-foreground text-sm">
              {filter === 'unread'
                ? t('empty.messageUnread')
                : t('empty.message')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${
                !notification.is_read ? 'border-primary/30 bg-primary/5' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${getTypeColor(
                      notification.type,
                      notification.category
                    )}`}
                  >
                    {getTypeIcon(notification.type, notification.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{notification.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      </div>
                      {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        {notification.action_url && (
                          <Link href={notification.action_url}>
                            <Button variant="ghost" size="sm">
                              {notification.action_label || t('actions.view')}
                            </Button>
                          </Link>
                        )}
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            title={t('actions.markAsRead')}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notification.id)}
                          title={t('actions.delete')}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
