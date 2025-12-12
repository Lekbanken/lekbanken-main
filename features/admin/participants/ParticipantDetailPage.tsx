'use client';

import { useEffect, useMemo, useState } from 'react';
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
        setError('Visar mockdata tills riktiga kopplingen är klar.');
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [participantId]);

  const breadcrumbs = useMemo(
    () => [
      { label: 'Startsida', href: '/admin' },
      { label: 'Deltagare', href: '/admin/participants' },
      { label: participant?.name || 'Deltagare' },
    ],
    [participant]
  );

  if (!can('admin.participants.view')) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          title="Ingen åtkomst"
          description="Du behöver behörighet för att se deltagare."
        />
      </AdminPageLayout>
    );
  }

  if (!participant) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          title="Deltagaren hittades inte"
          description="Kontrollera länken eller gå tillbaka till listan."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={breadcrumbs} />
      <AdminPageHeader
        title={participant.name}
        description={participant.email || 'Ingen e-post angiven'}
      />

      {error && <p className="mb-2 text-sm text-amber-600">{error}</p>}

      <AdminStatGrid className="mb-4">
        <AdminStatCard label="Organisation" value={participant.tenantName} />
        <AdminStatCard label="Risk" value={participant.risk} />
        <AdminStatCard label="Senast aktiv" value={new Date(participant.lastActive).toLocaleString()} />
      </AdminStatGrid>

      <Card className="border border-border mb-4">
        <CardHeader className="border-b border-border bg-muted/40">
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground">E-post: {participant.email || '—'}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Risk:</span>
            <Badge
              variant={
                participant.risk === 'high' ? 'destructive' : participant.risk === 'low' ? 'secondary' : 'success'
              }
              className="capitalize"
            >
              {participant.risk}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Anteckningar: {participant.notes || '—'}</p>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="border-b border-border bg-muted/40">
          <CardTitle>Åtgärder & logg</CardTitle>
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
                success('Mute skickad.');
              }}
            >
              Mute
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
                warning('Kick skickad.');
              }}
            >
              Kick
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
                warning('Ban skickad.');
              }}
            >
              Ban
            </button>
          </div>
          <div className="space-y-2">
            {log.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen logg ännu.</p>
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
