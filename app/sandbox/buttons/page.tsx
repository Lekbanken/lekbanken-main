'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SimpleModulePage } from '../components/shell/SimpleModulePage'

export default function ButtonsSandbox() {
  return (
    <SimpleModulePage
      moduleId="buttons"
      title="Buttons & Badges"
      description="Button and badge variants with different sizes and states."
    >
      <div className="space-y-12">
        {/* Primary Buttons */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Primary Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        {/* Outline Buttons */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Outline Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" size="sm">Small</Button>
            <Button variant="outline" size="md">Medium</Button>
            <Button variant="outline" size="lg">Large</Button>
          </div>
        </section>

        {/* Ghost Buttons */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Ghost Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="ghost" size="sm">Small</Button>
            <Button variant="ghost" size="md">Medium</Button>
            <Button variant="ghost" size="lg">Large</Button>
          </div>
        </section>

        {/* Badges */}
        <section className="rounded-xl border border-border bg-card p-6">
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
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Badges med dot</h2>
          <div className="flex flex-wrap gap-4">
            <Badge variant="primary" dot>Primary</Badge>
            <Badge variant="success" dot>Online</Badge>
            <Badge variant="warning" dot>Pending</Badge>
            <Badge variant="destructive" dot>Offline</Badge>
          </div>
        </section>

        {/* Badge sizes */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Badge storlekar</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="primary" size="sm">Small</Badge>
            <Badge variant="primary" size="md">Medium</Badge>
            <Badge variant="primary" size="lg">Large</Badge>
          </div>
        </section>

        {/* Links as buttons */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Knappar som länkar</h2>
          <div className="flex flex-wrap gap-4">
            <Button href="/sandbox">Primary Link</Button>
            <Button variant="outline" href="/sandbox">Outline Link</Button>
            <Button variant="ghost" href="/sandbox">Ghost Link</Button>
          </div>
        </section>

        {/* Disabled Buttons */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Disabled Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button disabled>Primary Disabled</Button>
            <Button variant="outline" disabled>Outline Disabled</Button>
            <Button variant="ghost" disabled>Ghost Disabled</Button>
            <Button variant="destructive" disabled>Destructive Disabled</Button>
          </div>
        </section>

        {/* Loading Buttons */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Loading Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button loading>Laddar...</Button>
            <Button variant="outline" loading>Sparar</Button>
            <Button variant="destructive" loading loadingText="Raderar...">Radera</Button>
          </div>
        </section>
      </div>
    </SimpleModulePage>
  )
}



