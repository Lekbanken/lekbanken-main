/**
 * RoleAssignerContainer Component
 * 
 * Container that loads participants and assignments data,
 * then renders RoleAssigner with the correct props.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { RoleAssigner } from './RoleAssigner';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SessionRole, RoleAssignment } from '@/types/play-runtime';
import type { Participant } from '@/lib/utils/role-assignment';

// =============================================================================
// Types
// =============================================================================

export interface RoleAssignerContainerProps {
  /** Session ID */
  sessionId: string;
  /** Available session roles */
  sessionRoles: SessionRole[];
  /** Called when assignment is complete */
  onAssignmentComplete?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function RoleAssignerContainer({
  sessionId,
  sessionRoles,
  onAssignmentComplete,
}: RoleAssignerContainerProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load participants and assignments
  const loadData = useCallback(async () => {
    try {
      // Fetch participants
      const participantsRes = await fetch(`/api/play/sessions/${sessionId}/participants`, {
        cache: 'no-store',
      });
      
      if (participantsRes.ok) {
        const data = await participantsRes.json();
        // Map to Participant format expected by RoleAssigner
        setParticipants((data.participants || []).map((p: { id: string; displayName: string }) => ({
          id: p.id,
          display_name: p.displayName,
        })));
      }
      
      // Fetch assignments
      const assignmentsRes = await fetch(`/api/play/sessions/${sessionId}/assignments`, {
        cache: 'no-store',
      });
      
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data.assignments || []);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ladda data');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handle assignment
  const handleAssign = useCallback(async (
    newAssignments: Array<{ participantId: string; roleId: string }>
  ) => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: newAssignments }),
      });
      
      if (!res.ok) {
        throw new Error('Kunde inte tilldela roller');
      }
      
      // Reload data
      await loadData();
      onAssignmentComplete?.();
    } catch (err) {
      console.error('[RoleAssignerContainer] Assign error:', err);
      throw err;
    }
  }, [sessionId, loadData, onAssignmentComplete]);

  // Handle unassign
  const handleUnassign = useCallback(async (participantId: string, roleId: string) => {
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/assignments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, roleId }),
      });
      
      if (!res.ok) {
        throw new Error('Kunde inte ta bort rolltilldelning');
      }
      
      // Reload data and notify parent
      await loadData();
      onAssignmentComplete?.();
    } catch (err) {
      console.error('[RoleAssignerContainer] Unassign error:', err);
      throw err;
    }
  }, [sessionId, loadData, onAssignmentComplete]);

  // Loading state
  if (loading) {
    return (
      <Card className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-destructive">{error}</p>
      </Card>
    );
  }

  // No roles available in session yet
  if (sessionRoles.length === 0) {
    return (
      <Card className="p-6 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground">Inga roller kopierade ännu</h2>
        <p className="text-sm text-muted-foreground">
          Klicka på <span className="font-medium">&ldquo;Kopiera roller från spel&rdquo;</span> ovan för att hämta rollerna från spelets mall.
        </p>
        <p className="text-xs text-muted-foreground">
          Efter kopiering kan du tilldela roller till deltagare manuellt eller slumpmässigt.
        </p>
      </Card>
    );
  }

  return (
    <RoleAssigner
      sessionId={sessionId}
      roles={sessionRoles}
      participants={participants}
      assignments={assignments}
      onAssign={handleAssign}
      onUnassign={handleUnassign}
    />
  );
}
