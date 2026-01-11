'use client';

/**
 * PuzzleProgressPanel Component
 * 
 * Host-facing panel showing puzzle progress for all participants/teams.
 * Shows which puzzles are solved, in-progress, or pending.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  UserGroupIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/solid';

// =============================================================================
// Types
// =============================================================================

export interface PuzzleStatus {
  artifactId: string;
  artifactTitle: string;
  artifactType: string;
  participantId?: string;
  participantName?: string;
  teamId?: string;
  teamName?: string;
  status: 'not_started' | 'in_progress' | 'solved' | 'locked' | 'pending_approval';
  progress?: number; // 0-100 for partial progress
  attempts?: number;
  solvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface PuzzleProgressPanelProps {
  sessionId: string;
  /** Refresh interval in ms (default: 5000) */
  refreshInterval?: number;
}

// =============================================================================
// Component
// =============================================================================

export function PuzzleProgressPanel({
  sessionId,
  refreshInterval = 5000,
}: PuzzleProgressPanelProps) {
  const t = useTranslations('play.puzzleProgress');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [puzzleStatuses, setPuzzleStatuses] = useState<PuzzleStatus[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load puzzle progress
  const loadProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/puzzles/progress`, {
        cache: 'no-store',
      });
      
      if (!res.ok) {
        throw new Error(t('errors.couldNotLoad'));
      }
      
      const data = await res.json();
      setPuzzleStatuses(data.puzzles || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.loadError'));
    } finally {
      setLoading(false);
    }
  }, [sessionId, t]);

  // Initial load and polling
  useEffect(() => {
    void loadProgress();
    
    const interval = setInterval(() => {
      void loadProgress();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [loadProgress, refreshInterval]);

  // Group puzzles by team/participant
  const groupedPuzzles = puzzleStatuses.reduce((acc, puzzle) => {
    const key = puzzle.teamId || puzzle.participantId || 'unknown';
    const name = puzzle.teamName || puzzle.participantName || t('unknown');
    
    if (!acc[key]) {
      acc[key] = { name, puzzles: [] };
    }
    acc[key].puzzles.push(puzzle);
    
    return acc;
  }, {} as Record<string, { name: string; puzzles: PuzzleStatus[] }>);

  // Calculate overall stats
  const stats = {
    total: puzzleStatuses.length,
    solved: puzzleStatuses.filter(p => p.status === 'solved').length,
    inProgress: puzzleStatuses.filter(p => p.status === 'in_progress').length,
    pendingApproval: puzzleStatuses.filter(p => p.status === 'pending_approval').length,
    locked: puzzleStatuses.filter(p => p.status === 'locked').length,
  };

  // Status icons and colors
  const getStatusBadge = (status: PuzzleStatus['status']) => {
    switch (status) {
      case 'solved':
        return (
          <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            {t('status.solved')}
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30">
            <ClockIcon className="h-3 w-3 mr-1" />
            {t('status.inProgress')}
          </Badge>
        );
      case 'pending_approval':
        return (
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
            <ExclamationCircleIcon className="h-3 w-3 mr-1" />
            {t('status.pending')}
          </Badge>
        );
      case 'locked':
        return (
          <Badge variant="destructive">
            {t('status.locked')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {t('status.notStarted')}
          </Badge>
        );
    }
  };

  // Artifact type icon
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      riddle: '❓',
      counter: '🔢',
      audio: '🔊',
      multi_answer: '✅',
      qr_gate: '📱',
      hint_container: '💡',
      hotspot: '🎯',
      tile_puzzle: '🧩',
      cipher: '🔤',
      logic_grid: '🧠',
      prop_confirmation: '📦',
      location_check: '📍',
      sound_level: '🎤',
    };
    return icons[type] || '📄';
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ArrowPathIcon className="h-5 w-5 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={loadProgress}>
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            {t('tryAgain')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PuzzlePieceIcon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{t('title')}</h3>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                {t('updatedAt', { time: lastUpdated.toLocaleTimeString('sv-SE') })}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={loadProgress}>
              <ArrowPathIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="text-2xl font-bold text-green-600">{stats.solved}</div>
            <div className="text-xs text-muted-foreground">{t('stats.solved')}</div>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-xs text-muted-foreground">{t('stats.inProgress')}</div>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="text-2xl font-bold text-amber-600">{stats.pendingApproval}</div>
            <div className="text-xs text-muted-foreground">{t('stats.pending')}</div>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="text-2xl font-bold text-muted-foreground">{stats.total - stats.solved}</div>
            <div className="text-xs text-muted-foreground">{t('stats.remaining')}</div>
          </div>
        </div>
      </Card>

      {/* Grouped by team/participant */}
      {Object.entries(groupedPuzzles).length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            {t('noPuzzlesStarted')}
          </p>
        </Card>
      ) : (
        Object.entries(groupedPuzzles).map(([groupId, group]) => (
          <Card key={groupId} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{group.name}</span>
              <Badge variant="outline" className="ml-auto">
                {group.puzzles.filter(p => p.status === 'solved').length}/{group.puzzles.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {group.puzzles.map((puzzle) => (
                <div
                  key={`${puzzle.artifactId}-${puzzle.participantId || puzzle.teamId}`}
                  className="flex items-center justify-between p-2 rounded bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getTypeIcon(puzzle.artifactType)}</span>
                    <div>
                      <p className="text-sm font-medium">{puzzle.artifactTitle}</p>
                      {puzzle.attempts !== undefined && puzzle.attempts > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {t('attempts', { count: puzzle.attempts })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {puzzle.progress !== undefined && puzzle.progress > 0 && puzzle.progress < 100 && (
                      <span className="text-xs text-muted-foreground">{puzzle.progress}%</span>
                    )}
                    {getStatusBadge(puzzle.status)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
