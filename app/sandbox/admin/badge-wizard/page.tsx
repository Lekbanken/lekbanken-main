'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { AchievementEditorWizard } from '@/features/admin/achievements/editor/AchievementEditorWizard'
import { AchievementItem } from '@/features/admin/achievements/types'
import { themes } from '@/features/admin/achievements/data'
import { SandboxShell as SandboxShellV2 } from '../../components/shell/SandboxShellV2'

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
    <SandboxShellV2
      moduleId="admin-achievements"
      title="Badge Wizard Editor"
      description="Ny wizard-baserad badge-editor med 4 steg."
    >
      <div className="space-y-6">
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Badge Wizard Editor</h1>
              <p className="text-sm text-muted-foreground">
                Ny wizard-baserad badge-editor med 4 steg
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="primary" size="sm">Wizard v2.0</Badge>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-muted/50 hover:bg-muted"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <div>
                <h2 className="font-semibold text-foreground">Ny Wizard-baserad Editor!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Steg-för-steg: <strong>Lagerval</strong> → <strong>Tema & Färger</strong> → <strong>Metadata</strong> → <strong>Publicering</strong>.
                  Inkluderar hex-färginmatning, slumpa-knappar, kort/ring-preview och presets.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <AchievementEditorWizard
            draft={draft}
            onDraftChange={setDraft}
            onSave={handleSave}
            isSaving={false}
          />
        </div>

        {showJson && savedData && (
          <div className="mt-2 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Exporterad JSON
              </h3>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(savedData, null, 2))}
                className="px-3 py-1 text-xs rounded-lg border border-border bg-background hover:bg-muted"
              >
                Kopiera
              </button>
            </div>
            <pre className="text-xs bg-background rounded-lg p-4 overflow-x-auto border border-border">
              {JSON.stringify(savedData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </SandboxShellV2>
  )
}
