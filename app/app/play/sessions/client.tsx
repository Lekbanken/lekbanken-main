'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { listHostSessions, type PlaySession } from '@/features/play-participant/api';
import { SessionCard, SessionCardSkeleton } from '@/components/play';
import { PageTitleHeader } from '@/components/app/PageTitleHeader';
import { appNavItems } from '@/components/app/nav-items';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  PlusIcon, 
  PlayIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type SessionStatus = Database['public']['Enums']['participant_session_status'];

export function HostSessionsClient() {
  const t = useTranslations('play.hostSessions');
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
        setError(err instanceof Error ? err.message : t('errors.fetchFailed'));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const filteredSessions = filter === 'all' 
    ? sessions 
    : sessions.filter((s) => s.status === filter);

  const activeSessions = sessions.filter((s) => s.status === 'active' || s.status === 'paused');
  const playNavIcon = appNavItems.find((item) => item.href === '/app/play')?.icon;

  return (
    <div className="space-y-6">
      <PageTitleHeader
        icon={playNavIcon ?? <PlayIcon className="h-5 w-5" />}
        title={t('header.title')}
        subtitle={t('header.subtitle')}
        rightSlot={
          <Button variant="primary" href="/app/browse">
            <PlusIcon className="h-4 w-4" />
            {t('header.newSession')}
          </Button>
        }
      />

      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{t('summary.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {activeSessions.length > 0
            ? t('summary.activeCount', { count: activeSessions.length })
            : t('summary.noneActive')}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {([
          { value: 'all', label: t('filters.all') },
          { value: 'active', label: t('filters.active') },
          { value: 'paused', label: t('filters.paused') },
          { value: 'ended', label: t('filters.ended') },
        ] as const).map((f) => (
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
          title={filter === 'all'
            ? t('empty.titleAll')
            : t('empty.titleFiltered', { status: t(`filters.${filter}`) })}
          description={filter === 'all'
            ? t('empty.descriptionAll')
            : t('empty.descriptionFiltered')
          }
          action={filter === 'all' ? {
            label: t('empty.action'),
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
