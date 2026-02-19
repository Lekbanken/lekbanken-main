/**
 * SessionHistoryViewer Component
 * 
 * Displays list of past sessions with filtering and pagination
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Select } from '@/components/ui/select';

interface SessionSummary {
  id: string;
  session_code: string;
  status: string;
  created_at: string;
  ended_at: string | null;
  game_id: string | null;
  total_participants: number;
  total_score: number;
  total_achievements: number;
  participant_counts: {
    active: number;
    idle: number;
    disconnected: number;
    kicked: number;
    blocked: number;
  };
}

interface SessionHistoryViewerProps {
  initialStatus?: string;
}

export function SessionHistoryViewer({ initialStatus }: SessionHistoryViewerProps) {
  const router = useRouter();
  const t = useTranslations('sessionHistory');
  const locale = useLocale();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus || 'all');
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale), [locale]);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/participants/sessions/history?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('errors.fetchFailed'));
      }

      setSessions(data.sessions);
      setTotalCount(data.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, offset]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'locked':
        return 'bg-orange-100 text-orange-800';
      case 'ended':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: t('status.active'),
      paused: t('status.paused'),
      locked: t('status.locked'),
      ended: t('status.ended'),
      cancelled: t('status.cancelled'),
      archived: t('status.archived'),
    };
    return labels[status] || status;
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return t('duration.hoursMinutes', { hours, minutes });
    }
    return t('duration.minutes', { minutes });
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow">
        <Select
          label={t('filters.label')}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setOffset(0);
          }}
          options={[
            { value: 'all', label: t('filters.all') },
            { value: 'active', label: t('filters.active') },
            { value: 'paused', label: t('filters.paused') },
            { value: 'locked', label: t('filters.locked') },
            { value: 'ended', label: t('filters.ended') },
            { value: 'cancelled', label: t('filters.cancelled') },
            { value: 'archived', label: t('filters.archived') },
          ]}
        />

        <div className="ml-auto text-sm text-gray-600">
          {t('summary.count', { count: totalCount })}
        </div>
      </div>

      {/* Session List */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">{t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 cursor-pointer"
              onClick={() => router.push(`/participants/analytics/${session.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl font-mono font-bold">
                      {session.session_code}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(session.status)}`}>
                      {getStatusLabel(session.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">{t('metrics.participants')}</p>
                      <p className="font-semibold">{session.total_participants}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t('metrics.totalScore')}</p>
                      <p className="font-semibold">{session.total_score.toLocaleString(locale)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t('metrics.achievements')}</p>
                      <p className="font-semibold">{session.total_achievements}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t('metrics.duration')}</p>
                      <p className="font-semibold">
                        {formatDuration(session.created_at, session.ended_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    {t('timestamps.created', { date: dateFormatter.format(new Date(session.created_at)) })}
                    {session.ended_at && (
                      <> • {t('timestamps.ended', { date: dateFormatter.format(new Date(session.ended_at)) })}</>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > limit && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('pagination.previous')}
          </button>

          <span className="text-sm text-gray-600">
            {t('pagination.showing', {
              start: offset + 1,
              end: Math.min(offset + limit, totalCount),
              total: totalCount,
            })}
          </span>

          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= totalCount}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('pagination.next')}
          </button>
        </div>
      )}
    </div>
  );
}
