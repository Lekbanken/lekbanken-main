'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAchievementBuilderStore } from './store'
import { AchievementExport } from '@/types/achievements-builder'

type Rarity = NonNullable<AchievementExport['metadata']>['rarity']

const RARITY_OPTIONS: { value: Rarity; label: string; color: string }[] = [
  { value: 'common', label: 'Common', color: 'bg-muted text-muted-foreground' },
  { value: 'rare', label: 'Rare', color: 'bg-blue-100 text-blue-700' },
  { value: 'epic', label: 'Epic', color: 'bg-purple-100 text-purple-700' },
  { value: 'legendary', label: 'Legendary', color: 'bg-amber-100 text-amber-700' },
  { value: 'limited', label: 'Limited', color: 'bg-rose-100 text-rose-700' },
] as const

export function ExportPanel() {
  const exportAchievement = useAchievementBuilderStore((s) => s.exportAchievement)
  const [createdBy, setCreatedBy] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [rarity, setRarity] = useState<Rarity>('common')
  const [json, setJson] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleExport() {
    const data = exportAchievement({
      createdBy: createdBy || 'demo-user',
      name: name || undefined,
      description: description || undefined,
      rarity,
    })
    setJson(JSON.stringify(data, null, 2))
  }

  function handleCopy() {
    if (!json) {
      handleExport()
    }
    const data = json || JSON.stringify(exportAchievement({ createdBy: createdBy || 'demo-user', name, description, rarity }), null, 2)
    navigator.clipboard.writeText(data)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSave() {
    // Mock save
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Metadata */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Metadata</h3>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Skapad av</label>
          <input
            type="text"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            placeholder="Ange skapare/anv?ndare..."
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Namn</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ange achievement-namn..."
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Beskrivning</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beskriv hur man får denna achievement..."
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Raritet</label>
          <div className="flex flex-wrap gap-2">
            {RARITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRarity(opt.value)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  opt.value === rarity
                    ? `${opt.color} ring-2 ring-offset-1 ring-primary`
                    : `${opt.color} opacity-60 hover:opacity-100`
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button onClick={handleExport} className="flex-1">
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Generera JSON
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <svg className="mr-1 h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Kopierad!
              </>
            ) : (
              <>
                <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Kopiera
              </>
            )}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} className="flex-1">
            {saved ? (
              <>
                <svg className="mr-2 h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Sparad!
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Spara utkast
              </>
            )}
          </Button>
          <Button variant="ghost" className="flex-1" disabled>
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Dela (snart)
          </Button>
        </div>
      </div>

      {/* JSON output */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">JSON-output</h3>
          {json && <Badge variant="success" size="sm">Genererad</Badge>}
        </div>
        <pre className="max-h-64 overflow-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs text-muted-foreground">
          {json || '// Klicka "Generera JSON" för att se output'}
        </pre>
      </div>
    </div>
  )
}
