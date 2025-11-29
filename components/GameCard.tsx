'use client'

import Link from 'next/link'
import type { Database } from '@/lib/supabase/types'

type Game = Database['public']['Tables']['games']['Row']

interface GameCardProps {
  game: Game
}

export default function GameCard({ game }: GameCardProps) {
  return (
    <Link href={`/app/games/${game.id}`}>
      <div className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg hover:scale-105">
        {/* Image/Thumbnail */}
        <div className="relative h-40 bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm font-semibold text-indigo-700">{game.name}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Name */}
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600">
              {game.name}
            </h3>
          </div>

          {/* Description */}
          {game.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {game.description}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {/* Age Range */}
            {game.age_min && game.age_max && (
              <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">
                Ages {game.age_min}-{game.age_max}
              </span>
            )}

            {/* Energy Level Badge */}
            {game.energy_level && (
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  game.energy_level === 'low'
                    ? 'bg-green-100 text-green-700'
                    : game.energy_level === 'medium'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {game.energy_level.charAt(0).toUpperCase() + game.energy_level.slice(1)} Energy
              </span>
            )}
          </div>

          {/* Time Estimate if available */}
          {game.time_estimate_min && (
            <div className="text-xs text-gray-500">
              ~{game.time_estimate_min} min
            </div>
          )}

          {/* Player Count */}
          {(game.min_players || game.max_players) && (
            <div className="text-xs text-gray-500">
              Players: {game.min_players || '?'}-{game.max_players || '?'}
            </div>
          )}
        </div>

        {/* Click Hint */}
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-2">
          <span className="text-2xl">→</span>
        </div>
      </div>
    </Link>
  )
}
