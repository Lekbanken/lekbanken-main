import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import { resolveSessionViewer } from '@/lib/api/play-auth';
import type { Json } from '@/types/supabase';

// =============================================================================
// Artifacts V2: Read config from game_artifacts, state from session_*_state
// =============================================================================

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getCurrentStepPhase(session: {
  current_step_index?: number | null;
  current_phase_index?: number | null;
}) {
  const currentStep = typeof session.current_step_index === 'number' ? session.current_step_index : 0;
  const currentPhase = typeof session.current_phase_index === 'number' ? session.current_phase_index : 0;
  return { currentStep, currentPhase };
}

function isUnlockedForPosition(
  itemStep: number | null | undefined,
  itemPhase: number | null | undefined,
  current: { currentStep: number; currentPhase: number }
) {
  if (typeof itemStep !== 'number') return true;
  if (current.currentStep > itemStep) return true;
  if (current.currentStep < itemStep) return false;
  if (typeof itemPhase !== 'number') return true;
  return current.currentPhase >= itemPhase;
}

function readStepPhaseFromMetadata(metadata: Json | null | undefined) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { stepIndex: null as number | null, phaseIndex: null as number | null };
  }

  const rec = metadata as Record<string, unknown>;
  const stepIndex = typeof rec.step_index === 'number' ? rec.step_index : null;
  const phaseIndex = typeof rec.phase_index === 'number' ? rec.phase_index : null;
  return { stepIndex, phaseIndex };
}

/**
 * Sanitize artifact metadata for participant view.
 * SECURITY: Removes correctCode and other host-only fields.
 * Merges runtime state from session_artifact_state.
 */
function sanitizeMetadataForParticipant(
  configMetadata: Json | null,
  stateMetadata: Json | null,
  artifactType: string | null
): Json | null {
  const config = (configMetadata && typeof configMetadata === 'object' && !Array.isArray(configMetadata))
    ? configMetadata as Record<string, unknown>
    : {};
  
  const state = (stateMetadata && typeof stateMetadata === 'object' && !Array.isArray(stateMetadata))
    ? stateMetadata as Record<string, unknown>
    : {};

  // For keypads, return sanitized config + state from state table
  if (artifactType === 'keypad') {
    const keypadState = state.keypadState as Record<string, unknown> | undefined;
    const safeKeypadState = {
      isUnlocked: Boolean(keypadState?.isUnlocked),
      isLockedOut: Boolean(keypadState?.isLockedOut),
      attemptCount: typeof keypadState?.attemptCount === 'number' ? keypadState.attemptCount : 0,
      unlockedAt: typeof keypadState?.unlockedAt === 'string' ? keypadState.unlockedAt : null,
    };
    return {
      // Safe config fields from game_artifacts (no correctCode!)
      codeLength: typeof config.codeLength === 'number' ? config.codeLength : 4,
      maxAttempts: typeof config.maxAttempts === 'number' ? config.maxAttempts : null,
      successMessage: typeof config.successMessage === 'string' ? config.successMessage : null,
      failMessage: typeof config.failMessage === 'string' ? config.failMessage : null,
      lockedMessage: typeof config.lockedMessage === 'string' ? config.lockedMessage : null,
      // Keypad state from session_artifact_state
      keypadState: safeKeypadState,
    } as unknown as Json;
  }

  // Conversation cards artifact: safe to expose collection id (no secrets)
  if (artifactType === 'conversation_cards_collection') {
    const collectionId = typeof config.conversation_card_collection_id === 'string' 
      ? config.conversation_card_collection_id 
      : null;
    if (!collectionId) return null;
    return { conversation_card_collection_id: collectionId } as unknown as Json;
  }

  // For other artifact types, return null (or could return safe subset)
  return null;
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
    console.warn('[play/sessions/[id]/artifacts] Failed to broadcast play event:', error);
  }
}

// =============================================================================
// GET: Read artifacts from game_artifacts + state from session_*_state
// =============================================================================

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (!session.game_id) return jsonError('Session has no associated game', 400);

  const current = getCurrentStepPhase(session);

  const viewer = await resolveSessionViewer(sessionId, request);
  if (!viewer) return jsonError('Unauthorized', 401);

  const service = await createServiceRoleClient();

  // Get session roles for role mapping (game_role -> session_role)
  const { data: sessionRoles } = await service
    .from('session_roles')
    .select('id, source_role_id')
    .eq('session_id', sessionId);

  const gameRoleToSessionRole = new Map<string, string>();
  for (const r of sessionRoles ?? []) {
    if (r.source_role_id) {
      gameRoleToSessionRole.set(r.source_role_id as string, r.id as string);
    }
  }

  // Determine locale (prefer session locale, fallback to null)
  const locale = (session as { locale?: string | null }).locale ?? null;

  // Fetch game artifacts (config)
  let artifactsQuery = service
    .from('game_artifacts')
    .select('id, title, description, artifact_type, artifact_order, tags, metadata')
    .eq('game_id', session.game_id);

  artifactsQuery = locale ? artifactsQuery.eq('locale', locale) : artifactsQuery.is('locale', null);

  const artifactsResult = await artifactsQuery.order('artifact_order', { ascending: true });
  let gameArtifacts = artifactsResult.data;
  const aErr = artifactsResult.error;

  if (aErr) return jsonError('Failed to load artifacts', 500);

  // Fallback to default locale if no artifacts found
  if ((gameArtifacts ?? []).length === 0 && locale) {
    const fallback = await service
      .from('game_artifacts')
      .select('id, title, description, artifact_type, artifact_order, tags, metadata')
      .eq('game_id', session.game_id)
      .is('locale', null)
      .order('artifact_order', { ascending: true });

    if (fallback.error) return jsonError('Failed to load artifacts', 500);
    gameArtifacts = fallback.data ?? [];
  }

  const artifactIds = (gameArtifacts ?? []).map((a) => a.id as string);

  if (artifactIds.length === 0) {
    return NextResponse.json({ artifacts: [], variants: [], assignments: [] }, { status: 200 });
  }

  // Fetch game artifact variants (config)
  const { data: gameVariants, error: vErr } = await service
    .from('game_artifact_variants')
    .select('id, artifact_id, title, body, media_ref, variant_order, metadata, visibility, visible_to_role_id')
    .in('artifact_id', artifactIds)
    .order('variant_order', { ascending: true });

  if (vErr) return jsonError('Failed to load artifact variants', 500);

  // Fetch session artifact state (runtime state)
  const { data: artifactStates } = await service
    .from('session_artifact_state')
    .select('game_artifact_id, state')
    .eq('session_id', sessionId)
    .in('game_artifact_id', artifactIds);

  const stateByArtifact = new Map<string, Json>();
  for (const s of artifactStates ?? []) {
    stateByArtifact.set(s.game_artifact_id as string, s.state as Json);
  }

  // Fetch session variant state (reveal/highlight)
  const variantIds = (gameVariants ?? []).map((v) => v.id as string);
  const { data: variantStates } = variantIds.length
    ? await service
        .from('session_artifact_variant_state')
        .select('game_artifact_variant_id, revealed_at, highlighted_at')
        .eq('session_id', sessionId)
        .in('game_artifact_variant_id', variantIds)
    : { data: [] };

  const variantStateMap = new Map<string, { revealed_at: string | null; highlighted_at: string | null }>();
  for (const vs of variantStates ?? []) {
    variantStateMap.set(vs.game_artifact_variant_id as string, {
      revealed_at: vs.revealed_at as string | null,
      highlighted_at: vs.highlighted_at as string | null,
    });
  }

  // Fetch assignments (V2)
  const { data: assignmentsV2 } = await service
    .from('session_artifact_variant_assignments_v2')
    .select('id, session_id, participant_id, game_artifact_variant_id, assigned_at')
    .eq('session_id', sessionId);

  // ==========================================================================
  // HOST VIEW: Return all artifacts/variants with full metadata + state
  // ==========================================================================
  if (viewer.type === 'host') {
    // Transform artifacts: game config + session state
    const artifacts = (gameArtifacts ?? []).map((a) => ({
      id: a.id,
      session_id: sessionId, // For backward compatibility
      title: a.title,
      description: a.description,
      artifact_type: a.artifact_type,
      artifact_order: a.artifact_order,
      tags: a.tags,
      metadata: a.metadata, // Host sees full metadata including correctCode
      // Merge runtime state
      state: stateByArtifact.get(a.id as string) ?? null,
      created_at: null, // Not available from game_artifacts
    }));

    // Transform variants: game config + session state (reveal/highlight)
    const variants = (gameVariants ?? []).map((v) => {
      const gameRoleId = v.visible_to_role_id as string | null;
      const sessionRoleId = gameRoleId ? gameRoleToSessionRole.get(gameRoleId) ?? null : null;
      const variantState = variantStateMap.get(v.id as string);

      return {
        id: v.id,
        session_artifact_id: v.artifact_id, // For backward compatibility (now game_artifact_id)
        title: v.title,
        body: v.body,
        media_ref: v.media_ref,
        variant_order: v.variant_order,
        metadata: v.metadata,
        visibility: v.visibility,
        visible_to_session_role_id: sessionRoleId,
        revealed_at: variantState?.revealed_at ?? null,
        highlighted_at: variantState?.highlighted_at ?? null,
      };
    });

    // Transform assignments
    const assignments = (assignmentsV2 ?? []).map((a) => ({
      id: a.id,
      session_id: a.session_id,
      participant_id: a.participant_id,
      session_artifact_variant_id: a.game_artifact_variant_id, // For backward compat
      assigned_at: a.assigned_at,
    }));

    return NextResponse.json({ artifacts, variants, assignments }, { status: 200 });
  }

  // ==========================================================================
  // PARTICIPANT VIEW: Filter by visibility, reveal state, role, assignments
  // ==========================================================================

  // Get participant's roles
  const { data: myRoles } = await service
    .from('participant_role_assignments')
    .select('session_role_id')
    .eq('session_id', sessionId)
    .eq('participant_id', viewer.participantId);

  const mySessionRoleIds = new Set((myRoles ?? []).map((r) => r.session_role_id as string).filter(Boolean));

  // Get participant's explicit assignments
  const myAssignedVariantIds = new Set(
    (assignmentsV2 ?? [])
      .filter((a) => a.participant_id === viewer.participantId)
      .map((a) => a.game_artifact_variant_id as string)
  );

  // Filter variants by visibility rules
  const accessibleVariantIds = new Set<string>();

  for (const v of gameVariants ?? []) {
    const variantId = v.id as string;
    const visibility = v.visibility as string;
    const gameRoleId = v.visible_to_role_id as string | null;
    const sessionRoleId = gameRoleId ? gameRoleToSessionRole.get(gameRoleId) ?? null : null;
    const variantState = variantStateMap.get(variantId);

    // Check step/phase unlock
    const { stepIndex, phaseIndex } = readStepPhaseFromMetadata((v.metadata as Json | null) ?? null);
    if (!isUnlockedForPosition(stepIndex, phaseIndex, current)) continue;

    // Leader only: not visible to participants
    if (visibility === 'leader_only') continue;

    // Public + revealed
    if (visibility === 'public' && variantState?.revealed_at) {
      accessibleVariantIds.add(variantId);
      continue;
    }

    // Role private + participant has the role
    if (visibility === 'role_private' && sessionRoleId && mySessionRoleIds.has(sessionRoleId)) {
      accessibleVariantIds.add(variantId);
      continue;
    }

    // Explicitly assigned to this participant
    if (myAssignedVariantIds.has(variantId)) {
      accessibleVariantIds.add(variantId);
    }
  }

  // Build filtered response
  const filteredVariants = (gameVariants ?? [])
    .filter((v) => accessibleVariantIds.has(v.id as string))
    .map((v) => {
      const variantState = variantStateMap.get(v.id as string);
      const gameRoleId = v.visible_to_role_id as string | null;
      const sessionRoleId = gameRoleId ? gameRoleToSessionRole.get(gameRoleId) ?? null : null;

      return {
        id: v.id,
        session_artifact_id: v.artifact_id,
        title: v.title,
        body: v.body,
        media_ref: v.media_ref,
        variant_order: v.variant_order,
        metadata: v.metadata,
        visibility: v.visibility,
        visible_to_session_role_id: sessionRoleId,
        revealed_at: variantState?.revealed_at ?? null,
        highlighted_at: variantState?.highlighted_at ?? null,
      };
    });

  // Sanitize artifacts for participant (no correctCode, merge state)
  const sanitizedArtifacts = (gameArtifacts ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    artifact_type: a.artifact_type,
    artifact_order: a.artifact_order,
    metadata: sanitizeMetadataForParticipant(
      a.metadata as Json | null,
      stateByArtifact.get(a.id as string) ?? null,
      a.artifact_type as string | null
    ),
  }));

  return NextResponse.json(
    {
      artifacts: sanitizedArtifacts,
      variants: filteredVariants,
    },
    { status: 200 }
  );
}

// =============================================================================
// POST: Deprecated snapshot endpoint - now returns deprecation notice
// =============================================================================

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError('Unauthorized', 401);

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (session.host_user_id !== user.id) return jsonError('Only host can manage artifacts', 403);

  // V2: Snapshot is no longer needed - artifacts are read directly from game_*
  // Return success with deprecation notice for backward compatibility
  await broadcastPlayEvent(sessionId, {
    type: 'artifact_update',
    payload: { action: 'refresh' },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      success: true,
      deprecated: true,
      message: 'Artifacts V2: Snapshot is no longer required. Artifacts are now read directly from game configuration.',
      artifacts: 0,
      variants: 0,
    },
    { status: 200 }
  );
}
