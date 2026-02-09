/**
 * Participant Play Mode Component
 * 
 * Integrates ParticipantPlayView with the participant session client.
 * Shows game content when session is active and has a game linked.
 * 
 * Play mode gating:
 * - basic: Simplified "follow board" view (participants watch, host leads)
 * - facilitated/participants: Full ParticipantPlayView with prompts/artifacts
 * 
 * @see docs/play/PLAY_UI_WIRING_AUDIT_REPORT.md for play_mode routing spec
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ParticipantPlayView } from './ParticipantPlayView';
import { getParticipantPlaySession, type ParticipantPlayData } from '../api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClockIcon, TvIcon } from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

export interface ParticipantPlayModeProps {
  /** Session code */
  sessionCode: string;
  /** Participant token from storage */
  participantToken: string;
  /** Whether to show role card */
  showRole?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function ParticipantPlayMode({
  sessionCode,
  participantToken,
  showRole = true,
}: ParticipantPlayModeProps) {
  const t = useTranslations('play.participantPlayMode');
  // Data state
  const [playData, setPlayData] = useState<ParticipantPlayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load play data
  const loadData = useCallback(async () => {
    try {
      const data = await getParticipantPlaySession(sessionCode, participantToken);
      if (data) {
        setPlayData(data);
        setError(null);
      } else {
        setError(t('errors.couldNotLoadPlayData'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }, [sessionCode, participantToken, t]);

  useEffect(() => {
    void loadData();
    
    // Refresh every 30 seconds to get updated state
    const interval = setInterval(() => void loadData(), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 px-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="max-w-md mx-auto p-6 text-center">
        <p className="text-destructive">{error}</p>
      </Card>
    );
  }

  // No data
  if (!playData) {
    return (
      <Card className="max-w-md mx-auto p-6 text-center">
        <p className="text-muted-foreground">{t('noData')}</p>
      </Card>
    );
  }

  // No game linked - show waiting message
  if (!playData.gameId || playData.steps.length === 0) {
    return (
      <Card className="max-w-md mx-auto p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ClockIcon className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-2">{t('waiting.title')}</h2>
        <p className="text-muted-foreground">
          {t('waiting.description')}
        </p>
      </Card>
    );
  }

  // Play mode gating: basic mode = "follow board" (host-led, minimal participant UI)
  // Treat null/undefined as 'basic' for safety
  const playMode = playData.playMode ?? 'basic';
  
  if (playMode === 'basic') {
    // Basic mode: participants follow board, no interactive prompts
    return (
      <Card className="max-w-md mx-auto p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <TvIcon className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-2">{t('basic.title')}</h2>
        <p className="text-muted-foreground">
          {t('basic.description')}
        </p>
        <p className="mt-4 text-sm font-medium text-foreground">
          {playData.gameTitle}
        </p>
      </Card>
    );
  }

  // facilitated / participants mode: full interactive view

  // Build role for ParticipantPlayView (must match RoleCardData interface)
  const role = playData.assignedRole
    ? {
        id: playData.assignedRole.id,
        name: playData.assignedRole.name,
        icon: playData.assignedRole.icon,
        color: playData.assignedRole.color,
        public_description: playData.assignedRole.public_description,
        private_instructions: playData.assignedRole.private_instructions,
        private_hints: playData.assignedRole.private_hints,
      }
    : undefined;

  return (
    <ParticipantPlayView
      sessionId={playData.sessionId}
      sessionCode={sessionCode}
      gameTitle={playData.gameTitle}
      steps={playData.steps.map((s) => ({
        ...s,
        display_mode: s.display_mode ?? undefined,
      }))}
      phases={playData.phases}
      role={role}
      initialState={playData.runtimeState}
      participantName={playData.participantName}
      participantId={playData.participantId}
      isNextStarter={playData.isNextStarter}
      participantToken={participantToken}
      showRole={showRole && !!role}
      secretRoleRevealedAt={playData.secretRoleRevealedAt}
      boardTheme={playData.boardTheme}
      tools={playData.tools}
    />
  );
}
