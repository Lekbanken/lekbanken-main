'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button, Card, CardContent } from '@/components/ui'
import {
  BellIcon,
  CheckCircleIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  TicketIcon,
  TrophyIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useAppNotifications, type AppNotification } from '@/hooks/useAppNotifications'

function getTypeIcon(type: AppNotification['type'], category: string | null) {
  if (category === 'support') return <TicketIcon className="h-5 w-5" />

  switch (type) {
    case 'success':
      return <TrophyIcon className="h-5 w-5" />
    case 'warning':
    case 'error':
      return <ExclamationTriangleIcon className="h-5 w-5" />
    case 'info':
    default:
      return <BellIcon className="h-5 w-5" />
  }
}

function getTypeColor(type: AppNotification['type'], category: string | null) {
  if (category === 'support') return 'bg-blue-100 text-blue-600'

  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-600'
    case 'warning':
      return 'bg-yellow-100 text-yellow-600'
    case 'error':
      return 'bg-red-100 text-red-600'
    case 'info':
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function NotificationsPage() {
  const t = useTranslations('app.notifications')
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    refresh,
  } = useAppNotifications(100)

  const formatTimeAgo = useCallback(
    (date: Date) => {
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 60) return t('timeAgo.minutes', { minutes: diffMins })
      if (diffHours < 24) return t('timeAgo.hours', { hours: diffHours })
      if (diffDays === 1) return t('timeAgo.yesterday')
      return t('timeAgo.days', { days: diffDays })
    },
    [t]
  )

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.readAt
    if (filter === 'read') return Boolean(n.readAt)
    return true
  })

  const handleView = (notification: AppNotification) => {
    if (!notification.readAt) void markAsRead(notification.id)
    if (notification.actionUrl) router.push(notification.actionUrl)
  }

  if (isLoading) {
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
            <Button onClick={() => void refresh()}>{t('error.retry')}</Button>
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
          <Button variant="outline" size="sm" onClick={() => void markAllAsRead()}>
            <CheckCircleIcon className="h-4 w-4 mr-1" />
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
              {filter === 'unread' ? t('empty.messageUnread') : t('empty.message')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${
                !notification.readAt ? 'border-primary/30 bg-primary/5' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4 group">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${getTypeColor(
                      notification.type,
                      notification.category ?? null
                    )}`}
                  >
                    {getTypeIcon(notification.type, notification.category ?? null)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{notification.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      </div>
                      {!notification.readAt && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(notification.deliveredAt)}
                      </span>

                      <div className="flex items-center gap-2">
                        {notification.actionUrl && (
                          <Button variant="ghost" size="sm" onClick={() => handleView(notification)}>
                            {notification.actionLabel || t('actions.view')}
                          </Button>
                        )}

                        {!notification.readAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void markAsRead(notification.id)}
                            title={t('actions.markAsRead')}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void dismiss(notification.id)}
                          title={t('actions.delete')}
                        >
                          <XMarkIcon className="h-4 w-4" />
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
