'use client'

import {
  PaintBrushIcon,
  SwatchIcon,
  SparklesIcon,
  UserCircleIcon,
  PhotoIcon,
  MusicalNoteIcon,
  DevicePhoneMobileIcon,
  CheckIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useState } from 'react'

const THEME_OPTIONS = [
  { value: 'default', label: 'Standard' },
  { value: 'dark', label: 'Mörkt' },
  { value: 'light', label: 'Ljust' },
  { value: 'colorful', label: 'Färgglatt' },
]

const THEMES = [
  { id: 'default', name: 'Standard', primary: '#8661ff', accent: '#00c7b0', bg: '#ffffff' },
  { id: 'ocean', name: 'Havsbris', primary: '#0ea5e9', accent: '#06b6d4', bg: '#f0f9ff' },
  { id: 'forest', name: 'Skogsgrön', primary: '#22c55e', accent: '#84cc16', bg: '#f0fdf4' },
  { id: 'sunset', name: 'Solnedgång', primary: '#f97316', accent: '#eab308', bg: '#fffbeb' },
  { id: 'berry', name: 'Bärfärger', primary: '#ec4899', accent: '#8b5cf6', bg: '#fdf4ff' },
  { id: 'dark', name: 'Mörkt läge', primary: '#8661ff', accent: '#00c7b0', bg: '#1f2937' },
]

const AVATARS = [
  '🦊', '🐻', '🐰', '🦁', '🐸', '🐱', '🐶', '🦄', '🐼', '🐨', '🦋', '🌟',
]

const AVATAR_FRAMES = [
  { id: 'none', name: 'Ingen', color: 'transparent' },
  { id: 'gold', name: 'Guld', color: '#ffd700' },
  { id: 'silver', name: 'Silver', color: '#c0c0c0' },
  { id: 'rainbow', name: 'Regnbåge', color: 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)' },
  { id: 'fire', name: 'Eld', color: '#ff4500' },
  { id: 'ice', name: 'Is', color: '#00bfff' },
]

const SOUNDS = [
  { id: 'default', name: 'Standard', description: 'Klassiska spelljud' },
  { id: 'retro', name: 'Retro', description: '8-bit ljud' },
  { id: 'nature', name: 'Natur', description: 'Mjuka naturljud' },
  { id: 'fun', name: 'Roliga', description: 'Humoristiska ljud' },
  { id: 'silent', name: 'Tyst', description: 'Inga ljud' },
]

const STATS = [
  { label: 'Aktiva teman', value: '6', icon: SwatchIcon },
  { label: 'Avatarer', value: '48', icon: UserCircleIcon },
  { label: 'Ljudpaket', value: '5', icon: MusicalNoteIcon },
  { label: 'Anpassningar idag', value: '1,247', icon: SparklesIcon },
]

export default function PersonalizationSandboxPage() {
  const [selectedTheme, setSelectedTheme] = useState('default')
  const [selectedAvatar, setSelectedAvatar] = useState('🦊')
  const [selectedFrame, setSelectedFrame] = useState('none')
  const [selectedSound, setSelectedSound] = useState('default')

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a 
              href="/sandbox/admin" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Tillbaka
            </a>
            <h1 className="text-lg font-semibold text-foreground">Personalization</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      <div className="p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Action buttons */}
          <div className="flex justify-end">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Lägg till tema
            </Button>
          </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Themes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PaintBrushIcon className="h-5 w-5 text-gray-600" />
                  <h3 className="font-semibold text-lg">Teman</h3>
                </div>
                <Button variant="outline" size="sm">
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Nytt tema
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {THEMES.map((theme) => (
                  <div
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedTheme === theme.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-sm">{theme.name}</span>
                      {selectedTheme === theme.id && (
                        <CheckIcon className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div
                        className="h-8 w-8 rounded-lg border"
                        style={{ backgroundColor: theme.primary }}
                        title="Primär"
                      />
                      <div
                        className="h-8 w-8 rounded-lg border"
                        style={{ backgroundColor: theme.accent }}
                        title="Accent"
                      />
                      <div
                        className="h-8 w-8 rounded-lg border"
                        style={{ backgroundColor: theme.bg }}
                        title="Bakgrund"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Avatars */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCircleIcon className="h-5 w-5 text-gray-600" />
                  <h3 className="font-semibold text-lg">Avatarer</h3>
                </div>
                <Button variant="outline" size="sm">
                  <PhotoIcon className="h-4 w-4 mr-1" />
                  Ladda upp
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 mb-3">Välj avatar</p>
                <div className="grid grid-cols-6 gap-2">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`h-12 w-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                        selectedAvatar === avatar
                          ? 'bg-primary/10 ring-2 ring-primary'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-3">Avatarram</p>
                <div className="grid grid-cols-3 gap-2">
                  {AVATAR_FRAMES.map((frame) => (
                    <button
                      key={frame.id}
                      onClick={() => setSelectedFrame(frame.id)}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        selectedFrame === frame.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="h-10 w-10 rounded-full mx-auto mb-1 border-4 flex items-center justify-center text-xl"
                        style={{ 
                          borderColor: frame.id === 'none' ? '#e5e7eb' : frame.color,
                          background: frame.id === 'rainbow' ? frame.color : 'transparent'
                        }}
                      >
                        {selectedAvatar}
                      </div>
                      <span className="text-xs font-medium">{frame.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sound Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MusicalNoteIcon className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-lg">Ljudinställningar</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {SOUNDS.map((sound) => (
                  <div
                    key={sound.id}
                    onClick={() => setSelectedSound(sound.id)}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedSound === sound.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{sound.name}</p>
                      <p className="text-sm text-gray-600">{sound.description}</p>
                    </div>
                    {selectedSound === sound.id && (
                      <CheckIcon className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preview & Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DevicePhoneMobileIcon className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-lg">Förhandsgranskning</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="rounded-xl p-6 text-center"
                style={{ 
                  backgroundColor: THEMES.find(t => t.id === selectedTheme)?.bg || '#ffffff',
                }}
              >
                <div 
                  className="h-20 w-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl border-4"
                  style={{ 
                    borderColor: AVATAR_FRAMES.find(f => f.id === selectedFrame)?.color || 'transparent',
                  }}
                >
                  {selectedAvatar}
                </div>
                <h4 className="font-bold text-lg">SpelareNamn</h4>
                <p className="text-sm text-gray-600 mb-4">Nivå 42 • 12,450 poäng</p>
                <div className="flex justify-center gap-2">
                  <Button 
                    size="sm"
                    style={{ 
                      backgroundColor: THEMES.find(t => t.id === selectedTheme)?.primary,
                    }}
                  >
                    Primär knapp
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    style={{ 
                      borderColor: THEMES.find(t => t.id === selectedTheme)?.accent,
                      color: THEMES.find(t => t.id === selectedTheme)?.accent,
                    }}
                  >
                    Sekundär
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Standardtema för nya användare</label>
                  <Select
                    options={THEME_OPTIONS}
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Tillåt egna teman</p>
                    <p className="text-sm text-gray-600">Låt användare skapa egna färgscheman</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Premium-avatarer</p>
                    <p className="text-sm text-gray-600">Visa premium-avatarer för alla</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Temahantering med färgväljare</li>
            <li>Avatarer med kategorier och ramar</li>
            <li>Ljudpaket</li>
            <li>Förhandsvisning av anpassningar</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
      </div>
    </div>
  )
}
