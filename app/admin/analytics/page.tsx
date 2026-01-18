'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { SystemAdminClientGuard } from '@/components/admin/SystemAdminClientGuard';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import {
  getPageViewStats,
  getTopPages,
  getSessionStats,
  getTopFeatures,
  getErrorStats,
  getTopErrors,
} from '@/lib/services/analyticsService';

interface DateRange {
  startDate: string;
  endDate: string;
}

export default function AnalyticsPage() {
  const t = useTranslations('admin.analyticsDashboard');
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const userId = user?.id;
  const tenantId = currentTenant?.id;

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = Date.now();
    return {
      startDate: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(now).toISOString().split('T')[0],
    };
  });

  // Analytics data
  const [pageViewStats, setPageViewStats] = useState<{ total: number; unique: number; avgDuration: number } | null>(null);
  const [topPages, setTopPages] = useState<Array<{ path: string; views: number; avgDuration: number }>>([]);
  const [sessionStats, setSessionStats] = useState<{
    totalSessions: number;
    completedSessions: number;
    avgDuration: number;
    avgScore: number;
  } | null>(null);
  const [topFeatures, setTopFeatures] = useState<Array<{ name: string; usage: number; successRate: number }>>([]);
  const [errorStats, setErrorStats] = useState<{ totalErrors: number; uniqueTypes: number; unresolvedCount: number } | null>(null);
  const [topErrors, setTopErrors] = useState<Array<{ type: string; message: string; count: number }>>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'features' | 'errors'>('overview');

  // Load analytics data
  useEffect(() => {
    if (!userId || !tenantId) return;

    const loadData = async () => {
      setIsLoading(true);

      const startDateISO = new Date(dateRange.startDate).toISOString();
      const endDateISO = new Date(new Date(dateRange.endDate).getTime() + 24 * 60 * 60 * 1000).toISOString();

      const [pageStats, pages, sessions, features, errors, errorList] = await Promise.all([
        getPageViewStats(tenantId, startDateISO, endDateISO),
        getTopPages(tenantId, 5),
        getSessionStats(tenantId, startDateISO, endDateISO),
        getTopFeatures(tenantId, 5),
        getErrorStats(tenantId, startDateISO, endDateISO),
        getTopErrors(tenantId, 5),
      ]);

      if (pageStats) setPageViewStats(pageStats);
      if (pages) setTopPages(pages);
      if (sessions) setSessionStats(sessions);
      if (features) setTopFeatures(features);
      if (errors) setErrorStats(errors);
      if (errorList) setTopErrors(errorList);

      setIsLoading(false);
    };

    loadData();
  }, [userId, tenantId, dateRange]);

  const content = !user || !currentTenant ? (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto pt-20">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">{t('title')}</h1>
          <p className="text-muted-foreground">{t('requiresAdmin')}</p>
        </div>
      </div>
    </div>
  ) : (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ChartBarIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">{t('dashboardTitle')}</h1>
          </div>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Date Range Filter */}
        <Card className="mb-6">
          <CardContent className="p-4 flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t('dateRange.from')}</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t('dateRange.to')}</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card className="mb-6">
          <CardContent className="p-2 flex gap-2">
            {(['overview', 'pages', 'features', 'errors'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab === 'overview' && t('tabs.overview')}
                {tab === 'pages' && t('tabs.pages')}
                {tab === 'features' && t('tabs.features')}
                {tab === 'errors' && t('tabs.errors')}
              </button>
            ))}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Top Stats */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Page Views */}
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-muted-foreground text-sm font-medium mb-1">{t('overview.pageViews')}</p>
                      <p className="text-3xl font-bold text-foreground">
                        {pageViewStats?.total.toLocaleString() || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('overview.uniqueVisitors', { count: pageViewStats?.unique ?? 0 })}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Sessions */}
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-muted-foreground text-sm font-medium mb-1">{t('overview.sessions')}</p>
                      <p className="text-3xl font-bold text-foreground">
                        {sessionStats?.totalSessions.toLocaleString() || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('overview.completedSessions', { count: sessionStats?.completedSessions ?? 0 })}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Avg Session Duration */}
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-muted-foreground text-sm font-medium mb-1">{t('overview.avgDuration')}</p>
                      <p className="text-3xl font-bold text-foreground">
                        {sessionStats?.avgDuration
                          ? t('overview.avgDurationValue', { minutes: Math.round(sessionStats.avgDuration / 60) })
                          : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">{t('overview.perSession')}</p>
                    </CardContent>
                  </Card>

                  {/* Errors */}
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-muted-foreground text-sm font-medium mb-1">{t('overview.reportedErrors')}</p>
                      <p className="text-3xl font-bold text-red-600">
                        {errorStats?.totalErrors || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('overview.unresolvedErrors', { count: errorStats?.unresolvedCount ?? 0 })}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Pages & Features */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Top Pages */}
                  <Card>
                    <CardHeader className="bg-primary p-4">
                      <CardTitle className="text-white">{t('overview.topPages')}</CardTitle>
                    </CardHeader>
                    <div className="divide-y divide-border">
                      {topPages.length === 0 ? (
                        <p className="p-4 text-muted-foreground text-sm">{t('overview.noData')}</p>
                      ) : (
                        topPages.map((page, idx) => (
                          <div key={idx} className="p-4 hover:bg-muted">
                            <p className="font-medium text-foreground truncate">{page.path}</p>
                            <div className="flex justify-between text-sm text-muted-foreground mt-1">
                              <span>{t('overview.views', { count: page.views.toLocaleString() })}</span>
                              <span>{t('overview.avgSeconds', { seconds: page.avgDuration })}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  {/* Top Features */}
                  <Card>
                    <CardHeader className="bg-purple-600 p-4">
                      <CardTitle className="text-white">{t('overview.topFeatures')}</CardTitle>
                    </CardHeader>
                    <div className="divide-y divide-border">
                      {topFeatures.length === 0 ? (
                        <p className="p-4 text-muted-foreground text-sm">{t('overview.noData')}</p>
                      ) : (
                        topFeatures.map((feature, idx) => (
                          <div key={idx} className="p-4 hover:bg-muted">
                            <p className="font-medium text-foreground">{feature.name}</p>
                            <div className="flex justify-between text-sm text-muted-foreground mt-1">
                              <span>{t('overview.usageCount', { count: feature.usage.toLocaleString() })}</span>
                              <span className={feature.successRate === 100 ? 'text-green-600' : 'text-yellow-600'}>
                                {t('overview.successRate', { rate: feature.successRate })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Pages Tab */}
            {activeTab === 'pages' && (
              <Card>
                <CardHeader className="bg-primary p-4">
                  <CardTitle className="text-white">{t('pages.title')}</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('pages.columns.page')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('pages.columns.views')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('pages.columns.avgDuration')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {topPages.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-muted-foreground">
                            {t('pages.noData')}
                          </td>
                        </tr>
                      ) : (
                        topPages.map((page, idx) => (
                          <tr key={idx} className="hover:bg-muted">
                            <td className="px-6 py-4 font-medium text-foreground truncate">{page.path}</td>
                            <td className="px-6 py-4 text-right text-muted-foreground">{page.views.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-muted-foreground">{t('pages.avgDurationValue', { seconds: page.avgDuration })}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Features Tab */}
            {activeTab === 'features' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="bg-purple-600 p-4">
                    <CardTitle className="text-white">{t('features.title')}</CardTitle>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted border-b border-border">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('features.columns.feature')}</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('features.columns.usage')}</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('features.columns.successRate')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {topFeatures.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-4 text-center text-muted-foreground">
                              {t('features.noData')}
                            </td>
                          </tr>
                        ) : (
                          topFeatures.map((feature, idx) => (
                            <tr key={idx} className="hover:bg-muted">
                              <td className="px-6 py-4 font-medium text-foreground">{feature.name}</td>
                              <td className="px-6 py-4 text-right text-muted-foreground">{feature.usage.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right">
                                <Badge
                                  variant={feature.successRate === 100 ? 'default' : 'secondary'}
                                  className={`${
                                    feature.successRate === 100
                                      ? 'bg-green-100 text-green-700'
                                      : feature.successRate >= 80
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {feature.successRate}%
                                </Badge>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* Errors Tab */}
            {activeTab === 'errors' && (
              <Card>
                <CardHeader className="bg-red-600 p-4">
                  <CardTitle className="text-white">{t('errors.title')}</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('errors.columns.type')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t('errors.columns.message')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t('errors.columns.count')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {topErrors.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-muted-foreground">
                            {t('errors.noData')}
                          </td>
                        </tr>
                      ) : (
                        topErrors.map((error, idx) => (
                          <tr key={idx} className="hover:bg-muted">
                            <td className="px-6 py-4">
                              <Badge variant="destructive">
                                {error.type}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-foreground truncate">{error.message}</td>
                            <td className="px-6 py-4 text-right text-muted-foreground font-medium">{error.count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );

  return <SystemAdminClientGuard>{content}</SystemAdminClientGuard>;
}
