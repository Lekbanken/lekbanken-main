'use client'

import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GameCard } from '@/components/app/GameCard'

const stats = [
  { label: 'Sparade aktiviteter', value: '47', change: '+3 denna vecka' },
  { label: 'Genomförda pass', value: '23', change: '+5 denna månad' },
  { label: 'Delade pass', value: '12', change: '3 väntar på feedback' },
  { label: 'Favoriter', value: '18', change: '' },
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

export default function DashboardSandbox() {
  return (
    <SandboxShell
      moduleId="app-dashboard"
      title="Dashboard"
      description="User dashboard with stats, activity and quick actions"
    >
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Welcome section */}
        <section>
          <Card variant="featured" padding="lg">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Välkommen tillbaka, Anna! 👋
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Du har 3 pass schemalagda denna vecka. Behöver du fler aktiviteter?
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline">Se schema</Button>
                <Button>Bläddra aktiviteter</Button>
              </div>
            </div>
          </Card>
        </section>

        {/* Stats */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Din översikt</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <Card key={stat.label} variant="elevated">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                    {stat.change && (
                      <div className="mt-2 text-xs text-primary">{stat.change}</div>
                    )}
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
                <CardContent className="divide-y divide-border">
                  {recentActivities.map((activity, i) => (
                    <div key={activity.id} className={`flex items-center justify-between py-4 ${i === 0 ? 'pt-0' : ''}`}>
                      <div>
                        <div className="font-medium text-foreground">{activity.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {activity.action} · {activity.time}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">→</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            {/* Suggested games */}
            <section className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Föreslagna aktiviteter</h2>
                <Button variant="ghost" size="sm">Visa alla →</Button>
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: '➕', label: 'Skapa pass', desc: 'Bygg ett nytt pass' },
                { icon: '🔍', label: 'Sök aktiviteter', desc: 'Hitta nya lekar' },
                { icon: '📅', label: 'Se kalender', desc: 'Planerade pass' },
                { icon: '👥', label: 'Dela med team', desc: 'Bjud in kollegor' },
              ].map((action) => (
                <Card key={action.label} className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="text-3xl">{action.icon}</div>
                    <div>
                      <div className="font-medium text-foreground">{action.label}</div>
                      <div className="text-sm text-muted-foreground">{action.desc}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-2xl border border-dashed border-border bg-muted/50 p-6">
            <h3 className="font-semibold text-foreground">📝 Dashboard Komponenter</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>✅ Welcome card med CTA</li>
              <li>✅ Stats grid med siffror</li>
              <li>✅ Senaste aktivitet lista</li>
              <li>✅ Föreslagna aktiviteter (använder GameCard)</li>
              <li>✅ Snabbåtgärder grid</li>
              <li>⬜ Skeleton loading states</li>
              <li>⬜ Empty states</li>
            </ul>

            <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
          </section>
        </div>
    </SandboxShell>
  )
}
