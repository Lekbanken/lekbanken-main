import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GameCard } from '@/components/app/GameCard'
import Link from 'next/link'

const stats = [
  { label: 'Sparade aktiviteter', value: '47', change: '+3 denna vecka', icon: '📚' },
  { label: 'Genomförda pass', value: '23', change: '+5 denna månad', icon: '✅' },
  { label: 'Delade pass', value: '12', change: '3 väntar', icon: '🔗' },
  { label: 'Favoriter', value: '18', icon: '❤️' },
]

const recentActivities = [
  { id: '1', name: 'Räkna & Spring', time: '2 timmar sedan', action: 'Spelade' },
  { id: '2', name: 'Ordstafett', time: 'Igår', action: 'Sparade' },
  { id: '3', name: 'Mindfulness-runda', time: '3 dagar sedan', action: 'Delade' },
]

const suggestedGames = [
  {
    id: '1',
    name: 'Bollkull',
    description: 'Klassisk kullek med mjuk boll. Perfekt för uppvärmning.',
    ageMin: 6,
    ageMax: 12,
    energyLevel: 'high' as const,
    timeEstimate: 10,
    rating: 4.7,
  },
  {
    id: '2',
    name: 'Samarbetspussel',
    description: 'Gruppen löser ett pussel tillsammans under tidspress.',
    ageMin: 8,
    ageMax: 14,
    energyLevel: 'low' as const,
    timeEstimate: 15,
    rating: 4.5,
  },
]

export default function AppHome() {
  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Welcome section */}
      <Card variant="featured" padding="lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Välkommen tillbaka! 👋
            </h1>
            <p className="mt-2 text-muted-foreground">
              Du har 3 pass schemalagda denna vecka. Behöver du fler aktiviteter?
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" href="/app/planner">Se schema</Button>
            <Button href="/app/games">Bläddra aktiviteter</Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Din översikt</h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} variant="elevated">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{stat.icon}</span>
                  {stat.change && (
                    <Badge variant="primary" size="sm">{stat.change}</Badge>
                  )}
                </div>
                <div className="mt-3 text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Two column layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent activity */}
        <section className="lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Senaste aktivitet</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {recentActivities.map((activity, i) => (
                <Link 
                  key={activity.id} 
                  href={`/app/games/${activity.id}`}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <div className="font-medium text-foreground">{activity.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {activity.action} · {activity.time}
                    </div>
                  </div>
                  <span className="text-muted-foreground">→</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Suggested games */}
        <section className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Föreslagna aktiviteter</h2>
            <Button variant="ghost" size="sm" href="/app/games">Visa alla →</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {suggestedGames.map((game) => (
              <GameCard key={game.id} {...game} />
            ))}
          </div>
        </section>
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Snabbåtgärder</h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { icon: '➕', label: 'Skapa pass', desc: 'Bygg ett nytt pass', href: '/app/planner/new' },
            { icon: '🔍', label: 'Sök aktiviteter', desc: 'Hitta nya lekar', href: '/app/games' },
            { icon: '📅', label: 'Se kalender', desc: 'Planerade pass', href: '/app/planner' },
            { icon: '👥', label: 'Dela med team', desc: 'Bjud in kollegor', href: '/app/profile' },
          ].map((action) => (
            <Link key={action.label} href={action.href}>
              <Card className="h-full cursor-pointer transition-all hover:border-primary hover:shadow-md">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="text-3xl">{action.icon}</div>
                  <div>
                    <div className="font-medium text-foreground">{action.label}</div>
                    <div className="text-sm text-muted-foreground">{action.desc}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
