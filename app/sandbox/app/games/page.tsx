'use client'

import { useState } from 'react'
import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Button, Card, CardContent, Badge, Input, Select } from '@/components/ui'
import { GameCard } from '@/components/game/GameCard'
import type { GameSummary } from '@/lib/game-display'
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

type ViewMode = 'grid' | 'list'

// Mock games using unified GameSummary format
const mockGames: GameSummary[] = [
  { 
    id: '1', 
    slug: 'kurragomma',
    title: 'Kurragömma', 
    shortDescription: 'Klassiskt gömlek där en person letar medan andra gömmer sig.',
    energyLevel: 'high',
    ageMin: 4,
    ageMax: 12,
    minPlayers: 3,
    maxPlayers: 20,
    durationMin: 25,
    durationMax: 35,
    playMode: 'basic',
    environment: 'both',
    categories: ['Rörelselekar'],
    tags: ['klassiker', 'utomhus'],
    isFavorite: false,
  },
  { 
    id: '2', 
    slug: 'samarbetspussel',
    title: 'Samarbetspussel', 
    shortDescription: 'Bygg pussel tillsammans i lag. Bra för samarbete.',
    energyLevel: 'low',
    ageMin: 5,
    ageMax: 10,
    minPlayers: 2,
    maxPlayers: 6,
    durationMin: 40,
    durationMax: 50,
    playMode: 'facilitated',
    environment: 'indoor',
    categories: ['Samarbetslekar'],
    tags: ['samarbete', 'lugn'],
    isFavorite: true,
  },
  { 
    id: '3', 
    slug: 'stafett',
    title: 'Stafett', 
    shortDescription: 'Spännande stafettlopp med olika stationer.',
    energyLevel: 'high',
    ageMin: 5,
    ageMax: 15,
    minPlayers: 6,
    maxPlayers: 30,
    durationMin: 15,
    durationMax: 25,
    playMode: 'participants',
    environment: 'outdoor',
    categories: ['Laglekar'],
    tags: ['tävling', 'lag'],
    isFavorite: false,
  },
  { 
    id: '4', 
    slug: 'ordlek',
    title: 'Ordlek', 
    shortDescription: 'Gissa ord och fraser genom att rita eller förklara.',
    energyLevel: 'low',
    ageMin: 7,
    ageMax: 99,
    minPlayers: 4,
    maxPlayers: 12,
    durationMin: 25,
    durationMax: 35,
    playMode: 'basic',
    environment: 'indoor',
    categories: ['Ordlekar'],
    tags: ['kreativitet', 'kommunikation'],
    isFavorite: false,
  },
  { 
    id: '5', 
    slug: 'freeze-dance',
    title: 'Freeze Dance', 
    shortDescription: 'Dansa när musiken spelar, frys när den stannar!',
    energyLevel: 'medium',
    ageMin: 3,
    ageMax: 10,
    minPlayers: 4,
    maxPlayers: 25,
    durationMin: 10,
    durationMax: 20,
    playMode: 'facilitated',
    environment: 'both',
    categories: ['Danslekar'],
    tags: ['musik', 'dans'],
    isFavorite: false,
  },
  { 
    id: '6', 
    slug: 'skattjakt',
    title: 'Skattjakt', 
    shortDescription: 'Följ ledtrådar och kartor för att hitta skatten.',
    energyLevel: 'medium',
    ageMin: 5,
    ageMax: 12,
    minPlayers: 2,
    maxPlayers: 10,
    durationMin: 50,
    durationMax: 70,
    playMode: 'participants',
    environment: 'outdoor',
    categories: ['Utomhuslekar'],
    tags: ['utomhus', 'äventyr'],
    isFavorite: false,
  },
]

const energyOptions = [
  { value: '', label: 'Alla energinivåer' },
  { value: 'low', label: 'Låg energi' },
  { value: 'medium', label: 'Medium energi' },
  { value: 'high', label: 'Hög energi' },
]

export default function GamesSandbox() {
  const [search, setSearch] = useState('')
  const [energyLevel, setEnergyLevel] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const filteredGames = mockGames.filter(game => {
    if (search && !game.title.toLowerCase().includes(search.toLowerCase())) return false
    if (energyLevel && game.energyLevel !== energyLevel) return false
    return true
  })

  return (
    <SandboxShell
      moduleId="app-games"
      title="Games"
      description="Game browsing with search, filters and view modes"
    >
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Utforska Lekar</h1>
          <p className="mt-2 text-gray-600">
            Hitta den perfekta aktiviteten för din grupp.
          </p>
        </div>

        {/* Featured Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="h-6 w-6 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-900">Utvalda Lekar</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockGames.slice(0, 3).map((game) => (
              <GameCard 
                key={game.id}
                game={game}
                variant="featured"
              />
            ))}
          </div>
        </section>

        {/* Search & Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Sök efter lekar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
                />
              </div>

              <div className="w-full lg:w-48">
                <Select
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(e.target.value)}
                  options={energyOptions}
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white shadow-sm text-primary' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Squares2X2Icon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white shadow-sm text-primary' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <ListBulletIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Active Filters */}
            {(search || energyLevel) && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                <FunnelIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Aktiva filter:</span>
                {search && (
                  <Badge variant="secondary" size="sm">
                    Sök: {search}
                    <button onClick={() => setSearch('')} className="ml-1">×</button>
                  </Badge>
                )}
                {energyLevel && (
                  <Badge variant="secondary" size="sm">
                    {energyOptions.find(o => o.value === energyLevel)?.label}
                    <button onClick={() => setEnergyLevel('')} className="ml-1">×</button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Info */}
        <p className="text-gray-600">
          Visar {filteredGames.length} av {mockGames.length} lekar
        </p>

        {/* Games Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredGames.map((game) => (
              <GameCard 
                key={game.id}
                game={game}
                variant="grid"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGames.map((game) => (
              <GameCard 
                key={game.id}
                game={game}
                variant="list"
              />
            ))}
          </div>
        )}

        {/* No Results */}
        {filteredGames.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Inga lekar hittades</h3>
              <p className="text-gray-600 mb-4">
                Prova att ändra dina sökkriterier.
              </p>
              <Button variant="outline" onClick={() => { setSearch(''); setEnergyLevel(''); }}>
                Rensa filter
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Sök och filter med Select-komponenter</li>
            <li>Grid/List-vy toggle</li>
            <li>Empty state med &quot;Rensa filter&quot;-knapp</li>
            <li>Använder GameCard i båda vyer</li>
          </ul>
          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
    </SandboxShell>
  )
}
