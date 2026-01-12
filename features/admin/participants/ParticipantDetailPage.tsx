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

type RiskLevel = 'none' | 'low' | 'high';

type Participant = {
  id: string;
  name: string;
  email?: string;
  tenantName: string;
  lastActive: string;
  risk: RiskLevel;
  notes?: string;
};

type ActionLogEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
};

const mockParticipant: Participant = {
  id: 'p-1',
  name: 'Nora Nilsson',
  email: 'nora@example.com',
  tenantName: 'Lekbanken',
  lastActive: '2025-12-12T09:05:00Z',
  risk: 'none',
  notes: 'Mockprofil tills backend kopplas.',
};

const mockLog: ActionLogEntry[] = [
  { id: 'p-log-1', at: '2025-12-12T09:02:00Z', actor: 'Anna', action: 'Lades till i session' },
  { id: 'p-log-2', at: '2025-12-12T09:05:00Z', actor: 'System', action: 'Risknivå: låg' },
];

type Props = {
  participantId: string;
};

export function ParticipantDetailPage({ participantId }: Props) {
  const { can } = useRbac();
  const { success, warning } = useToast();
  const t = useTranslations('admin.participants');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [log, setLog] = useState<ActionLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setError(null);
      try {
        const res = await fetch(`/api/participants/${participantId}`);
        if (res.ok) {
          const json = (await res.json()) as { participant?: Participant; log?: ActionLogEntry[] };
          if (!active) return;
          setParticipant(json.participant || null);
          setLog(json.log || []);
        } else {
          throw new Error(`API ${res.status}`);
        }
      } catch (err) {
        console.warn('[admin/participant detail] fallback till mock', err);
        if (!active) return;
        setParticipant(mockParticipant);
        setLog(mockLog);
        setError(t('showingMockData'));
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [participantId, t]);

  const breadcrumbs = useMemo(
    () => [
      { label: t('breadcrumbs.home'), href: '/admin' },
      { label: t('breadcrumbs.participants'), href: '/admin/participants' },
      { label: participant?.name || t('title') },
    ],
    [participant, t]
  );

  if (!can('admin.participants.view')) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          title={t('noAccess')}
          description={t('noPermissionParticipants')}
        />
      </AdminPageLayout>
    );
  }

  if (!participant) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          title={t('notFound')}
          description={t('checkLinkOrGoBack')}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={breadcrumbs} />
      <AdminPageHeader
        title={participant.name}
        description={participant.email || t('noEmailProvided')}
      />

      {error && <p className="mb-2 text-sm text-amber-600">{error}</p>}

      <AdminStatGrid className="mb-4">
        <AdminStatCard label={t('organisation')} value={participant.tenantName} />
        <AdminStatCard label={t('risk')} value={participant.risk} />
        <AdminStatCard label={t('lastActive')} value={new Date(participant.lastActive).toLocaleString()} />
      </AdminStatGrid>

      <Card className="border border-border mb-4">
        <CardHeader className="border-b border-border bg-muted/40">
          <CardTitle>{t('profile')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground">{t('email')}: {participant.email || '—'}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t('risk')}:</span>
            <Badge
              variant={
                participant.risk === 'high' ? 'destructive' : participant.risk === 'low' ? 'secondary' : 'success'
              }
              className="capitalize"
            >
              {participant.risk}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t('notes')}: {participant.notes || '—'}</p>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="border-b border-border bg-muted/40">
          <CardTitle>{t('actionsAndLog')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded border px-3 py-1 text-sm"
              onClick={async () => {
                const res = await fetch(`/api/participants/${participant.id}/actions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'mute' }),
                });
                const json = await res.json().catch(() => ({}));
                if (json?.logEntry) setLog((prev) => [json.logEntry, ...prev]);
                success(t('muteSent'));
              }}
            >
              {t('mute')}
            </button>
            <button
              className="rounded border px-3 py-1 text-sm"
              onClick={async () => {
                const res = await fetch(`/api/participants/${participant.id}/actions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'kick' }),
                });
                const json = await res.json().catch(() => ({}));
                if (json?.logEntry) setLog((prev) => [json.logEntry, ...prev]);
                warning(t('kickSent'));
              }}
            >
              {t('kick')}
            </button>
            <button
              className="rounded border px-3 py-1 text-sm"
              onClick={async () => {
                const res = await fetch(`/api/participants/${participant.id}/actions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'ban' }),
                });
                const json = await res.json().catch(() => ({}));
                if (json?.logEntry) setLog((prev) => [json.logEntry, ...prev]);
                warning(t('banSent'));
              }}
            >
              {t('ban')}
            </button>
          </div>
          <div className="space-y-2">
            {log.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noLogYet')}</p>
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
