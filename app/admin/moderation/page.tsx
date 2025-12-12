'use client';

import { useEffect, useState } from 'react';
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

// Report and action types
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
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    if (!currentTenant) return;

    const loadData = async () => {
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
      } finally {
        setLoading(false);
      }
    };

    loadData();
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
      setActionNotes('');
    } catch (err) {
      console.error('Error resolving report:', err);
    }
  };

  const handleCompleteQueueItem = async (queueId: string) => {
    try {
      await completeQueueItem(queueId);
      setQueue((prev) => prev.filter((q) => q.id !== queueId));
    } catch (err) {
      console.error('Error completing queue item:', err);
    }
  };

  if (!currentTenant) return <div className="p-4 text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldExclamationIcon className="h-8 w-8 text-red-400" />
            <h1 className="text-4xl font-bold text-white">Moderation Console</h1>
          </div>
          <p className="text-red-200">Content reports, user restrictions, and safety management</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-red-800">
          {['queue', 'reports', 'stats'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabType)}
              className={`px-6 py-3 font-medium transition ${
                activeTab === tab
                  ? 'border-b-2 border-red-500 text-white'
                  : 'text-red-200 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'queue' && queue.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {queue.length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            {loading ? (
              <p className="text-red-200">Loading queue...</p>
            ) : queue.length > 0 ? (
              queue.map((item) => (
                <Card key={item.id} className="bg-red-800/30 border-red-700">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          {item.content_reports?.[0]?.reason || 'Content Report'}
                        </h3>
                        <p className="text-red-200 text-sm">
                          {item.content_reports?.[0]?.content_type || 'Unknown'} •{' '}
                          {item.priority}
                        </p>
                      </div>
                      <Badge
                        variant="destructive"
                        className={`${
                          item.priority === 'critical'
                            ? 'bg-red-600'
                            : item.priority === 'high'
                              ? 'bg-orange-600'
                              : 'bg-yellow-600 text-black'
                        }`}
                      >
                        {item.priority.toUpperCase()}
                      </Badge>
                    </div>
                    {item.content_reports?.[0]?.description && (
                      <p className="text-red-100 mb-4">{item.content_reports[0].description}</p>
                    )}
                    <Button
                      onClick={() => handleCompleteQueueItem(item.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Mark Complete
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-red-200 text-lg">No pending items in queue</p>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {loading ? (
              <p className="text-red-200">Loading reports...</p>
            ) : (
              <>
                {selectedReport ? (
                  <div className="bg-red-800/30 border border-red-700 rounded-lg p-6">
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="text-red-300 hover:text-white mb-4 underline"
                    >
                      ← Back to reports
                    </button>
                    <h2 className="text-2xl font-bold text-white mb-4">{selectedReport.reason}</h2>
                    <div className="space-y-3 mb-6">
                      <p className="text-red-100">
                        <span className="font-bold">Type:</span> {selectedReport.content_type}
                      </p>
                      <p className="text-red-100">
                        <span className="font-bold">Priority:</span> {selectedReport.priority}
                      </p>
                      <p className="text-red-100">
                        <span className="font-bold">Status:</span> {selectedReport.status}
                      </p>
                      {selectedReport.description && (
                        <p className="text-red-100">
                          <span className="font-bold">Details:</span> {selectedReport.description}
                        </p>
                      )}
                    </div>

                    <div className="mb-6">
                      <label className="block text-white font-bold mb-2">Action Notes</label>
                      <textarea
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        className="w-full bg-red-900 border border-red-700 text-white px-3 py-2 rounded resize-none"
                        rows={4}
                        placeholder="Add notes about this report..."
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <button
                        onClick={() => handleResolveReport(selectedReport, 'dismiss')}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleResolveReport(selectedReport, 'warn')}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded transition"
                      >
                        Warn
                      </button>
                      <button
                        onClick={() => handleResolveReport(selectedReport, 'mute')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
                      >
                        Mute
                      </button>
                      <button
                        onClick={() => handleResolveReport(selectedReport, 'suspend')}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded transition"
                      >
                        Suspend
                      </button>
                      <button
                        onClick={() => handleResolveReport(selectedReport, 'ban')}
                        className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition"
                      >
                        Ban
                      </button>
                      <button
                        onClick={() => handleResolveReport(selectedReport, 'content_removal')}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className="w-full text-left bg-red-800/30 border border-red-700 rounded-lg p-4 hover:bg-red-800/50 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-white font-bold">{report.reason}</h3>
                            <p className="text-red-200 text-sm">
                              {report.content_type} • {report.priority}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              report.priority === 'critical'
                                ? 'bg-red-600'
                                : report.priority === 'high'
                                  ? 'bg-orange-600'
                                  : 'bg-yellow-600'
                            } text-white`}
                          >
                            {report.priority}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {loading ? (
              <p className="text-red-200">Loading stats...</p>
            ) : (
              <>
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-red-800/30 border border-red-700 rounded-lg p-6">
                      <p className="text-red-200 text-sm mb-2">Total Reports</p>
                      <p className="text-3xl font-bold text-white">{stats.total_reports}</p>
                    </div>
                    <div className="bg-yellow-800/30 border border-yellow-700 rounded-lg p-6">
                      <p className="text-yellow-200 text-sm mb-2">Pending</p>
                      <p className="text-3xl font-bold text-yellow-300">{stats.pending_reports}</p>
                    </div>
                    <div className="bg-green-800/30 border border-green-700 rounded-lg p-6">
                      <p className="text-green-200 text-sm mb-2">Resolved</p>
                      <p className="text-3xl font-bold text-green-300">{stats.resolved_reports}</p>
                    </div>
                    <div className="bg-blue-800/30 border border-blue-700 rounded-lg p-6">
                      <p className="text-blue-200 text-sm mb-2">Actions Taken</p>
                      <p className="text-3xl font-bold text-blue-300">{stats.actions_taken}</p>
                    </div>

                    <div className="bg-orange-800/30 border border-orange-700 rounded-lg p-6">
                      <p className="text-orange-200 text-sm mb-2">Users Warned</p>
                      <p className="text-3xl font-bold text-orange-300">{stats.users_warned}</p>
                    </div>
                    <div className="bg-purple-800/30 border border-purple-700 rounded-lg p-6">
                      <p className="text-purple-200 text-sm mb-2">Users Suspended</p>
                      <p className="text-3xl font-bold text-purple-300">{stats.users_suspended}</p>
                    </div>
                    <div className="bg-red-800/30 border border-red-700 rounded-lg p-6">
                      <p className="text-red-200 text-sm mb-2">Users Banned</p>
                      <p className="text-3xl font-bold text-red-400">{stats.users_banned}</p>
                    </div>
                    <div className="bg-slate-800/30 border border-border rounded-lg p-6">
                      <p className="text-slate-200 text-sm mb-2">Avg Resolution Time</p>
                      <p className="text-3xl font-bold text-slate-300">
                        {stats.average_resolution_time.toFixed(1)}h
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
