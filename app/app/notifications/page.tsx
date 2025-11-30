'use client'

import { useState } from 'react'
import { Button, Card, CardContent, Badge } from '@/components/ui'
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
} from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'

// Types
interface Notification {
  id: string
  title: string
  message: string
  type: 'achievement' | 'event' | 'social' | 'reward' | 'system' | 'announcement'
  isRead: boolean
  createdAt: string
  actionUrl?: string
}

// Mock data
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Nytt märke låst upp! 🎉',
    message: 'Grattis! Du har låst upp märket "Första steget" genom att genomföra din första aktivitet.',
    type: 'achievement',
    isRead: false,
    createdAt: '2025-01-27T10:30:00Z',
  },
  {
    id: '2',
    title: 'Nytt event har startat',
    message: 'Vinteräventyret har börjat! Delta nu för att vinna exklusiva belöningar.',
    type: 'event',
    isRead: false,
    createdAt: '2025-01-27T09:00:00Z',
    actionUrl: '/app/events',
  },
  {
    id: '3',
    title: 'Anna har gått med i ditt team',
    message: 'Du har en ny teammedlem! Välkomna Anna till gruppen.',
    type: 'social',
    isRead: true,
    createdAt: '2025-01-26T15:45:00Z',
  },
  {
    id: '4',
    title: 'Daglig belöning klar att hämta',
    message: 'Din dagliga belöning väntar! Logga in varje dag för att få ännu bättre belöningar.',
    type: 'reward',
    isRead: true,
    createdAt: '2025-01-26T08:00:00Z',
    actionUrl: '/app/shop',
  },
  {
    id: '5',
    title: 'Systemuppdatering',
    message: 'Vi har uppdaterat plattformen med nya funktioner och förbättringar.',
    type: 'system',
    isRead: true,
    createdAt: '2025-01-25T12:00:00Z',
  },
  {
    id: '6',
    title: 'Ny utmaning tillgänglig',
    message: 'Veckans utmaning är här! Genomför 10 nya lekar för att vinna 200 XP.',
    type: 'announcement',
    isRead: false,
    createdAt: '2025-01-27T07:00:00Z',
    actionUrl: '/app/challenges',
  },
]

function getTypeIcon(type: string) {
  switch (type) {
    case 'achievement':
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
    default:
      return <BellIcon className="h-5 w-5" />
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'achievement':
      return 'bg-yellow-100 text-yellow-600'
    case 'event':
      return 'bg-purple-100 text-purple-600'
    case 'social':
      return 'bg-blue-100 text-blue-600'
    case 'reward':
      return 'bg-green-100 text-green-600'
    case 'system':
      return 'bg-muted text-muted-foreground'
    case 'announcement':
      return 'bg-primary/10 text-primary'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins} min sedan`
  if (diffHours < 24) return `${diffHours} tim sedan`
  if (diffDays === 1) return 'Igår'
  return `${diffDays} dagar sedan`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead
    if (filter === 'read') return n.isRead
    return true
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notiser</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `Du har ${unreadCount} olästa notiser`
              : 'Du är uppdaterad!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            Markera alla som lästa
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{notifications.length}</div>
            <div className="text-sm text-muted-foreground">Totalt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">{unreadCount}</div>
            <div className="text-sm text-muted-foreground">Olästa</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {notifications.length - unreadCount}
            </div>
            <div className="text-sm text-muted-foreground">Lästa</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Alla
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          <BellSolidIcon className="h-4 w-4 mr-1" />
          Olästa ({unreadCount})
        </Button>
        <Button
          variant={filter === 'read' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('read')}
        >
          Lästa
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map((notification) => (
          <Card
            key={notification.id}
            className={`overflow-hidden transition-all ${
              !notification.isRead ? 'border-l-4 border-l-primary bg-primary/5' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Type Icon */}
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(
                    notification.type
                  )}`}
                >
                  {getTypeIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    </div>
                    {!notification.isRead && (
                      <Badge variant="primary" size="sm">
                        Ny
                      </Badge>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                    <div className="flex gap-2">
                      {!notification.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </Button>
                      )}
                      {notification.actionUrl && (
                        <Button size="sm" variant="outline">
                          Visa
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <TrashIcon className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredNotifications.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <BellIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Inga notiser</h3>
            <p className="text-muted-foreground text-sm">
              {filter === 'unread'
                ? 'Du har inga olästa notiser.'
                : filter === 'read'
                ? 'Du har inga lästa notiser.'
                : 'Du har inga notiser att visa.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
