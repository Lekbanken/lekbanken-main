'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminBreadcrumbs,
  AdminDataTable,
  AdminEmptyState,
  AdminErrorState,
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
    if (!can('admin.participants.list')) {
      warning('Du har inte behörighet att se deltagare.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const query = tenantId ? `/api/participants?tenantId=${tenantId}` : '/api/participants';
      const res = await fetch(query);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `API-fel ${res.status}`);
      }
      const { participants: rows } = (await res.json()) as { participants?: ParticipantRow[] };
      setParticipants(rows || []);
    } catch (err) {
      console.error('[admin/participants] load error', err);
      setError('Kunde inte ladda deltagare just nu.');
      setParticipants([]);
    } finally {
      setIsLoading(false);
    }
  }, [can, tenantId, warning]);

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
        <AdminEmptyState title="Ingen åtkomst" description="Du behöver behörighet för att se deltagare." />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={breadcrumbs} />
      <AdminPageHeader
        title="Deltagare"
        description="Översikt av deltagare, risknivåer och senaste aktivitet."
        icon={<Badge variant="outline">P</Badge>}
      />

      {error && <AdminErrorState title="Kunde inte ladda deltagare" description={error} onRetry={load} />}

      <AdminStatGrid className="mb-4">
        {stats.map((s) => (
          <AdminStatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </AdminStatGrid>

      <Card className="mb-4 border border-border">
        <CardHeader className="border-b border-border bg-muted/40 px-6 py-4">
          <CardTitle>Deltagaröversikt</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <AdminTableToolbar
            searchValue=""
            onSearchChange={() => {}}
            searchPlaceholder="Sök (ej aktiv ännu)"
            filters={
              <div className="flex flex-wrap gap-2">
                <Select
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value as 'all' | RiskLevel)}
                  options={[
                    { value: 'all', label: 'Alla risknivåer' },
                    { value: 'low', label: 'Låg risk' },
                    { value: 'high', label: 'Hög risk' },
                  ]}
                  placeholder="Risk"
                />
              </div>
            }
          />

          <AdminDataTable
            data={filtered}
            isLoading={isLoading}
            keyAccessor="id"
            selectable={false}
            emptyState={
              <AdminEmptyState
                title="Inga deltagare"
                description="Justera filter eller försök igen senare."
              />
            }
            onRowClick={onSelectParticipant ? (row) => onSelectParticipant(row.id) : undefined}
            columns={[
              { header: 'Namn', accessor: (row) => row.name },
              { header: 'E-post', accessor: (row) => row.email || '—' },
              { header: 'Tenant', accessor: (row) => row.tenantName || 'Global' },
              {
                header: 'Risk',
                accessor: (row) => row.risk,
                cell: (row) => (
                  <Badge variant={row.risk === 'high' ? 'destructive' : row.risk === 'low' ? 'warning' : 'secondary'}>
                    {row.risk === 'high' ? 'Hög' : row.risk === 'low' ? 'Låg' : 'Ingen'}
                  </Badge>
                ),
              },
              {
                header: 'Senast aktiv',
                accessor: (row) => new Date(row.lastActive).toLocaleString(),
              },
            ]}
          />
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
