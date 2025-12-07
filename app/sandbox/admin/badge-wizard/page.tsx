'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { AchievementEditorWizard } from '@/features/admin/achievements/editor/AchievementEditorWizard'
import { AchievementItem } from '@/features/admin/achievements/types'
import { themes } from '@/features/admin/achievements/data'

const DEFAULT_ACHIEVEMENT: AchievementItem = {
  id: 'sandbox-demo',
  title: 'Min Nya Badge',
  subtitle: 'Sandbox Demo',
  description: 'Testa att bygga en badge med den nya wizard-editorn!',
  rewardCoins: 100,
  status: 'draft',
  version: 1,
  icon: {
    mode: 'theme',
    themeId: themes[0]?.id ?? 'gold_default',
    size: 'lg',
    base: { id: 'base_circle' },
    symbol: { id: 'ic_singlestar' },
    backgrounds: [],
    foregrounds: [],
  },
  profileFrameSync: { enabled: false },
  publishedRoles: [],
}

export default function AchievementWizardPage() {
  const [draft, setDraft] = useState<AchievementItem>(DEFAULT_ACHIEVEMENT)
  const [savedData, setSavedData] = useState<AchievementItem | null>(null)
  const [showJson, setShowJson] = useState(false)

  const handleSave = () => {
    setSavedData(draft)
    setShowJson(true)
  }

  const handleReset = () => {
    setDraft(DEFAULT_ACHIEVEMENT)
    setSavedData(null)
    setShowJson(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/sandbox" className="text-muted-foreground hover:text-foreground">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <span className="text-2xl">🧙‍♂️</span>
                Badge Wizard Editor
              </h1>
              <p className="text-sm text-muted-foreground">
                Ny wizard-baserad badge-editor med 4 steg
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="primary" size="sm">
              🆕 Wizard v2.0
            </Badge>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-muted/50 hover:bg-muted"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Info banner */}
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <h2 className="font-semibold text-foreground">Ny Wizard-baserad Editor!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Steg-för-steg: <strong>Lagerval</strong> → <strong>Tema & Färger</strong> → <strong>Metadata</strong> → <strong>Publicering</strong>.
                Inkluderar hex-färginput, slumpa-knappar, kort/ring-preview och presets.
              </p>
            </div>
          </div>
        </div>

        {/* Wizard Editor */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <AchievementEditorWizard
            draft={draft}
            onDraftChange={setDraft}
            onSave={handleSave}
            isSaving={false}
          />
        </div>

        {/* JSON Output */}
        {showJson && savedData && (
          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                📦 Exporterad JSON
              </h3>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(savedData, null, 2))}
                className="px-3 py-1 text-xs rounded-lg border border-border bg-background hover:bg-muted"
              >
                📋 Kopiera
              </button>
            </div>
            <pre className="text-xs bg-background rounded-lg p-4 overflow-x-auto border border-border">
              {JSON.stringify(savedData, null, 2)}
            </pre>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-border bg-card/50 py-6">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Badge Wizard Editor är en del av Lekbankens admin-verktyg.
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <Link href="/sandbox/admin/achievements-builder" className="hover:text-foreground">
                ← Gammal Builder
              </Link>
              <span>•</span>
              <Link href="/sandbox" className="hover:text-foreground">
                Sandbox
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
