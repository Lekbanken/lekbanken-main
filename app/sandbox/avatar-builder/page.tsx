'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  AvatarRenderer,
  AvatarTabs,
  AvatarPartGrid,
  AvatarDownloadButton,
} from './components'
import type { AvatarRendererHandle } from './components'
import type { AvatarConfig, AvatarCategory } from './types'
import { STORAGE_KEY_CONFIG, STORAGE_KEY_PREVIEW, DEFAULT_AVATAR_CONFIG, CATEGORY_META } from './types'
import { AVATAR_PARTS, OPTIONAL_CATEGORIES } from './seed-data'
import { SandboxShell } from '../components/shell/SandboxShellV2'

export default function AvatarBuilderPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG)
  const [activeTab, setActiveTab] = useState<AvatarCategory>('face')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const rendererRef = useRef<AvatarRendererHandle>(null)

  // ── Load from localStorage ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG)
      if (stored) {
        const parsed = JSON.parse(stored) as AvatarConfig
        if (parsed.version === 2 && parsed.layers) {
          setConfig(parsed)
        }
      }
    } catch {
      console.warn('Failed to load avatar config')
    }
    setIsLoaded(true)
  }, [])

  // ── Derived values ──────────────────────────────────────────────────────────
  const currentParts = AVATAR_PARTS[activeTab]
  const selectedPartId = config.layers[activeTab]?.partId ?? null

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handlePartSelect = useCallback(
    (partId: string | null) => {
      setConfig((prev) => ({
        ...prev,
        layers: {
          ...prev.layers,
          [activeTab]: { ...prev.layers[activeTab], partId },
        },
      }))
    },
    [activeTab]
  )

  const handleRandomize = useCallback(() => {
    const newLayers = { ...config.layers }

    for (const category of Object.keys(AVATAR_PARTS) as AvatarCategory[]) {
      const parts = AVATAR_PARTS[category]
      const isOptional = OPTIONAL_CATEGORIES.includes(category)

      // 20% chance of "none" for optional categories
      if (isOptional && Math.random() < 0.2) {
        newLayers[category] = { partId: null }
      } else {
        const randomPart = parts[Math.floor(Math.random() * parts.length)]
        newLayers[category] = { partId: randomPart.id }
      }
    }

    setConfig((prev) => ({ ...prev, layers: newLayers }))
  }, [config.layers])

  const handleReset = useCallback(() => {
    setConfig(DEFAULT_AVATAR_CONFIG)
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config))

      if (rendererRef.current) {
        const pngDataUrl = await rendererRef.current.exportToPng()
        if (pngDataUrl) {
          localStorage.setItem(STORAGE_KEY_PREVIEW, pngDataUrl)
        }
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      console.error('Failed to save avatar')
    } finally {
      setIsSaving(false)
    }
  }, [config])

  const handleGetPng = useCallback(async () => {
    return rendererRef.current?.exportToPng() ?? null
  }, [])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <SandboxShell
        moduleId="avatar-builder"
        title="Avatar Builder"
        description="Skapa din unika avatar genom att kombinera ansikten, ögon, näsor, munnar, frisyrer och glasögon."
      >
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </SandboxShell>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SandboxShell
      moduleId="avatar-builder"
      title="Avatar Builder"
      description="Skapa din unika avatar genom att kombinera ansikten, ögon, näsor, munnar, frisyrer och glasögon."
    >
      {/* Single module card */}
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Avatar preview */}
        <div className="flex flex-col items-center gap-4 bg-gradient-to-b from-muted/50 to-transparent px-6 pt-6 pb-4">
          <AvatarRenderer
            ref={rendererRef}
            config={config}
            size={160}
            className="ring-4 ring-white shadow-lg"
          />

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              onClick={handleRandomize}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <DiceIcon className="w-3.5 h-3.5" />
              Slumpa
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ResetIcon className="w-3.5 h-3.5" />
              Återställ
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5" />
                  Sparad!
                </>
              ) : (
                <>
                  <SaveIcon className="w-3.5 h-3.5" />
                  {isSaving ? 'Sparar...' : 'Spara'}
                </>
              )}
            </button>

            <AvatarDownloadButton getPng={handleGetPng} />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Picker section */}
        <div className="p-4 space-y-4">
          {/* Category tabs */}
          <AvatarTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Part grid */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {CATEGORY_META[activeTab].label}
            </p>
            <AvatarPartGrid
              parts={currentParts}
              category={activeTab}
              selectedPartId={selectedPartId}
              onSelect={handlePartSelect}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2">
          <p className="text-center text-[10px] text-muted-foreground">
            Sparas i localStorage &bull; Sandbox
          </p>
        </div>
      </div>
    </SandboxShell>
  )
}

// ── Inline icon components ─────────────────────────────────────────────────

function DiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
    </svg>
  )
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 21 17 13 7 13 7 21" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="7 3 7 8 15 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
