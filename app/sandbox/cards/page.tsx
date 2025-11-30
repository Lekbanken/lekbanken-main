'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function CardsSandbox() {
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
            <h1 className="text-lg font-semibold text-foreground">Cards</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      {/* Preview Area */}
      <div className="p-8">
        <div className="mx-auto max-w-5xl space-y-12">
          {/* Card variants */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Card Variants</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card variant="default">
                <CardTitle>Default</CardTitle>
                <CardDescription>Med border</CardDescription>
              </Card>
              <Card variant="elevated">
                <CardTitle>Elevated</CardTitle>
                <CardDescription>Med shadow</CardDescription>
              </Card>
              <Card variant="bordered">
                <CardTitle>Bordered</CardTitle>
                <CardDescription>Med dubbel border</CardDescription>
              </Card>
              <Card variant="featured">
                <CardTitle>Featured</CardTitle>
                <CardDescription>Med primary ring</CardDescription>
              </Card>
            </div>
          </section>

          {/* Structured cards */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Strukturerat innehåll</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Aktivitetspaket</CardTitle>
                  <CardDescription>20 aktiviteter för fotbollsträning</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Badge variant="primary">Fotboll</Badge>
                    <Badge variant="accent">8-12 år</Badge>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button size="sm">Visa alla</Button>
                  <Button size="sm" variant="ghost">Dela</Button>
                </CardFooter>
              </Card>

              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Premium Plan</CardTitle>
                  <CardDescription>Allt du behöver för ditt lag</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">149 kr<span className="text-sm font-normal text-muted-foreground">/mån</span></p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Uppgradera nu</Button>
                </CardFooter>
              </Card>
            </div>
          </section>

          {/* Game Card example */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Game Card</h2>
            <div className="w-72">
              <Card variant="elevated" padding="none">
                <div className="aspect-video bg-gradient-to-br from-primary to-accent" />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Math Adventure</h3>
                    <Badge variant="warning" size="sm">⭐ 4.8</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Lär dig matematik genom lek</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="primary" size="sm">6-9 år</Badge>
                    <span className="text-xs text-muted-foreground">1.2k spelningar</span>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Padding options */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Padding storlekar</h2>
            <div className="grid gap-6 sm:grid-cols-4">
              <Card padding="none">
                <div className="p-4">
                  <CardTitle>None</CardTitle>
                </div>
              </Card>
              <Card padding="sm">
                <CardTitle>Small</CardTitle>
              </Card>
              <Card padding="md">
                <CardTitle>Medium</CardTitle>
              </Card>
              <Card padding="lg">
                <CardTitle>Large</CardTitle>
              </Card>
            </div>
          </section>
        </div>
      </div>

      {/* Notes */}
      <div className="mx-auto max-w-4xl border-t border-border p-8">
        <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>Card: 4 varianter (default, elevated, bordered, featured)</li>
          <li>Card: 4 padding-storlekar (none, sm, md, lg)</li>
          <li>CardHeader, CardContent, CardFooter för strukturerat innehåll</li>
          <li>CardTitle och CardDescription för typografi</li>
          <li>Featured variant använder <code className="rounded bg-muted px-1">ring-primary</code> för framhävning</li>
          <li>Game Card-pattern med <code className="rounded bg-muted px-1">padding=&quot;none&quot;</code> och bild</li>
        </ul>
        
        <h3 className="mt-8 text-md font-semibold text-foreground">Användning</h3>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-sm">
{`import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

<Card variant="elevated">
  <CardHeader>
    <CardTitle>Rubrik</CardTitle>
    <CardDescription>Beskrivning</CardDescription>
  </CardHeader>
  <CardContent>Innehåll</CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>`}
        </pre>

        <p className="mt-8 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
      </div>
    </div>
  )
}
