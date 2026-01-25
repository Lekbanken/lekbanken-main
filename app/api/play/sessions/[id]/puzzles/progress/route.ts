/**
 * Host Puzzle Progress API (V2)
 * 
 * Returns puzzle progress for all participants/teams in a session.
 * Used by PuzzleProgressPanel component.
 * 
 * V2 Architecture:
 * - Config (hotspots count, etc.) read from game_artifacts.metadata
 * - Runtime state (puzzleState) read from session_artifact_state.state
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface GameArtifactRow {
  id: string;
  title: string | null;
  artifact_type: string | null;
  metadata: Record<string, unknown> | null;
}

interface StateRow {
  game_artifact_id: string;
  state: Record<string, unknown> | null;
}

interface ParticipantRow {
  id: string;
  display_name: string | null;
  team: { id: string; name: string } | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  const supabase = await createServerRlsClient();

  // Verify host access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is host of this session
  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session || session.host_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get all puzzle artifacts with their state
  const puzzleTypes = [
    'riddle', 'counter', 'audio', 'multi_answer', 'qr_gate',
    'hint_container', 'hotspot', 'tile_puzzle', 'cipher',
    'logic_grid', 'prop_confirmation', 'location_check', 'sound_level',
  ];

  const service = await createServiceRoleClient() as SupabaseAny;

  // V2: Get session's game_id
  const { data: sessionData } = await service
    .from('participant_sessions')
    .select('game_id')
    .eq('id', sessionId)
    .single();

  if (!sessionData?.game_id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // V2: Get game artifacts config
  const { data: artifacts, error: artifactsError } = await service
    .from('game_artifacts')
    .select(`
      id,
      title,
      artifact_type,
      metadata
    `)
    .eq('game_id', sessionData.game_id)
    .in('artifact_type', puzzleTypes);

  if (artifactsError) {
    console.error('[Puzzle Progress V2] Error fetching artifacts:', artifactsError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // V2: Get runtime state from session_artifact_state
  const artifactIds = (artifacts || []).map((a: GameArtifactRow) => a.id);
  const { data: stateRows } = artifactIds.length > 0
    ? await service
        .from('session_artifact_state')
        .select('game_artifact_id, state')
        .eq('session_id', sessionId)
        .in('game_artifact_id', artifactIds)
    : { data: [] };

  const stateMap = new Map(
    ((stateRows || []) as StateRow[]).map(s => [s.game_artifact_id, s.state])
  );

  // Get session participants
  const { data: participants } = await service
    .from('session_participants')
    .select(`
      id,
      display_name,
      team:session_teams(id, name)
    `)
    .eq('session_id', sessionId);

  // Build puzzle status list
  const puzzles = ((artifacts || []) as GameArtifactRow[]).map(artifact => {
    const stateData = stateMap.get(artifact.id) || {};
    const puzzleState = (stateData as Record<string, unknown>)?.puzzleState as Record<string, unknown> | undefined;
    
    // Determine status based on puzzleState
    let status: 'not_started' | 'in_progress' | 'solved' | 'locked' | 'pending_approval' = 'not_started';
    let progress = 0;
    let attempts = 0;

    if (puzzleState) {
      if (puzzleState.solved === true || puzzleState.isCorrect === true || puzzleState.verified === true) {
        status = 'solved';
        progress = 100;
      } else if (puzzleState.locked === true) {
        status = 'locked';
      } else if (puzzleState.pending === true) {
        status = 'pending_approval';
      } else if (
        puzzleState.attempts !== undefined ||
        puzzleState.attemptsUsed !== undefined ||
        puzzleState.foundIds !== undefined ||
        puzzleState.revealedCount !== undefined
      ) {
        status = 'in_progress';
        
        // Calculate progress for specific types (config from game_artifacts.metadata)
        if (Array.isArray(puzzleState.foundIds) && artifact.artifact_type === 'hotspot') {
          const meta = artifact.metadata as Record<string, unknown>;
          const totalHotspots = Array.isArray(meta?.hotspots) ? meta.hotspots.length : 0;
          if (totalHotspots > 0) {
            progress = Math.round(((puzzleState.foundIds as unknown[]).length / totalHotspots) * 100);
          }
        }
      }

      // Count attempts
      if (Array.isArray(puzzleState.attempts)) {
        attempts = puzzleState.attempts.length;
      } else if (typeof puzzleState.attemptsUsed === 'number') {
        attempts = puzzleState.attemptsUsed;
      }
    }

    // For now, we return artifact-level status
    // In a full implementation, this would be per-participant/team
    const typedParticipants = (participants || []) as ParticipantRow[];
    return {
      artifactId: artifact.id,
      artifactTitle: artifact.title || 'Namnlös',
      artifactType: artifact.artifact_type || 'unknown',
      status,
      progress,
      attempts,
      solvedAt: puzzleState?.solvedAt as string | undefined,
      // Add first participant info as placeholder
      participantId: typedParticipants[0]?.id,
      participantName: typedParticipants[0]?.display_name || 'Deltagare',
      teamId: typedParticipants[0]?.team?.id,
      teamName: typedParticipants[0]?.team?.name,
    };
  });

  return NextResponse.json({
    puzzles,
    participantCount: participants?.length || 0,
    timestamp: new Date().toISOString(),
  });
}
