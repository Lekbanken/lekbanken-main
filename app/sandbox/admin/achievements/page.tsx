'use client'

import {
  TrophyIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  SwatchIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useMemo, useState, type CSSProperties } from 'react'

type BadgeTheme = {
  backgroundId: string
  symbolId: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  symbolColor: string
  textColor: string
  fontFamily: string
  effect: 'none' | 'glow' | 'shine'
}

type Achievement = {
  id: string
  name: string
  description: string
  category: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'limited'
  points: number
  status: 'active' | 'draft' | 'archived'
  unlockedBy: number
  requirement: string
  theme: BadgeTheme
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Alla kategorier' },
  { value: 'games', label: 'Spelrelaterade' },
  { value: 'streak', label: 'Streak' },
  { value: 'social', label: 'Sociala' },
  { value: 'special', label: 'Speciella' },
  { value: 'seasonal', label: 'Säsong' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alla statusar' },
  { value: 'active', label: 'Aktiva' },
  { value: 'draft', label: 'Utkast' },
  { value: 'archived', label: 'Arkiverade' },
]

const BADGE_BACKGROUNDS = [
  { value: 'orb', label: 'Orb', hint: 'Mjukt, runt kort' },
  { value: 'shield', label: 'Sköld', hint: 'Klassisk badge-form' },
  { value: 'diamond', label: 'Diamant', hint: 'Kantig, tydlig siluett' },
  { value: 'ribbon', label: 'Band', hint: 'Mjuk lång form' },
]

const BADGE_SYMBOLS = [
  { value: 'trophy', label: 'Pokal', glyph: '🏆' },
  { value: 'star', label: 'Stjärna', glyph: '⭐' },
  { value: 'flame', label: 'Flamma', glyph: '🔥' },
  { value: 'puzzle', label: 'Pussel', glyph: '🧩' },
  { value: 'controller', label: 'Spel', glyph: '🎮' },
  { value: 'comet', label: 'Komet', glyph: '🌠' },
]

const COLOR_PRESETS = [
  {
    name: 'Solnedgång',
    primaryColor: '#f97316',
    secondaryColor: '#facc15',
    accentColor: '#fb7185',
    symbolColor: '#ffffff',
    textColor: '#0f172a',
  },
  {
    name: 'Ocean',
    primaryColor: '#0ea5e9',
    secondaryColor: '#22d3ee',
    accentColor: '#22c55e',
    symbolColor: '#0b1224',
    textColor: '#0b1224',
  },
  {
    name: 'Skog',
    primaryColor: '#16a34a',
    secondaryColor: '#a3e635',
    accentColor: '#22c55e',
    symbolColor: '#0b1224',
    textColor: '#0b1224',
  },
  {
    name: 'Kosmos',
    primaryColor: '#8b5cf6',
    secondaryColor: '#22d3ee',
    accentColor: '#a855f7',
    symbolColor: '#f8fafc',
    textColor: '#e2e8f0',
  },
]

const FONT_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Neutral (Inter)' },
  { value: '"Space Grotesk", "Inter", system-ui, sans-serif', label: 'Futuristisk' },
  { value: '"Fredoka", "Inter", system-ui, sans-serif', label: 'Lekfull' },
  { value: '"Bricolage Grotesque", "Inter", system-ui, sans-serif', label: 'Bold' },
]

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ACH-001',
    name: 'Första steget',
    description: 'Slutför ditt första spel',
    category: 'games',
    rarity: 'common',
    points: 10,
    status: 'active',
    unlockedBy: 12847,
    requirement: 'games_completed >= 1',
    theme: {
      backgroundId: 'orb',
      symbolId: 'trophy',
      primaryColor: '#f97316',
      secondaryColor: '#facc15',
      accentColor: '#fb7185',
      symbolColor: '#ffffff',
      textColor: '#0f172a',
      fontFamily: '"Space Grotesk", "Inter", system-ui, sans-serif',
      effect: 'glow',
    },
  },
  {
    id: 'ACH-002',
    name: 'Spelentusiast',
    description: 'Spela 100 spel totalt',
    category: 'games',
    rarity: 'rare',
    points: 50,
    status: 'active',
    unlockedBy: 3421,
    requirement: 'games_completed >= 100',
    theme: {
      backgroundId: 'shield',
      symbolId: 'controller',
      primaryColor: '#0ea5e9',
      secondaryColor: '#22d3ee',
      accentColor: '#22c55e',
      symbolColor: '#0b1224',
      textColor: '#0b1224',
      fontFamily: 'Inter, system-ui, sans-serif',
      effect: 'shine',
    },
  },
  {
    id: 'ACH-003',
    name: 'Eldsjäl',
    description: 'Behåll en 7-dagars streak',
    category: 'streak',
    rarity: 'uncommon',
    points: 25,
    status: 'active',
    unlockedBy: 5632,
    requirement: 'current_streak >= 7',
    theme: {
      backgroundId: 'diamond',
      symbolId: 'flame',
      primaryColor: '#ef4444',
      secondaryColor: '#f97316',
      accentColor: '#f59e0b',
      symbolColor: '#0b1224',
      textColor: '#0f172a',
      fontFamily: '"Fredoka", "Inter", system-ui, sans-serif',
      effect: 'glow',
    },
  },
  {
    id: 'ACH-004',
    name: 'Månadsmaraton',
    description: 'Behåll en 30-dagars streak',
    category: 'streak',
    rarity: 'epic',
    points: 100,
    status: 'active',
    unlockedBy: 847,
    requirement: 'current_streak >= 30',
    theme: {
      backgroundId: 'ribbon',
      symbolId: 'star',
      primaryColor: '#8b5cf6',
      secondaryColor: '#22d3ee',
      accentColor: '#c084fc',
      symbolColor: '#f8fafc',
      textColor: '#0b1224',
      fontFamily: '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
      effect: 'shine',
    },
  },
  {
    id: 'ACH-005',
    name: 'Vintervärlden',
    description: 'Spela under julperioden 2024',
    category: 'seasonal',
    rarity: 'limited',
    points: 30,
    status: 'draft',
    unlockedBy: 0,
    requirement: 'played_during_christmas_2024',
    theme: {
      backgroundId: 'shield',
      symbolId: 'comet',
      primaryColor: '#0ea5e9',
      secondaryColor: '#a855f7',
      accentColor: '#67e8f9',
      symbolColor: '#f8fafc',
      textColor: '#0b1224',
      fontFamily: '"Space Grotesk", "Inter", system-ui, sans-serif',
      effect: 'none',
    },
  },
  {
    id: 'ACH-006',
    name: 'Hjälpande hand',
    description: 'Bjud in 5 vänner',
    category: 'social',
    rarity: 'uncommon',
    points: 35,
    status: 'active',
    unlockedBy: 2156,
    requirement: 'referrals >= 5',
    theme: {
      backgroundId: 'orb',
      symbolId: 'puzzle',
      primaryColor: '#22c55e',
      secondaryColor: '#a3e635',
      accentColor: '#10b981',
      symbolColor: '#0b1224',
      textColor: '#0f172a',
      fontFamily: '"Fredoka", "Inter", system-ui, sans-serif',
      effect: 'glow',
    },
  },
]

const STATS = [
  { label: 'Totala prestationer', value: '48', icon: TrophyIcon },
  { label: 'Aktiva', value: '42', icon: SparklesIcon },
  { label: 'Upplåsta idag', value: '234', icon: SparklesIcon },
  { label: 'Poäng utdelade', value: '45.2k', icon: SparklesIcon },
]

function getRarityBadge(rarity: string) {
  switch (rarity) {
    case 'common':
      return <Badge variant="secondary">Vanlig</Badge>
    case 'uncommon':
      return <Badge className="bg-green-100 text-green-700">Ovanlig</Badge>
    case 'rare':
      return <Badge className="bg-blue-100 text-blue-700">Sällsynt</Badge>
    case 'epic':
      return <Badge className="bg-purple-100 text-purple-700">Episk</Badge>
    case 'legendary':
      return <Badge className="bg-yellow-100 text-yellow-700">Legendarisk</Badge>
    case 'limited':
      return <Badge variant="error">Begränsad</Badge>
    default:
      return <Badge>{rarity}</Badge>
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="success">Aktiv</Badge>
    case 'draft':
      return <Badge variant="warning">Utkast</Badge>
    case 'archived':
      return <Badge variant="secondary">Arkiverad</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function getSymbolGlyph(id: string) {
  return BADGE_SYMBOLS.find((item) => item.value === id)?.glyph ?? '⭐'
}

function BadgePreview({
  theme,
  label,
  size = 180,
  showLabel = true,
}: {
  theme: BadgeTheme
  label?: string
  size?: number
  showLabel?: boolean
}) {
  const gradient = `radial-gradient(circle at 30% 30%, ${theme.secondaryColor}, ${theme.primaryColor})`
  const boxShadow =
    theme.effect === 'glow'
      ? `0 12px 40px ${theme.primaryColor}44, 0 4px 12px ${theme.accentColor}55`
      : '0 8px 20px rgba(0,0,0,0.12)'

  const overlay =
    theme.effect === 'shine'
      ? 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%)'
      : 'none'

  const shapeStyles: Record<string, CSSProperties> = {
    orb: { borderRadius: '32px' },
    shield: { borderRadius: '20px' },
    diamond: { clipPath: 'polygon(50% 0%, 100% 35%, 80% 100%, 20% 100%, 0 35%)' },
    ribbon: { borderRadius: '24px', aspectRatio: '16 / 10' },
  }

  return (
    <div className="flex flex-col items-center gap-3" style={{ fontFamily: theme.fontFamily }}>
      <div
        className="relative flex items-center justify-center"
        style={{
          width: size,
          height: size,
          filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.12))',
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: gradient,
            boxShadow,
            border: `2px solid ${theme.accentColor}`,
            ...shapeStyles[theme.backgroundId],
          }}
        >
          {overlay !== 'none' && (
            <div
              className="absolute inset-0 opacity-80"
              style={{ background: overlay, ...shapeStyles[theme.backgroundId] }}
            />
          )}
          <div className="relative z-10 text-5xl" style={{ color: theme.symbolColor }}>
            {getSymbolGlyph(theme.symbolId)}
          </div>
        </div>
      </div>
      {showLabel && label && (
        <div className="text-center">
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">Live-preview</p>
        </div>
      )}
    </div>
  )
}

export default function AchievementsSandboxPage() {
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS)
  const [selectedAchievementId, setSelectedAchievementId] = useState<string>(ACHIEVEMENTS[0].id)
  const [draftThemes, setDraftThemes] = useState<Record<string, BadgeTheme>>(() =>
    Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a.theme]))
  )
  const selectedAchievement = useMemo(
    () => achievements.find((item) => item.id === selectedAchievementId) ?? achievements[0],
    [achievements, selectedAchievementId]
  )
  const draftTheme = selectedAchievement ? draftThemes[selectedAchievement.id] ?? selectedAchievement.theme : ACHIEVEMENTS[0].theme

  const filteredAchievements = useMemo(() => {
    return achievements.filter((achievement) => {
      const matchesCategory = categoryFilter === 'all' || achievement.category === categoryFilter
      const matchesStatus = statusFilter === 'all' || achievement.status === statusFilter
      const matchesSearch =
        search.trim().length === 0 ||
        achievement.name.toLowerCase().includes(search.toLowerCase()) ||
        achievement.description.toLowerCase().includes(search.toLowerCase())

      return matchesCategory && matchesStatus && matchesSearch
    })
  }, [achievements, categoryFilter, statusFilter, search])

  function updateTheme(field: keyof BadgeTheme, value: string) {
    if (!selectedAchievement) return
    setDraftThemes((prev) => ({
      ...prev,
      [selectedAchievement.id]: { ...(prev[selectedAchievement.id] ?? selectedAchievement.theme), [field]: value },
    }))
  }

  function applyPreset(presetIndex: number) {
    const preset = COLOR_PRESETS[presetIndex]
    if (!preset) return
    if (!selectedAchievement) return
    setDraftThemes((prev) => ({
      ...prev,
      [selectedAchievement.id]: { ...(prev[selectedAchievement.id] ?? selectedAchievement.theme), ...preset },
    }))
  }

  function saveThemeToAchievement() {
    setAchievements((prev) =>
      prev.map((achievement) =>
        achievement.id === selectedAchievementId
          ? { ...achievement, theme: draftThemes[selectedAchievementId] ?? achievement.theme }
          : achievement
      )
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/sandbox/admin" className="text-sm text-muted-foreground hover:text-foreground">
              ← Tillbaka
            </a>
            <h1 className="text-lg font-semibold text-foreground">Achievements</h1>
          </div>
          <Badge variant="success">Personaliserad badge-bygger</Badge>
        </div>
      </div>

      <div className="p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Bygg badge-tema direkt på varje prestation (bakgrund, symbol, färger och font).
            </p>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Ny prestation
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-3 text-primary">
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
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            {/* Achievements List */}
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <CardTitle>Alla prestationer</CardTitle>
                      <Badge variant="secondary">Live</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="relative w-full sm:w-48">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          type="search"
                          placeholder="Sök..."
                          className="w-full pl-9"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <Select
                        options={CATEGORY_OPTIONS}
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        label="Kategori"
                      />
                      <Select
                        options={STATUS_OPTIONS}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        label="Status"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredAchievements.map((achievement) => (
                      <button
                        key={achievement.id}
                        onClick={() => setSelectedAchievementId(achievement.id)}
                        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                          selectedAchievementId === achievement.id
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14">
                            <BadgePreview theme={achievement.theme} size={64} showLabel={false} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold">{achievement.name}</h4>
                              {getRarityBadge(achievement.rarity)}
                              {getStatusBadge(achievement.status)}
                            </div>
                            <p className="text-sm text-gray-600">{achievement.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 text-primary font-semibold">
                            <SparklesIcon className="h-4 w-4" />
                            {achievement.points}
                          </div>
                          <p className="text-xs text-gray-500">{achievement.unlockedBy.toLocaleString()} har</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Editor */}
            <div className="space-y-4 xl:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Bygg kortet</CardTitle>
                    <Badge variant="outline">Live-preview</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Select
                      label="Bakgrund"
                      options={BADGE_BACKGROUNDS}
                      value={draftTheme.backgroundId}
                      onChange={(e) => updateTheme('backgroundId', e.target.value)}
                      hint="Form + kant"
                    />
                    <Select
                      label="Symbol"
                      options={BADGE_SYMBOLS}
                      value={draftTheme.symbolId}
                      onChange={(e) => updateTheme('symbolId', e.target.value)}
                      hint="Välj emoji/ikon"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ColorField
                      label="Primär"
                      value={draftTheme.primaryColor}
                      onChange={(value) => updateTheme('primaryColor', value)}
                    />
                    <ColorField
                      label="Sekundär"
                      value={draftTheme.secondaryColor}
                      onChange={(value) => updateTheme('secondaryColor', value)}
                    />
                    <ColorField
                      label="Accent / kant"
                      value={draftTheme.accentColor}
                      onChange={(value) => updateTheme('accentColor', value)}
                    />
                    <ColorField
                      label="Symbol"
                      value={draftTheme.symbolColor}
                      onChange={(value) => updateTheme('symbolColor', value)}
                    />
                    <ColorField
                      label="Text"
                      value={draftTheme.textColor}
                      onChange={(value) => updateTheme('textColor', value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Select
                      label="Font"
                      options={FONT_OPTIONS}
                      value={draftTheme.fontFamily}
                      onChange={(e) => updateTheme('fontFamily', e.target.value)}
                    />
                    <Select
                      label="Effekt"
                      options={[
                        { value: 'none', label: 'Ingen' },
                        { value: 'glow', label: 'Glow' },
                        { value: 'shine', label: 'Shine' },
                      ]}
                      value={draftTheme.effect}
                      onChange={(e) => updateTheme('effect', e.target.value as BadgeTheme['effect'])}
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Färgpresets</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {COLOR_PRESETS.map((preset, idx) => (
                        <button
                          key={preset.name}
                          onClick={() => applyPreset(idx)}
                          className="group rounded-lg border border-border p-3 text-left transition hover:border-primary"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded-full border"
                              style={{ background: preset.primaryColor }}
                            />
                            <div
                              className="h-6 w-6 rounded-full border"
                              style={{ background: preset.secondaryColor }}
                            />
                            <div className="rounded bg-muted px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {preset.name}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Matcha färger snabbt (primär + sekundär + accent).
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => applyPreset(Math.floor(Math.random() * COLOR_PRESETS.length))}
                    >
                      <SparklesIcon className="mr-2 h-4 w-4" />
                      Överraska mig
                    </Button>
                    <Button onClick={saveThemeToAchievement} disabled={!selectedAchievement}>
                      <SwatchIcon className="mr-2 h-4 w-4" />
                      Spara tema på {selectedAchievement?.name || 'achievement'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Regelkrav</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {selectedAchievement?.requirement || 'Välj en prestation för att se villkor.'}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">Kategori: {selectedAchievement?.category}</Badge>
                    <Badge variant="outline">Poäng: {selectedAchievement?.points}</Badge>
                    <Badge variant="outline">Rarity: {selectedAchievement?.rarity}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <PaintBrushIcon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Preview</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedAchievement ? (
                    <BadgePreview theme={draftTheme} label={selectedAchievement.name} />
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                      <TrophyIcon className="h-10 w-10" />
                      <p>Välj en prestation för att bygga kortet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mini-varianter</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {COLOR_PRESETS.slice(0, 3).map((preset) => (
                      <div
                        key={preset.name}
                        className="rounded-lg border border-border p-2"
                        style={{ fontFamily: draftTheme.fontFamily }}
                      >
                        <BadgePreview
                          theme={{
                            ...draftTheme,
                            ...preset,
                          }}
                          showLabel={false}
                          size={120}
                        />
                        <p className="mt-2 text-center text-xs text-muted-foreground">{preset.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{value}</span>
      </div>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-16 cursor-pointer rounded border border-border bg-transparent p-1"
      />
    </label>
  )
}
