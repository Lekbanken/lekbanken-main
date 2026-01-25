/**
 * Host Prop Confirmations API (V2)
 * 
 * GET: List all prop confirmation requests
 * PATCH: Approve or reject a prop request
 * 
 * V2 Architecture:
 * - Config (propDescription, propImageUrl) read from game_artifacts.metadata
 * - Runtime state (puzzleState) stored in session_artifact_state.state
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import type { Json } from '@/types/supabase';

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

  const service = await createServiceRoleClient() as SupabaseAny;

  // V2: Get prop_confirmation artifacts from game_artifacts via session
  const { data: sessionData } = await service
    .from('participant_sessions')
    .select('game_id')
    .eq('id', sessionId)
    .single();

  if (!sessionData?.game_id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Get game artifacts config
  const { data: artifacts, error: artifactsError } = await service
    .from('game_artifacts')
    .select(`
      id,
      title,
      artifact_type,
      metadata
    `)
    .eq('game_id', sessionData.game_id)
    .eq('artifact_type', 'prop_confirmation');

  if (artifactsError) {
    console.error('[Props API V2] Error fetching artifacts:', artifactsError);
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

  // Get participants for name lookup
  const { data: participants } = await service
    .from('session_participants')
    .select(`
      id,
      display_name,
      team:session_teams(id, name)
    `)
    .eq('session_id', sessionId);

  const typedParticipants = (participants || []) as ParticipantRow[];
  const participantMap = new Map(
    typedParticipants.map(p => [p.id, p])
  );

  // Build request list from artifact config + session state
  const typedArtifacts = (artifacts || []) as GameArtifactRow[];
  const requests = typedArtifacts.flatMap(artifact => {
    const meta = artifact.metadata as Record<string, unknown> | null;
    const stateData = stateMap.get(artifact.id) || {};
    const puzzleState = (stateData as Record<string, unknown>)?.puzzleState as Record<string, unknown> | undefined;
    
    if (!puzzleState) return [];
    
    // Check if there's a pending request
    const status = puzzleState.status as string || 
                   (puzzleState.confirmed ? 'confirmed' : 
                    puzzleState.pending ? 'pending' : 'not_requested');
    
    if (status === 'not_requested') return [];

    const participantId = puzzleState.participantId as string | undefined;
    const participant = participantId ? participantMap.get(participantId) : null;

    return [{
      id: `${artifact.id}-${participantId || 'default'}`,
      artifactId: artifact.id,
      artifactTitle: artifact.title || 'Prop-kontroll',
      participantId: participantId || 'unknown',
      participantName: participant?.display_name || 'Okänd deltagare',
      teamId: participant?.team?.id,
      teamName: participant?.team?.name,
      propDescription: (meta?.propDescription as string) || 
                       (meta?.propName as string) || 
                       'Föremål',
      propImageUrl: meta?.propImageUrl as string | undefined,
      status,
      requestedAt: (puzzleState.requestedAt as string) || new Date().toISOString(),
      photoUrl: puzzleState.photoUrl as string | undefined,
      hostNotes: puzzleState.hostNotes as string | undefined,
    }];
  });

  return NextResponse.json({
    requests,
    timestamp: new Date().toISOString(),
  });
}

export async function PATCH(
  req: NextRequest,
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

  // Parse request body
  const body = await req.json();
  const { requestId, action, hostNotes } = body as {
    requestId: string;
    action: 'confirm' | 'reject';
    hostNotes?: string;
  };

  if (!requestId || !action) {
    return NextResponse.json({ error: 'Missing requestId or action' }, { status: 400 });
  }

  // Extract artifact ID from requestId (format: gameArtifactId-participantId)
  const gameArtifactId = requestId.split('-')[0];

  const service = await createServiceRoleClient() as SupabaseAny;

  // V2: Verify artifact exists in game_artifacts
  const { data: artifact, error: fetchError } = await service
    .from('game_artifacts')
    .select('id')
    .eq('id', gameArtifactId)
    .single();

  if (fetchError || !artifact) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
  }

  // V2: Get current state from session_artifact_state
  const { data: stateRow } = await service
    .from('session_artifact_state')
    .select('state')
    .eq('session_id', sessionId)
    .eq('game_artifact_id', gameArtifactId)
    .single();

  const currentState = (stateRow?.state as Record<string, unknown>) || {};
  const currentPuzzleState = (currentState.puzzleState as Record<string, unknown>) || {};

  const newPuzzleState = {
    ...currentPuzzleState,
    status: action === 'confirm' ? 'confirmed' : 'rejected',
    confirmed: action === 'confirm',
    pending: false,
    confirmedAt: action === 'confirm' ? new Date().toISOString() : undefined,
    confirmedBy: action === 'confirm' ? user.id : undefined,
    rejectedAt: action === 'reject' ? new Date().toISOString() : undefined,
    hostNotes,
  };

  // V2: Upsert state in session_artifact_state
  const { error: updateError } = await service
    .from('session_artifact_state')
    .upsert(
      {
        session_id: sessionId,
        game_artifact_id: gameArtifactId,
        state: { puzzleState: newPuzzleState } as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,game_artifact_id' }
    );

  if (updateError) {
    console.error('[Props API V2] Error updating state:', updateError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    requestId,
    action,
    timestamp: new Date().toISOString(),
  });
}
