'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminEmptyState,
  AdminErrorState,
  AdminStatGrid,
  AdminStatCard,
} from '@/components/admin/shared';
import { useTenant } from '@/lib/context/TenantContext';
import { getPageViewStats, getSessionStats } from '@/lib/services/analyticsService';

type DateRange = { startDate: string; endDate: string };

export default function TenantAnalyticsPage() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageStats, setPageStats] = useState<NonNullable<Awaited<ReturnType<typeof getPageViewStats>>> | null>(null);
  const [sessionStats, setSessionStats] = useState<NonNullable<Awaited<ReturnType<typeof getSessionStats>>> | null>(null);

  const dateRange = useMemo<DateRange>(() => {
    const now = Date.now();
    return {
      startDate: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(now).toISOString(),
    };
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    const load = async () => {
      try {
        const [pageData, sessionData] = await Promise.all([
          getPageViewStats(tenantId, dateRange.startDate, dateRange.endDate),
          getSessionStats(tenantId, dateRange.startDate, dateRange.endDate),
        ]);
        setPageStats(pageData ?? null);
        setSessionStats(sessionData ?? null);
      } catch (err) {
        console.error(err);
        setError('Kunde inte ladda statistik just nu.');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [tenantId, dateRange]);

  if (!tenantId) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<ChartBarIcon className="h-6 w-6" />}
          title="Ingen organisation vald"
          description="Välj eller byt organisation för att se statistik."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Statistik"
        description="Nyckeltal för organisationens användning."
        icon={<ChartBarIcon className="h-8 w-8 text-primary" />}
      />

      {error && (
        <AdminErrorState
          title="Kunde inte ladda statistik"
          description={error}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laddar statistik...</p>
      ) : (
        <AdminStatGrid>
          <AdminStatCard
            label="Sidvisningar"
            value={pageStats ? pageStats.total : '–'}
            change={pageStats ? `Unika: ${pageStats.unique}` : undefined}
            trend="flat"
          />
          <AdminStatCard
            label="Sessioner"
            value={sessionStats ? sessionStats.totalSessions : '–'}
            change={sessionStats ? `Avslutade: ${sessionStats.completedSessions}` : undefined}
            trend="flat"
          />
          <AdminStatCard
            label="Genomsnittlig tid"
            value={sessionStats ? `${Math.round(sessionStats.avgDuration / 60)} min` : '–'}
            subtitle={pageStats ? `Snitt besökstid: ${Math.round(pageStats.avgDuration)}s` : undefined}
            trend="flat"
          />
          <AdminStatCard
            label="Genomsnittlig poäng"
            value={sessionStats ? sessionStats.avgScore : '–'}
            subtitle="Senaste 30 dagarna"
            trend="flat"
          />
        </AdminStatGrid>
      )}
    </AdminPageLayout>
  );
}
