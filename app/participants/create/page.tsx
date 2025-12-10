'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState('');

  const handleCreateSession = async () => {
    setLoading(true);
    setError(null);

    try {
      const body = gameId.trim() ? { game_id: gameId.trim() } : {};
      
      const response = await fetch('/api/participants/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kunde inte skapa session');
      }

      // Redirect to host dashboard
      router.push(`/participants/host/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Skapa Ny Session
        </h1>
        <p className="text-gray-600 mb-6">
          Starta en ny deltagarsession för ditt spel eller aktivitet
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spel ID (valfritt)
            </label>
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Ange spel-ID om du vill koppla session till ett spel"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Lämna tomt för en fristående session
            </p>
          </div>

          <button
            onClick={handleCreateSession}
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Skapar session...' : 'Skapa Session'}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">
            Vad händer härnäst?
          </h2>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">1.</span>
              <span>Du får en unik sessionskod som deltagare använder för att gå med</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2.</span>
              <span>Du kommer till värd-dashboarden där du kan hantera deltagare</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3.</span>
              <span>Deltagare går med genom att ange koden på gå med-sidan</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
