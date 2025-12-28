/**
 * Host Prop Confirmations API
 * 
 * GET: List all prop confirmation requests
 * PATCH: Approve or reject a prop request
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface ArtifactRow {
  id: string;
  title: string | null;
  artifact_type: string | null;
  metadata: Record<string, unknown> | null;
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

  // Get all prop_confirmation artifacts with pending requests
  const { data: artifacts, error: artifactsError } = await service
    .from('session_artifacts')
    .select(`
      id,
      title,
      artifact_type,
      metadata
    `)
    .eq('session_id', sessionId)
    .eq('artifact_type', 'prop_confirmation');

  if (artifactsError) {
    console.error('[Props API] Error fetching artifacts:', artifactsError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

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

  // Build request list from artifact metadata
  const typedArtifacts = (artifacts || []) as ArtifactRow[];
  const requests = typedArtifacts.flatMap(artifact => {
    const meta = artifact.metadata as Record<string, unknown> | null;
    const puzzleState = meta?.puzzleState as Record<string, unknown> | undefined;
    
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

  // Extract artifact ID from requestId (format: artifactId-participantId)
  const artifactId = requestId.split('-')[0];

  const service = await createServiceRoleClient() as SupabaseAny;

  // Get current artifact
  const { data: artifact, error: fetchError } = await service
    .from('session_artifacts')
    .select('id, metadata')
    .eq('id', artifactId)
    .eq('session_id', sessionId)
    .single();

  if (fetchError || !artifact) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
  }

  // Update puzzle state
  const currentMeta = (artifact.metadata as Record<string, unknown>) || {};
  const currentPuzzleState = (currentMeta.puzzleState as Record<string, unknown>) || {};

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

  const { error: updateError } = await service
    .from('session_artifacts')
    .update({
      metadata: {
        ...currentMeta,
        puzzleState: newPuzzleState,
      },
    })
    .eq('id', artifactId);

  if (updateError) {
    console.error('[Props API] Error updating artifact:', updateError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    requestId,
    action,
    timestamp: new Date().toISOString(),
  });
}
