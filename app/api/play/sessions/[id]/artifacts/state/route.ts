import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';

// =============================================================================
// Artifacts V2: State management using session_*_state tables
// variantId now refers to game_artifact_variants.id
// =============================================================================

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type ArtifactStateRequest =
  | { action: 'reveal_variant'; variantId: string; revealed: boolean }
  | { action: 'highlight_variant'; variantId: string; highlighted: boolean }
  | { action: 'assign_variant'; variantId: string; participantId: string }
  | { action: 'unassign_variant'; variantId: string; participantId: string };

function isArtifactStateRequest(value: unknown): value is ArtifactStateRequest {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  const action = rec.action;
  if (action === 'reveal_variant') {
    return typeof rec.variantId === 'string' && typeof rec.revealed === 'boolean';
  }
  if (action === 'highlight_variant') {
    return typeof rec.variantId === 'string' && typeof rec.highlighted === 'boolean';
  }
  if (action === 'assign_variant' || action === 'unassign_variant') {
    return typeof rec.variantId === 'string' && typeof rec.participantId === 'string';
  }
  return false;
}

async function broadcastPlayEvent(sessionId: string, event: unknown) {
  try {
    const supabase = await createServiceRoleClient();
    const channel = supabase.channel(`play:${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'play_event',
      payload: event,
    });
  } catch (error) {
    console.warn('[play/sessions/[id]/artifacts/state] Failed to broadcast play event:', error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError('Unauthorized', 401);

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (session.host_user_id !== user.id) return jsonError('Only host can modify artifacts', 403);
  if (!session.game_id) return jsonError('Session has no associated game', 400);

  const rawBody = await request.json().catch(() => null);
  if (!isArtifactStateRequest(rawBody)) {
    return jsonError('Invalid body', 400);
  }

  const body = rawBody;
  const service = await createServiceRoleClient();

  // V2: Validate that the variant belongs to the session's game
  const { data: variantRow, error: vErr } = await service
    .from('game_artifact_variants')
    .select('id, artifact_id')
    .eq('id', body.variantId)
    .single();

  if (vErr || !variantRow) return jsonError('Variant not found', 404);

  // Verify the variant's artifact belongs to this session's game
  const { data: artifactRow, error: aErr } = await service
    .from('game_artifacts')
    .select('id, game_id')
    .eq('id', variantRow.artifact_id as string)
    .single();

  if (aErr || !artifactRow) return jsonError('Artifact not found', 404);
  if ((artifactRow.game_id as string) !== session.game_id) {
    return jsonError('Variant does not belong to session game', 400);
  }

  switch (body.action) {
    case 'reveal_variant': {
      if (body.revealed) {
        // Upsert variant state with revealed_at
        const { error } = await service
          .from('session_artifact_variant_state')
          .upsert({
            session_id: sessionId,
            game_artifact_variant_id: body.variantId,
            revealed_at: new Date().toISOString(),
          }, {
            onConflict: 'session_id,game_artifact_variant_id',
          });

        if (error) return jsonError('Failed to reveal variant', 500);
      } else {
        // Update to clear revealed_at
        const { error } = await service
          .from('session_artifact_variant_state')
          .update({ revealed_at: null })
          .eq('session_id', sessionId)
          .eq('game_artifact_variant_id', body.variantId);

        if (error) return jsonError('Failed to hide variant', 500);
      }

      await broadcastPlayEvent(sessionId, {
        type: 'artifact_update',
        payload: { action: body.revealed ? 'variant_revealed' : 'variant_hidden', variant_id: body.variantId },
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    case 'highlight_variant': {
      if (body.highlighted) {
        // Clear all existing highlights in this session
        await service
          .from('session_artifact_variant_state')
          .update({ highlighted_at: null })
          .eq('session_id', sessionId)
          .not('highlighted_at', 'is', null);

        // Upsert variant state with highlighted_at
        const { error } = await service
          .from('session_artifact_variant_state')
          .upsert({
            session_id: sessionId,
            game_artifact_variant_id: body.variantId,
            highlighted_at: new Date().toISOString(),
          }, {
            onConflict: 'session_id,game_artifact_variant_id',
          });

        if (error) return jsonError('Failed to highlight variant', 500);
      } else {
        // Clear highlighted_at
        const { error } = await service
          .from('session_artifact_variant_state')
          .update({ highlighted_at: null })
          .eq('session_id', sessionId)
          .eq('game_artifact_variant_id', body.variantId);

        if (error) return jsonError('Failed to unhighlight variant', 500);
      }

      await broadcastPlayEvent(sessionId, {
        type: 'artifact_update',
        payload: { action: body.highlighted ? 'variant_highlighted' : 'variant_unhighlighted', variant_id: body.variantId },
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    case 'assign_variant': {
      // V2: Use session_artifact_variant_assignments_v2
      const { error } = await service
        .from('session_artifact_variant_assignments_v2')
        .insert({
          session_id: sessionId,
          participant_id: body.participantId,
          game_artifact_variant_id: body.variantId,
          assigned_by: user.id,
        });

      if (error) return jsonError('Failed to assign variant', 500);

      await broadcastPlayEvent(sessionId, {
        type: 'artifact_update',
        payload: { action: 'assigned', variant_id: body.variantId },
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    case 'unassign_variant': {
      // V2: Use session_artifact_variant_assignments_v2
      const { error } = await service
        .from('session_artifact_variant_assignments_v2')
        .delete()
        .eq('session_id', sessionId)
        .eq('participant_id', body.participantId)
        .eq('game_artifact_variant_id', body.variantId);

      if (error) return jsonError('Failed to unassign variant', 500);

      await broadcastPlayEvent(sessionId, {
        type: 'artifact_update',
        payload: { action: 'unassigned', variant_id: body.variantId },
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    default:
      return jsonError('Unknown action', 400);
  }
}
