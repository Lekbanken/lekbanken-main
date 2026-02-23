import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { broadcastPlayEvent } from '@/lib/realtime/play-broadcast-server';

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
  | { action: 'unassign_variant'; variantId: string; participantId: string }
  // Artifact-level convenience actions (resolve artifact → all public variants)
  | { action: 'reveal_artifact'; artifactId: string }
  | { action: 'hide_artifact'; artifactId: string }
  | { action: 'reset_artifact'; artifactId: string };

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
  // Artifact-level actions
  if (action === 'reveal_artifact' || action === 'hide_artifact' || action === 'reset_artifact') {
    return typeof rec.artifactId === 'string';
  }
  return false;
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

  // Artifact-level actions skip variant validation
  const isArtifactLevelAction = body.action === 'reveal_artifact' || body.action === 'hide_artifact' || body.action === 'reset_artifact';

  // V2: For variant-level actions, validate that the variant belongs to the session's game
  if (!isArtifactLevelAction) {
    const { data: variantRow, error: vErr } = await service
      .from('game_artifact_variants')
      .select('id, artifact_id')
      .eq('id', (body as { variantId: string }).variantId)
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

    // =========================================================================
    // Artifact-level convenience actions
    // Resolve artifact → all public variants, then reveal/hide/reset them
    // Used by trigger engine (reveal_artifact/hide_artifact) and useSessionState
    // =========================================================================

    case 'reveal_artifact':
    case 'hide_artifact':
    case 'reset_artifact': {
      // Validate that the artifact belongs to this session's game
      const { data: targetArtifact, error: taErr } = await service
        .from('game_artifacts')
        .select('id, game_id')
        .eq('id', body.artifactId)
        .single();

      if (taErr || !targetArtifact) return jsonError('Artifact not found', 404);
      if ((targetArtifact.game_id as string) !== session.game_id) {
        return jsonError('Artifact does not belong to session game', 400);
      }

      // Get all public variants for this artifact
      const { data: publicVariants, error: pvErr } = await service
        .from('game_artifact_variants')
        .select('id, visibility')
        .eq('artifact_id', body.artifactId);

      if (pvErr) return jsonError('Failed to load variants', 500);

      const revealableVariants = (publicVariants ?? [])
        .filter((v) => (v.visibility as string) === 'public')
        .map((v) => v.id as string);

      if (revealableVariants.length === 0) {
        // No public variants to reveal — not an error, just a no-op
        return NextResponse.json({
          success: true,
          variantsAffected: 0,
          message: 'No public variants for this artifact',
        }, { status: 200 });
      }

      const isReveal = body.action === 'reveal_artifact';
      const isReset = body.action === 'reset_artifact';
      const now = new Date().toISOString();

      if (isReveal) {
        // Upsert revealed_at + highlighted_at for all public variants
        // highlighted_at makes the participant UI pulse/spotlight the artifact
        const upserts = revealableVariants.map((variantId) => ({
          session_id: sessionId,
          game_artifact_variant_id: variantId,
          revealed_at: now,
          highlighted_at: now,
        }));
        const { error: uErr } = await service
          .from('session_artifact_variant_state')
          .upsert(upserts, { onConflict: 'session_id,game_artifact_variant_id' });
        if (uErr) return jsonError('Failed to reveal artifact variants', 500);
      } else if (isReset) {
        // Reset: DELETE variant state rows so the artifact reverts to its
        // author-time default (visibleFromStart or hidden). Also reset
        // artifact-level state (puzzles, keypads, etc.).
        const { error: uErr } = await service
          .from('session_artifact_variant_state')
          .delete()
          .eq('session_id', sessionId)
          .in('game_artifact_variant_id', revealableVariants);
        if (uErr) return jsonError('Failed to reset artifact variants', 500);

        // Also reset artifact-level state (puzzles, keypads, etc.)
        await service
          .from('session_artifact_state')
          .delete()
          .eq('session_id', sessionId)
          .eq('game_artifact_id', body.artifactId);
      } else {
        // hide_artifact: upsert revealed_at=null for all public variants.
        // Must use upsert (not update) so visibleFromStart artifacts that have
        // no session_artifact_variant_state row yet get an explicit "hidden" row.
        const hideUpserts = revealableVariants.map((variantId) => ({
          session_id: sessionId,
          game_artifact_variant_id: variantId,
          revealed_at: null,
          highlighted_at: null,
        }));
        const { error: uErr } = await service
          .from('session_artifact_variant_state')
          .upsert(hideUpserts, { onConflict: 'session_id,game_artifact_variant_id' });
        if (uErr) return jsonError('Failed to hide artifact variants', 500);
      }

      await broadcastPlayEvent(sessionId, {
        type: 'artifact_update',
        payload: {
          action: isReveal ? 'variant_revealed' : isReset ? 'variant_hidden' : 'variant_hidden',
          artifact_id: body.artifactId,
          variant_ids: revealableVariants,
        },
        timestamp: now,
      });

      return NextResponse.json({
        success: true,
        variantsAffected: revealableVariants.length,
      }, { status: 200 });
    }

    default:
      return jsonError('Unknown action', 400);
  }
}
