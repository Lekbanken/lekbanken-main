/**
 * Host Play Mode Component
 * 
 * Integrates FacilitatorDashboard with the existing host session view.
 * Shows play controls when a game is linked and session is active.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { FacilitatorDashboard } from './FacilitatorDashboard';
import { RoleAssignerContainer } from './RoleAssignerContainer';
import { ArtifactsPanel } from './ArtifactsPanel';
import { DecisionsPanel } from './DecisionsPanel';
import { OutcomePanel } from './OutcomePanel';
import { getHostPlaySession, updatePlaySessionState, type PlaySessionData } from '../api';
import type { SessionTrigger } from '@/types/games';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  PlayIcon, 
  Cog6ToothIcon,
  UserGroupIcon,
  CubeIcon,
  ScaleIcon,
  FlagIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import type { SessionRuntimeState } from '@/types/play-runtime';

// =============================================================================
// Types
// =============================================================================

export interface HostPlayModeProps {
  /** Session ID */
  sessionId: string;
  /** Callback when user wants to exit play mode */
  onExitPlayMode?: () => void;
  /** Whether to show the internal exit button (defaults to true). */
  showExitButton?: boolean;
  /** Number of participants */
  participantCount?: number;
}

// Navigation zones: Play (main), Content (artifacts/decisions/outcomes), Manage (roles/settings)
type PlayModeZone = 'play' | 'content' | 'manage';
type ContentSubTab = 'artifacts' | 'decisions' | 'outcome';
type ManageSubTab = 'roles' | 'settings';

// =============================================================================
// Component
// =============================================================================

export function HostPlayMode({
  sessionId,
  onExitPlayMode,
  showExitButton = true,
  participantCount = 0,
}: HostPlayModeProps) {
  // Data state
  const [playData, setPlayData] = useState<PlaySessionData | null>(null);
  const [triggers, setTriggers] = useState<SessionTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state - simplified 3-zone navigation
  const [activeZone, setActiveZone] = useState<PlayModeZone>('play');
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>('artifacts');
  const [manageSubTab, setManageSubTab] = useState<ManageSubTab>('roles');

  // Load play session data
  const loadData = useCallback(async () => {
    try {
      const data = await getHostPlaySession(sessionId);
      if (data) {
        setPlayData(data);
        setError(null);
      } else {
        setError('Kunde inte ladda speldata');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);
  // Load triggers (snapshot if needed)
  const loadTriggers = useCallback(async () => {
    try {
      // Try to get existing session triggers
      const res = await fetch(`/api/play/sessions/${sessionId}/triggers`, {
        cache: 'no-store',
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.triggers && data.triggers.length > 0) {
          setTriggers(data.triggers);
          return;
        }
      }

      // If no triggers exist, try to snapshot from game
      const snapshotRes = await fetch(`/api/play/sessions/${sessionId}/triggers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (snapshotRes.ok) {
        // Reload triggers after snapshot
        const reloadRes = await fetch(`/api/play/sessions/${sessionId}/triggers`, {
          cache: 'no-store',
        });
        if (reloadRes.ok) {
          const reloadData = await reloadRes.json();
          setTriggers(reloadData.triggers || []);
        }
      }
    } catch (err) {
      console.warn('[HostPlayMode] Failed to load triggers:', err);
    }
  }, [sessionId]);
  useEffect(() => {
    void loadData();
    void loadTriggers();
  }, [loadData, loadTriggers]);

  // Handle state updates
  const handleStateUpdate = useCallback(async (updates: Partial<SessionRuntimeState>) => {
    const previousState = playData?.runtimeState;
    const success = await updatePlaySessionState(sessionId, updates, previousState);
    if (success) {
      // Update local state optimistically
      setPlayData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          runtimeState: {
            ...prev.runtimeState,
            ...updates,
          },
        };
      });
    }
  }, [sessionId, playData?.runtimeState]);

  // Handle session end
  const handleEndSession = useCallback(() => {
    // This should be handled by the parent component
    onExitPlayMode?.();
  }, [onExitPlayMode]);

  // Handle trigger fire
  const handleTriggerAction = useCallback(async (triggerId: string, action: 'fire' | 'disable' | 'arm') => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/triggers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerId, action }),
      });

      if (res.ok) {
        // Update local state
        setTriggers((prev) => {
          return prev.map((t) => {
            if (t.id !== triggerId) return t;
            if (action === 'fire') {
              return {
                ...t,
                status: 'fired' as const,
                fired_count: (t.fired_count || 0) + 1,
                fired_at: new Date().toISOString(),
              };
            }
            if (action === 'disable') {
              return { ...t, status: 'disabled' as const };
            }
            if (action === 'arm') {
              return { ...t, status: 'armed' as const };
            }
            return t;
          });
        });
      }
    } catch (err) {
      console.error('[HostPlayMode] Failed to update trigger:', err);
    }
  }, [sessionId]);

  // Handle role assignment complete
  const handleRolesAssigned = useCallback(() => {
    // Reload data to get updated assignments
    void loadData();
    // Switch to play view
    setActiveZone('play');
  }, [loadData]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Error state
  if (error || !playData) {
    return (
      <Card className="p-8 text-center">
        <p className="text-destructive mb-4">{error || 'Ingen speldata tillgänglig'}</p>
        <Button variant="outline" onClick={onExitPlayMode}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Tillbaka
        </Button>
      </Card>
    );
  }

  // No game linked - show message
  if (!playData.gameId) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-semibold mb-2">Inget spel kopplat</h2>
        <p className="text-muted-foreground mb-4">
          Denna session har inget spel kopplat. Spelläget kräver ett spel med steg och instruktioner.
        </p>
        <Button variant="outline" onClick={onExitPlayMode}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Tillbaka till session
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simplified 3-zone navigation */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <Button
            variant={activeZone === 'play' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveZone('play')}
            className="min-w-[80px]"
          >
            <PlayIcon className="h-4 w-4 mr-1.5" />
            Spela
          </Button>
          <Button
            variant={activeZone === 'content' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveZone('content')}
            className="min-w-[80px]"
          >
            <CubeIcon className="h-4 w-4 mr-1.5" />
            Innehåll
          </Button>
          <Button
            variant={activeZone === 'manage' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveZone('manage')}
            className="min-w-[80px]"
          >
            <Cog6ToothIcon className="h-4 w-4 mr-1.5" />
            Hantera
          </Button>
        </div>
        
        {showExitButton && (
          <Button variant="ghost" size="sm" onClick={onExitPlayMode}>
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Lobby
          </Button>
        )}
      </div>

      {/* Zone: Play - Main facilitator dashboard */}
      {activeZone === 'play' && (
        <FacilitatorDashboard
          sessionId={sessionId}
          gameTitle={playData.gameTitle}
          steps={playData.steps}
          phases={playData.phases}
          initialState={playData.runtimeState}
          triggers={triggers}
          onStateUpdate={handleStateUpdate}
          onTriggerAction={handleTriggerAction}
          onEndSession={handleEndSession}
          participantCount={participantCount}
        />
      )}

      {/* Zone: Content - Artifacts, Decisions, Outcomes */}
      {activeZone === 'content' && (
        <div className="space-y-4">
          {/* Sub-tabs for content zone */}
          <div className="flex gap-2 border-b border-border/50 pb-3">
            <Button
              variant={contentSubTab === 'artifacts' ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => setContentSubTab('artifacts')}
            >
              <CubeIcon className="h-4 w-4 mr-1" />
              Artefakter
            </Button>
            <Button
              variant={contentSubTab === 'decisions' ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => setContentSubTab('decisions')}
            >
              <ScaleIcon className="h-4 w-4 mr-1" />
              Beslut
            </Button>
            <Button
              variant={contentSubTab === 'outcome' ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => setContentSubTab('outcome')}
            >
              <FlagIcon className="h-4 w-4 mr-1" />
              Utfall
            </Button>
          </div>

          {contentSubTab === 'artifacts' && <ArtifactsPanel sessionId={sessionId} />}
          {contentSubTab === 'decisions' && <DecisionsPanel sessionId={sessionId} />}
          {contentSubTab === 'outcome' && <OutcomePanel sessionId={sessionId} />}
        </div>
      )}

      {/* Zone: Manage - Roles, Settings */}
      {activeZone === 'manage' && (
        <div className="space-y-4">
          {/* Sub-tabs for manage zone */}
          <div className="flex gap-2 border-b border-border/50 pb-3">
            <Button
              variant={manageSubTab === 'roles' ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => setManageSubTab('roles')}
            >
              <UserGroupIcon className="h-4 w-4 mr-1" />
              Roller
              {playData.sessionRoles.length > 0 && (
                <span className="ml-1 text-xs opacity-75">
                  ({playData.sessionRoles.length})
                </span>
              )}
            </Button>
            <Button
              variant={manageSubTab === 'settings' ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => setManageSubTab('settings')}
            >
              <Cog6ToothIcon className="h-4 w-4 mr-1" />
              Inställningar
            </Button>
          </div>

          {manageSubTab === 'roles' && (
            <RoleAssignerContainer
              sessionId={sessionId}
              sessionRoles={playData.sessionRoles}
              onAssignmentComplete={handleRolesAssigned}
            />
          )}

          {manageSubTab === 'settings' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Spelinställningar</h2>
              <p className="text-muted-foreground">
                Inställningar för spelet kommer här i framtida versioner.
              </p>
              <ul className="mt-4 text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Timer-inställningar</li>
                <li>Automatisk stegframsteg</li>
                <li>Ljudeffekter</li>
                <li>Deltagarbegränsningar</li>
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
