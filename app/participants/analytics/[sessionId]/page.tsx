/**
 * Session Analytics Detail Page
 * 
 * /participants/analytics/[sessionId]
 * Shows detailed analytics for a specific session with export functionality
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const sessionId = params.sessionId as string;

  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/participants/sessions/${sessionId}/analytics`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
        throw new Error('Export failed');
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
      alert('Export misslyckades');
    } finally {
      setExporting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Laddar analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Session hittades inte'}</p>
          <button
            onClick={() => router.push('/participants/history')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Tillbaka till Historik
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
            ← Tillbaka till Historik
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Session Analytics
              </h1>
              <p className="text-gray-600 mt-1">
                Kod: <span className="font-mono font-semibold">{analytics.session.session_code}</span>
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('participants')}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                📊 Exportera Deltagare
              </button>
              <button
                onClick={() => handleExport('activity')}
                disabled={exporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                📋 Exportera Aktivitet
              </button>
              <button
                onClick={() => handleExport('achievements')}
                disabled={exporting}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
              >
                🏆 Exportera Utmärkelser
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
            <p className="text-sm text-gray-600">Totalt Deltagare</p>
            <p className="text-3xl font-bold text-gray-900">{analytics.stats.total_participants}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Totalt Poäng</p>
            <p className="text-3xl font-bold text-blue-600">{analytics.stats.total_score.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Utmärkelser</p>
            <p className="text-3xl font-bold text-purple-600">{analytics.stats.total_achievements}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Genomsnittlig Tid</p>
            <p className="text-3xl font-bold text-green-600">
              {formatDuration(analytics.stats.average_time_per_participant)}
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Top Scorers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Top Poängtagare</h2>
            {analytics.top_scorers.length === 0 ? (
              <p className="text-gray-500">Ingen data</p>
            ) : (
              <div className="space-y-2">
                {analytics.top_scorers.map((scorer, index) => (
                  <div key={scorer.participant_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <span className="font-medium">{scorer.display_name}</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{scorer.total_score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Achievers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Flest Utmärkelser</h2>
            {analytics.top_achievers.length === 0 ? (
              <p className="text-gray-500">Ingen data</p>
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
          <h2 className="text-xl font-semibold mb-4">Alla Deltagare</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Namn</th>
                  <th className="text-left p-2">Roll</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Poäng</th>
                  <th className="text-right p-2">Utmärkelser</th>
                  <th className="text-left p-2">Gick med</th>
                </tr>
              </thead>
              <tbody>
                {analytics.participants.map((participant) => (
                  <tr key={participant.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{participant.display_name}</td>
                    <td className="p-2 text-sm text-gray-600">{participant.role}</td>
                    <td className="p-2 text-sm">{participant.status}</td>
                    <td className="p-2 text-right font-semibold">{participant.total_score.toLocaleString()}</td>
                    <td className="p-2 text-right font-semibold">{participant.total_achievements}</td>
                    <td className="p-2 text-sm text-gray-600">
                      {new Date(participant.joined_at).toLocaleString('sv-SE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Senaste Aktivitet</h2>
          <div className="space-y-2">
            {analytics.recent_activity.slice(0, 10).map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-2 border-b">
                <div>
                  <span className="font-medium">{activity.event_type}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {new Date(activity.created_at).toLocaleString('sv-SE')}
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
