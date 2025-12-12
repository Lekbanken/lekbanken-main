'use client';

import { useEffect, useState } from 'react';

type ScoreBoardVariant = 'fixed' | 'inline';

interface ScoreBoardProps {
  sessionId: string;
  score?: number;
  gameTimeSeconds?: number;
  variant?: ScoreBoardVariant;
}

export default function ScoreBoard({
  sessionId,
  score = 0,
  gameTimeSeconds = 0,
  variant = 'fixed',
}: ScoreBoardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Handle elapsed time
  useEffect(() => {
    const resetTimer = setTimeout(() => setElapsedSeconds(0), 0);
    if (gameTimeSeconds === 0) return () => clearTimeout(resetTimer);

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (gameTimeSeconds > 0 && prev >= gameTimeSeconds) {
          clearInterval(interval);
          return gameTimeSeconds;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      clearTimeout(resetTimer);
      clearInterval(interval);
    };
  }, [gameTimeSeconds]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const timeProgress = gameTimeSeconds > 0 ? (elapsedSeconds / gameTimeSeconds) * 100 : 0;

  const containerClasses =
    variant === 'fixed'
      ? 'fixed top-0 left-0 right-0 z-50'
      : 'relative rounded-2xl shadow-md';

  return (
    <div className={containerClasses + ' bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'}>
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Score Display */}
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-sm font-semibold opacity-90 uppercase tracking-wide">Score</p>
              <p className="text-4xl font-bold">{score.toLocaleString()}</p>
            </div>

            {/* Time Display */}
            {gameTimeSeconds > 0 && (
              <div className="text-center">
                <p className="text-sm font-semibold opacity-90 uppercase tracking-wide">Time</p>
                <p className="text-3xl font-mono font-bold">{formatTime(elapsedSeconds)}</p>
              </div>
            )}
          </div>

          {/* Session Info */}
          <div className="text-right text-sm opacity-90">
            <p>Session ID: {sessionId.slice(0, 8)}...</p>
          </div>
        </div>

        {/* Progress Bar */}
        {gameTimeSeconds > 0 && (
          <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 transition-all duration-300"
              style={{ width: `${timeProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
