'use client'

import {
  TrophyIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  LockClosedIcon,
  LockOpenIcon,
  CheckBadgeIcon,
  GiftIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useState } from 'react'

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

const ACHIEVEMENTS = [
  {
    id: 'ACH-001',
    name: 'Första steget',
    description: 'Slutför ditt första spel',
    icon: '🎮',
    category: 'games',
    rarity: 'common',
    points: 10,
    status: 'active',
    unlockedBy: 12847,
    requirement: 'games_completed >= 1',
  },
  {
    id: 'ACH-002',
    name: 'Spelentusiast',
    description: 'Spela 100 spel totalt',
    icon: '🏆',
    category: 'games',
    rarity: 'rare',
    points: 50,
    status: 'active',
    unlockedBy: 3421,
    requirement: 'games_completed >= 100',
  },
  {
    id: 'ACH-003',
    name: 'Eldsjäl',
    description: 'Behåll en 7-dagars streak',
    icon: '🔥',
    category: 'streak',
    rarity: 'uncommon',
    points: 25,
    status: 'active',
    unlockedBy: 5632,
    requirement: 'current_streak >= 7',
  },
  {
    id: 'ACH-004',
    name: 'Månadsmaraton',
    description: 'Behåll en 30-dagars streak',
    icon: '⚡',
    category: 'streak',
    rarity: 'epic',
    points: 100,
    status: 'active',
    unlockedBy: 847,
    requirement: 'current_streak >= 30',
  },
  {
    id: 'ACH-005',
    name: 'Vintervärlden',
    description: 'Spela under julperioden 2024',
    icon: '❄️',
    category: 'seasonal',
    rarity: 'limited',
    points: 30,
    status: 'draft',
    unlockedBy: 0,
    requirement: 'played_during_christmas_2024',
  },
  {
    id: 'ACH-006',
    name: 'Hjälpande hand',
    description: 'Bjud in 5 vänner',
    icon: '🤝',
    category: 'social',
    rarity: 'uncommon',
    points: 35,
    status: 'active',
    unlockedBy: 2156,
    requirement: 'referrals >= 5',
  },
]

const STATS = [
  { label: 'Totala prestationer', value: '48', icon: TrophyIcon },
  { label: 'Aktiva', value: '42', icon: CheckBadgeIcon },
  { label: 'Upplåsta idag', value: '234', icon: LockOpenIcon },
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

export default function AchievementsSandboxPage() {
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedAchievement, setSelectedAchievement] = useState<typeof ACHIEVEMENTS[0] | null>(null)

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
            <h1 className="text-lg font-semibold text-foreground">Achievements</h1>
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
              Ny prestation
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Achievements List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-lg">Alla prestationer</h3>
                  <div className="flex flex-wrap gap-3">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="search"
                        placeholder="Sök..."
                        className="pl-9 w-48"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <Select
                      options={CATEGORY_OPTIONS}
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    />
                    <Select
                      options={STATUS_OPTIONS}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ACHIEVEMENTS.map((achievement) => (
                    <div
                      key={achievement.id}
                      onClick={() => setSelectedAchievement(achievement)}
                      className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedAchievement?.id === achievement.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                          {achievement.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{achievement.name}</h4>
                            {getRarityBadge(achievement.rarity)}
                            {getStatusBadge(achievement.status)}
                          </div>
                          <p className="text-sm text-gray-600">{achievement.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-primary font-semibold">
                          <SparklesIcon className="h-4 w-4" />
                          {achievement.points}
                        </div>
                        <p className="text-xs text-gray-500">{achievement.unlockedBy.toLocaleString()} har</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detail Sidebar */}
          <div className="space-y-4">
            {selectedAchievement ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Detaljer</h3>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center py-4">
                      <div className="h-20 w-20 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl mx-auto">
                        {selectedAchievement.icon}
                      </div>
                      <h4 className="font-bold text-xl mt-3">{selectedAchievement.name}</h4>
                      <p className="text-gray-600 mt-1">{selectedAchievement.description}</p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        {getRarityBadge(selectedAchievement.rarity)}
                        {getStatusBadge(selectedAchievement.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-y">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{selectedAchievement.points}</p>
                        <p className="text-xs text-gray-600">Poäng</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedAchievement.unlockedBy.toLocaleString()}</p>
                        <p className="text-xs text-gray-600">Upplåst av</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">Krav</p>
                      <code className="text-xs bg-gray-100 p-2 rounded block">
                        {selectedAchievement.requirement}
                      </code>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">Kategori</p>
                      <p className="font-medium capitalize">{selectedAchievement.category}</p>
                    </div>

                    <div className="pt-4 space-y-2">
                      {selectedAchievement.status === 'draft' ? (
                        <Button className="w-full">
                          <LockOpenIcon className="h-4 w-4 mr-2" />
                          Aktivera
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full">
                          <LockClosedIcon className="h-4 w-4 mr-2" />
                          Inaktivera
                        </Button>
                      )}
                      <Button variant="outline" className="w-full">
                        <GiftIcon className="h-4 w-4 mr-2" />
                        Tilldela manuellt
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Unlocks */}
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold">Senast upplåsta</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { user: 'SuperSpelare99', time: '5 min sedan' },
                        { user: 'QuizMästaren', time: '12 min sedan' },
                        { user: 'MinnasAllt', time: '1 tim sedan' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{item.user}</span>
                          <span className="text-gray-500">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <TrophyIcon className="h-12 w-12 text-gray-300 mx-auto" />
                  <p className="mt-4 text-gray-600">Välj en prestation för att se detaljer</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Achievement-kategorier: streak, spel, socialt</li>
            <li>Rariteter: common, rare, epic, legendary</li>
            <li>Villkorsredigerare</li>
            <li>Senaste tillägnade lista</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
      </div>
    </div>
  )
}
