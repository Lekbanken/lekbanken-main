'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SimpleModulePage } from '../components/shell/SimpleModulePage'

export default function CardsSandbox() {
  return (
    <SimpleModulePage
      moduleId="cards"
      title="Cards"
      description="Card variants with structured content areas."
    >
      <div className="space-y-12">
        {/* Card variants */}
        <section className="rounded-xl border border-border bg-card p-6">
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
        <section className="rounded-xl border border-border bg-card p-6">
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
        <section className="rounded-xl border border-border bg-card p-6">
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
        <section className="rounded-xl border border-border bg-card p-6">
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
    </SimpleModulePage>
  )
}
