'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listHostSessions, type PlaySession } from '@/features/play-participant/api';
import { SessionCard, SessionCardSkeleton } from '@/components/play';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  PlusIcon, 
  PlayIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type SessionStatus = Database['public']['Enums']['participant_session_status'];

const STATUS_FILTERS: { value: SessionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'active', label: 'Aktiva' },
  { value: 'paused', label: 'Pausade' },
  { value: 'ended', label: 'Avslutade' },
];

export function HostSessionsClient() {
  const router = useRouter();
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SessionStatus | 'all'>('all');

  useEffect(() => {
    void (async () => {
      try {
        const res = await listHostSessions();
        setSessions(res.sessions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunde inte hämta sessioner');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredSessions = filter === 'all' 
    ? sessions 
    : sessions.filter((s) => s.status === filter);

  const activeSessions = sessions.filter((s) => s.status === 'active' || s.status === 'paused');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mina sessioner</h1>
          <p className="text-muted-foreground">
            {activeSessions.length > 0 
              ? `${activeSessions.length} aktiv${activeSessions.length > 1 ? 'a' : ''} session${activeSessions.length > 1 ? 'er' : ''}`
              : 'Inga aktiva sessioner'
            }
          </p>
        </div>
        <Button variant="primary" href="/app/browse">
          <PlusIcon className="h-4 w-4" />
          Ny session
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              filter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SessionCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredSessions.length === 0 && (
        <EmptyState
          icon={<PlayIcon className="h-12 w-12" />}
          title={filter === 'all' ? 'Inga sessioner ännu' : `Inga ${STATUS_FILTERS.find(f => f.value === filter)?.label.toLowerCase()} sessioner`}
          description={filter === 'all' 
            ? 'Skapa din första session genom att välja ett spel.'
            : 'Prova ett annat filter eller skapa en ny session.'
          }
          action={filter === 'all' ? {
            label: 'Välj spel',
            onClick: () => router.push('/app/browse'),
          } : undefined}
        />
      )}

      {/* Session grid */}
      {!loading && filteredSessions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              id={session.id}
              code={session.sessionCode}
              name={session.displayName}
              status={session.status}
              participantCount={session.participantCount ?? 0}
              createdAt={session.createdAt ?? new Date().toISOString()}
              href={`/app/play/sessions/${session.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
