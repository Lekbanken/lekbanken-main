'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import type { AvatarConfig, AvatarCategory } from '../types'
import { DEFAULT_AVATAR_CONFIG } from '../types'
import { AVATAR_PARTS, OPTIONAL_CATEGORIES } from '../seed-data'
import type { AvatarRendererHandle } from '../components'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseAvatarBuilderOptions {
  /** Starting config (falls back to DEFAULT_AVATAR_CONFIG) */
  initialConfig?: AvatarConfig | null
  /** Called on every config change (useful for autosave / dirty tracking) */
  onChange?: (config: AvatarConfig) => void
}

export interface UseAvatarBuilderReturn {
  /** Current avatar configuration */
  config: AvatarConfig
  /** Currently active category tab */
  activeCategory: AvatarCategory
  /** Parts available for the active category */
  currentParts: typeof AVATAR_PARTS[AvatarCategory]
  /** Currently selected part ID for the active category */
  selectedPartId: string | null
  /** Whether config differs from initialConfig */
  canReset: boolean

  // ── Actions ────────────────────────────────────────────────────────────────
  /** Switch active category tab */
  setCategory: (category: AvatarCategory) => void
  /** Select a part for the active category */
  selectPart: (partId: string | null) => void
  /** Randomize all layers */
  randomize: () => void
  /** Reset to initial config */
  reset: () => void

  // ── Export ─────────────────────────────────────────────────────────────────
  /** Ref to attach to <AvatarRenderer> for PNG export */
  rendererRef: React.RefObject<AvatarRendererHandle | null>
  /** Export the current avatar as a PNG Blob (null on failure) */
  exportToBlob: () => Promise<Blob | null>
  /** Export the current avatar as a PNG data URL (null on failure) */
  exportToPng: () => Promise<string | null>
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAvatarBuilder(options: UseAvatarBuilderOptions = {}): UseAvatarBuilderReturn {
  const { initialConfig, onChange } = options
  const effectiveInitial = initialConfig ?? DEFAULT_AVATAR_CONFIG

  const [config, setConfigRaw] = useState<AvatarConfig>(effectiveInitial)
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>('face')
  const rendererRef = useRef<AvatarRendererHandle>(null)

  // Wrap setConfig to also fire onChange
  const setConfig = useCallback(
    (updater: AvatarConfig | ((prev: AvatarConfig) => AvatarConfig)) => {
      setConfigRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        onChange?.(next)
        return next
      })
    },
    [onChange]
  )

  // ── Derived ──────────────────────────────────────────────────────────────
  const currentParts = AVATAR_PARTS[activeCategory]
  const selectedPartId = config.layers[activeCategory]?.partId ?? null

  const canReset = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(effectiveInitial),
    [config, effectiveInitial]
  )

  // ── Actions ──────────────────────────────────────────────────────────────
  const setCategory = useCallback((category: AvatarCategory) => {
    setActiveCategory(category)
  }, [])

  const selectPart = useCallback(
    (partId: string | null) => {
      setConfig((prev) => ({
        ...prev,
        layers: {
          ...prev.layers,
          [activeCategory]: { ...prev.layers[activeCategory], partId },
        },
      }))
    },
    [activeCategory, setConfig]
  )

  const randomize = useCallback(() => {
    setConfig((prev) => {
      const newLayers = { ...prev.layers }
      for (const category of Object.keys(AVATAR_PARTS) as AvatarCategory[]) {
        const parts = AVATAR_PARTS[category]
        const isOptional = OPTIONAL_CATEGORIES.includes(category)
        if (isOptional && Math.random() < 0.2) {
          newLayers[category] = { partId: null }
        } else {
          const randomPart = parts[Math.floor(Math.random() * parts.length)]
          newLayers[category] = { partId: randomPart.id }
        }
      }
      return { ...prev, layers: newLayers }
    })
  }, [setConfig])

  const reset = useCallback(() => {
    setConfig(effectiveInitial)
  }, [effectiveInitial, setConfig])

  // ── Export ───────────────────────────────────────────────────────────────
  const exportToPng = useCallback(async (): Promise<string | null> => {
    return rendererRef.current?.exportToPng() ?? null
  }, [])

  const exportToBlob = useCallback(async (): Promise<Blob | null> => {
    const dataUrl = await exportToPng()
    if (!dataUrl) return null
    try {
      const res = await fetch(dataUrl)
      return await res.blob()
    } catch {
      console.error('Failed to convert data URL to Blob')
      return null
    }
  }, [exportToPng])

  return {
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
  }
}
