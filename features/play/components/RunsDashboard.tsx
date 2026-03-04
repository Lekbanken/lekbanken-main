'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { fetchRunsDashboard, endRunSession } from '@/features/play/api';
import type { DashboardRunRow, DashboardSessionInfo } from '@/features/play/types';
import { isTerminalRunSessionStatus } from '@/features/play/types';
import { Badge } from '@/components/ui/badge';
import type { BadgeVariant } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  PlayIcon,
  ArrowPathIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChevronRightIcon,
  StopIcon,
} from '@heroicons/react/24/outline';

// ── Helpers ─────────────────────────────────────────────────────────────────

function runStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'in_progress':
      return 'primary';
    case 'completed':
      return 'success';
    case 'abandoned':
      return 'destructive';
    default:
      return 'default';
  }
}

function sessionStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'active':
      return 'success';
    case 'created':
      return 'accent';
    case 'completed':
      return 'default';
    case 'ended':
      return 'default';
    case 'abandoned':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatRelativeTime(dateString: string, t: ReturnType<typeof useTranslations>): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return t('time.justNow');
  if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });

  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

// ── Component ───────────────────────────────────────────────────────────────

export function RunsDashboard() {
  const t = useTranslations('play.runsDashboard');
  const tTime = useTranslations('play.sessionCard');
  const router = useRouter();
  const [rows, setRows] = useState<DashboardRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<'active' | 'all'>('active');

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRunsDashboard(scope);
      setRows(data);
    } catch {
      setError(t('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [scope, t]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
        <div className="divide-y divide-border/50 rounded-lg border border-border/40 bg-card">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 py-4 px-4 animate-pulse">
              <div className="h-10 w-10 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-muted rounded" />
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scope toggle */}
      <div className="flex items-center gap-2">
        {(['active', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              scope === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {t(`scope.${s}`)}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <EmptyState
          icon={<PlayIcon className="h-12 w-12" />}
          title={t('empty.title')}
          description={t('empty.description')}
          action={{
            label: t('empty.action'),
            onClick: () => router.push('/app/browse'),
          }}
        />
      )}

      {/* Row list */}
      {rows.length > 0 && (
        <div className="divide-y divide-border/50 rounded-lg border border-border/40 bg-card overflow-hidden">
          {rows.map((row) => (
            <DashboardRow key={row.id} row={row} t={t} tTime={tTime} onRefresh={loadRows} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────

function DashboardRow({
  row,
  t,
  tTime,
  onRefresh,
}: {
  row: DashboardRunRow;
  t: ReturnType<typeof useTranslations>;
  tTime: ReturnType<typeof useTranslations>;
  onRefresh: () => void;
}) {
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const { info, error: showError } = useToast();

  // Find the "primary" session — the one at the current step, or the first active one
  const primarySession: DashboardSessionInfo | undefined =
    row.sessions.find((s) => s.stepIndex === row.currentStepIndex) ??
    row.sessions.find((s) => s.runSessionStatus === 'active') ??
    row.sessions[0];

  const needsAttention =
    row.runStatus === 'in_progress' &&
    row.sessions.some(
      (s) => s.runSessionStatus !== 'abandoned' && !s.participantSession
    );

  const totalParticipants = row.sessions.reduce(
    (sum, s) => sum + (s.participantSession?.participantCount ?? 0),
    0
  );

  // Can the session be ended?
  const canEnd =
    primarySession != null &&
    primarySession.participantSession != null &&
    !isTerminalRunSessionStatus(primarySession.runSessionStatus);

  const handleEndSession = async () => {
    if (!primarySession) return;
    setEnding(true);
    try {
      const result = await endRunSession(row.id, primarySession.stepIndex);
      if (!result.success && result.error.code === 'CONFLICT') {
        // Already ended (e.g. from another tab) — inform user, refresh
        info(t('endConfirm.alreadyEnded'));
      } else if (!result.success) {
        showError(result.error.message);
      }
      onRefresh();
    } catch {
      // Refresh anyway to show current state
      onRefresh();
    } finally {
      setEnding(false);
      setEndDialogOpen(false);
    }
  };

  return (
    <div className="relative flex items-center gap-4 py-4 px-4 hover:bg-muted/50 transition-colors">
      {/* Plan initial */}
      <div className="shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
        <span className="text-sm font-bold text-primary/60">
          {row.planName.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {/* Stale indicator */}
          {row.isStale && (
            <ExclamationTriangleIcon
              className="h-4 w-4 text-warning shrink-0"
              title={t('staleDescription')}
            />
          )}

          <h3 className="text-sm font-semibold text-foreground truncate">
            {row.planName}
          </h3>

          <Badge variant={runStatusVariant(row.runStatus)} size="sm">
            {t(`runStatus.${row.runStatus}`)}
          </Badge>

          {row.isStale && (
            <Badge variant="warning" size="sm" dot>
              {t('stale')}
            </Badge>
          )}

          {needsAttention && (
            <Badge variant="destructive" size="sm" dot>
              {t('needsAttention')}
            </Badge>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {t('stepLabel', {
              current: row.currentStepIndex + 1,
              total: row.totalSteps,
            })}
          </span>

          <span className="text-muted-foreground/50">•</span>

          {primarySession?.participantSession && (
            <>
              <span className="flex items-center gap-1">
                <Badge
                  variant={sessionStatusVariant(
                    primarySession.participantSession.status
                  )}
                  size="sm"
                >
                  {t(
                    `sessionStatus.${primarySession.runSessionStatus}`
                  )}
                </Badge>
              </span>
              <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {primarySession.participantSession.sessionCode}
              </span>
              <span className="text-muted-foreground/50">•</span>
            </>
          )}

          {!primarySession?.participantSession &&
            row.sessions.length > 0 && (
              <>
                <Badge variant="outline" size="sm">
                  {t('sessionStatus.noSession')}
                </Badge>
                <span className="text-muted-foreground/50">•</span>
              </>
            )}

          <span className="flex items-center gap-1">
            <UsersIcon className="h-3 w-3" />
            {totalParticipants}
          </span>

          <span className="text-muted-foreground/50">•</span>

          <span className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            {formatRelativeTime(row.startedAt, tTime)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {row.runStatus === 'in_progress' && (
          <Link
            href={`/app/play/plan/${row.planId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            {t('actions.resume')}
          </Link>
        )}

        {primarySession?.participantSession && (
          <Link
            href={`/app/play/sessions/${primarySession.participantSession.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            {t('actions.openSession')}
          </Link>
        )}

        {canEnd && (
          <button
            onClick={() => setEndDialogOpen(true)}
            disabled={ending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
          >
            <StopIcon className="h-3.5 w-3.5" />
            {ending ? t('actions.ending') : t('actions.end')}
          </button>
        )}

        <ChevronRightIcon className="h-5 w-5 text-muted-foreground/50" />
      </div>

      {/* End session confirm dialog */}
      <AlertDialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <AlertDialogContent variant="destructive">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('endConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('endConfirm.description', {
                sessionName: primarySession?.participantSession?.displayName ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ending}>
              {t('endConfirm.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndSession}
              disabled={ending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {ending ? t('actions.ending') : t('endConfirm.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
