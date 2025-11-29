'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getGlobalLeaderboard,
  getGameLeaderboard,
  getTenantLeaderboard,
  getUserGlobalRank,
  getUserGameRank,
  getUserGlobalStats,
  LeaderboardEntry,
} from '@/lib/services/leaderboardService';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { supabase } from '@/lib/supabase/client';

interface Game {
  id: string;
  name: string;
}

export default function LeaderboardPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const gameId = searchParams.get('gameId');
  const leaderboardType = (searchParams.get('type') || 'global') as 'global' | 'game' | 'tenant';

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [userStats, setUserStats] = useState<{
    totalScore: number;
    totalSessions: number;
    averageScore: number;
    bestScore: number;
    rank: number | null;
  } | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setIsLoading(true);

        let leaderboardEntries: LeaderboardEntry[] = [];
        let rank: number | null = null;

        // Load leaderboard based on type
        if (leaderboardType === 'game' && gameId) {
          // Load game details
          const { data: gameData } = await supabase
            .from('games')
            .select('id, name')
            .eq('id', gameId)
            .single();

          if (gameData) {
            setGame(gameData);
          }

          const offset = (currentPage - 1) * ITEMS_PER_PAGE;
          leaderboardEntries = await getGameLeaderboard(gameId, ITEMS_PER_PAGE, offset);

          if (user) {
            rank = await getUserGameRank(user.id, gameId);
          }
        } else if (leaderboardType === 'tenant' && currentTenant?.id) {
          const offset = (currentPage - 1) * ITEMS_PER_PAGE;
          leaderboardEntries = await getTenantLeaderboard(currentTenant.id, ITEMS_PER_PAGE, offset);

          if (user) {
            rank = await getUserGameRank(user.id, currentTenant.id);
          }
        } else {
          // Global leaderboard
          const offset = (currentPage - 1) * ITEMS_PER_PAGE;
          leaderboardEntries = await getGlobalLeaderboard(ITEMS_PER_PAGE, offset);

          if (user) {
            rank = await getUserGlobalRank(user.id);
            const stats = await getUserGlobalStats(user.id);
            setUserStats(stats);
          }
        }

        setEntries(leaderboardEntries);
        setUserRank(rank);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [leaderboardType, gameId, currentTenant?.id, user, currentPage]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/app/games" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
            ← Back to Games
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Leaderboard</h1>
          <p className="text-lg text-gray-600">
            {leaderboardType === 'game' && game
              ? `Top players in ${game.name}`
              : leaderboardType === 'tenant'
                ? 'Tenant leaderboard'
                : 'Global leaderboard'}
          </p>
        </div>

        {/* Leaderboard Type Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <Link
            href="/app/leaderboard"
            className={`py-2 px-4 font-semibold transition ${
              leaderboardType === 'global'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Global
          </Link>
          {currentTenant && (
            <Link
              href={`/app/leaderboard?type=tenant`}
              className={`py-2 px-4 font-semibold transition ${
                leaderboardType === 'tenant'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {currentTenant.name}
            </Link>
          )}
        </div>

        {/* User's Stats Card */}
        {user && userStats && leaderboardType === 'global' && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">Your Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <p className="text-sm opacity-90">Rank</p>
                <p className="text-3xl font-bold">
                  {userRank ? `#${userRank}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm opacity-90">Total Score</p>
                <p className="text-3xl font-bold">{userStats.totalScore}</p>
              </div>
              <div>
                <p className="text-sm opacity-90">Games Played</p>
                <p className="text-3xl font-bold">{userStats.totalSessions}</p>
              </div>
              <div>
                <p className="text-sm opacity-90">Average</p>
                <p className="text-3xl font-bold">{userStats.averageScore}</p>
              </div>
              <div>
                <p className="text-sm opacity-90">Best</p>
                <p className="text-3xl font-bold">{userStats.bestScore}</p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Loading leaderboard...</p>
          </div>
        ) : entries.length > 0 ? (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Rank</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Player</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">Score</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">Games</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-900">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr
                      key={entry.userId}
                      className={`hover:bg-gray-50 transition ${
                        user?.id === entry.userId ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-2xl font-bold">
                        {getRankBadge(entry.rank)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{entry.userName}</p>
                        {user?.id === entry.userId && (
                          <p className="text-sm text-blue-600">You</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-lg font-bold text-gray-900">
                        {entry.totalScore.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {entry.totalSessions}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-600">
                        {Math.round(entry.averageScore)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <span className="text-gray-600 font-semibold">Page {currentPage}</span>
              <button
                onClick={handleNextPage}
                disabled={entries.length < ITEMS_PER_PAGE}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-lg">No leaderboard data yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
