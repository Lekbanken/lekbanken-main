'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function CreateSessionPage() {
  const router = useRouter();
  const t = useTranslations('participantSessionCreate');
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
        throw new Error(data.error || t('errors.createFailed'));
      }

      // Redirect to host dashboard
      router.push(`/participants/host/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('title')}
        </h1>
        <p className="text-gray-600 mb-6">
          {t('description')}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('gameId.label')}
            </label>
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder={t('gameId.placeholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('gameId.hint')}
            </p>
          </div>

          <button
            onClick={handleCreateSession}
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? t('actions.creating') : t('actions.create')}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">
            {t('nextSteps.title')}
          </h2>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">1.</span>
              <span>{t('nextSteps.step1')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">2.</span>
              <span>{t('nextSteps.step2')}</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">3.</span>
              <span>{t('nextSteps.step3')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
