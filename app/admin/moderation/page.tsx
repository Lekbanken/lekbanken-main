'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { SystemAdminClientGuard } from '@/components/admin/SystemAdminClientGuard';
import { Badge, Button, Card, CardContent } from '@/components/ui';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import {
  getContentReports,
  updateContentReport,
  getModerationQueue,
  completeQueueItem,
  getModerationStats,
  createModerationAction,
  type ContentReport,
  type ModerationQueueItem,
  type ModerationStats,
} from '@/lib/services/moderationService';
import {
  AdminPageLayout,
  AdminPageHeader,
  AdminEmptyState,
  AdminErrorState,
  AdminStatGrid,
  AdminStatCard,
} from '@/components/admin/shared';

type TabType = 'queue' | 'reports' | 'stats';
type QueueItem = ModerationQueueItem;

export default function ModerationAdminPage() {
  const t = useTranslations('admin.moderation');
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const tenantId = currentTenant?.id;

  const [reports, setReports] = useState<ContentReport[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [reportsData, queueData, statsData] = await Promise.all([
          getContentReports(tenantId, { status: 'pending', limit: 100 }),
          getModerationQueue(tenantId, 'pending'),
          getModerationStats(tenantId),
        ]);

        setReports(reportsData || []);
        setQueue(queueData || []);
        setStats(statsData);
      } catch (err) {
        console.error('Error loading moderation data:', err);
        setError(t('errors.loadFailedDescription'));
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [tenantId]);

  const handleResolveReport = async (report: ContentReport, action: string) => {
    if (!user || !currentTenant) return;

    try {
      await updateContentReport(report.id, {
        status: 'resolved',
        resolution_reason: action,
        resolved_at: new Date().toISOString(),
      });

      if (action !== 'dismiss') {
        await createModerationAction(currentTenant.id, user.id, {
          action_type: action,
          target_content_id: report.content_id,
          reason: `Report: ${report.reason}`,
          severity: report.priority,
          duration_minutes: null,
          is_appealable: true,
          expires_at: null,
          target_user_id: null,
        });
      }

      setReports((prev) => prev.filter((r) => r.id !== report.id));
      setSelectedReport(null);
    } catch (err) {
      console.error('Error resolving report:', err);
      setError(t('errors.updateReportFailed'));
    }
  };

  const handleCompleteQueueItem = async (queueId: string) => {
    try {
      await completeQueueItem(queueId);
      setQueue((prev) => prev.filter((q) => q.id !== queueId));
    } catch (err) {
      console.error('Error completing queue item:', err);
      setError(t('errors.updateQueueFailed'));
    }
  };

  const openQueueCount = useMemo(() => queue.length, [queue]);

  if (!currentTenant) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<ShieldExclamationIcon className="h-6 w-6" />}
          title={t('noTenant.title')}
          description={t('noTenant.description')}
        />
      </AdminPageLayout>
    );
  }

  return (
    <SystemAdminClientGuard>
    <AdminPageLayout>
      <AdminPageHeader
        title={t('page.title')}
        description={t('page.description')}
        icon={<ShieldExclamationIcon className="h-8 w-8 text-primary" />}
      />

      {error && (
        <AdminErrorState
          title={t('errors.loadFailed')}
          description={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
          }}
        />
      )}

      {stats && (
      <AdminStatGrid className="mb-4">
          <AdminStatCard label={t('stats.openReports')} value={stats.pending_reports ?? reports.length} />
          <AdminStatCard label={t('stats.queue')} value={openQueueCount} />
          <AdminStatCard label={t('stats.actions')} value={stats.actions_taken ?? 0} />
          <AdminStatCard label={t('stats.suspended')} value={stats.users_suspended ?? 0} />
        </AdminStatGrid>
      )}

      <div className="flex gap-2 mb-6 border-b border-border">
        {(['queue', 'reports', 'stats'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition border-b-2 ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'queue' ? t('tabs.queue') : tab === 'reports' ? t('tabs.reports') : t('tabs.stats')}
            {tab === 'queue' && openQueueCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {openQueueCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'queue' && (
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('queue.loading')}</p>
          ) : queue.length === 0 ? (
            <AdminEmptyState
              icon={<ShieldExclamationIcon className="h-6 w-6" />}
              title={t('queue.emptyTitle')}
              description={t('queue.emptyDescription')}
            />
          ) : (
            queue.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-start justify-between gap-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Queue #{item.id}</p>
                    <p className="text-xs text-muted-foreground">Priority: {item.priority}</p>
                    <div className="mt-2 space-y-1">
                      {(item.content_reports || []).map((r, idx) => (
                        <p key={idx} className="text-sm text-foreground">
                          {r.content_type}: {r.reason}
                          {r.description ? ` – ${r.description}` : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void handleCompleteQueueItem(item.id)}>
                    {t('queue.markHandled')}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="grid gap-4 md:grid-cols-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('reports.loading')}</p>
          ) : reports.length === 0 ? (
            <AdminEmptyState
              icon={<ShieldExclamationIcon className="h-6 w-6" />}
              title={t('reports.emptyTitle')}
              description={t('reports.emptyDescription')}
            />
          ) : (
            reports.map((report) => (
              <Card
                key={report.id}
                className={`cursor-pointer border ${selectedReport?.id === report.id ? 'border-primary' : ''}`}
                onClick={() => setSelectedReport(report)}
              >
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{report.reason}</p>
                      <p className="text-xs text-muted-foreground">{report.content_type}</p>
                    </div>
                    <Badge variant="outline">{report.priority || 'normal'}</Badge>
                  </div>
                  {report.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('reports.created')} {new Date(report.created_at).toLocaleDateString('sv-SE')}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <Card>
          <CardContent className="py-6">
            {loading ? (
              <p className="text-sm text-muted-foreground">{t('statsTab.loading')}</p>
            ) : !stats ? (
              <AdminEmptyState
                icon={<ShieldExclamationIcon className="h-6 w-6" />}
                title={t('statsTab.emptyTitle')}
                description={t('statsTab.emptyDescription')}
              />
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                <AdminStatCard label={t('stats.openReports')} value={stats.pending_reports ?? 0} />
                <AdminStatCard label={t('stats.actionsTotal')} value={stats.actions_taken ?? 0} />
                <AdminStatCard label={t('stats.suspended')} value={stats.users_suspended ?? 0} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedReport && activeTab === 'reports' && (
        <Card className="mt-6">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedReport.reason}</p>
                <p className="text-xs text-muted-foreground">{selectedReport.content_type}</p>
              </div>
              <Badge variant="outline">{selectedReport.priority || 'normal'}</Badge>
            </div>
            {selectedReport.description && (
              <p className="text-sm text-foreground">{selectedReport.description}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleResolveReport(selectedReport, 'dismiss')}
              >
                {t('actions.dismiss')}
              </Button>
              <Button
                size="sm"
                onClick={() => void handleResolveReport(selectedReport, 'block')}
              >
                {t('actions.block')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminPageLayout>
    </SystemAdminClientGuard>
  );
}
