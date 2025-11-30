'use client'

import { useState, useEffect } from 'react'
import { searchGames, getFeaturedGames } from '@/lib/services/gameService'
import type { Database } from '@/lib/supabase/types'
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
  UserGroupIcon 
} from '@heroicons/react/24/outline'

type Game = Database['public']['Tables']['games']['Row']
type EnergyLevel = 'low' | 'medium' | 'high' | ''
type ViewMode = 'grid' | 'list'

const energyOptions = [
  { value: '', label: 'Alla energinivåer' },
  { value: 'low', label: 'Låg energi' },
  { value: 'medium', label: 'Medium energi' },
  { value: 'high', label: 'Hög energi' },
]

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [featured, setFeatured] = useState<Game[]>([])
  const [search, setSearch] = useState('')
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('')
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const pageSize = 12

  // Load featured games on mount
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const featuredGames = await getFeaturedGames()
        setFeatured(featuredGames)
      } catch (err) {
        console.error('Error loading featured games:', err)
      }
    }
    loadFeatured()
  }, [])

  // Load games when search or filters change
  useEffect(() => {
    const loadGames = async () => {
      setIsLoading(true)
      try {
        const result = await searchGames({
          search: search || undefined,
          energyLevel: energyLevel ? (energyLevel as 'low' | 'medium' | 'high') : undefined,
          page: 1,
          pageSize,
        })
        setGames(result.games)
        setTotal(result.total)
        setHasMore(result.hasMore)
        setPage(1)
      } catch (err) {
        console.error('Error loading games:', err)
        setGames([])
        setTotal(0)
        setHasMore(false)
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce search
    const timer = setTimeout(() => {
      loadGames()
    }, 300)

    return () => clearTimeout(timer)
  }, [search, energyLevel])

  const handleLoadMore = async () => {
    const nextPage = page + 1
    setIsLoading(true)
    try {
      const result = await searchGames({
        search: search || undefined,
        energyLevel: energyLevel ? (energyLevel as 'low' | 'medium' | 'high') : undefined,
        page: nextPage,
        pageSize,
      })
      setGames((prev) => [...prev, ...result.games])
      setTotal(result.total)
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch (err) {
      console.error('Error loading more games:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getEnergyBadge = (level: string | null) => {
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
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Utforska Lekar</h1>
        <p className="mt-2 text-muted-foreground">
          Hitta den perfekta aktiviteten för din grupp. Filtrera efter energinivå, ålder och mer.
        </p>
      </div>

      {/* Featured Section */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="h-6 w-6 text-yellow-500" />
            <h2 className="text-xl font-semibold text-foreground">Utvalda Lekar</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((game) => (
              <GameCard 
                key={game.id}
                id={game.id}
                variant="featured"
                name={game.name}
                description={game.description}
                ageMin={game.age_min}
                ageMax={game.age_max}
                timeEstimate={game.time_estimate_min}
                minPlayers={game.min_players}
                maxPlayers={game.max_players}
                energyLevel={game.energy_level as 'low' | 'medium' | 'high' | null}
                isFavorite={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Sök efter lekar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
              />
            </div>

            {/* Energy Level Filter */}
            <div className="w-full lg:w-48">
              <Select
                value={energyLevel}
                onChange={(e) => setEnergyLevel(e.target.value as EnergyLevel)}
                options={energyOptions}
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white shadow-sm text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white shadow-sm text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ListBulletIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Active Filters */}
          {(search || energyLevel) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <FunnelIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Aktiva filter:</span>
              {search && (
                <Badge variant="secondary" size="sm">
                  Sök: {search}
                  <button 
                    onClick={() => setSearch('')}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {energyLevel && (
                <Badge variant="secondary" size="sm">
                  {energyOptions.find(o => o.value === energyLevel)?.label}
                  <button 
                    onClick={() => setEnergyLevel('')}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <button 
                onClick={() => { setSearch(''); setEnergyLevel(''); }}
                className="text-sm text-primary hover:underline ml-2"
              >
                Rensa alla
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Visar {games.length} av {total} lekar
        </p>
      </div>

      {/* Loading State */}
      {isLoading && games.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-32 bg-muted rounded-lg" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Games Grid/List */}
      {!isLoading && games.length > 0 && (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {games.map((game) => (
              <GameCard 
                key={game.id}
                id={game.id}
                name={game.name}
                description={game.description}
                ageMin={game.age_min}
                ageMax={game.age_max}
                timeEstimate={game.time_estimate_min}
                minPlayers={game.min_players}
                maxPlayers={game.max_players}
                energyLevel={game.energy_level as 'low' | 'medium' | 'high' | null}
                isFavorite={false}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((game) => (
              <Card key={game.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{game.name}</h3>
                        {getEnergyBadge(game.energy_level)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {game.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UserGroupIcon className="h-4 w-4" />
                          {game.min_players}-{game.max_players} spelare
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {game.time_estimate_min} min
                        </span>
                        <span className="flex items-center gap-1">
                          <BoltIcon className="h-4 w-4" />
                          {game.age_min}+ år
                        </span>
                      </div>
                    </div>
                    <Button href={`/app/games/${game.id}`} size="sm">
                      Visa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={handleLoadMore}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? 'Laddar...' : 'Ladda fler'}
          </Button>
        </div>
      )}

      {/* No Results */}
      {!isLoading && games.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MagnifyingGlassIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Inga lekar hittades</h3>
            <p className="text-muted-foreground mb-4">
              Prova att ändra dina sökkriterier eller rensa filtren.
            </p>
            <Button 
              variant="outline" 
              onClick={() => { setSearch(''); setEnergyLevel(''); }}
            >
              Rensa filter
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
