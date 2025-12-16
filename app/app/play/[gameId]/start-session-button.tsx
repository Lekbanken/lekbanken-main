'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSession } from '@/features/play-participant/api';

export function StartSessionButton({ gameId, gameName }: { gameId: string; gameName: string }) {
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
      setError(err instanceof Error ? err.message : 'Kunde inte skapa session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Vi skapar en ny session med en unik kod som deltagarna kan använda.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        onClick={handleStart}
        disabled={loading}
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground font-semibold disabled:opacity-50"
      >
        {loading ? 'Startar...' : 'Starta session'}
      </button>
    </div>
  );
}
