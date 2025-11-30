'use client'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

// Dölj sandbox i produktion
if (process.env.NODE_ENV === 'production') {
  notFound()
}

const uiComponents = [
  { name: 'Buttons & Badges', href: '/sandbox/buttons', status: 'ready', description: 'Alla button och badge varianter' },
  { name: 'Cards', href: '/sandbox/cards', status: 'ready', description: 'Card varianter och layouts' },
  { name: 'Forms', href: '/sandbox/forms', status: 'ready', description: 'Input, Textarea, Select' },
  { name: 'Feedback & States', href: '/sandbox/feedback', status: 'ready', description: 'Empty, Error, Loading, Skeletons, Alerts, Toasts' },
  { name: 'Interactive', href: '/sandbox/interactive', status: 'ready', description: 'Dialog, Dropdown, Avatar, Tabs, Breadcrumbs' },
]

const marketingComponents = [
  { name: 'Hero', href: '/sandbox/hero', status: 'ready', description: 'Hero section med stats' },
  { name: 'Pricing', href: '/sandbox/pricing', status: 'ready', description: 'Three tiers med toggle' },
  { name: 'Testimonials', href: '/sandbox/testimonials', status: 'ready', description: 'Grid layout testimonials' },
  { name: 'Header', href: '/sandbox/navigation', status: 'ready', description: 'Navigation med mobile menu' },
]

const appSections = [
  { name: '📱 App Sandbox', href: '/sandbox/app', status: 'ready', description: 'Shell, Dashboard, GameCard, Leaderboard m.m.' },
]

const adminSections = [
  { name: '🔧 Admin Sandbox', href: '/sandbox/admin', status: 'ready', description: 'Dashboard, Users, Content, Analytics m.m.' },
]

export default function SandboxIndex() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">🧪 UI Sandbox</h1>
          <p className="mt-2 text-muted-foreground">
            Testa och utveckla komponenter isolerat. Denna sida syns bara i development.
          </p>
        </div>

        {/* App & Admin Sections */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {[...appSections, ...adminSections].map((section) => (
            <Link
              key={section.name}
              href={section.href}
              className="group relative rounded-2xl border-2 border-border bg-card p-6 shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground group-hover:text-primary">
                  {section.name}
                </h2>
                <Badge 
                  variant={section.status === 'ready' ? 'success' : section.status === 'wip' ? 'warning' : 'default'}
                  size="sm"
                >
                  {section.status === 'ready' ? '✓ Klar' : section.status === 'wip' ? '🔧 WIP' : '○ Väntar'}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {section.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Marketing Components */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Marketing</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {marketingComponents.map((component) => (
              <Link
                key={component.name}
                href={component.href}
                className="group relative rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground group-hover:text-primary">
                    {component.name}
                  </h3>
                  <Badge variant="success" size="sm">✓</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {component.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* UI Primitives */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">UI Primitives</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {uiComponents.map((component) => (
              <Link
                key={component.name}
                href={component.href}
                className="group relative rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground group-hover:text-primary">
                    {component.name}
                  </h3>
                  <Badge variant="success" size="sm">✓</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {component.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-6">
          <h3 className="font-semibold text-foreground">🎨 Design Tokens</h3>
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary" />
              <span className="text-sm text-muted-foreground">Primary #8661ff</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-accent" />
              <span className="text-sm text-muted-foreground">Accent #00c7b0</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-yellow" />
              <span className="text-sm text-muted-foreground">Yellow #ffd166</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
            <div>text-foreground</div>
            <div>text-muted-foreground</div>
            <div>bg-background</div>
            <div>bg-card</div>
            <div>border-border</div>
            <div>text-primary</div>
            <div>bg-primary</div>
            <div>rounded-2xl</div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Sandbox är endast synlig i development mode</p>
        </div>
      </div>
    </div>
  )
}
