'use client'

import { useState } from 'react'
import { JourneyOverview } from '@/components/journey'
import { 
  getFactionTheme, 
  getAllFactions,
} from '@/lib/factions'
import type { FactionId, JourneyState, JourneySandboxState } from '@/types/journey'

// =============================================================================
// Mock Data
// =============================================================================

function createMockJourney(level: number, xpProgress: number, factionId: FactionId): JourneyState {
  const xpToNextLevel = 500 + (level * 100)
  const currentXP = Math.floor(xpToNextLevel * (xpProgress / 100))
  
  return {
    userId: 'mock-user-1',
    displayName: 'Lekledare Anna',
    avatarUrl: undefined, // No avatar to test placeholder
    faction: factionId,
    level,
    currentXP,
    xpToNextLevel,
    totalXP: 5000 + currentXP,
    totalCoins: 1250,
    badgeCount: 12,
    currentStreak: 7,
    longestStreak: 14,
    nextMilestone: {
      type: 'badge',
      label: 'Stjärnledare',
      description: 'Håll 10 sessioner',
      progress: 80,
    },
    memberSince: '2025-03-15',
    lastActive: '2026-01-05',
  }
}

// =============================================================================
// Sandbox Page
// =============================================================================

export default function JourneySandboxPage() {
  // Sandbox controls state
  const [state, setState] = useState<JourneySandboxState>({
    selectedFaction: null,
    isCompact: false,
    reducedMotion: false,
    mockLevel: 12,
    mockXPProgress: 65,
  })

  // Derive theme and journey data
  const theme = getFactionTheme(state.selectedFaction)
  const journey = createMockJourney(state.mockLevel, state.mockXPProgress, state.selectedFaction)

  const factions = getAllFactions()

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Control Panel */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-bold text-gray-900 mb-4">
            🧭 Journey Sandbox
          </h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Faction Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Faction
              </label>
              <select
                value={state.selectedFaction ?? ''}
                onChange={(e) => setState(s => ({ 
                  ...s, 
                  selectedFaction: e.target.value ? e.target.value as FactionId : null 
                }))}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="">Neutral (ingen)</option>
                {factions.map(f => (
                  <option key={f.id} value={f.id ?? ''}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Level: {state.mockLevel}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={state.mockLevel}
                onChange={(e) => setState(s => ({ ...s, mockLevel: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* XP Progress */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                XP Progress: {state.mockXPProgress}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={state.mockXPProgress}
                onChange={(e) => setState(s => ({ ...s, mockXPProgress: parseInt(e.target.value) }))}
                className="w-full"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.isCompact}
                  onChange={(e) => setState(s => ({ ...s, isCompact: e.target.checked }))}
                  className="rounded"
                />
                Compact (Dashboard)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.reducedMotion}
                  onChange={(e) => setState(s => ({ ...s, reducedMotion: e.target.checked }))}
                  className="rounded"
                />
                Reduced Motion
              </label>
            </div>
          </div>

          {/* Faction Quick Select */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setState(s => ({ ...s, selectedFaction: null }))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                state.selectedFaction === null 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Neutral
            </button>
            {factions.map(f => (
              <button
                key={f.id}
                onClick={() => setState(s => ({ ...s, selectedFaction: f.id }))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors`}
                style={{
                  backgroundColor: state.selectedFaction === f.id ? f.accentColor : f.accentColorMuted,
                  color: state.selectedFaction === f.id ? 'white' : f.accentColor,
                }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="max-w-md mx-auto bg-white shadow-2xl my-8 rounded-3xl overflow-hidden">
        {/* Mobile Device Frame Simulation */}
        <div className="relative">
          {/* Status bar mockup */}
          <div 
            className="flex items-center justify-between px-6 py-2 text-xs text-white/80"
            style={{ 
              background: `linear-gradient(180deg, ${theme.gradientFrom} 0%, ${theme.gradientFrom} 100%)` 
            }}
          >
            <span className="font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px]">5G</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="7" width="3" height="14" rx="1"/>
                <rect x="7" y="4" width="3" height="17" rx="1"/>
                <rect x="12" y="1" width="3" height="20" rx="1"/>
                <rect x="17" y="4" width="3" height="17" rx="1"/>
              </svg>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="7" width="18" height="10" rx="2"/>
                <rect x="20" y="10" width="2" height="4" rx="1"/>
                <rect x="4" y="9" width="12" height="6" rx="1" fill="white"/>
              </svg>
            </div>
          </div>

          {/* Content */}
          <JourneyOverview
            journey={journey}
            theme={theme}
            compact={state.isCompact}
            reducedMotion={state.reducedMotion}
          />
        </div>
      </div>

      {/* Theme Debug Info */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <details className="bg-white rounded-lg shadow p-4">
          <summary className="font-medium text-gray-900 cursor-pointer">
            🎨 Theme Debug
          </summary>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Accent</p>
              <div className="flex items-center gap-2 mt-1">
                <div 
                  className="w-6 h-6 rounded" 
                  style={{ backgroundColor: theme.accentColor }}
                />
                <code className="text-xs">{theme.accentColor}</code>
              </div>
            </div>
            <div>
              <p className="text-gray-500">Gradient From</p>
              <div className="flex items-center gap-2 mt-1">
                <div 
                  className="w-6 h-6 rounded" 
                  style={{ backgroundColor: theme.gradientFrom }}
                />
                <code className="text-xs">{theme.gradientFrom}</code>
              </div>
            </div>
            <div>
              <p className="text-gray-500">Gradient To</p>
              <div className="flex items-center gap-2 mt-1">
                <div 
                  className="w-6 h-6 rounded" 
                  style={{ backgroundColor: theme.gradientTo }}
                />
                <code className="text-xs">{theme.gradientTo}</code>
              </div>
            </div>
            <div>
              <p className="text-gray-500">Glow</p>
              <div className="flex items-center gap-2 mt-1">
                <div 
                  className="w-6 h-6 rounded border" 
                  style={{ backgroundColor: theme.glowColor }}
                />
                <code className="text-xs">{theme.glowColor}</code>
              </div>
            </div>
          </div>
          
          <pre className="mt-4 p-3 bg-gray-50 rounded text-xs overflow-auto">
            {JSON.stringify({ theme, journey }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
