'use client'

import Image from 'next/image'
import { notFound } from 'next/navigation'
import { SandboxShell } from '../../components/shell/SandboxShellV2'

if (process.env.NODE_ENV === 'production') {
  notFound()
}

export default function IconGuidelinesPage() {
  return (
    <SandboxShell
      moduleId="icons"
      title="Icon Guidelines"
      description="Lekbanken-ikonen och användningsriktlinjer."
    >
      <div className="space-y-12">
        {/* Main Icon Display */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-6 text-lg font-semibold text-foreground">Lekbanken Ikon</h2>
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl bg-background p-4 shadow-lg">
                <Image
                  src="/lekbanken-icon.png"
                  alt="Lekbanken ikon"
                  width={96}
                  height={96}
                  className="h-24 w-24"
                />
              </div>
              <span className="text-sm font-medium text-foreground">96×96px</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl bg-background p-3 shadow-md">
                <Image
                  src="/lekbanken-icon.png"
                  alt="Lekbanken ikon"
                  width={64}
                  height={64}
                  className="h-16 w-16"
                />
              </div>
              <span className="text-sm font-medium text-foreground">64×64px</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg bg-background p-2 shadow">
                <Image
                  src="/lekbanken-icon.png"
                  alt="Lekbanken ikon"
                  width={48}
                  height={48}
                  className="h-12 w-12"
                />
              </div>
              <span className="text-sm font-medium text-foreground">48×48px</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-md bg-background p-1.5 shadow-sm">
                <Image
                  src="/lekbanken-icon.png"
                  alt="Lekbanken ikon"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
              </div>
              <span className="text-sm font-medium text-foreground">32×32px (min)</span>
            </div>
          </div>
        </section>

        {/* Usage Guidelines */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Användningsriktlinjer</h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Minsta storlek:</strong> 32×32 pixlar. 
                Använd aldrig ikonen mindre än detta.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Friyta:</strong> Lämna minst 8px 
                utrymme runt ikonen på alla sidor.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Bakgrund:</strong> Placera på ljusa 
                eller neutrala bakgrunder. Undvik mörka bakgrunder som minskar kontrasten.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>
                <strong className="text-foreground">Ingen modifiering:</strong> Sträck inte, 
                rotera inte, och lägg inte till effekter på ikonen.
              </span>
            </li>
          </ul>
        </section>

        {/* Background Examples */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Bakgrundsexempel</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-full items-center justify-center rounded-lg bg-white">
                <Image
                  src="/lekbanken-icon.png"
                  alt="Lekbanken ikon"
                  width={48}
                  height={48}
                  className="h-12 w-12"
                />
              </div>
              <span className="text-xs text-green-600">✓ Vit bakgrund</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-full items-center justify-center rounded-lg bg-gray-100">
                <Image
                  src="/lekbanken-icon.png"
                  alt="Lekbanken ikon"
                  width={48}
                  height={48}
                  className="h-12 w-12"
                />
              </div>
              <span className="text-xs text-green-600">✓ Ljusgrå bakgrund</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-full items-center justify-center rounded-lg bg-gray-900">
                <Image
                  src="/lekbanken-icon.png"
                  alt="Lekbanken ikon"
                  width={48}
                  height={48}
                  className="h-12 w-12"
                />
              </div>
              <span className="text-xs text-yellow-600">⚠ Mörk bakgrund (undvik)</span>
            </div>
          </div>
        </section>

        {/* File Info */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Filinformation</h2>
          <div className="rounded-lg bg-muted p-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Sökväg</dt>
                <dd className="font-mono text-foreground">public/lekbanken-icon.png</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Format</dt>
                <dd className="font-mono text-foreground">PNG (transparent)</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Användning</dt>
                <dd className="text-foreground">Header, footer, app-ikon, favicons</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Varianter</dt>
                <dd className="text-foreground">Endast en officiell version</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </SandboxShell>
  )
}
