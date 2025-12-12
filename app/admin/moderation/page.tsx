'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
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

interface QueueItem {
  id: string;
  priority: string;
  content_reports?: Array<{ reason: string; content_type: string; description?: string }>;
}

export default function ModerationAdminPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [reports, setReports] = useState<ContentReport[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);

  useEffect(() => {
    if (!currentTenant) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [reportsData, queueData, statsData] = await Promise.all([
          getContentReports(currentTenant.id, { status: 'pending', limit: 100 }),
          getModerationQueue(currentTenant.id, 'pending'),
          getModerationStats(currentTenant.id),
        ]);

        setReports(reportsData || []);
        setQueue(queueData || []);
        setStats(statsData);
      } catch (err) {
        console.error('Error loading moderation data:', err);
        setError('Kunde inte ladda modereringsdata.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [currentTenant]);

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
      setError('Kunde inte uppdatera rapporten.');
    }
  };

  const handleCompleteQueueItem = async (queueId: string) => {
    try {
      await completeQueueItem(queueId);
      setQueue((prev) => prev.filter((q) => q.id !== queueId));
    } catch (err) {
      console.error('Error completing queue item:', err);
      setError('Kunde inte uppdatera modereringskön.');
    }
  };

  const openQueueCount = useMemo(() => queue.length, [queue]);

  if (!currentTenant) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<ShieldExclamationIcon className="h-6 w-6" />}
          title="Ingen organisation vald"
          description="Välj en organisation för att hantera moderering."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Moderering"
        description="Content reports, åtgärder och statistik."
        icon={<ShieldExclamationIcon className="h-8 w-8 text-primary" />}
      />

      {error && (
        <AdminErrorState
          title="Kunde inte ladda modereringsdata"
          description={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
          }}
        />
      )}

      {stats && (
      <AdminStatGrid className="mb-4">
          <AdminStatCard label="Öppna rapporter" value={stats.pending_reports ?? reports.length} />
          <AdminStatCard label="Kö" value={openQueueCount} />
          <AdminStatCard label="Åtgärder" value={stats.actions_taken ?? 0} />
          <AdminStatCard label="Suspenderade" value={stats.users_suspended ?? 0} />
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
            {tab === 'queue' ? 'Kö' : tab === 'reports' ? 'Rapporter' : 'Statistik'}
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
            <p className="text-sm text-muted-foreground">Laddar kö...</p>
          ) : queue.length === 0 ? (
            <AdminEmptyState
              icon={<ShieldExclamationIcon className="h-6 w-6" />}
              title="Ingen kö"
              description="Inga poster i modereringskön just nu."
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
                    Markera hanterad
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
            <p className="text-sm text-muted-foreground">Laddar rapporter...</p>
          ) : reports.length === 0 ? (
            <AdminEmptyState
              icon={<ShieldExclamationIcon className="h-6 w-6" />}
              title="Inga rapporter"
              description="Det finns inga öppna rapporter."
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
                    Skapad: {new Date(report.created_at).toLocaleDateString('sv-SE')}
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
              <p className="text-sm text-muted-foreground">Laddar statistik...</p>
            ) : !stats ? (
              <AdminEmptyState
                icon={<ShieldExclamationIcon className="h-6 w-6" />}
                title="Ingen statistik"
                description="Statistik kunde inte hämtas."
              />
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                <AdminStatCard label="Öppna rapporter" value={stats.pending_reports ?? 0} />
                <AdminStatCard label="Åtgärder totalt" value={stats.actions_taken ?? 0} />
                <AdminStatCard label="Suspenderade" value={stats.users_suspended ?? 0} />
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
                Avfärda
              </Button>
              <Button
                size="sm"
                onClick={() => void handleResolveReport(selectedReport, 'block')}
              >
                Blockera
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminPageLayout>
  );
}
