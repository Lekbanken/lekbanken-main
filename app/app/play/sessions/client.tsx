'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { listHostSessions, type PlaySession } from '@/features/play-participant/api';
import { SessionListItem, SessionListItemSkeleton } from '@/components/play/SessionListItem';
import { PageTitleHeader } from '@/components/app/PageTitleHeader';
import { appNavItems } from '@/components/app/nav-items';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  PlusIcon, 
  PlayIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type SessionStatus = Database['public']['Enums']['participant_session_status'];
type FilterType = 'active' | 'all' | SessionStatus;

export function HostSessionsClient() {
  const t = useTranslations('play.hostSessions');
  const router = useRouter();
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Default to showing only active sessions (not ended)
  const [filter, setFilter] = useState<FilterType>('active');
  const [showEnded, setShowEnded] = useState(false);

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

  // Filter sessions based on current filter
  const getFilteredSessions = () => {
    if (filter === 'all') {
      return sessions;
    }
    if (filter === 'active') {
      // "Active" filter shows draft, lobby, active, paused - basically anything not ended
      return sessions.filter((s) => 
        s.status !== 'ended' && 
        s.status !== 'archived' && 
        s.status !== 'cancelled'
      );
    }
    return sessions.filter((s) => s.status === filter);
  };

  const filteredSessions = getFilteredSessions();
  
  // Separate ended sessions for the "show more" section
  const endedSessions = sessions.filter((s) => 
    s.status === 'ended' || s.status === 'archived' || s.status === 'cancelled'
  );
  
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
          { value: 'active', label: t('filters.activeAll') },
          { value: 'all', label: t('filters.all') },
          { value: 'paused', label: t('filters.paused') },
          { value: 'ended', label: t('filters.ended') },
        ] as const).map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setFilter(f.value);
              if (f.value === 'ended') setShowEnded(true);
            }}
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
        <div className="divide-y divide-border/50 rounded-lg border border-border/40 bg-card">
          {[1, 2, 3, 4, 5].map((i) => (
            <SessionListItemSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredSessions.length === 0 && (
        <EmptyState
          icon={<PlayIcon className="h-12 w-12" />}
          title={filter === 'all' || filter === 'active'
            ? t('empty.titleAll')
            : t('empty.titleFiltered', { status: t(`filters.${filter}`) })}
          description={filter === 'all' || filter === 'active'
            ? t('empty.descriptionAll')
            : t('empty.descriptionFiltered')
          }
          action={filter === 'all' || filter === 'active' ? {
            label: t('empty.action'),
            onClick: () => router.push('/app/browse'),
          } : undefined}
        />
      )}

      {/* Session list */}
      {!loading && filteredSessions.length > 0 && (
        <div className="divide-y divide-border/50 rounded-lg border border-border/40 bg-card overflow-hidden">
          {filteredSessions.map((session) => (
            <SessionListItem
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

      {/* Show ended sessions section - only when filter is 'active' and there are ended sessions */}
      {!loading && filter === 'active' && endedSessions.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowEnded(!showEnded)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDownIcon className={cn(
              'h-4 w-4 transition-transform',
              showEnded && 'rotate-180'
            )} />
            {t('filters.showEnded', { count: endedSessions.length })}
          </button>

          {showEnded && (
            <div className="divide-y divide-border/50 rounded-lg border border-border/40 bg-card/50 overflow-hidden opacity-75">
              {endedSessions.map((session) => (
                <SessionListItem
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
      )}
    </div>
  );
}
