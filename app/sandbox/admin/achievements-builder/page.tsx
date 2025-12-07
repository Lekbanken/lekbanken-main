'use client'

import Link from 'next/link'
import { AchievementBuilder } from '@/components/achievements/AchievementBuilder'
import { Badge } from '@/components/ui/badge'

export default function AchievementsBuilderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/sandbox" className="text-muted-foreground hover:text-foreground">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <span className="text-2xl">?</span>
                Achievement Builder
              </h1>
              <p className="text-sm text-muted-foreground">
                Designa och exportera custom achievements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="primary" size="sm">
              Admin Tool
            </Badge>
            <Badge variant="outline" size="sm">
              v1.0.0
            </Badge>
          </div>
        </div>
      </header>

      {/* Builder */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Instructions */}
        <div className="mb-8 rounded-xl border border-border bg-card/50 p-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Sa har bygger du en achievement:</h2>
          <ol className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <span><strong>Valj tema</strong> - fargpalett for hela achievementen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <span><strong>Valj bas & symbol</strong> - formen och central ikon</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              <span><strong>Lagg till dekorationer</strong> - bakre och framre lager</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                4
              </span>
              <span><strong>Exportera</strong> - generera JSON for anvandning</span>
            </li>
          </ol>
        </div>

        <AchievementBuilder />
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-border bg-card/50 py-6">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Achievement Builder är en del av Lekbankens admin-verktyg.
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <Link href="/sandbox" className="hover:text-foreground">
                ← Tillbaka till Sandbox
              </Link>
              <span>•</span>
              <Link href="/sandbox/admin" className="hover:text-foreground">
                Admin Components
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
