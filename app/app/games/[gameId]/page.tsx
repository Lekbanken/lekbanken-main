'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import GameCard from '@/components/GameCard';
import Link from 'next/link';

type Game = Database['public']['Tables']['games']['Row'];

export default function GameDetailPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const [game, setGame] = useState<Game | null>(null);
  const [relatedGames, setRelatedGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGame = async () => {
      try {
        setIsLoading(true);

        // Fetch game details
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (gameError) {
          setError('Game not found');
          return;
        }

        setGame(gameData);

        // Fetch related games (same energy level, different game)
        if (gameData.energy_level) {
          const { data: related, error: relatedError } = await supabase
            .from('games')
            .select('*')
            .eq('energy_level', gameData.energy_level)
            .neq('id', gameId)
            .eq('status', 'published')
            .limit(4);

          if (!relatedError && related) {
            setRelatedGames(related);
          }
        }
      } catch (err) {
        console.error('Error loading game:', err);
        setError('Error loading game details');
      } finally {
        setIsLoading(false);
      }
    };

    if (gameId) {
      loadGame();
    }
  }, [gameId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Game not found'}
          </h1>
          <Link
            href="/app/games"
            className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  // Helper function to get energy level badge color
  const getEnergyLevelColor = (level: string | null) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/app/games"
            className="text-blue-500 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to Games
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{game.name}</h1>
          <div className="flex flex-wrap gap-3">
            {game.energy_level && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEnergyLevelColor(game.energy_level)}`}>
                {game.energy_level.charAt(0).toUpperCase() + game.energy_level.slice(1)} Energy
              </span>
            )}
            {game.age_min && game.age_max && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                Ages {game.age_min}-{game.age_max}
              </span>
            )}
            {game.min_players && game.max_players && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                {game.min_players}-{game.max_players} Players
              </span>
            )}
            {game.time_estimate_min && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                ~{game.time_estimate_min} min
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Details */}
          <div className="lg:col-span-2">
            {/* Description */}
            <section className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
              <p className="text-gray-700 leading-relaxed text-lg">
                {game.description || 'No description available'}
              </p>
            </section>

            {/* Instructions */}
            {game.instructions && (
              <section className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Play</h2>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {game.instructions}
                </div>
              </section>
            )}

            {/* Game Details Grid */}
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Game Details</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Player Count
                  </h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {game.min_players}-{game.max_players}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Duration
                  </h3>
                  <p className="text-2xl font-bold text-gray-900">
                    ~{game.time_estimate_min} min
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Age Range
                  </h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {game.age_min}-{game.age_max}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Energy Level
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 capitalize">
                    {game.energy_level}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Play Button */}
            <Link
              href={`/app/play/${game.id}`}
              className="block text-center w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg text-lg transition mb-6 shadow-lg"
            >
              Play Game
            </Link>

            {/* Game Info Card */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-500 font-medium">Status</p>
                  <p className="text-gray-900 capitalize font-semibold">
                    {game.status === 'published' ? '✓ Published' : 'Draft'}
                  </p>
                </div>
                {game.created_at && (
                  <div>
                    <p className="text-gray-500 font-medium">Added</p>
                    <p className="text-gray-900 font-semibold">
                      {new Date(game.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Share Card */}
            <div className="bg-blue-50 rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Share This Game</h3>
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition mb-2">
                Share
              </button>
              <button className="w-full bg-white border border-blue-500 text-blue-500 hover:bg-blue-50 font-semibold py-2 px-4 rounded transition">
                Favorite
              </button>
            </div>
          </div>
        </div>

        {/* Related Games */}
        {relatedGames.length > 0 && (
          <section className="mt-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">You Might Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedGames.map((relatedGame) => (
                <GameCard key={relatedGame.id} game={relatedGame} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
