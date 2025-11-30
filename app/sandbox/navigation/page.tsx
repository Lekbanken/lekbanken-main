'use client'

import Link from 'next/link'
import { Header } from '@/components/marketing/header'
import { Badge } from '@/components/ui/badge'

export default function NavigationSandbox() {
  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-[60] border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/sandbox" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Tillbaka
            </Link>
            <h1 className="text-lg font-semibold text-foreground">Navigation</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      {/* Preview Area */}
      <div className="space-y-12 p-8">
        {/* Marketing Header - Live component */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Marketing Header (Live)</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Testa mobilmenyn genom att minska webbläsarens bredd under 1024px.
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <Header />
          </div>
        </section>

        {/* App SideNav */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">App SideNav</h2>
          <div className="w-64 overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex flex-col gap-1 p-4">
              <a href="#" className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                <span>🏠</span> Dashboard
              </a>
              <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <span>🎮</span> Spel
              </a>
              <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <span>🏆</span> Topplista
              </a>
              <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <span>⭐</span> Prestationer
              </a>
              <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <span>👤</span> Profil
              </a>
            </div>
          </div>
        </section>

        {/* App BottomNav (Mobile) */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">App BottomNav (Mobile)</h2>
          <div className="mx-auto max-w-sm overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-around border-t border-border py-3">
              <a href="#" className="flex flex-col items-center gap-1 text-primary">
                <span className="text-xl">🏠</span>
                <span className="text-xs font-medium">Hem</span>
              </a>
              <a href="#" className="flex flex-col items-center gap-1 text-muted-foreground">
                <span className="text-xl">🎮</span>
                <span className="text-xs font-medium">Spel</span>
              </a>
              <a href="#" className="flex flex-col items-center gap-1 text-muted-foreground">
                <span className="text-xl">🏆</span>
                <span className="text-xs font-medium">Topplista</span>
              </a>
              <a href="#" className="flex flex-col items-center gap-1 text-muted-foreground">
                <span className="text-xl">👤</span>
                <span className="text-xs font-medium">Profil</span>
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Notes */}
      <div className="mx-auto max-w-4xl border-t border-border p-8">
        <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Marketing Header: Responsiv med mobilmeny under 1024px</li>
          <li>App SideNav: Fixed, 256px bred, visas på desktop (≥1024px)</li>
          <li>App BottomNav: Fixed bottom, 5 items, visas på mobil (&lt;1024px)</li>
          <li>Aktiv item: <code className="rounded bg-muted px-1">bg-primary/10 text-primary</code></li>
          <li>Safe-area support för iOS via <code className="rounded bg-muted px-1">pb-safe</code></li>
        </ul>
        
        <h3 className="mt-8 text-md font-semibold text-foreground">Användning</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
{`// Marketing
import { Header } from '@/components/marketing/header'

// App
import { SideNav } from '@/components/app/SideNav'
import { BottomNav } from '@/components/app/BottomNav'

// SideNav används i app/layout.tsx
// BottomNav används i app/layout.tsx`}
        </pre>

        <p className="mt-8 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
      </div>
    </div>
  )
}
