'use client'

import Link from 'next/link'
import { Testimonials } from '@/components/marketing/testimonials'
import { Badge } from '@/components/ui/badge'

export default function TestimonialsSandbox() {
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
            <h1 className="text-lg font-semibold text-foreground">Testimonials - Grid</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      {/* Preview Area */}
      <div className="border-b border-border">
        <Testimonials />
      </div>

      {/* Notes */}
      <div className="mx-auto max-w-4xl p-8">
        <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Grid layout med masonry-liknande effekt</li>
          <li>Featured testimonial med logo</li>
          <li>Cards med <code className="rounded bg-muted px-1">shadow-lg ring-1 ring-border</code></li>
          <li>Responsiv: 1 → 2 → 4 kolumner</li>
        </ul>
        
        <h3 className="mt-8 text-md font-semibold text-foreground">Användning</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
{`import { Testimonials } from '@/components/marketing/testimonials'

export default function Page() {
  return <Testimonials />
}`}
        </pre>

        <p className="mt-8 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
      </div>
    </div>
  )
}
