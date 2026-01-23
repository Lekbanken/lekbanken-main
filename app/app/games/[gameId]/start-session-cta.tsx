'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createSession } from '@/features/play-participant/api';

export function StartSessionCta({ gameId, gameName }: { gameId: string; gameName: string }) {
  const t = useTranslations('app.play.startSession');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createSession({ displayName: gameName, gameId });
      const sessionId = (res as { session?: { id?: string } }).session?.id;
      if (!sessionId) throw new Error(t('createFailed'));
      router.push(`/app/play/sessions/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        onClick={handleStart}
        disabled={loading}
        className="block text-center w-full bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 text-white font-bold py-4 px-6 rounded-xl text-lg transition shadow-sm disabled:opacity-60"
      >
        {loading ? t('starting') : t('startButton')}
      </button>
    </div>
  );
}
