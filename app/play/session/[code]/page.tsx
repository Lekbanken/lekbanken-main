'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPublicSession } from '@/features/play-participant/api';
import { useParticipantSession } from '@/features/play-participant/useParticipantSession';

export default function ParticipantSessionPage({ params }: { params: { code: string } }) {
  const sessionCode = params.code.toUpperCase();
  const router = useRouter();
  const [publicSession, setPublicSession] = useState<any>(null);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [joinName, setJoinName] = useState('');
  const { participant, session, joinState, error, join, tryRejoin, isLoading, leave } = useParticipantSession(sessionCode);

  useEffect(() => {
    void (async () => {
      try {
        const res = await getPublicSession(sessionCode);
        setPublicSession(res.session);
      } catch (err) {
        setPublicError(err instanceof Error ? err.message : 'Kunde inte hämta session');
      } finally {
        setLoadingPublic(false);
      }
    })();
    void tryRejoin();
  }, [sessionCode, tryRejoin]);

  const statusLabel = useMemo(() => {
    const s = session?.status || publicSession?.status;
    if (!s) return null;
    const map: Record<string, string> = {
      active: 'Pågår',
      paused: 'Pausad',
      locked: 'Låst',
      ended: 'Avslutad',
    };
    return map[s] || s;
  }, [session?.status, publicSession?.status]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    await join(joinName);
  };

  const joined = Boolean(participant);

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/40 to-background">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Session</p>
              <h1 className="text-2xl font-bold text-foreground">{publicSession?.displayName || 'Session'}</h1>
              <p className="text-sm text-muted-foreground">Kod: <span className="font-mono">{sessionCode}</span></p>
            </div>
            {statusLabel && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {statusLabel}
              </span>
            )}
          </div>

          {publicError && <p className="mt-3 text-sm text-destructive">{publicError}</p>}
          {loadingPublic && <p className="mt-3 text-sm text-muted-foreground">Laddar session...</p>}
        </div>

        {!joined ? (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-3">Gå med</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Ditt namn</label>
                <input
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                  maxLength={50}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={joinState === 'joining' || !joinName.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground font-semibold disabled:opacity-50"
              >
                {joinState === 'joining' ? 'Ansluter...' : 'Gå med i sessionen'}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Lobby</h2>
            <p className="text-sm text-muted-foreground">
              Inloggad som <span className="font-semibold text-foreground">{participant?.displayName}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Status: {statusLabel || session?.status || 'okänd'}
            </p>
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-muted px-3 py-2 text-sm"
                onClick={() => {
                  leave();
                  router.push('/play');
                }}
              >
                Lämna
              </button>
              <button
                className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                onClick={() => window.location.reload()}
              >
                Uppdatera
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
