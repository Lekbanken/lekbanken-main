/**
 * Session Analytics Detail Page
 * 
 * /participants/analytics/[sessionId]
 * Shows detailed analytics for a specific session with export functionality
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { SessionActions } from '@/features/participants/components/SessionActions';

interface SessionAnalytics {
  session: {
    id: string;
    session_code: string;
    status: string;
    created_at: string;
    ended_at: string | null;
    game_id: string | null;
  };
  stats: {
    total_participants: number;
    active_participants: number;
    idle_participants: number;
    disconnected_participants: number;
    kicked_participants: number;
    blocked_participants: number;
    total_score: number;
    average_score: number;
    highest_score: number;
    total_achievements: number;
    unique_achievements: number;
    total_time_played: number;
    average_time_per_participant: number;
    total_events: number;
    event_breakdown: Record<string, number>;
  };
  top_scorers: Array<{
    participant_id: string;
    display_name: string;
    total_score: number;
    total_achievements: number;
    role: string;
  }>;
  top_achievers: Array<{
    participant_id: string;
    display_name: string;
    total_score: number;
    total_achievements: number;
    role: string;
  }>;
  participants: Array<{
    id: string;
    display_name: string;
    role: string;
    status: string;
    joined_at: string;
    last_seen_at: string | null;
    total_score: number;
    total_achievements: number;
  }>;
  recent_activity: Array<{
    event_type: string;
    created_at: string;
    event_data: Record<string, unknown>;
  }>;
  recent_achievements: Array<{
    achievement_name: string;
    achievement_points: number;
    unlocked_at: string;
  }>;
}

export default function SessionAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('sessionAnalytics');
  const locale = useLocale();
  const sessionId = params.sessionId as string;

  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale), [locale]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/participants/sessions/${sessionId}/analytics`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('errors.fetchFailed'));
      }

      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleExport = async (type: 'participants' | 'activity' | 'achievements') => {
    setExporting(true);

    try {
      const response = await fetch(`/api/participants/sessions/${sessionId}/export?type=${type}`);

      if (!response.ok) {
        throw new Error(t('export.errors.failed'));
      }

      // Download the CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_${analytics?.session.session_code}_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert(t('export.errors.failed'));
    } finally {
      setExporting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return t('duration.hoursMinutes', { hours, minutes });
    }
    return t('duration.minutes', { minutes });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      observer: t('participants.roles.observer'),
      player: t('participants.roles.player'),
      team_lead: t('participants.roles.teamLead'),
      facilitator: t('participants.roles.facilitator'),
    };

    return labels[role] || role;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t('participants.status.pending'),
      active: t('participants.status.active'),
      idle: t('participants.status.idle'),
      disconnected: t('participants.status.disconnected'),
      kicked: t('participants.status.kicked'),
      blocked: t('participants.status.blocked'),
    };

    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || t('errors.notFound')}</p>
          <button
            onClick={() => router.push('/participants/history')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('actions.backToHistory')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/participants/history')}
            className="mb-4 text-blue-600 hover:text-blue-700"
          >
            {t('actions.backToHistoryArrow')}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('title')}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('sessionCodeLabel')}{' '}
                <span className="font-mono font-semibold">{analytics.session.session_code}</span>
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('participants')}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {t('export.participants')}
              </button>
              <button
                onClick={() => handleExport('activity')}
                disabled={exporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {t('export.activity')}
              </button>
              <button
                onClick={() => handleExport('achievements')}
                disabled={exporting}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
              >
                {t('export.achievements')}
              </button>
            </div>
          </div>
        </div>

        {/* Session Management Actions */}
        <div className="mb-6">
          <SessionActions
            sessionId={analytics.session.id}
            sessionCode={analytics.session.session_code}
            status={analytics.session.status}
            onActionComplete={fetchAnalytics}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">{t('stats.totalParticipants')}</p>
            <p className="text-3xl font-bold text-gray-900">{analytics.stats.total_participants}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">{t('stats.totalScore')}</p>
            <p className="text-3xl font-bold text-blue-600">{analytics.stats.total_score.toLocaleString(locale)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">{t('stats.achievements')}</p>
            <p className="text-3xl font-bold text-purple-600">{analytics.stats.total_achievements}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">{t('stats.averageTime')}</p>
            <p className="text-3xl font-bold text-green-600">
              {formatDuration(analytics.stats.average_time_per_participant)}
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Top Scorers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{t('topScorers.title')}</h2>
            {analytics.top_scorers.length === 0 ? (
              <p className="text-gray-500">{t('topScorers.empty')}</p>
            ) : (
              <div className="space-y-2">
                {analytics.top_scorers.map((scorer, index) => (
                  <div key={scorer.participant_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <span className="font-medium">{scorer.display_name}</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{scorer.total_score.toLocaleString(locale)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Achievers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{t('topAchievers.title')}</h2>
            {analytics.top_achievers.length === 0 ? (
              <p className="text-gray-500">{t('topAchievers.empty')}</p>
            ) : (
              <div className="space-y-2">
                {analytics.top_achievers.map((achiever, index) => (
                  <div key={achiever.participant_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <span className="font-medium">{achiever.display_name}</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">{achiever.total_achievements}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Participants Table */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{t('participants.title')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">{t('participants.table.name')}</th>
                  <th className="text-left p-2">{t('participants.table.role')}</th>
                  <th className="text-left p-2">{t('participants.table.status')}</th>
                  <th className="text-right p-2">{t('participants.table.score')}</th>
                  <th className="text-right p-2">{t('participants.table.achievements')}</th>
                  <th className="text-left p-2">{t('participants.table.joined')}</th>
                </tr>
              </thead>
              <tbody>
                {analytics.participants.map((participant) => (
                  <tr key={participant.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{participant.display_name}</td>
                    <td className="p-2 text-sm text-gray-600">{getRoleLabel(participant.role)}</td>
                    <td className="p-2 text-sm">{getStatusLabel(participant.status)}</td>
                    <td className="p-2 text-right font-semibold">{participant.total_score.toLocaleString(locale)}</td>
                    <td className="p-2 text-right font-semibold">{participant.total_achievements}</td>
                    <td className="p-2 text-sm text-gray-600">
                      {dateFormatter.format(new Date(participant.joined_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">{t('recentActivity.title')}</h2>
          <div className="space-y-2">
            {analytics.recent_activity.slice(0, 10).map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-2 border-b">
                <div>
                  <span className="font-medium">{activity.event_type}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {dateFormatter.format(new Date(activity.created_at))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
