'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { supabase } from '@/lib/supabase/client';

interface GameStats {
  id: string;
  name: string;
  status: string;
  total_plays: number;
  avg_score: number;
  completion_rate: number;
  created_at: string;
  updated_at: string;
  description: string | null;
  thumbnail_url: string | null;
  energy_level: string;
}

export default function ContentPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // States
  const [games, setGames] = useState<GameStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<GameStats | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [newGame, setNewGame] = useState({ name: '', description: '', energy_level: 'medium' });

  // Load games
  useEffect(() => {
    if (!user || !currentTenant) return;

    const loadGames = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading games:', error);
          return;
        }

        // For each game, get play stats
        const gamesWithStats = await Promise.all(
          (data || []).map(async (game) => {
            const { count: totalPlays } = await supabase
              .from('game_sessions')
              .select('*', { count: 'exact', head: true })
              .eq('game_id', game.id);

            const { data: scores } = await supabase
              .from('game_sessions')
              .select('score')
              .eq('game_id', game.id)
              .not('score', 'is', null);

            const avgScore = scores && scores.length > 0
              ? scores.reduce((sum, s) => sum + (s.score || 0), 0) / scores.length
              : 0;

            const completedSessions = (scores || []).filter(s => s.score && s.score > 0).length;
            const completionRate = totalPlays && totalPlays > 0
              ? (completedSessions / totalPlays) * 100
              : 0;

            return {
              id: game.id,
              name: game.name,
              status: game.status || 'published',
              total_plays: totalPlays || 0,
              avg_score: Math.round(avgScore),
              completion_rate: Math.round(completionRate),
              created_at: game.created_at,
              updated_at: game.updated_at,
              description: game.description,
              thumbnail_url: game.thumbnail_url,
              energy_level: game.energy_level,
            };
          })
        );

        setGames(gamesWithStats);
      } catch (err) {
        console.error('Error loading games:', err);
      }
      setIsLoading(false);
    };

    loadGames();
  }, [user, currentTenant]);

  const handleCreateGame = async () => {
    if (!currentTenant || !newGame.name.trim()) return;

    setIsCreatingGame(true);
    try {
      const { data, error } = await supabase
        .from('games')
        .insert({
          tenant_id: currentTenant.id,
          name: newGame.name,
          description: newGame.description,
          energy_level: newGame.energy_level,
          status: 'draft',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating game:', error);
        alert('Det gick inte att skapa spelet.');
      } else {
        setGames([
          {
            id: data.id,
            name: data.name,
            status: 'draft',
            total_plays: 0,
            avg_score: 0,
            completion_rate: 0,
            created_at: data.created_at,
            updated_at: data.updated_at,
            description: data.description,
            thumbnail_url: data.thumbnail_url,
            energy_level: data.energy_level,
          },
          ...games,
        ]);
        setNewGame({ name: '', description: '', energy_level: 'medium' });
        alert('Spelet har skapats!');
      }
    } catch (err) {
      console.error('Error creating game:', err);
      alert('Det gick inte att skapa spelet.');
    }
    setIsCreatingGame(false);
  };

  const handlePublishGame = async (gameId: string) => {
    if (!currentTenant) return;

    try {
      const { error } = await supabase
        .from('games')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', gameId)
        .eq('tenant_id', currentTenant.id);

      if (error) {
        console.error('Error publishing game:', error);
        alert('Det gick inte att publicera spelet.');
      } else {
        const updatedGames = games.map((g) =>
          g.id === gameId ? { ...g, status: 'published' } : g
        );
        setGames(updatedGames);
        if (selectedGame?.id === gameId) {
          setSelectedGame({ ...selectedGame, status: 'published' });
        }
        alert('Spelet har publicerats!');
      }
    } catch (err) {
      console.error('Error publishing game:', err);
      alert('Det gick inte att publicera spelet.');
    }
  };

  // Filter games
  const filteredGames = games.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!user || !currentTenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Content Management</h1>
            <p className="text-slate-600">Du måste vara admin i en organisation för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Content Management</h1>
          <p className="text-slate-600">Hantera och publicera spel för organisationen</p>
        </div>

        {/* Create Game */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Skapa Nytt Spel</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Spelets namn"
              value={newGame.name}
              onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Beskrivning (valfritt)"
              value={newGame.description}
              onChange={(e) => setNewGame({ ...newGame, description: e.target.value })}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={newGame.energy_level}
              onChange={(e) => setNewGame({ ...newGame, energy_level: e.target.value })}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Låg Energi</option>
              <option value="medium">Medel Energi</option>
              <option value="high">Hög Energi</option>
            </select>
            <button
              onClick={handleCreateGame}
              disabled={isCreatingGame || !newGame.name.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
            >
              {isCreatingGame ? 'Skapar...' : 'Skapa Spel'}
            </button>
          </div>
        </div>

        {/* Games List */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Games List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <h2 className="text-lg font-bold text-white">Spel ({filteredGames.length})</h2>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-slate-200 flex gap-2">
              <input
                type="text"
                placeholder="Sök spel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Alla Status</option>
                <option value="draft">Utkast</option>
                <option value="published">Publicerad</option>
              </select>
            </div>

            {/* Games */}
            <div className="divide-y overflow-y-auto flex-1 max-h-96">
              {isLoading ? (
                <div className="p-4 text-center text-slate-600">Laddar...</div>
              ) : filteredGames.length === 0 ? (
                <div className="p-4 text-center text-slate-600">Inga spel hittades</div>
              ) : (
                filteredGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-l-4 ${
                      selectedGame?.id === game.id ? 'bg-blue-50 border-l-blue-500' : 'border-l-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-slate-900">{game.name}</p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          game.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {game.status === 'published' ? 'Publicerad' : 'Utkast'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 truncate">{game.description || 'Ingen beskrivning'}</p>
                    <div className="flex gap-4 text-xs text-slate-500 mt-2">
                      <span>{game.total_plays} spelade</span>
                      <span>Ø {game.avg_score} poäng</span>
                      <span>{game.completion_rate}% slutförda</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Game Detail */}
          {selectedGame ? (
            <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col max-h-96">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
                <h2 className="text-lg font-bold text-white truncate">{selectedGame.name}</h2>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {/* Game Info */}
                <div className="space-y-2 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Status</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedGame.status === 'published' ? 'Publicerad' : 'Utkast'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-medium">Energinivå</p>
                    <p className="text-sm text-slate-900 capitalize">
                      {selectedGame.energy_level === 'low'
                        ? 'Låg'
                        : selectedGame.energy_level === 'high'
                          ? 'Hög'
                          : 'Medel'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-medium">Skapad</p>
                    <p className="text-sm text-slate-900">
                      {new Date(selectedGame.created_at).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                </div>

                {/* Statistics */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">Spelade</p>
                    <p className="text-2xl font-bold text-blue-600">{selectedGame.total_plays}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">Genomsnittspoäng</p>
                    <p className="text-2xl font-bold text-green-600">{selectedGame.avg_score}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-1">Slutförandehastighet</p>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${selectedGame.completion_rate}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{selectedGame.completion_rate}%</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {selectedGame.status === 'draft' && (
                <div className="p-4 border-t border-slate-200">
                  <button
                    onClick={() => handlePublishGame(selectedGame.id)}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Publicera Spel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-64">
              <p className="text-slate-600">Välj ett spel för att se detaljer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
