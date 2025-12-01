'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ButtonsSandbox() {
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
            <h1 className="text-lg font-semibold text-foreground">Buttons & Badges</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      {/* Preview Area */}
      <div className="p-8">
        <div className="mx-auto max-w-4xl space-y-12">
          {/* Primary Buttons */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Primary Buttons</h2>
            <div className="flex flex-wrap gap-4">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </section>

          {/* Outline Buttons */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Outline Buttons</h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" size="sm">Small</Button>
              <Button variant="outline" size="md">Medium</Button>
              <Button variant="outline" size="lg">Large</Button>
            </div>
          </section>

          {/* Ghost Buttons */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Ghost Buttons</h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="ghost" size="sm">Small</Button>
              <Button variant="ghost" size="md">Medium</Button>
              <Button variant="ghost" size="lg">Large</Button>
            </div>
          </section>

          {/* Badges */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Badges</h2>
            <div className="flex flex-wrap gap-4">
              <Badge variant="default">Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="accent">Accent</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </section>

          {/* Badges with dots */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Badges med dot</h2>
            <div className="flex flex-wrap gap-4">
              <Badge variant="primary" dot>Primary</Badge>
              <Badge variant="success" dot>Online</Badge>
              <Badge variant="warning" dot>Pending</Badge>
              <Badge variant="destructive" dot>Offline</Badge>
            </div>
          </section>

          {/* Badge sizes */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Badge storlekar</h2>
            <div className="flex flex-wrap items-center gap-4">
              <Badge variant="primary" size="sm">Small</Badge>
              <Badge variant="primary" size="md">Medium</Badge>
              <Badge variant="primary" size="lg">Large</Badge>
            </div>
          </section>

          {/* Links as buttons */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Knappar som länkar</h2>
            <div className="flex flex-wrap gap-4">
              <Button href="/sandbox">Primary Link</Button>
              <Button variant="outline" href="/sandbox">Outline Link</Button>
              <Button variant="ghost" href="/sandbox">Ghost Link</Button>
            </div>
          </section>

          {/* Disabled Buttons */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Disabled Buttons</h2>
            <div className="flex flex-wrap gap-4">
              <Button disabled>Primary Disabled</Button>
              <Button variant="outline" disabled>Outline Disabled</Button>
              <Button variant="ghost" disabled>Ghost Disabled</Button>
              <Button variant="destructive" disabled>Destructive Disabled</Button>
            </div>
          </section>

          {/* Loading Buttons */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Loading Buttons</h2>
            <div className="flex flex-wrap gap-4">
              <Button loading>Laddar...</Button>
              <Button variant="outline" loading>Sparar</Button>
              <Button variant="destructive" loading loadingText="Raderar...">Radera</Button>
            </div>
          </section>
        </div>
      </div>

      {/* Notes */}
      <div className="mx-auto max-w-4xl border-t border-border p-8">
        <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Button: 5 varianter (default, primary, outline, ghost, destructive)</li>
          <li>Button: 3 storlekar (sm, md, lg)</li>
          <li>Button: Stöd för <code className="rounded bg-muted px-1">href</code> prop för länkar</li>
          <li>Button: <code className="rounded bg-muted px-1">disabled</code> prop för inaktiv knapp</li>
          <li>Button: <code className="rounded bg-muted px-1">loading</code> prop för laddningsläge med spinner</li>
          <li>Button: <code className="rounded bg-muted px-1">loadingText</code> för att ändra text under laddning</li>
          <li>Badge: 7 varianter (default, primary, accent, warning, success, destructive, outline)</li>
          <li>Badge: 3 storlekar (sm, md, lg)</li>
          <li>Badge: <code className="rounded bg-muted px-1">dot</code> prop för statusindikator</li>
        </ul>
        
        <h3 className="mt-8 text-md font-semibold text-foreground">Användning</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
{`import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

<Button variant="primary" size="md">Klicka här</Button>
<Button variant="outline" href="/page">Länk</Button>
<Button loading>Sparar...</Button>
<Button disabled>Inaktiverad</Button>
<Badge variant="success" dot>Online</Badge>`}
        </pre>

        <p className="mt-8 text-xs text-muted-foreground">Senast uppdaterad: 2024-12-01</p>
      </div>
    </div>
  )
}
