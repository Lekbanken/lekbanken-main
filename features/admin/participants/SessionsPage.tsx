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

  const stats = useMemo(() => {
    const total = sessions.length;
    const active = sessions.filter((s) => s.status === 'active').length;
    const flagged = sessions.filter((s) => s.status === 'flagged').length;
    return [
      { label: 'Sessioner', value: total },
      { label: 'Aktiva', value: active },
      { label: 'Flaggade', value: flagged },
    ];
  }, [sessions]);

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
    if (!can('admin.participants.list')) {
      warning('Du har inte behörighet att se sessioner.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const qs = tenantId ? `?tenantId=${tenantId}` : '';
      const res = await fetch(`/api/sessions${qs}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `API-fel ${res.status}`);
      }
      const { sessions: rows } = (await res.json()) as { sessions?: SessionRow[] };
      setSessions(rows || []);
    } catch (err) {
      console.error('[admin/sessions] load error', err);
      setError('Kunde inte ladda sessioner just nu.');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [can, tenantId, warning]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => (statusFilter === 'all' ? true : s.status === statusFilter));
  }, [sessions, statusFilter]);

  if (!can('admin.participants.list')) {
    return (
      <AdminPageLayout>
        <AdminEmptyState title="Ingen åtkomst" description="Du behöver behörighet för att se sessioner." />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={breadcrumbs} />
      <AdminPageHeader
        title="Sessioner"
        description="Översikt över aktiva och avslutade sessioner."
        icon={<PlayIcon className="h-8 w-8 text-primary" />}
      />

      {error && <AdminErrorState title="Kunde inte ladda sessioner" description={error} onRetry={load} />}

      <AdminStatGrid className="mb-4">
        {stats.map((s) => (
          <AdminStatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </AdminStatGrid>

      <Card className="mb-4 border border-border">
        <CardHeader className="border-b border-border bg-muted/40 px-6 py-4">
          <CardTitle>Sessioner</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <AdminTableToolbar
            searchValue=""
            onSearchChange={() => {}}
            searchPlaceholder="Sök (ej aktiv ännu)"
            filters={
              <div className="flex flex-wrap gap-2">
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | SessionStatus)}
                  options={[
                    { value: 'all', label: 'Alla statusar' },
                    { value: 'active', label: 'Aktiva' },
                    { value: 'completed', label: 'Avslutade' },
                    { value: 'flagged', label: 'Flaggade' },
                  ]}
                  placeholder="Status"
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
                title="Inga sessioner"
                description="Justera filter eller försök igen senare."
              />
            }
            onRowClick={onSelectSession ? (row) => onSelectSession(row.id) : undefined}
            columns={[
              { header: 'Titel', accessor: (row) => row.title },
              { header: 'Tenant', accessor: (row) => row.tenantName || 'Global' },
              { header: 'Värd', accessor: (row) => row.host },
              { header: 'Deltagare', accessor: (row) => row.participants },
              {
                header: 'Status',
                accessor: (row) => row.status,
                cell: (row) => (
                  <Badge
                    variant={
                      row.status === 'flagged' ? 'destructive' : row.status === 'active' ? 'success' : 'secondary'
                    }
                  >
                    {row.status === 'active' ? 'Aktiv' : row.status === 'completed' ? 'Avslutad' : 'Flaggad'}
                  </Badge>
                ),
              },
              { header: 'Startad', accessor: (row) => new Date(row.startedAt).toLocaleString() },
            ]}
          />
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
