'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AchievementPreview } from './AchievementPreview'
import { ThemeSelector } from './ThemeSelector'
import { BaseSelector, SymbolSelector, DecorationSelector } from './ElementSelector'
import { ExportPanel } from './ExportPanel'
import { useAchievementBuilderStore } from './store'

const BUILDER_TABS = [
  { id: 'theme', label: 'Tema', icon: <PaletteIcon /> },
  { id: 'base', label: 'Bas & Symbol', icon: <LayersIcon /> },
  { id: 'decorations', label: 'Dekorationer', icon: <SparklesIcon /> },
]

function PaletteIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}

export function AchievementBuilder() {
  const state = useAchievementBuilderStore((s) => s.state)
  const setProfileFrameEnabled = useAchievementBuilderStore((s) => s.setProfileFrameEnabled)
  const [activeTab, setActiveTab] = useState('theme')

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Controls */}
      <div className="space-y-4 lg:col-span-5">
        <Card className="overflow-hidden border-2">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Bygg din Achievement</CardTitle>
              <Badge variant="primary" size="sm">
                Builder v1.0
              </Badge>
            </div>
            <Tabs
              tabs={BUILDER_TABS}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="default"
              size="sm"
              className="mt-4"
            />
          </CardHeader>
          <CardContent className="p-5">
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <ThemeSelector />
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Tips:</strong> Välj ett tema som passar din achievement. Temafärgerna påverkar hur "Tema"-färger visas i preview.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'base' && (
              <div className="space-y-6">
                <BaseSelector />
                <div className="h-px bg-border" />
                <SymbolSelector />
              </div>
            )}

            {activeTab === 'decorations' && (
              <div className="space-y-6">
                <DecorationSelector position="back" />
                <div className="h-px bg-border" />
                <DecorationSelector position="front" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Frame (future) */}
        <Card className="border-dashed opacity-75">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Profilram</CardTitle>
              <Badge variant="secondary" size="sm">
                Kommer snart
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex cursor-not-allowed items-center gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={state.profileFrame?.enabled}
                onChange={(e) => setProfileFrameEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border"
                disabled
              />
              Aktivera profilram-stil
            </label>
            <p className="text-xs text-muted-foreground">
              Profilramar ger spelaren en unik ram runt sin avatar baserad på achievement-designen.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle: Preview */}
      <div className="lg:col-span-4">
        <Card className="sticky top-4 overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-muted/30 to-muted/10 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Preview</CardTitle>
              <div className="flex gap-1">
                {['sm', 'md', 'lg'].map((size) => (
                  <button
                    key={size}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                      size === 'md' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {size.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <AchievementPreview state={state} size="lg" />
            
            {/* Layer info */}
            <div className="mt-6 w-full space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Aktiva lager</h4>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" size="sm">
                  Bas: {state.base.type}
                </Badge>
                <Badge variant="outline" size="sm">
                  Symbol: {state.symbol.type}
                </Badge>
                {state.backDecorations.map((d, i) => (
                  <Badge key={`back-${i}`} variant="secondary" size="sm">
                    ↓ {d.type}
                  </Badge>
                ))}
                {state.frontDecorations.map((d, i) => (
                  <Badge key={`front-${i}`} variant="primary" size="sm">
                    ↑ {d.type}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Export */}
      <div className="space-y-4 lg:col-span-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export & Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <ExportPanel />
          </CardContent>
        </Card>

        {/* Marketplace teaser */}
        <Card className="border-dashed bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">🛍️</span>
              <h4 className="font-semibold text-foreground">Marketplace</h4>
              <Badge variant="accent" size="sm">
                Snart
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Kommer snart: Köp och sälj skins, badge-packs, ramar och symboler. Skapa unika achievements med premium-innehåll.
            </p>
            <div className="mt-3 flex gap-2">
              <Badge variant="outline" size="sm">
                Skins
              </Badge>
              <Badge variant="outline" size="sm">
                Packs
              </Badge>
              <Badge variant="outline" size="sm">
                Ramar
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card className="border-dashed opacity-75">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Behörigheter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Org:</span> OrgAdmin, SystemAdmin, GameAdmin
            </p>
            <p>
              <span className="font-medium text-foreground">Global:</span> SystemAdmin, GameAdmin
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
