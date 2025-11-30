'use client'

import Link from 'next/link'
import { Hero } from '@/components/marketing/hero'
import { Badge } from '@/components/ui/badge'

export default function HeroSandbox() {
  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/sandbox" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Tillbaka
            </Link>
            <h1 className="text-lg font-semibold text-foreground">Hero - Med preview</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      {/* Preview Area */}
      <div className="border-b border-border">
        <Hero />
      </div>

      {/* Notes */}
      <div className="mx-auto max-w-4xl p-8">
        <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Använder <code className="rounded bg-muted px-1">text-primary</code> och <code className="rounded bg-muted px-1">bg-primary</code></li>
          <li>Stats-kort med <code className="rounded bg-muted px-1">rounded-xl</code> och <code className="rounded bg-muted px-1">border-border/60</code></li>
          <li>Bakgrund med gradient: <code className="rounded bg-muted px-1">from-primary/5</code></li>
          <li>Phone mockup placeholder - byt ut när app-screenshots är klara</li>
        </ul>
        
        <h3 className="mt-8 text-md font-semibold text-foreground">Användning</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
{`import { Hero } from '@/components/marketing/hero'

export default function Page() {
  return <Hero />
}`}
        </pre>

        <p className="mt-8 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
      </div>
    </div>
  )
}
