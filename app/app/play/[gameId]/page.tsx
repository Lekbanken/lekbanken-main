'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import {
  startGameSession,
  getActiveSession,
  endGameSession,
  recordScore,
  getUserGameStats,
  GameSession,
} from '@/lib/services/sessionService';
import ScoreBoard from '@/components/ScoreBoard';

interface Game {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  time_estimate_min: number | null;
  min_players: number | null;
  max_players: number | null;
  energy_level: string | null;
  age_min: number | null;
  age_max: number | null;
}

export default function GamePlayerPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [game, setGame] = useState<Game | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [stats, setStats] = useState<{
    totalGames: number;
    totalScore: number;
    averageScore: number;
    bestScore: number;
    totalTimeSeconds: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const loadGame = async () => {
      if (!gameId) return;

      try {
        setIsLoading(true);
        setError(null);

        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (gameError || !gameData) {
          setError('Game not found');
          setGame(null);
          return;
        }

        setGame(gameData);

        if (user) {
          const activeSession = await getActiveSession(gameId, user.id);
          if (activeSession) {
            setSession(activeSession);
            setGameStarted(true);
            setScore(activeSession.score || 0);
          } else {
            setSession(null);
            setGameStarted(false);
            setScore(0);
          }

          const userStats = await getUserGameStats(user.id, gameId);
          setStats(userStats);
        } else {
          setSession(null);
          setGameStarted(false);
          setStats(null);
          setScore(0);
        }
      } catch (err) {
        console.error('Error loading game:', err);
        setError('Error loading game details');
      } finally {
        setIsLoading(false);
      }
    };

    loadGame();
  }, [user, gameId]);

  const handleStartGame = async () => {
    if (!user) {
      setError('You must be logged in to start a game.');
      return;
    }
    if (!gameId) return;

    try {
      const newSession = await startGameSession({
        gameId,
        userId: user.id,
        tenantId: currentTenant?.id,
      });

      if (newSession) {
        setSession(newSession);
        setGameStarted(true);
        setScore(0);
        setError(null);
      }
    } catch (err) {
      console.error('Error starting game:', err);
      setError('Failed to start game');
    }
  };

  const handleAddScore = async (points: number) => {
    if (!session || !user || !game) return;

    try {
      await recordScore({
        sessionId: session.id,
        gameId: game.id,
        userId: user.id,
        score: points,
        tenantId: currentTenant?.id,
      });

      setScore((prev) => prev + points);
    } catch (err) {
      console.error('Error recording score:', err);
    }
  };

  const handleEndGame = async () => {
    if (!session) return;

    try {
      const completedSession = await endGameSession({
        sessionId: session.id,
        finalScore: score,
      });

      if (completedSession) {
        setGameStarted(false);
        setScore(0);
        setSession(null);
        setStats((prev) =>
          prev
            ? {
                ...prev,
                totalGames: prev.totalGames + 1,
                totalScore: prev.totalScore + score,
                bestScore: Math.max(prev.bestScore, score),
                averageScore:
                  prev.totalGames + 1 > 0
                    ? Math.round((prev.totalScore + score) / (prev.totalGames + 1))
                    : prev.averageScore,
                totalTimeSeconds: prev.totalTimeSeconds,
              }
            : prev
        );
      }
    } catch (err) {
      console.error('Error ending game:', err);
      setError('Failed to end game');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="mt-4 text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{error || 'Game not found'}</h1>
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

  return (
    <>
      {gameStarted && session && (
        <ScoreBoard
          sessionId={session.id}
          score={score}
          gameTimeSeconds={game.time_estimate_min ? game.time_estimate_min * 60 : 0}
        />
      )}

      <div className={gameStarted ? 'pt-32 pb-8' : 'py-8'}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {!gameStarted && (
            <div className="mb-8">
              <Link href="/app/games" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                ← Back to Games
              </Link>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{game.name}</h1>
              <p className="text-lg text-gray-700">{game.description}</p>
            </div>
          )}

          {!gameStarted && game.instructions && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Play</h2>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">{game.instructions}</div>
            </div>
          )}

          {!gameStarted && stats && (
            <div className="bg-blue-50 rounded-lg shadow p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Your Stats</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Times Played</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalGames}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Best Score</p>
                  <p className="text-2xl font-bold text-green-600">{stats.bestScore}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageScore}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Score</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalScore}</p>
                </div>
              </div>
            </div>
          )}

          {gameStarted && session ? (
            <div className="bg-white rounded-lg shadow p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{game.name}</h2>
                <div className="text-6xl font-bold text-blue-600 mb-8">{score}</div>

                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  <button
                    onClick={() => handleAddScore(10)}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition text-lg"
                  >
                    +10 Points
                  </button>
                  <button
                    onClick={() => handleAddScore(50)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition text-lg"
                  >
                    +50 Points
                  </button>
                  <button
                    onClick={() => handleAddScore(100)}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition text-lg"
                  >
                    +100 Points
                  </button>
                </div>

                <button
                  onClick={handleEndGame}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg transition text-lg"
                >
                  End Game
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              {user ? (
                <button
                  onClick={handleStartGame}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-2xl transition"
                >
                  Start Game
                </button>
              ) : (
                <Link
                  href={`/auth/login?redirect=/app/play/${game.id}`}
                  className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-lg text-2xl transition"
                >
                  Sign in to play
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
