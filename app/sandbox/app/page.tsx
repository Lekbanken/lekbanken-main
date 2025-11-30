'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const appSections = [
  { 
    name: 'App Shell', 
    href: '/sandbox/app/shell', 
    status: 'ready',
    description: 'SideNav + BottomNav + Layout' 
  },
  { 
    name: 'Dashboard', 
    href: '/sandbox/app/dashboard', 
    status: 'ready',
    description: 'Välkomst, stats, senaste aktivitet' 
  },
  { 
    name: 'Game Card', 
    href: '/sandbox/app/game-card', 
    status: 'ready',
    description: 'Aktivitetskort med varianter' 
  },
  { 
    name: 'Games / Utforska', 
    href: '/sandbox/app/games', 
    status: 'ready',
    description: 'Lista + filter + sök + grid/list' 
  },
  { 
    name: 'Profile / Profil', 
    href: '/sandbox/app/profile', 
    status: 'ready',
    description: 'Nivå, XP, achievements, milestones' 
  },
  { 
    name: 'Leaderboard / Topplista', 
    href: '/sandbox/app/leaderboard', 
    status: 'ready',
    description: 'Podium och rankning' 
  },
  { 
    name: 'Events / Händelser', 
    href: '/sandbox/app/events', 
    status: 'ready',
    description: 'Event-kort, progress, belöningar' 
  },
  { 
    name: 'Planner', 
    href: '/sandbox/app/planner', 
    status: 'ready',
    description: 'Mål, schema, progress tracking' 
  },
  { 
    name: 'Shop / Butik', 
    href: '/sandbox/app/shop', 
    status: 'ready',
    description: 'Artiklar, valutor, köp' 
  },
]

export default function AppSandboxIndex() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-2">
          <Link 
            href="/sandbox" 
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Tillbaka till Sandbox
          </Link>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">📱 App Sandbox</h1>
          <p className="mt-2 text-muted-foreground">
            Prototypa och testa app-komponenter innan implementation.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {appSections.map((section) => (
            <Link key={section.name} href={section.href}>
              <Card variant="default" className="h-full transition-all hover:border-primary hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{section.name}</CardTitle>
                    <Badge 
                      variant={section.status === 'ready' ? 'success' : section.status === 'wip' ? 'warning' : 'default'}
                      size="sm"
                    >
                      {section.status === 'ready' ? '✓' : section.status === 'wip' ? '🔧' : '○'}
                    </Badge>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-6">
          <h3 className="font-semibold text-foreground">🎯 App Design Principer</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span><strong>Mobile-first:</strong> BottomNav på mobil, SideNav på desktop</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span><strong>Touch-friendly:</strong> Minst 44px touch targets</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span><strong>Konsekvent:</strong> Samma komponenter överallt</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span><strong>Snabb:</strong> Skeleton loading, optimistic updates</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
