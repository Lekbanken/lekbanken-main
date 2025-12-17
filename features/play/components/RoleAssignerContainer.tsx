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
      
      // Reload data
      await loadData();
    } catch (err) {
      console.error('[RoleAssignerContainer] Unassign error:', err);
      throw err;
    }
  }, [sessionId, loadData]);

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

  // No roles available
  if (sessionRoles.length === 0) {
    return (
      <Card className="p-6 text-center">
        <h2 className="text-lg font-semibold mb-2">Inga roller tillgängliga</h2>
        <p className="text-muted-foreground">
          Detta spel har inga roller att tilldela.
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
