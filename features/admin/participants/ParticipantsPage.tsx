'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const t = useTranslations('admin.participants');
  const { can } = useRbac();
  const { warning } = useToast();
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const stats = useMemo(() => {
    const total = participants.length;
    const high = participants.filter((p) => p.risk === 'high').length;
    const low = participants.filter((p) => p.risk === 'low').length;
    return [
      { label: t('stats.participants'), value: total },
      { label: t('stats.highRisk'), value: high },
      { label: t('stats.lowRisk'), value: low },
    ];
  }, [participants, t]);

  const breadcrumbs = tenantId
    ? [
        { label: t('breadcrumbs.home'), href: '/admin' },
        { label: t('breadcrumbs.tenant'), href: `/admin/tenant/${tenantId}` },
        { label: t('breadcrumbs.participants') },
      ]
    : [
        { label: t('breadcrumbs.home'), href: '/admin' },
        { label: t('breadcrumbs.participants') },
      ];

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!can('admin.participants.list')) {
      warning(t('noPermission'));
      inFlight.current = false;
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
      setError(t('loadError'));
      setParticipants([]);
    } finally {
      setIsLoading(false);
      inFlight.current = false;
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
    return participants.filter((p) => (riskFilter === 'all' ? true : p.risk === riskFilter));
  }, [participants, riskFilter]);

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
        icon={<Badge variant="outline">P</Badge>}
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
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value as 'all' | RiskLevel)}
                  options={[
                    { value: 'all', label: t('riskFilter.all') },
                    { value: 'low', label: t('riskFilter.low') },
                    { value: 'high', label: t('riskFilter.high') },
                  ]}
                  placeholder={t('riskFilter.placeholder')}
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
                title={t('emptyState.noParticipants')}
                description={t('emptyState.noParticipantsDescription')}
              />
            }
            onRowClick={onSelectParticipant ? (row) => onSelectParticipant(row.id) : undefined}
            columns={[
              { header: t('columns.name'), accessor: (row) => row.name },
              { header: t('columns.email'), accessor: (row) => row.email || t('columns.missing') },
              { header: t('columns.tenant'), accessor: (row) => row.tenantName || t('columns.global') },
              {
                header: t('columns.risk'),
                accessor: (row) => row.risk,
                cell: (row) => (
                  <Badge variant={row.risk === 'high' ? 'destructive' : row.risk === 'low' ? 'warning' : 'secondary'}>
                    {row.risk === 'high' ? t('riskLabels.high') : row.risk === 'low' ? t('riskLabels.low') : t('riskLabels.none')}
                  </Badge>
                ),
              },
              {
                header: t('columns.lastActive'),
                accessor: (row) => new Date(row.lastActive).toLocaleString(),
              },
            ]}
          />
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}

