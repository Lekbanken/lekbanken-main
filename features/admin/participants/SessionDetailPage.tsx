'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AdminBreadcrumbs,
  AdminEmptyState,
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/shared';
import { Badge, Card, CardContent, CardHeader, CardTitle, useToast } from '@/components/ui';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';
import { PlayIcon } from '@heroicons/react/24/outline';

type Status = 'active' | 'completed' | 'flagged';

type SessionDetail = {
  id: string;
  title: string;
  tenantName: string;
  host: string;
  participants: number;
  startedAt: string;
  status: Status;
  notes?: string;
};

type ActionLogEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
};

const mockSession: SessionDetail = {
  id: 'mock-session',
  title: 'Fredagslek',
  tenantName: 'Lekbanken',
  host: 'Anna',
  participants: 12,
  startedAt: '2025-12-12T09:00:00Z',
  status: 'active',
  notes: 'Realtime-data kopplas senare.',
};

const mockLog: ActionLogEntry[] = [
  { id: 'log-1', at: '2025-12-12T09:02:00Z', actor: 'Anna', action: 'Session startad' },
  { id: 'log-2', at: '2025-12-12T09:05:00Z', actor: 'System', action: '3 flaggor registrerades' },
];

function statusVariant(status: Status) {
  if (status === 'active') return 'success';
  if (status === 'flagged') return 'destructive';
  return 'secondary';
}

type Props = {
  sessionId: string;
};

export function SessionDetailPage({ sessionId }: Props) {
  const t = useTranslations('admin.sessions');
  const tDetail = useTranslations('admin.sessions.detail');
  const { can } = useRbac();
  const { success, warning } = useToast();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [log, setLog] = useState<ActionLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setError(null);
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (res.ok) {
          const json = (await res.json()) as { session?: SessionDetail; log?: ActionLogEntry[] };
          if (!active) return;
          setSession(json.session || null);
          setLog(json.log || []);
        } else {
          throw new Error(`API ${res.status}`);
        }
      } catch (err) {
        console.warn('[admin/session detail] fallback till mock', err);
        if (!active) return;
        setSession(mockSession);
        setLog(mockLog);
        setError(t('showingMockData'));
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [sessionId, t]);

  const breadcrumbs = useMemo(
    () => [
      { label: t('breadcrumbs.home'), href: '/admin' },
      { label: t('breadcrumbs.sessions'), href: '/admin/sessions' },
      { label: session?.title || 'Session' },
    ],
    [session, t]
  );

  if (!can('admin.sessions.view')) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          title={tDetail('noAccess')}
          description={tDetail('noAccessDescription')}
        />
      </AdminPageLayout>
    );
  }

  if (!session) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<PlayIcon className="h-6 w-6" />}
          title={tDetail('notFound')}
          description={tDetail('notFoundDescription')}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={breadcrumbs} />
      <AdminPageHeader
        title={session.title}
        description={tDetail('pageDescription')}
        icon={<PlayIcon className="h-8 w-8 text-primary" />}
      />

      {error && <p className="mb-2 text-sm text-amber-600">{error}</p>}

      <AdminStatGrid className="mb-4">
        <AdminStatCard label={tDetail('status')} value={session.status} />
        <AdminStatCard label={t('columns.participants')} value={session.participants} />
        <AdminStatCard label={t('columns.host')} value={session.host} />
      </AdminStatGrid>

      <Card className="border border-border mb-4">
        <CardHeader className="border-b border-border bg-muted/40">
          <CardTitle>{tDetail('metadata')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{tDetail('status')}:</span>
            <Badge variant={statusVariant(session.status)} className="capitalize">
              {session.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{tDetail('organisation')}: {session.tenantName}</p>
          <p className="text-sm text-muted-foreground">{tDetail('start')}: {new Date(session.startedAt).toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">{tDetail('notes')}: {session.notes || tDetail('noNotes')}</p>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="border-b border-border bg-muted/40">
          <CardTitle>{tDetail('actionsAndLog')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded border px-3 py-1 text-sm"
              onClick={async () => {
                const res = await fetch(`/api/sessions/${session.id}/actions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'mute' }),
                });
                const json = await res.json().catch(() => ({}));
                if (json?.logEntry) {
                  setLog((prev) => [json.logEntry, ...prev]);
                }
                success(tDetail('muteSent'));
              }}
            >
              {tDetail('muteParticipant')}
            </button>
            <button
              className="rounded border px-3 py-1 text-sm"
              onClick={async () => {
                const res = await fetch(`/api/sessions/${session.id}/actions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'kick' }),
                });
                const json = await res.json().catch(() => ({}));
                if (json?.logEntry) {
                  setLog((prev) => [json.logEntry, ...prev]);
                }
                warning(tDetail('kickSent'));
              }}
            >
              {tDetail('kickSession')}
            </button>
            <button
              className="rounded border px-3 py-1 text-sm"
              onClick={async () => {
                const res = await fetch(`/api/sessions/${session.id}/actions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'ban' }),
                });
                const json = await res.json().catch(() => ({}));
                if (json?.logEntry) {
                  setLog((prev) => [json.logEntry, ...prev]);
                }
                warning(tDetail('banSent'));
              }}
            >
              {tDetail('banParticipant')}
            </button>
          </div>
          <div className="space-y-2">
            {log.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tDetail('noLogYet')}</p>
            ) : (
              log.map((entry) => (
                <div key={entry.id} className="rounded border border-border px-3 py-2">
                  <p className="text-sm font-medium">{entry.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.actor} · {new Date(entry.at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
