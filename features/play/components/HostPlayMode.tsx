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
  /** Number of participants */
  participantCount?: number;
}

type PlayModeTab = 'facilitator' | 'artifacts' | 'decisions' | 'outcome' | 'roles' | 'settings';

// =============================================================================
// Component
// =============================================================================

export function HostPlayMode({
  sessionId,
  onExitPlayMode,
  participantCount = 0,
}: HostPlayModeProps) {
  // Data state
  const [playData, setPlayData] = useState<PlaySessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState<PlayModeTab>('facilitator');

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

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  // Handle role assignment complete
  const handleRolesAssigned = useCallback(() => {
    // Reload data to get updated assignments
    void loadData();
    // Switch to facilitator view
    setActiveTab('facilitator');
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
      {/* Tab navigation */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'facilitator' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('facilitator')}
          >
            <PlayIcon className="h-4 w-4 mr-1" />
            Spela
          </Button>
          <Button
            variant={activeTab === 'artifacts' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('artifacts')}
          >
            <CubeIcon className="h-4 w-4 mr-1" />
            Artefakter
          </Button>
          <Button
            variant={activeTab === 'decisions' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('decisions')}
          >
            <ScaleIcon className="h-4 w-4 mr-1" />
            Beslut
          </Button>
          <Button
            variant={activeTab === 'outcome' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('outcome')}
          >
            <FlagIcon className="h-4 w-4 mr-1" />
            Utfall
          </Button>
          <Button
            variant={activeTab === 'roles' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('roles')}
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
            variant={activeTab === 'settings' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('settings')}
          >
            <Cog6ToothIcon className="h-4 w-4 mr-1" />
            Inställningar
          </Button>
        </div>
        
        <Button variant="ghost" size="sm" onClick={onExitPlayMode}>
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Lobby
        </Button>
      </div>

      {/* Tab content */}
      {activeTab === 'facilitator' && (
        <FacilitatorDashboard
          sessionId={sessionId}
          gameTitle={playData.gameTitle}
          steps={playData.steps}
          phases={playData.phases}
          initialState={playData.runtimeState}
          onStateUpdate={handleStateUpdate}
          onEndSession={handleEndSession}
          participantCount={participantCount}
        />
      )}

      {activeTab === 'artifacts' && (
        <ArtifactsPanel sessionId={sessionId} />
      )}

      {activeTab === 'decisions' && (
        <DecisionsPanel sessionId={sessionId} />
      )}

      {activeTab === 'outcome' && (
        <OutcomePanel sessionId={sessionId} />
      )}

      {activeTab === 'roles' && (
        <RoleAssignerContainer
          sessionId={sessionId}
          sessionRoles={playData.sessionRoles}
          onAssignmentComplete={handleRolesAssigned}
        />
      )}

      {activeTab === 'settings' && (
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
  );
}
