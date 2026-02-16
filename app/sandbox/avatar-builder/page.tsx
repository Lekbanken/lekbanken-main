'use client'

import { useState, useCallback } from 'react'
import { AvatarBuilderWidget } from './components'
import type { AvatarConfig } from './types'
import { STORAGE_KEY_CONFIG, STORAGE_KEY_PREVIEW } from './types'
import { SandboxShell } from '../components/shell/SandboxShellV2'

export default function AvatarBuilderPage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [initialConfig, setInitialConfig] = useState<AvatarConfig | undefined>()

  // Load saved config from localStorage on first render
  if (!isLoaded) {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_CONFIG) : null
      if (stored) {
        const parsed = JSON.parse(stored) as AvatarConfig
        if (parsed.version === 2 && parsed.layers) {
          setInitialConfig(parsed)
        }
      }
    } catch {
      console.warn('Failed to load avatar config from localStorage')
    }
    setIsLoaded(true)
  }

  const handleSave = useCallback(async ({ config, blob }: { config: AvatarConfig; blob: Blob }) => {
    // Sandbox mode: persist to localStorage
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config))

    // Also store the preview PNG as data URL for quick display
    const reader = new FileReader()
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
    localStorage.setItem(STORAGE_KEY_PREVIEW, dataUrl)
  }, [])

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

  return (
    <SandboxShell
      moduleId="avatar-builder"
      title="Avatar Builder"
      description="Skapa din unika avatar genom att kombinera ansikten, ögon, näsor, munnar, frisyrer och glasögon."
    >
      <AvatarBuilderWidget
        initialConfig={initialConfig}
        onSave={handleSave}
        saveLabel="Spara"
      />

      {/* Sandbox footer */}
      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Sparas i localStorage &bull; Sandbox
      </p>
    </SandboxShell>
  )
}
