'use client'

import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import {
  CalendarDaysIcon,
  UserGroupIcon,
  GiftIcon,
  SparklesIcon,
  TrophyIcon,
  FireIcon,
} from '@heroicons/react/24/outline'

// Mock event data for sandbox preview
const mockEvents = [
  {
    id: '1',
    title: 'Vinteräventyr',
    theme: 'Säsongsevent',
    description: 'Delta i vintertemade lekar och samla snöflingor!',
    participant_count: 234,
    reward_type: 'points',
    reward_amount: 500,
    isActive: true,
    progress: 65,
    daysRemaining: 5,
  },
  {
    id: '2',
    title: 'Teamwork Challenge',
    theme: 'Samarbetsutmaning',
    description: 'Arbeta tillsammans med andra och klara uppgifter.',
    participant_count: 156,
    reward_type: 'cosmetics',
    reward_amount: 1,
    isActive: true,
    progress: 30,
    daysRemaining: 2,
  },
]

function getRewardIcon(type: string) {
  switch (type) {
    case 'points':
      return <TrophyIcon className="h-4 w-4" />
    case 'cosmetics':
      return <SparklesIcon className="h-4 w-4" />
    default:
      return <GiftIcon className="h-4 w-4" />
  }
}

export default function EventsSandboxPage() {
  return (
    <SandboxShell
      moduleId="app-events"
      title="Events"
      description="Preview av event-komponenter för app-sektionen"
    >
      <div className="space-y-8">
        {/* Stats Preview */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Stats Overview</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">2</div>
                <div className="text-sm text-gray-600">Aktiva event</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-accent">4</div>
                <div className="text-sm text-gray-600">Totalt</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">390</div>
                <div className="text-sm text-gray-600">Deltagare</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">1</div>
                <div className="text-sm text-gray-600">Avklarade</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Filter Tabs */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Filter Tabs</h2>
          <div className="flex gap-2">
            <Button variant="default" size="sm">Alla</Button>
            <Button variant="outline" size="sm">
              <FireIcon className="h-4 w-4 mr-1" />
              Aktiva
            </Button>
            <Button variant="outline" size="sm">
              <CalendarDaysIcon className="h-4 w-4 mr-1" />
              Kommande
            </Button>
          </div>
        </section>

        {/* Event Cards */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Event Cards</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {mockEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden">
                {/* Event Header */}
                <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="primary" className="mb-2">
                        {event.theme}
                      </Badge>
                      <h3 className="font-semibold text-lg text-gray-900">{event.title}</h3>
                    </div>
                    {event.daysRemaining <= 3 && (
                      <Badge variant="warning" className="flex items-center gap-1">
                        <FireIcon className="h-3 w-3" />
                        {event.daysRemaining} dagar kvar
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-4 space-y-4">
                  <p className="text-gray-600 text-sm">{event.description}</p>

                  {/* Event Info */}
                  <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <CalendarDaysIcon className="h-4 w-4" />
                      15 jan - 15 feb
                    </span>
                    <span className="flex items-center gap-1">
                      <UserGroupIcon className="h-4 w-4" />
                      {event.participant_count} deltagare
                    </span>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Din progress</span>
                      <span className="font-medium text-primary">{event.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                        style={{ width: `${event.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Reward & Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">
                        {getRewardIcon(event.reward_type)}
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {event.reward_type === 'points'
                          ? `${event.reward_amount} poäng`
                          : 'Exklusiv belöning'}
                      </span>
                    </div>
                    <Button size="sm">Delta</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Upcoming Event Card (Disabled State) */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Kommande Event (Disabled State)</h2>
          <div className="max-w-md">
            <Card className="overflow-hidden">
              <div className="p-4 bg-gray-100">
                <Badge variant="outline" className="mb-2">Kreativt event</Badge>
                <h3 className="font-semibold text-lg text-gray-900">Kreativa Veckan</h3>
              </div>
              <CardContent className="p-4 space-y-4">
                <p className="text-gray-600 text-sm">
                  Visa din kreativa sida med roliga aktiviteter.
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">
                      <GiftIcon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-gray-700">100 mynt</span>
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    Kommer snart
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Empty State */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Empty State</h2>
          <div className="max-w-md">
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Inga event hittades</h3>
                <p className="text-gray-600 text-sm">
                  Det finns inga aktiva event just nu. Kolla tillbaka snart!
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Badge Variants for Events */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Event Badges</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">Säsongsevent</Badge>
            <Badge variant="accent">Samarbetsutmaning</Badge>
            <Badge variant="success">Avklarad</Badge>
            <Badge variant="warning">2 dagar kvar</Badge>
            <Badge variant="outline">Kommande</Badge>
            <Badge variant="destructive">Utgånget</Badge>
          </div>
        </section>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Event-kort med progress-bar</li>
            <li>Belöningsikoner och mynt-indikator</li>
            <li>Disabled state för kommande events</li>
            <li>Empty state med CalendarDays-ikon</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
    </SandboxShell>
  )
}
