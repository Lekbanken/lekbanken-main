'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('admin.tenant.analytics');
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
        setError(t('error.message'));
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
          title={t('noOrganization.title')}
          description={t('noOrganization.description')}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<ChartBarIcon className="h-8 w-8 text-primary" />}
      />

      {error && (
        <AdminErrorState
          title={t('error.loadFailed')}
          description={error}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : (
        <AdminStatGrid>
          <AdminStatCard
            label={t('stats.pageViews')}
            value={pageStats ? pageStats.total : '–'}
            change={pageStats ? t('stats.uniqueViews', { count: pageStats.unique }) : undefined}
            trend="flat"
          />
          <AdminStatCard
            label={t('stats.sessions')}
            value={sessionStats ? sessionStats.totalSessions : '–'}
            change={sessionStats ? t('stats.completedSessions', { count: sessionStats.completedSessions }) : undefined}
            trend="flat"
          />
          <AdminStatCard
            label={t('stats.avgTime')}
            value={sessionStats ? `${Math.round(sessionStats.avgDuration / 60)} min` : '–'}
            subtitle={pageStats ? t('stats.avgVisitTime', { seconds: Math.round(pageStats.avgDuration) }) : undefined}
            trend="flat"
          />
          <AdminStatCard
            label={t('stats.avgScore')}
            value={sessionStats ? sessionStats.avgScore : '–'}
            subtitle={t('stats.last30Days')}
            trend="flat"
          />
        </AdminStatGrid>
      )}
    </AdminPageLayout>
  );
}
