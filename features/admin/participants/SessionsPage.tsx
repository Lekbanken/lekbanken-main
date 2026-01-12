'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('admin.sessions');
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
      { label: t('stats.sessions'), value: total },
      { label: t('stats.active'), value: active },
      { label: t('stats.flagged'), value: flagged },
    ];
  }, [sessions, t]);

  const breadcrumbs = tenantId
    ? [
        { label: t('breadcrumbs.home'), href: '/admin' },
        { label: t('breadcrumbs.tenant'), href: `/admin/tenant/${tenantId}` },
        { label: t('breadcrumbs.sessions') },
      ]
    : [
        { label: t('breadcrumbs.home'), href: '/admin' },
        { label: t('breadcrumbs.sessions') },
      ];

  const load = useCallback(async () => {
    if (!can('admin.participants.list')) {
      warning(t('noPermission'));
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
      setError(t('loadError'));
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [can, tenantId, t]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await load();
    };
    void run();
    const interval = setInterval(run, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [load]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => (statusFilter === 'all' ? true : s.status === statusFilter));
  }, [sessions, statusFilter]);

  if (!can('admin.participants.list')) {
    return (
      <AdminPageLayout>
        <AdminEmptyState title={t('emptyState.noAccess')} description={t('emptyState.noAccessDescription')} />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={breadcrumbs} />
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<PlayIcon className="h-8 w-8 text-primary" />}
      />

      {error && <AdminErrorState title={t('errorState.title')} description={error} onRetry={load} />}

      <AdminStatGrid className="mb-4">
        {stats.map((s) => (
          <AdminStatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </AdminStatGrid>

      <Card className="mb-4 border border-border">
        <CardHeader className="border-b border-border bg-muted/40 px-6 py-4">
          <CardTitle>{t('cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <AdminTableToolbar
            searchValue=""
            onSearchChange={() => {}}
            searchPlaceholder={t('searchPlaceholder')}
            filters={
              <div className="flex flex-wrap gap-2">
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | SessionStatus)}
                  options={[
                    { value: 'all', label: t('statusFilter.all') },
                    { value: 'active', label: t('statusFilter.active') },
                    { value: 'completed', label: t('statusFilter.completed') },
                    { value: 'flagged', label: t('statusFilter.flagged') },
                  ]}
                  placeholder={t('statusFilter.placeholder')}
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
                title={t('emptyState.noSessions')}
                description={t('emptyState.noSessionsDescription')}
              />
            }
            onRowClick={onSelectSession ? (row) => onSelectSession(row.id) : undefined}
            columns={[
              { header: t('columns.title'), accessor: (row) => row.title },
              { header: t('columns.tenant'), accessor: (row) => row.tenantName || t('columns.global') },
              { header: t('columns.host'), accessor: (row) => row.host },
              { header: t('columns.participants'), accessor: (row) => row.participants },
              {
                header: t('columns.status'),
                accessor: (row) => row.status,
                cell: (row) => (
                  <Badge
                    variant={
                      row.status === 'flagged' ? 'destructive' : row.status === 'active' ? 'success' : 'secondary'
                    }
                  >
                    {row.status === 'active' ? t('statusLabels.active') : row.status === 'completed' ? t('statusLabels.completed') : t('statusLabels.flagged')}
                  </Badge>
                ),
              },
              { header: t('columns.startedAt'), accessor: (row) => new Date(row.startedAt).toLocaleString() },
            ]}
          />
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
