'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const adminSections = [
  { 
    name: 'Dashboard', 
    href: '/sandbox/admin/dashboard', 
    status: 'ready',
    description: 'Översikt, KPI-kort, aktivitetsfeed' 
  },
  { 
    name: 'Users / Användare', 
    href: '/sandbox/admin/users', 
    status: 'ready',
    description: 'Användarlista, roller, filter, actions' 
  },
  { 
    name: 'Content / Innehåll', 
    href: '/sandbox/admin/content', 
    status: 'ready',
    description: 'Aktiviteter, kategorier, CRUD' 
  },
  { 
    name: 'Analytics', 
    href: '/sandbox/admin/analytics', 
    status: 'ready',
    description: 'Statistik, grafer, rapporter' 
  },
  { 
    name: 'Organisations', 
    href: '/sandbox/admin/organisations', 
    status: 'ready',
    description: 'Organisationshantering, tenants' 
  },
  { 
    name: 'Billing / Fakturering', 
    href: '/sandbox/admin/billing', 
    status: 'ready',
    description: 'Prenumerationer, betalningar' 
  },
  { 
    name: 'Moderation', 
    href: '/sandbox/admin/moderation', 
    status: 'ready',
    description: 'Rapporter, användarhantering' 
  },
  { 
    name: 'Notifications', 
    href: '/sandbox/admin/notifications', 
    status: 'ready',
    description: 'Push, e-post, meddelanden' 
  },
  { 
    name: 'Support & Tickets', 
    href: '/sandbox/admin/support', 
    status: 'ready',
    description: 'Ärenden, feedback' 
  },
  { 
    name: 'Licenses', 
    href: '/sandbox/admin/licenses', 
    status: 'ready',
    description: 'Licensnycklar, organisationer' 
  },
  { 
    name: 'Leaderboard', 
    href: '/sandbox/admin/leaderboard', 
    status: 'ready',
    description: 'Topplistor, statistik' 
  },
  { 
    name: 'Achievements', 
    href: '/sandbox/admin/achievements', 
    status: 'ready',
    description: 'Prestationer, badges' 
  },
  { 
    name: 'Personalization', 
    href: '/sandbox/admin/personalization', 
    status: 'ready',
    description: 'Teman, avatarer, anpassning' 
  },
  { 
    name: 'Settings', 
    href: '/sandbox/admin/settings', 
    status: 'ready',
    description: 'Systeminställningar, konfiguration' 
  },
]

export default function AdminSandboxIndex() {
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
          <h1 className="text-3xl font-bold text-foreground">🔧 Admin Sandbox</h1>
          <p className="mt-2 text-muted-foreground">
            Prototypa och testa admin-komponenter innan implementation.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section) => (
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
          <h3 className="font-semibold text-foreground">🎯 Admin Design Principer</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span><strong>Data-driven:</strong> Tabeller, filter och sökfunktioner för effektiv hantering</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span><strong>Bulk actions:</strong> Multi-select och batch-operationer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span><strong>Confirmations:</strong> Bekräfta destruktiva åtgärder</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
              <span><strong>Audit trail:</strong> Visa vem som gjorde vad och när</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
