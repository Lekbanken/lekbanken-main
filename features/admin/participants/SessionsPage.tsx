'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminBreadcrumbs,
  AdminDataTable,
  AdminEmptyState,
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminTableToolbar,
} from '@/components/admin/shared';
import { Badge, Card, CardContent, CardHeader, CardTitle, Select, useToast } from '@/components/ui';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';
import { useRealtimeTable } from '@/features/admin/hooks';
import { PlayIcon } from '@heroicons/react/24/outline';

type SessionStatus = 'active' | 'completed' | 'flagged';

type SessionRow = {
  id: string;
  title: string;
  tenantName: string;
  host: string;
  participants: number;
  startedAt: string;
  status: SessionStatus;
};

const mockSessions: SessionRow[] = [
  {
    id: 'sess-1',
    title: 'Fredagslek',
    tenantName: 'Lekbanken',
    host: 'Anna',
    participants: 12,
    startedAt: '2025-12-12T09:00:00Z',
    status: 'active',
  },
  {
    id: 'sess-2',
    title: 'Workshop QA',
    tenantName: 'Campus Nord',
    host: 'Oskar',
    participants: 8,
    startedAt: '2025-12-11T15:00:00Z',
    status: 'completed',
  },
  {
    id: 'sess-3',
    title: 'Trygghetspass',
    tenantName: 'Lekbanken',
    host: 'Mia',
    participants: 15,
    startedAt: '2025-12-12T08:30:00Z',
    status: 'flagged',
  },
];

type Props = {
  tenantId?: string;
  onSelectSession?: (id: string) => void;
};

export function SessionsPage({ tenantId, onSelectSession }: Props) {
  const { can } = useRbac();
  const { warning } = useToast();
  const [statusFilter, setStatusFilter] = useState<'all' | SessionStatus>('all');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = tenantId
    ? [
        { label: 'Startsida', href: '/admin' },
        { label: 'Tenant', href: `/admin/tenant/${tenantId}` },
        { label: 'Sessioner' },
      ]
    : [
        { label: 'Startsida', href: '/admin' },
        { label: 'Sessioner' },
      ];

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = tenantId ? `/api/sessions?tenantId=${tenantId}` : '/api/sessions';
      const res = await fetch(query);
      if (res.ok) {
        const json = (await res.json()) as { sessions?: SessionRow[] };
        setSessions(json.sessions || []);
      } else {
        throw new Error(`API svarade ${res.status}`);
      }
    } catch (err) {
      console.warn('[admin/sessions] fallback till mock', err);
      setSessions(mockSessions);
      setError('Visar mockdata tills riktiga sessionskopplingen är klar.');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable({
    table: 'sessions',
    enabled: can('admin.sessions.list'),
    onEvent: () => {
      void load();
    },
  });

  const filtered = useMemo(() => {
    return sessions.filter((s) => (statusFilter === 'all' ? true : s.status === statusFilter));
  }, [statusFilter, sessions]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((s) => s.status === 'active').length;
    const flagged = filtered.filter((s) => s.status === 'flagged').length;
    return [
      { label: 'Sessioner', value: total },
      { label: 'Aktiva', value: active },
      { label: 'Flaggade', value: flagged },
    ];
  }, [filtered]);

  if (!can('admin.sessions.list')) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          title="Ingen åtkomst"
          description="Du behöver behörighet för att se sessioner."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={breadcrumbs} />
      <AdminPageHeader
        title="Sessioner"
        description="Visa och hantera deltagarsessioner, statistik och avvikelser."
        icon={<PlayIcon className="h-8 w-8 text-primary" />}
      />

      {error && (
        <p className="mb-2 text-sm text-amber-600">
          {error}{' '}
          <button
            className="underline"
            onClick={() => warning('Koppla backend för att ta bort denna varning.')}
          >
            Lär mer
          </button>
        </p>
      )}

      <AdminStatGrid className="mb-4">
        {stats.map((s) => (
          <AdminStatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </AdminStatGrid>

      <Card className="border border-border">
        <CardHeader className="border-b border-border bg-muted/40">
          <CardTitle>Sessioner</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <AdminTableToolbar
            searchValue=""
            onSearchChange={() => {}}
            searchPlaceholder="Sök (kommersiell data kopplas senare)"
            filters={
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                options={[
                  { value: 'all', label: 'Alla statusar' },
                  { value: 'active', label: 'Aktiva' },
                  { value: 'completed', label: 'Avslutade' },
                  { value: 'flagged', label: 'Flaggade' },
                ]}
                placeholder="Status"
              />
            }
          />

          <AdminDataTable
            data={filtered}
            isLoading={isLoading}
            keyAccessor="id"
            columns={[
              {
                header: 'Titel',
                accessor: (row) => row.title,
                cell: (row) => (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{row.title}</span>
                      <Badge
                        variant={
                          row.status === 'active'
                            ? 'success'
                            : row.status === 'flagged'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="capitalize"
                      >
                        {row.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Värd: {row.host} · {row.tenantName}
                    </p>
                  </div>
                ),
              },
              { header: 'Deltagare', accessor: (row) => row.participants.toString(), hideBelow: 'md' },
              {
                header: 'Start',
                accessor: (row) => new Date(row.startedAt).toLocaleString(),
                hideBelow: 'md',
              },
            ]}
            emptyState={
              <AdminEmptyState
                icon={<PlayIcon className="h-6 w-6" />}
                title="Inga sessioner"
                description="När data kopplas in visas sessioner här."
              />
            }
            onRowClick={(row) => onSelectSession?.(row.id)}
          />
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
