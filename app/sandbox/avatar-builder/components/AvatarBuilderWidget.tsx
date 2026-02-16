'use client'

import { useState } from 'react'
import type { AvatarConfig } from '../types'
import { CATEGORY_META } from '../types'
import { AvatarRenderer, AvatarTabs, AvatarPartGrid, AvatarDownloadButton } from '../components'
import { useAvatarBuilder } from '../hooks/useAvatarBuilder'
import type { UseAvatarBuilderOptions } from '../hooks/useAvatarBuilder'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AvatarBuilderWidgetProps {
  /** Starting config (falls back to default) */
  initialConfig?: AvatarConfig | null
  /** Called on every config change (for dirty tracking / autosave) */
  onChange?: UseAvatarBuilderOptions['onChange']
  /** Called when user clicks "Save". Receives config + PNG blob. */
  onSave?: (payload: { config: AvatarConfig; blob: Blob }) => Promise<void> | void
  /** Called when user clicks "Cancel" */
  onCancel?: () => void
  /** Hide the save button (default: false) */
  hideSave?: boolean
  /** Hide the download button (default: false) */
  hideDownload?: boolean
  /** Label for the save button (default: "Spara") */
  saveLabel?: string
  /** Label for the cancel button (default: "Avbryt") */
  cancelLabel?: string
  /** Extra CSS class on the outer wrapper */
  className?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget
// ─────────────────────────────────────────────────────────────────────────────

export function AvatarBuilderWidget({
  initialConfig,
  onChange,
  onSave,
  onCancel,
  hideSave = false,
  hideDownload = false,
  saveLabel = 'Spara',
  cancelLabel = 'Avbryt',
  className = '',
}: AvatarBuilderWidgetProps) {
  const {
    config,
    activeCategory,
    currentParts,
    selectedPartId,
    canReset,
    setCategory,
    selectPart,
    randomize,
    reset,
    rendererRef,
    exportToBlob,
    exportToPng,
  } = useAvatarBuilder({ initialConfig, onChange })

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSave = async () => {
    if (!onSave || isSaving) return
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const blob = await exportToBlob()
      if (!blob) throw new Error('Failed to export avatar')
      await onSave({ config, blob })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('Avatar save failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleGetPng = async () => {
    return exportToPng()
  }

  const showSave = !hideSave && !!onSave
  const showCancel = !!onCancel

  return (
    <div className={`mx-auto max-w-lg rounded-2xl border border-border bg-card shadow-sm overflow-hidden ${className}`}>
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
            onClick={randomize}
            className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <DiceIcon className="w-3.5 h-3.5" />
            Slumpa
          </button>

          <button
            onClick={reset}
            disabled={!canReset}
            className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"
          >
            <ResetIcon className="w-3.5 h-3.5" />
            Återställ
          </button>

          {showSave && (
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
                  {isSaving ? 'Sparar...' : saveLabel}
                </>
              )}
            </button>
          )}

          {showCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {cancelLabel}
            </button>
          )}

          {!hideDownload && <AvatarDownloadButton getPng={handleGetPng} />}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Picker section */}
      <div className="p-4 space-y-4">
        {/* Category tabs */}
        <AvatarTabs
          activeTab={activeCategory}
          onTabChange={setCategory}
        />

        {/* Part grid */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            {CATEGORY_META[activeCategory].label}
          </p>
          <AvatarPartGrid
            parts={currentParts}
            category={activeCategory}
            selectedPartId={selectedPartId}
            onSelect={selectPart}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline icons (self-contained — no external deps)
// ─────────────────────────────────────────────────────────────────────────────

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
