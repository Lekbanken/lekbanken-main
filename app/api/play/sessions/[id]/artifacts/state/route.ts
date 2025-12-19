import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';

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

  const rawBody = await request.json().catch(() => null);
  if (!isArtifactStateRequest(rawBody)) {
    return jsonError('Invalid body', 400);
  }

  const body = rawBody;

  const service = await createServiceRoleClient();

  // Resolve the variant -> artifact -> session check
  const { data: variantRow, error: vErr } = await service
    .from('session_artifact_variants')
    .select('id, session_artifact_id, revealed_at, highlighted_at')
    .eq('id', body.variantId)
    .single();

  if (vErr || !variantRow) return jsonError('Variant not found', 404);

  const { data: artifactRow, error: aErr } = await service
    .from('session_artifacts')
    .select('id, session_id')
    .eq('id', variantRow.session_artifact_id as string)
    .single();

  if (aErr || !artifactRow) return jsonError('Artifact not found', 404);
  if ((artifactRow.session_id as string) !== sessionId) return jsonError('Variant not in session', 400);

  switch (body.action) {
    case 'reveal_variant': {
      const next = body.revealed ? new Date().toISOString() : null;
      const { error } = await service
        .from('session_artifact_variants')
        .update({ revealed_at: next })
        .eq('id', body.variantId);

      if (error) return jsonError('Failed to update variant', 500);

      await broadcastPlayEvent(sessionId, {
        type: 'artifact_update',
        payload: { action: body.revealed ? 'variant_revealed' : 'variant_hidden', variant_id: body.variantId },
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    case 'highlight_variant': {
      if (body.highlighted) {
        // Clear existing highlights in this session (best-effort)
        const { data: sessionArtifacts } = await service
          .from('session_artifacts')
          .select('id')
          .eq('session_id', sessionId);

        const ids = (sessionArtifacts ?? []).map((r) => r.id as string).filter(Boolean);
        if (ids.length > 0) {
          await service
            .from('session_artifact_variants')
            .update({ highlighted_at: null })
            .in('session_artifact_id', ids);
        }

        const { error } = await service
          .from('session_artifact_variants')
          .update({ highlighted_at: new Date().toISOString() })
          .eq('id', body.variantId);

        if (error) return jsonError('Failed to highlight variant', 500);
      } else {
        const { error } = await service
          .from('session_artifact_variants')
          .update({ highlighted_at: null })
          .eq('id', body.variantId);

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
      const { error } = await service
        .from('session_artifact_assignments')
        .insert({
          session_id: sessionId,
          participant_id: body.participantId,
          session_artifact_variant_id: body.variantId,
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
      const { error } = await service
        .from('session_artifact_assignments')
        .delete()
        .eq('session_id', sessionId)
        .eq('participant_id', body.participantId)
        .eq('session_artifact_variant_id', body.variantId);

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
