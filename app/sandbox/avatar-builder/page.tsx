'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  AvatarBuilderShell, 
  AvatarRenderer,
  AvatarTabs, 
  AvatarPartGrid, 
  AvatarPalette 
} from './components'
import type { AvatarRendererHandle } from './components'
import type { AvatarConfig, AvatarCategory } from './types'
import { STORAGE_KEY_CONFIG, STORAGE_KEY_PREVIEW, DEFAULT_AVATAR_CONFIG } from './types'
import { AVATAR_PARTS, PALETTES, getPartById } from './seed-data'
import { ArrowPathIcon, ArrowUturnLeftIcon, CheckIcon } from '@heroicons/react/24/outline'
import { BookmarkIcon } from '@heroicons/react/24/solid'

export default function AvatarBuilderPage() {
  // Core state
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG)
  const [activeTab, setActiveTab] = useState<AvatarCategory>('body')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Ref for PNG export
  const rendererRef = useRef<AvatarRendererHandle>(null)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG)
      if (stored) {
        const parsed = JSON.parse(stored) as AvatarConfig
        // Validate version compatibility
        if (parsed.version === 1 && parsed.layers) {
          setConfig(parsed)
        }
      }
    } catch (e) {
      console.warn('Failed to load avatar config from localStorage:', e)
    }
    setIsLoaded(true)
  }, [])

  // Get current selections
  const currentLayerConfig = config.layers[activeTab]
  const selectedPartId = currentLayerConfig?.partId ?? null
  const selectedColor = currentLayerConfig?.color ?? null
  const currentParts = AVATAR_PARTS[activeTab]
  const currentPalettes = PALETTES[activeTab]

  // Check if current part supports color
  const selectedPart = selectedPartId ? getPartById(activeTab, selectedPartId) : null
  const showPalette = selectedPart?.supportsColor ?? false

  // Update a layer's part
  const handlePartSelect = useCallback((partId: string) => {
    setConfig(prev => ({
      ...prev,
      layers: {
        ...prev.layers,
        [activeTab]: {
          ...prev.layers[activeTab],
          partId,
        }
      }
    }))
  }, [activeTab])

  // Update a layer's color
  const handleColorSelect = useCallback((colorToken: string) => {
    setConfig(prev => ({
      ...prev,
      layers: {
        ...prev.layers,
        [activeTab]: {
          ...prev.layers[activeTab],
          color: colorToken,
        }
      }
    }))
  }, [activeTab])

  // Randomize all layers
  const handleRandomize = useCallback(() => {
    const newLayers = { ...config.layers }
    
    for (const category of Object.keys(AVATAR_PARTS) as AvatarCategory[]) {
      const parts = AVATAR_PARTS[category]
      const palettes = PALETTES[category]
      
      // Random part
      const randomPart = parts[Math.floor(Math.random() * parts.length)]
      
      // Random color (if part supports it)
      let randomColor = newLayers[category]?.color
      if (randomPart.supportsColor && palettes.length > 0) {
        randomColor = palettes[Math.floor(Math.random() * palettes.length)].token
      }
      
      newLayers[category] = {
        partId: randomPart.id,
        color: randomColor,
      }
    }
    
    setConfig(prev => ({ ...prev, layers: newLayers }))
  }, [config.layers])

  // Reset to default
  const handleReset = useCallback(() => {
    setConfig(DEFAULT_AVATAR_CONFIG)
  }, [])

  // Save to localStorage + export PNG
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    
    try {
      // Save config JSON
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config))
      
      // Export PNG
      if (rendererRef.current) {
        const pngDataUrl = await rendererRef.current.exportToPng()
        if (pngDataUrl) {
          localStorage.setItem(STORAGE_KEY_PREVIEW, pngDataUrl)
        }
      }
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (e) {
      console.error('Failed to save avatar:', e)
    } finally {
      setIsSaving(false)
    }
  }, [config])

  // Don't render until hydrated to avoid mismatch
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-teal-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-teal-50">
      {/* Page header */}
      <div className="text-center pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Avatar Builder</h1>
        <p className="text-sm text-gray-500 mt-1">Create your unique avatar</p>
      </div>

      {/* Mobile frame with builder */}
      <AvatarBuilderShell>
        {/* App header */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">My Avatar</h2>
        </div>

        {/* Avatar preview */}
        <div className="flex justify-center mb-4">
          <AvatarRenderer 
            ref={rendererRef}
            config={config} 
            size={140}
            className="ring-4 ring-white shadow-lg"
          />
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-3 mb-4">
          <button
            onClick={handleRandomize}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Random
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <CheckIcon className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <BookmarkIcon className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </>
            )}
          </button>
        </div>

        {/* Category tabs */}
        <AvatarTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          className="mb-3"
        />

        {/* Color palette (if applicable) */}
        {showPalette && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Color</p>
            <AvatarPalette
              palettes={currentPalettes}
              selectedToken={selectedColor}
              onSelect={handleColorSelect}
            />
          </div>
        )}

        {/* Part grid */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5 font-medium">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Options
          </p>
          <AvatarPartGrid
            parts={currentParts}
            category={activeTab}
            selectedPartId={selectedPartId}
            selectedColor={selectedColor}
            onSelect={handlePartSelect}
          />
        </div>
      </AvatarBuilderShell>

      {/* Footer info */}
      <div className="text-center pb-8 text-xs text-gray-400">
        Avatar saved to localStorage • Sandbox Demo
      </div>
    </div>
  )
}
