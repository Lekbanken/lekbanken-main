'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, Button } from '@/components/ui';
import {
  ArrowPathIcon,
  ClockIcon,
  UserGroupIcon,
  BoltIcon,
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import type { SessionAnalyticsResponse, TimelineEvent, TimeBankEntry } from '@/types/analytics';

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
  }
  return `${mins}m ${secs}s`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function StatBox({
  label,
  value,
  subValue,
  icon: Icon,
  color = 'primary',
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  color?: 'primary' | 'green' | 'amber' | 'blue' | 'red';
}) {
  const colorStyles = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
    blue: 'bg-blue-500/10 text-blue-500',
    red: 'bg-red-500/10 text-red-500',
  };

  return (
    <div className="text-center p-4">
      <div className={`inline-flex p-2 rounded-lg ${colorStyles[color]} mb-2`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
    </div>
  );
}

function EventIcon({ type }: { type: string }) {
  switch (type) {
    case 'session_started':
    case 'session_ended':
      return <span className="text-lg">🎬</span>;
    case 'participant_joined':
    case 'participant_left':
      return <span className="text-lg">👤</span>;
    case 'trigger_fired':
      return <span className="text-lg">⚡</span>;
    case 'step_advanced':
    case 'phase_changed':
      return <span className="text-lg">📍</span>;
    case 'signal_sent':
      return <span className="text-lg">📡</span>;
    case 'time_bank_changed':
      return <span className="text-lg">⏰</span>;
    case 'decision_created':
    case 'vote_cast':
      return <span className="text-lg">🗳️</span>;
    case 'artifact_revealed':
      return <span className="text-lg">🔓</span>;
    default:
      return <span className="text-lg">📋</span>;
  }
}

type SessionAnalyticsViewerProps = {
  sessionId: string;
};

export function SessionAnalyticsViewer({ sessionId }: SessionAnalyticsViewerProps) {
  const t = useTranslations('admin.sessionAnalytics');
  const [data, setData] = useState<SessionAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'timebank'>('overview');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-destructive">{error || t('noData')}</p>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} className="mt-4">
          {t('retry')}
        </Button>
      </div>
    );
  }

  const { analytics, timeline, time_bank_history } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{analytics.game_name}</h2>
          <p className="text-sm text-muted-foreground">
            Session: {sessionId.slice(0, 8)}...
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics}>
          <ArrowPathIcon className="h-4 w-4 mr-1" />
          {t('refresh')}
        </Button>
      </div>

      {/* Quick stats */}
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border">
          <StatBox
            label="Varaktighet"
            value={formatDuration(analytics.duration_seconds)}
            icon={ClockIcon}
            color="primary"
          />
          <StatBox
            label="Deltagare"
            value={analytics.participant_count}
            subValue={`${analytics.active_participant_count} aktiva`}
            icon={UserGroupIcon}
            color="blue"
          />
          <StatBox
            label="Triggers"
            value={`${analytics.triggers_fired}/${analytics.total_triggers}`}
            subValue={`${analytics.trigger_fire_rate.toFixed(0)}% aktiverade`}
            icon={BoltIcon}
            color="amber"
          />
          <StatBox
            label="Tidsbank"
            value={`${analytics.time_bank_delta >= 0 ? '+' : ''}${analytics.time_bank_delta}s`}
            subValue={`${analytics.time_bank_transactions} transaktioner`}
            icon={ClockIcon}
            color={analytics.time_bank_delta >= 0 ? 'green' : 'red'}
          />
        </div>
      </Card>

      {/* Tab navigation */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'overview'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ChartBarIcon className="h-4 w-4 inline mr-1" />
          {t('tabs.overview')}
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'timeline'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ChatBubbleBottomCenterTextIcon className="h-4 w-4 inline mr-1" />
          {t('tabs.timeline')} ({timeline.length})
        </button>
        <button
          onClick={() => setActiveTab('timebank')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'timebank'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ClockIcon className="h-4 w-4 inline mr-1" />
          {t('tabs.timebank')} ({time_bank_history.length})
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Events breakdown */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <SignalIcon className="h-4 w-4" />
              {t('overview.eventsByType')}
            </h3>
            {Object.keys(analytics.events_by_type).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('overview.noEvents')}</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(analytics.events_by_type)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{type.replace(/_/g, ' ')}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          {/* Signals breakdown */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BoltIcon className="h-4 w-4" />
              {t('overview.signalsByType')}
            </h3>
            {Object.keys(analytics.signals_by_type).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('overview.noSignals')}</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(analytics.signals_by_type)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{type}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </Card>

          {/* Decisions summary */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              🗳️ {t('decisions.title')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totalt</span>
                <span className="font-mono">{analytics.total_decisions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avslutade</span>
                <span className="font-mono">{analytics.decisions_completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Röster</span>
                <span className="font-mono">{analytics.total_votes}</span>
              </div>
            </div>
          </Card>

          {/* Session info */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              📋 {t('sessionInfo.title')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Startad</span>
                <span className="font-mono">
                  {analytics.started_at ? formatTime(analytics.started_at) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avslutad</span>
                <span className="font-mono">
                  {analytics.ended_at ? formatTime(analytics.ended_at) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Totala händelser</span>
                <span className="font-mono">{analytics.total_events}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'timeline' && (
        <Card className="p-4">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('timeline.empty')}
            </p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {timeline.map((event: TimelineEvent) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <EventIcon type={event.event_type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{event.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(event.timestamp)} · {event.actor_type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'timebank' && (
        <Card className="p-4">
          {time_bank_history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Ingen tidsbankhistorik
            </p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {time_bank_history.map((entry: TimeBankEntry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg ${entry.delta_seconds >= 0 ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {entry.delta_seconds >= 0 ? '⬆️' : '⬇️'}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {entry.delta_seconds >= 0 ? '+' : ''}{entry.delta_seconds}s
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">{entry.balance_after}s</p>
                    <p className="text-xs text-muted-foreground">{formatTime(entry.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
