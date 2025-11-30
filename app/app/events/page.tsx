'use client'

import { useState } from 'react'
import { Button, Card, CardContent, Badge } from '@/components/ui'
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  GiftIcon,
  SparklesIcon,
  TrophyIcon,
  FireIcon,
} from '@heroicons/react/24/outline'

// Types
interface Event {
  id: string
  title: string
  theme: string
  description: string
  start_date: string
  end_date: string
  participant_count: number
  completion_count: number
  reward_type: 'points' | 'cosmetics' | 'currency'
  reward_amount: number
  isActive?: boolean
  progress?: number
}

// Mock events for demo
const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Vinteräventyr',
    theme: 'Säsongsevent',
    description: 'Delta i vintertemade lekar och samla snöflingor för exklusiva belöningar!',
    start_date: '2025-01-15',
    end_date: '2025-02-15',
    participant_count: 234,
    completion_count: 89,
    reward_type: 'points',
    reward_amount: 500,
    isActive: true,
    progress: 65,
  },
  {
    id: '2',
    title: 'Teamwork Challenge',
    theme: 'Samarbetsutmaning',
    description: 'Arbeta tillsammans med andra och klara samarbetsuppgifter för att vinna.',
    start_date: '2025-01-20',
    end_date: '2025-02-05',
    participant_count: 156,
    completion_count: 42,
    reward_type: 'cosmetics',
    reward_amount: 1,
    isActive: true,
    progress: 30,
  },
  {
    id: '3',
    title: 'Kreativa Veckan',
    theme: 'Kreativt event',
    description: 'Visa din kreativa sida med roliga skapande aktiviteter.',
    start_date: '2025-02-01',
    end_date: '2025-02-08',
    participant_count: 98,
    completion_count: 15,
    reward_type: 'currency',
    reward_amount: 100,
    isActive: false,
    progress: 0,
  },
  {
    id: '4',
    title: 'Sportdagen',
    theme: 'Rörelseevent',
    description: 'Tävla i olika fysiska aktiviteter och utmaningar. Perfekt för energifyllda barn!',
    start_date: '2025-02-10',
    end_date: '2025-02-12',
    participant_count: 312,
    completion_count: 0,
    reward_type: 'points',
    reward_amount: 750,
    isActive: false,
    progress: 0,
  },
]

function getRewardIcon(type: string) {
  switch (type) {
    case 'points':
      return <TrophyIcon className="h-4 w-4" />
    case 'cosmetics':
      return <SparklesIcon className="h-4 w-4" />
    case 'currency':
      return <GiftIcon className="h-4 w-4" />
    default:
      return <GiftIcon className="h-4 w-4" />
  }
}

function getRewardLabel(type: string, amount: number) {
  switch (type) {
    case 'points':
      return `${amount} poäng`
    case 'cosmetics':
      return 'Exklusiv belöning'
    case 'currency':
      return `${amount} mynt`
    default:
      return 'Belöning'
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
  })
}

function getDaysRemaining(endDate: string) {
  const end = new Date(endDate)
  const now = new Date()
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function EventsPage() {
  const [events] = useState<Event[]>(mockEvents)
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming'>('all')

  const filteredEvents = events.filter((event) => {
    if (filter === 'active') return event.isActive
    if (filter === 'upcoming') return !event.isActive
    return true
  })

  const activeEvents = events.filter((e) => e.isActive)
  const totalParticipants = events.reduce((sum, e) => sum + e.participant_count, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Händelser</h1>
        <p className="text-muted-foreground mt-1">
          Delta i spännande event och tjäna exklusiva belöningar
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{activeEvents.length}</div>
            <div className="text-sm text-muted-foreground">Aktiva event</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">{events.length}</div>
            <div className="text-sm text-muted-foreground">Totalt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{totalParticipants}</div>
            <div className="text-sm text-muted-foreground">Deltagare</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {events.filter((e) => (e.progress || 0) >= 100).length}
            </div>
            <div className="text-sm text-muted-foreground">Avklarade</div>
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
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          <FireIcon className="h-4 w-4 mr-1" />
          Aktiva
        </Button>
        <Button
          variant={filter === 'upcoming' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('upcoming')}
        >
          <CalendarDaysIcon className="h-4 w-4 mr-1" />
          Kommande
        </Button>
      </div>

      {/* Events Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filteredEvents.map((event) => {
          const daysRemaining = getDaysRemaining(event.end_date)
          const isEnding = daysRemaining <= 3 && daysRemaining > 0

          return (
            <Card key={event.id} className="overflow-hidden">
              {/* Event Header with Theme Gradient */}
              <div
                className={`p-4 ${
                  event.isActive
                    ? 'bg-gradient-to-r from-primary/10 to-accent/10'
                    : 'bg-muted'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant={event.isActive ? 'primary' : 'outline'} className="mb-2">
                      {event.theme}
                    </Badge>
                    <h3 className="font-semibold text-lg text-foreground">{event.title}</h3>
                  </div>
                  {event.isActive && isEnding && (
                    <Badge variant="warning" className="flex items-center gap-1">
                      <FireIcon className="h-3 w-3" />
                      {daysRemaining} dagar kvar
                    </Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-4 space-y-4">
                <p className="text-muted-foreground text-sm">{event.description}</p>

                {/* Event Info */}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDaysIcon className="h-4 w-4" />
                    {formatDate(event.start_date)} - {formatDate(event.end_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserGroupIcon className="h-4 w-4" />
                    {event.participant_count} deltagare
                  </span>
                </div>

                {/* Progress (for active events) */}
                {event.isActive && event.progress !== undefined && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Din progress</span>
                      <span className="font-medium text-primary">{event.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                        style={{ width: `${event.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Reward & Action */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">
                      {getRewardIcon(event.reward_type)}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {getRewardLabel(event.reward_type, event.reward_amount)}
                    </span>
                  </div>
                  
                  {event.isActive ? (
                    <Button size="sm">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      Delta
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      Kommer snart
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <CalendarDaysIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Inga event hittades</h3>
            <p className="text-muted-foreground text-sm">
              {filter === 'active'
                ? 'Det finns inga aktiva event just nu. Kolla tillbaka snart!'
                : filter === 'upcoming'
                ? 'Det finns inga kommande event planerade.'
                : 'Det finns inga event att visa.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
