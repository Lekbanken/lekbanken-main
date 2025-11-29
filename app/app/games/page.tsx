'use client'

import { useState, useEffect } from 'react'
import { searchGames, getFeaturedGames } from '@/lib/services/gameService'
import type { Database } from '@/lib/supabase/types'
import GameCard from '@/components/GameCard'

type Game = Database['public']['Tables']['games']['Row']

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [featured, setFeatured] = useState<Game[]>([])
  const [search, setSearch] = useState('')
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high' | ''>('')
  const [isLoading, setIsLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const pageSize = 12

  // Load featured games on mount
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const featured = await getFeaturedGames()
        setFeatured(featured)
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

  return (
    <div className="space-y-12">
      {/* Featured Section */}
      {featured.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold mb-6">Featured Games</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}

      {/* Search & Filters */}
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-6">Browse Games</h2>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Energy Level Filter */}
            <select
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Energy Levels</option>
              <option value="low">Low Energy</option>
              <option value="medium">Medium Energy</option>
              <option value="high">High Energy</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-gray-600">
          Showing {games.length} of {total} games
        </p>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}

        {/* No Results */}
        {!isLoading && games.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No games found matching your criteria.</p>
          </div>
        )}
      </section>
    </div>
  )
}
