'use client'

import Link from 'next/link'
import { PricingSection } from '@/components/marketing/pricing-section'
import { Badge } from '@/components/ui/badge'

export default function PricingSandbox() {
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
            <h1 className="text-lg font-semibold text-foreground">Pricing - Three tiers med toggle</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      {/* Preview Area */}
      <div className="border-b border-border">
        <PricingSection />
      </div>

      {/* Notes */}
      <div className="mx-auto max-w-4xl p-8">
        <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Toggle för månadsvis/årsvis</li>
          <li>Tre tiers: Gratis, Pro, Team</li>
          <li>Featured card med <code className="rounded bg-muted px-1">ring-primary</code></li>
          <li>Responsive: 1 kolumn mobil → 3 kolumner desktop</li>
        </ul>
        
        <h3 className="mt-8 text-md font-semibold text-foreground">Användning</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
{`import { PricingSection } from '@/components/marketing/pricing-section'

export default function Page() {
  return <PricingSection />
}`}
        </pre>

        <p className="mt-8 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
      </div>
    </div>
  )
}
