'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createSession } from '@/features/play-participant/api';

export function StartSessionButton({ gameId, gameName }: { gameId: string; gameName: string }) {
  const t = useTranslations('app.play.startSession');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await createSession({ displayName: gameName, gameId });
      const sessionId = res.session.id;
      router.push(`/app/play/sessions/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t('helper')}
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        onClick={handleStart}
        disabled={loading}
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground font-semibold disabled:opacity-50"
      >
        {loading ? t('starting') : t('startButton')}
      </button>
    </div>
  );
}
