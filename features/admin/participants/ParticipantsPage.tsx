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

type RiskLevel = 'none' | 'low' | 'high';

type ParticipantRow = {
  id: string;
  name: string;
  email?: string;
  tenantName: string;
  lastActive: string;
  risk: RiskLevel;
};

const mockParticipants: ParticipantRow[] = [
  {
    id: 'p-1',
    name: 'Nora Nilsson',
    email: 'nora@example.com',
    tenantName: 'Lekbanken',
    lastActive: '2025-12-12T09:05:00Z',
    risk: 'none',
  },
  {
    id: 'p-2',
    name: 'Oskar Öhman',
    email: 'oskar@example.com',
    tenantName: 'Campus Nord',
    lastActive: '2025-12-11T14:00:00Z',
    risk: 'low',
  },
  {
    id: 'p-3',
    name: 'Mia Månsson',
    email: 'mia@example.com',
    tenantName: 'Lekbanken',
    lastActive: '2025-12-12T08:50:00Z',
    risk: 'high',
  },
];

type Props = {
  tenantId?: string;
  onSelectParticipant?: (id: string) => void;
};

export function ParticipantsPage({ tenantId, onSelectParticipant }: Props) {
  const { can } = useRbac();
  const { warning } = useToast();
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = participants.length;
    const high = participants.filter((p) => p.risk === 'high').length;
    const low = participants.filter((p) => p.risk === 'low').length;
    return [
      { label: 'Deltagare', value: total },
      { label: 'Hög risk', value: high },
      { label: 'Låg risk', value: low },
    ];
  }, [participants]);

  const breadcrumbs = tenantId
    ? [
        { label: 'Startsida', href: '/admin' },
        { label: 'Tenant', href: `/admin/tenant/${tenantId}` },
        { label: 'Deltagare' },
      ]
    : [
        { label: 'Startsida', href: '/admin' },
        { label: 'Deltagare' },
      ];

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = tenantId ? `/api/participants?tenantId=${tenantId}` : '/api/participants';
      const res = await fetch(query);
      if (res.ok) {
        const json = (await res.json()) as { participants?: ParticipantRow[] };
        setParticipants(json.participants || []);
      } else {
        throw new Error(`API ${res.status}`);
      }
    } catch (err) {
      console.warn('[admin/participants] fallback till mock', err);
      setParticipants(mockParticipants);
      setError('Visar mockdata tills riktiga kopplingen är klar.');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable({
    table: 'participants',
    enabled: can('admin.participants.list'),
    onEvent: () => {
      void load();
    },
  });

  const filtered = useMemo(() => {
    return participants.filter((p) => (riskFilter === 'all' ? true : p.risk === riskFilter));
  }, [participants, riskFilter]);

  if (!can('admin.participants.list')) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          title="Ingen åtkomst"
          description="Du behöver behörighet för att se deltagare."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={breadcrumbs} />
      <AdminPageHeader
        title="Deltagare"
        description={
          tenantId
            ? 'Hantera deltagare och sessioner för denna organisation.'
            : 'Överblick över deltagare och sessioner.'
        }
      />

      {error && (
        <p className="mb-2 text-sm text-amber-600">
          {error}{' '}
          <button className="underline" onClick={() => warning('Koppla backend för skarpa data.')}>
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
          <CardTitle>Deltagare</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <AdminTableToolbar
            searchValue=""
            onSearchChange={() => {}}
            searchPlaceholder="Sök (kopplas till riktig data)"
            filters={
              <Select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as typeof riskFilter)}
                options={[
                  { value: 'all', label: 'Alla risknivåer' },
                  { value: 'none', label: 'Ingen' },
                  { value: 'low', label: 'Låg' },
                  { value: 'high', label: 'Hög' },
                ]}
                placeholder="Risk"
              />
            }
          />

          <AdminDataTable
            data={filtered}
            isLoading={isLoading}
            keyAccessor="id"
            columns={[
              {
                header: 'Namn',
                accessor: (row) => row.name,
                cell: (row) => (
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.email || 'Ingen e-post'}</p>
                  </div>
                ),
              },
              { header: 'Organisation', accessor: (row) => row.tenantName, hideBelow: 'md' },
              {
                header: 'Senast aktiv',
                accessor: (row) => new Date(row.lastActive).toLocaleString(),
                hideBelow: 'md',
              },
              {
                header: 'Risk',
                accessor: (row) => row.risk,
                cell: (row) => (
                  <Badge
                    variant={
                      row.risk === 'high' ? 'destructive' : row.risk === 'low' ? 'secondary' : 'success'
                    }
                    className="capitalize"
                  >
                    {row.risk}
                  </Badge>
                ),
              },
            ]}
            emptyState={
              <AdminEmptyState
                title="Inga deltagare"
                description="När data kopplas in visas deltagare här."
              />
            }
            onRowClick={(row) => onSelectParticipant?.(row.id)}
          />
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
