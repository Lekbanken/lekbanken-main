'use client';

import { useEffect, useState } from 'react';
import { Card, Button, HelpText } from '@/components/ui';
import {
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  PlayCircleIcon,
  BoltIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import type { DashboardOverview, SessionSummary } from '@/types/analytics';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('sv-SE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: SessionSummary['status'] }) {
  const styles = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    active: 'bg-green-500/10 text-green-500 border-green-500/30',
    ended: 'bg-muted text-muted-foreground border-border',
  };

  const labels = {
    pending: 'Väntande',
    active: 'Aktiv',
    ended: 'Avslutad',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'primary',
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: 'primary' | 'green' | 'amber' | 'blue';
}) {
  const colorStyles = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-500/10 text-green-500',
    amber: 'bg-amber-500/10 text-amber-500',
    blue: 'bg-blue-500/10 text-blue-500',
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorStyles[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export function AnalyticsDashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/analytics/overview');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Laddar statistik...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchOverview} className="mt-4">
          Försök igen
        </Button>
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Analysöversikt</h2>
          <p className="text-sm text-muted-foreground">Statistik och insikter från dina sessioner</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOverview}>
          <ArrowPathIcon className="h-4 w-4 mr-1" />
          Uppdatera
        </Button>
      </div>

      <HelpText variant="info">
        Statistiken uppdateras i realtid. Klicka på &quot;Uppdatera&quot; för att hämta senaste data.
      </HelpText>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Totalt antal spel"
          value={overview.total_games}
          icon={ChartBarIcon}
          color="primary"
        />
        <StatCard
          title="Totala sessioner"
          value={overview.total_sessions}
          icon={PlayCircleIcon}
          color="blue"
        />
        <StatCard
          title="Aktiva sessioner"
          value={overview.active_sessions}
          icon={BoltIcon}
          color="green"
        />
        <StatCard
          title="Totala deltagare"
          value={overview.total_participants}
          icon={UserGroupIcon}
          color="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent sessions */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Senaste sessioner</h3>
            <ClockIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <HelpText className="mb-3">
            Visar de senaste spelsessionerna med status och antal deltagare.
          </HelpText>
          
          {overview.recent_sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Inga sessioner ännu
            </p>
          ) : (
            <div className="space-y-3">
              {overview.recent_sessions.map((session) => (
                <div
                  key={session.session_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserGroupIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {session.participant_count} deltagare
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(session.created_at)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={session.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Popular games */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Populära spel</h3>
            <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <HelpText className="mb-3">
            Spel rankade efter antal genomförda sessioner.
          </HelpText>
          
          {overview.popular_games.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Inga spel har körts ännu
            </p>
          ) : (
            <div className="space-y-3">
              {overview.popular_games.map((game, idx) => (
                <div
                  key={game.game_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-medium">{game.game_name}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {game.session_count} {game.session_count === 1 ? 'session' : 'sessioner'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
