'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { getSocialLeaderboard, getFriendsLeaderboard, SocialLeaderboardEntry } from '@/lib/services/socialService';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Game {
  id: string;
  name: string;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'global' | 'friends'>('global');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<SocialLeaderboardEntry[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<SocialLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load games on mount
  useEffect(() => {
    const loadGames = async () => {
      try {
        const { data, error } = await supabaseAdmin
          .from('games')
          .select('id, name')
          .eq('tenant_id', currentTenant?.id || '')
          .order('name');

        if (error) {
          console.error('Error loading games:', error);
          return;
        }

        setGames(data || []);
        if (data && data.length > 0) {
          setSelectedGameId(data[0].id);
        }
      } catch (err) {
        console.error('Error loading games:', err);
      }
    };

    if (currentTenant?.id) {
      loadGames();
    }
  }, [currentTenant?.id]);

  // Load leaderboard data when game or tab changes
  useEffect(() => {
    if (!selectedGameId || !currentTenant?.id || !user?.id) return;

    const loadLeaderboard = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'global') {
          const data = await getSocialLeaderboard(currentTenant.id, selectedGameId, 100, 0);
          setGlobalLeaderboard(data || []);
        } else {
          const data = await getFriendsLeaderboard(user.id, selectedGameId);
          setFriendsLeaderboard(data || []);
        }
      } catch (err) {
        console.error('Error loading leaderboard:', err);
      }
      setIsLoading(false);
    };

    loadLeaderboard();
  }, [selectedGameId, activeTab, currentTenant?.id, user?.id]);

  const currentLeaderboard = activeTab === 'global' ? globalLeaderboard : friendsLeaderboard;
  const isTopTen = (rank: number) => rank <= 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Leaderboard</h1>
          <p className="text-slate-600">Se hur du står sig mot andra spelare</p>
        </div>

        {/* Game Selector */}
        {games.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Game</label>
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-2 shadow">
          {(['global', 'friends'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'global' && 'Global Rankings'}
              {tab === 'friends' && 'Friends Rankings'}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-slate-600">Laddar leaderboard...</p>
            </div>
          ) : currentLeaderboard.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-slate-600">
                {activeTab === 'global'
                  ? 'Inga spelare än'
                  : 'Du har inga vänner än'}
              </p>
            </div>
          ) : (
            currentLeaderboard.map((entry, index) => {
              const rank = index + 1;
              const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank <= 10 ? '⭐' : '';

              return (
                <div
                  key={entry.id}
                  className={`rounded-lg shadow p-4 flex justify-between items-center transition-colors ${
                    isTopTen(rank)
                      ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-200 font-bold text-slate-700">
                      {medalEmoji || rank}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{entry.user_id}</p>
                      <div className="flex gap-4 text-xs text-slate-600">
                        <span>Score: {entry.score}</span>
                        <span>Plays: {entry.total_plays}</span>
                        <span>Best: {entry.best_score || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">Avg: {(entry.avg_score || 0).toFixed(1)}</p>
                    <p className="text-xs text-slate-500">{entry.achievements_unlocked} achievements</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Stats Summary */}
        {currentLeaderboard.length > 0 && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-slate-600 text-sm mb-1">Total Players</p>
              <p className="text-2xl font-bold text-blue-600">{currentLeaderboard.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-slate-600 text-sm mb-1">Average Score</p>
              <p className="text-2xl font-bold text-green-600">
                {(
                  currentLeaderboard.reduce((sum: number, e: SocialLeaderboardEntry) => sum + e.score, 0) / currentLeaderboard.length
                ).toFixed(0)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-slate-600 text-sm mb-1">Top Score</p>
              <p className="text-2xl font-bold text-purple-600">
                {currentLeaderboard[0]?.score || 0}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
