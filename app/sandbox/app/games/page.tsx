'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Card, CardContent, Badge, Input, Select } from '@/components/ui'
import { GameCard } from '@/components/app/GameCard'
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  SparklesIcon,
  BoltIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

type ViewMode = 'grid' | 'list'

const mockGames = [
  { 
    id: '1', 
    name: 'Kurragömma', 
    description: 'Klassiskt gömlek där en person letar medan andra gömmer sig.',
    energyLevel: 'high' as const,
    ageMin: 4,
    ageMax: 12,
    minPlayers: 3,
    maxPlayers: 20,
    timeEstimate: 30,
  },
  { 
    id: '2', 
    name: 'Samarbetspussel', 
    description: 'Bygg pussel tillsammans i lag. Bra för samarbete.',
    energyLevel: 'low' as const,
    ageMin: 5,
    ageMax: 10,
    minPlayers: 2,
    maxPlayers: 6,
    timeEstimate: 45,
  },
  { 
    id: '3', 
    name: 'Stafett', 
    description: 'Spännande stafettlopp med olika stationer.',
    energyLevel: 'high' as const,
    ageMin: 5,
    ageMax: 15,
    minPlayers: 6,
    maxPlayers: 30,
    timeEstimate: 20,
  },
  { 
    id: '4', 
    name: 'Ordlek', 
    description: 'Gissa ord och fraser genom att rita eller förklara.',
    energyLevel: 'low' as const,
    ageMin: 7,
    ageMax: 99,
    minPlayers: 4,
    maxPlayers: 12,
    timeEstimate: 30,
  },
  { 
    id: '5', 
    name: 'Freeze Dance', 
    description: 'Dansa när musiken spelar, frys när den stannar!',
    energyLevel: 'medium' as const,
    ageMin: 3,
    ageMax: 10,
    minPlayers: 4,
    maxPlayers: 25,
    timeEstimate: 15,
  },
  { 
    id: '6', 
    name: 'Skattjakt', 
    description: 'Följ ledtrådar och kartor för att hitta skatten.',
    energyLevel: 'medium' as const,
    ageMin: 5,
    ageMax: 12,
    minPlayers: 2,
    maxPlayers: 10,
    timeEstimate: 60,
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

  // Filter games
  const filteredGames = mockGames.filter(game => {
    if (search && !game.name.toLowerCase().includes(search.toLowerCase())) return false
    if (energyLevel && game.energyLevel !== energyLevel) return false
    return true
  })

  const getEnergyBadge = (level: string) => {
    switch (level) {
      case 'low':
        return <Badge variant="success" size="sm">Låg energi</Badge>
      case 'medium':
        return <Badge variant="warning" size="sm">Medium</Badge>
      case 'high':
        return <Badge variant="error" size="sm">Hög energi</Badge>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-2">
          <Link 
            href="/sandbox/app" 
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Tillbaka till App Sandbox
          </Link>
        </div>

        <div className="mb-8">
          <Badge variant="accent" size="sm" className="mb-2">Sandbox Preview</Badge>
          <h1 className="text-3xl font-bold text-gray-900">🎮 Games / Utforska Lekar</h1>
          <p className="mt-2 text-gray-600">
            Förhandsvisning av spellistan med sök, filter och olika visningslägen.
          </p>
        </div>

        {/* Demo of actual Games page */}
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-6">
          <div className="space-y-8">
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
                    id={game.id}
                    variant="featured"
                    name={game.name}
                    description={game.description}
                    ageMin={game.ageMin}
                    ageMax={game.ageMax}
                    timeEstimate={game.timeEstimate}
                    minPlayers={game.minPlayers}
                    maxPlayers={game.maxPlayers}
                    energyLevel={game.energyLevel}
                    isFavorite={game.id === '1'}
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
                    id={game.id}
                    name={game.name}
                    description={game.description}
                    ageMin={game.ageMin}
                    ageMax={game.ageMax}
                    timeEstimate={game.timeEstimate}
                    minPlayers={game.minPlayers}
                    maxPlayers={game.maxPlayers}
                    energyLevel={game.energyLevel}
                    isFavorite={game.id === '2'}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGames.map((game) => (
                  <Card key={game.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{game.name}</h3>
                            {getEnergyBadge(game.energyLevel)}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {game.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <UserGroupIcon className="h-4 w-4" />
                              {game.minPlayers}-{game.maxPlayers} spelare
                            </span>
                            <span className="flex items-center gap-1">
                              <ClockIcon className="h-4 w-4" />
                              {game.timeEstimate} min
                            </span>
                            <span className="flex items-center gap-1">
                              <BoltIcon className="h-4 w-4" />
                              {game.ageMin}+ år
                            </span>
                          </div>
                        </div>
                        <Button size="sm">Visa</Button>
                      </div>
                    </CardContent>
                  </Card>
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
          </div>
        </div>

        {/* Link to real page */}
        <div className="mt-6 text-center">
          <Button href="/app/games" variant="outline">
            Öppna riktiga sidan →
          </Button>
        </div>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
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
    </div>
  )
}
