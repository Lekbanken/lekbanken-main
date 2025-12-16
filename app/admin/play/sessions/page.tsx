'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listHostSessions, type PlaySession } from '@/features/play-participant/api';
import { SessionStatusBadge } from '@/components/play';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  PlayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type SessionStatus = Database['public']['Enums']['participant_session_status'];

export default function AdminPlaySessionsPage() {
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all');

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await listHostSessions();
      setSessions(res.sessions || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte hämta sessioner');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = search === '' || 
      s.displayName.toLowerCase().includes(search.toLowerCase()) ||
      s.sessionCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.status === 'active').length,
    paused: sessions.filter(s => s.status === 'paused').length,
    ended: sessions.filter(s => s.status === 'ended').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Play</p>
          <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={loadSessions} disabled={loading}>
          <ArrowPathIcon className={cn('h-4 w-4', loading && 'animate-spin')} />
          Uppdatera
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Totalt', value: stats.total, color: 'bg-muted' },
          { label: 'Aktiva', value: stats.active, color: 'bg-green-100 dark:bg-green-900/30' },
          { label: 'Pausade', value: stats.paused, color: 'bg-amber-100 dark:bg-amber-900/30' },
          { label: 'Avslutade', value: stats.ended, color: 'bg-gray-100 dark:bg-gray-800' },
        ].map((stat) => (
          <Card key={stat.label} className={cn('p-4 text-center', stat.color)}>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Sök på namn eller kod..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SessionStatus | 'all')}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">Alla statusar</option>
          <option value="active">Aktiva</option>
          <option value="paused">Pausade</option>
          <option value="locked">Låsta</option>
          <option value="ended">Avslutade</option>
          <option value="archived">Arkiverade</option>
          <option value="cancelled">Avbrutna</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <Card className="overflow-hidden">
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border/60 p-4 last:border-0">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!loading && filteredSessions.length === 0 && (
        <EmptyState
          icon={<PlayIcon className="h-8 w-8" />}
          title="Inga sessioner hittades"
          description={search || statusFilter !== 'all' 
            ? 'Prova att ändra sökning eller filter.'
            : 'Det finns inga sessioner i systemet ännu.'
          }
        />
      )}

      {/* Table */}
      {!loading && filteredSessions.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Namn</th>
                  <th className="px-4 py-3 font-medium">Kod</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Deltagare</th>
                  <th className="px-4 py-3 font-medium">Skapad</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((s) => (
                  <tr key={s.id} className="border-t border-border/60 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{s.displayName}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{s.sessionCode}</td>
                    <td className="px-4 py-3">
                      <SessionStatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.participantCount ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.createdAt 
                        ? new Date(s.createdAt).toLocaleDateString('sv-SE', { 
                            day: 'numeric', 
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link 
                        href={`/app/play/sessions/${s.id}`} 
                        className="text-primary hover:underline font-medium"
                      >
                        Öppna
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
