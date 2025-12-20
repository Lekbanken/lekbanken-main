import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import type { Json } from '@/types/supabase';

type Viewer =
  | { type: 'host'; userId: string }
  | { type: 'participant'; participantId: string; participantName: string; token: string };

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

async function resolveViewer(sessionId: string, request: Request): Promise<Viewer | null> {
  const token = request.headers.get('x-participant-token');
  if (token) {
    const supabase = await createServiceRoleClient();
    const { data: participant } = await supabase
      .from('participants')
      .select('id, display_name, token_expires_at')
      .eq('participant_token', token)
      .eq('session_id', sessionId)
      .single();

    if (!participant) return null;
    if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) return null;

    return {
      type: 'participant',
      participantId: participant.id,
      participantName: participant.display_name,
      token,
    };
  }

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = await createServiceRoleClient();
  const { data: session } = await service
    .from('participant_sessions')
    .select('host_user_id')
    .eq('id', sessionId)
    .single();

  if (!session) return null;
  if (session.host_user_id !== user.id) return null;

  return { type: 'host', userId: user.id };
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);

  const current = getCurrentStepPhase(session);

  const viewer = await resolveViewer(sessionId, request);
  if (!viewer) return jsonError('Unauthorized', 401);

  const service = await createServiceRoleClient();

  if (viewer.type === 'host') {
    const { data: artifacts, error: aErr } = await service
      .from('session_artifacts')
      .select('id, session_id, title, description, artifact_type, artifact_order, tags, metadata, created_at')
      .eq('session_id', sessionId)
      .order('artifact_order', { ascending: true });

    if (aErr) return jsonError('Failed to load artifacts', 500);

    const artifactIds = (artifacts ?? []).map((a) => a.id as string);

    const { data: variants, error: vErr } = artifactIds.length
      ? await service
          .from('session_artifact_variants')
          .select(
            'id, session_artifact_id, title, body, media_ref, variant_order, metadata, visibility, visible_to_session_role_id, revealed_at, highlighted_at'
          )
          .in('session_artifact_id', artifactIds)
          .order('variant_order', { ascending: true })
      : { data: [], error: null };

    if (vErr) return jsonError('Failed to load artifact variants', 500);

    const { data: assignments, error: asErr } = await service
      .from('session_artifact_assignments')
      .select('id, session_id, participant_id, session_artifact_variant_id, assigned_at')
      .eq('session_id', sessionId);

    if (asErr) return jsonError('Failed to load artifact assignments', 500);

    return NextResponse.json(
      {
        artifacts: artifacts ?? [],
        variants: variants ?? [],
        assignments: assignments ?? [],
      },
      { status: 200 }
    );
  }

  // Participant view: only accessible variants
  const { data: myRoles } = await service
    .from('participant_role_assignments')
    .select('session_role_id')
    .eq('session_id', sessionId)
    .eq('participant_id', viewer.participantId);

  const myRoleIds = (myRoles ?? []).map((r) => r.session_role_id as string).filter(Boolean);

  // Assigned variants (explicit)
  const { data: myAssignments } = await service
    .from('session_artifact_assignments')
    .select('session_artifact_variant_id')
    .eq('session_id', sessionId)
    .eq('participant_id', viewer.participantId);

  const assignedVariantIds = (myAssignments ?? [])
    .map((a) => a.session_artifact_variant_id as string)
    .filter(Boolean);

  // Fetch all session artifacts ids (for revealed public variants)
  const { data: artifacts, error: aErr } = await service
    .from('session_artifacts')
    .select('id, title, artifact_order')
    .eq('session_id', sessionId)
    .order('artifact_order', { ascending: true });

  if (aErr) return jsonError('Failed to load artifacts', 500);

  const artifactIds = (artifacts ?? []).map((a) => a.id as string);
  if (artifactIds.length === 0) {
    return NextResponse.json({ artifacts: [], variants: [] }, { status: 200 });
  }

  const { data: allVariants, error: vErr } = await service
    .from('session_artifact_variants')
    .select(
      'id, session_artifact_id, title, body, media_ref, variant_order, metadata, visibility, visible_to_session_role_id, revealed_at, highlighted_at'
    )
    .in('session_artifact_id', artifactIds)
    .order('variant_order', { ascending: true });

  if (vErr) return jsonError('Failed to load artifact variants', 500);

  const accessibleVariantIds = new Set<string>();

  for (const v of allVariants ?? []) {
    const id = v.id as string;
    const visibility = v.visibility as string;
    const revealedAt = v.revealed_at as string | null;
    const visibleToRoleId = v.visible_to_session_role_id as string | null;

    const { stepIndex, phaseIndex } = readStepPhaseFromMetadata((v.metadata as Json | null) ?? null);
    if (!isUnlockedForPosition(stepIndex, phaseIndex, current)) continue;

    if (visibility === 'leader_only') continue;

    if (visibility === 'public' && revealedAt) {
      accessibleVariantIds.add(id);
      continue;
    }

    if (visibility === 'role_private' && visibleToRoleId && myRoleIds.includes(visibleToRoleId)) {
      accessibleVariantIds.add(id);
      continue;
    }

    if (assignedVariantIds.includes(id)) {
      accessibleVariantIds.add(id);
    }
  }

  const variants = (allVariants ?? []).filter((v) => accessibleVariantIds.has(v.id as string));
  return NextResponse.json(
    {
      artifacts: artifacts ?? [],
      variants,
    },
    { status: 200 }
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return jsonError('Unauthorized', 401);

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);
  if (session.host_user_id !== user.id) return jsonError('Only host can snapshot artifacts', 403);
  if (!session.game_id) return jsonError('Session has no associated game', 400);

  const service = await createServiceRoleClient();

  // Prevent double-snapshot
  const { data: existing } = await service
    .from('session_artifacts')
    .select('id')
    .eq('session_id', sessionId)
    .limit(1);

  if ((existing ?? []).length > 0) {
    return jsonError('Artifacts already snapshotted for this session', 409);
  }

  const body = await request.json().catch(() => ({}));
  const locale = typeof body?.locale === 'string' ? (body.locale as string) : null;

  // Prefer locale-specific artifacts; fallback to default locale (NULL)
  let localeQuery = service
    .from('game_artifacts')
    .select('id, title, description, artifact_type, artifact_order, tags, metadata')
    .eq('game_id', session.game_id);

  localeQuery = locale === null ? localeQuery.is('locale', null) : localeQuery.eq('locale', locale);

  const { data: gameArtifactsLocale, error: gaErr } = await localeQuery.order('artifact_order', { ascending: true });

  if (gaErr) return jsonError('Failed to load game artifacts', 500);

  let gameArtifacts = gameArtifactsLocale ?? [];

  if (gameArtifacts.length === 0) {
    const fallback = await service
      .from('game_artifacts')
      .select('id, title, description, artifact_type, artifact_order, tags, metadata')
      .eq('game_id', session.game_id)
      .is('locale', null)
      .order('artifact_order', { ascending: true });

    if (fallback.error) return jsonError('Failed to load game artifacts', 500);
    gameArtifacts = fallback.data ?? [];
  }

  const gameArtifactIds = gameArtifacts.map((a) => a.id as string);

  const { data: gameVariants, error: gvErr } = gameArtifactIds.length
    ? await service
        .from('game_artifact_variants')
        .select('id, artifact_id, title, body, media_ref, variant_order, metadata, visibility, visible_to_role_id')
        .in('artifact_id', gameArtifactIds)
        .order('variant_order', { ascending: true })
    : { data: [], error: null };

  if (gvErr) return jsonError('Failed to load game artifact variants', 500);

  const { data: sessionRoles, error: srErr } = await service
    .from('session_roles')
    .select('id, source_role_id')
    .eq('session_id', sessionId);

  if (srErr) return jsonError('Failed to load session roles', 500);

  const roleMap = new Map<string, string>();
  for (const r of sessionRoles ?? []) {
    if (r.source_role_id) roleMap.set(r.source_role_id as string, r.id as string);
  }

  // Insert session_artifacts
  const artifactInserts = gameArtifacts.map((a) => ({
    session_id: sessionId,
    source_artifact_id: a.id,
    title: a.title,
    description: a.description,
    artifact_type: a.artifact_type,
    artifact_order: a.artifact_order,
    tags: a.tags,
    metadata: a.metadata,
  }));

  const { data: insertedArtifacts, error: iaErr } = await service
    .from('session_artifacts')
    .insert(artifactInserts)
    .select('id, source_artifact_id');

  if (iaErr || !insertedArtifacts) return jsonError('Failed to snapshot session artifacts', 500);

  const artifactIdMap = new Map<string, string>();
  for (const row of insertedArtifacts) {
    if (row.source_artifact_id) artifactIdMap.set(row.source_artifact_id as string, row.id as string);
  }

  // Insert session_artifact_variants
  const variantInserts: Array<{
    session_artifact_id: string
    source_variant_id: string | null
    visibility: string
    visible_to_session_role_id: string | null
    title: string | null
    body: string | null
    media_ref: string | null
    variant_order: number
    metadata: Json
  }> = [];

  for (const v of gameVariants ?? []) {
    const sessionArtifactId = artifactIdMap.get(v.artifact_id as string);
    if (!sessionArtifactId) continue;

    const visibility = (v.visibility as string) ?? 'public';

    let mappedVisibility = visibility;
    let visibleToSessionRoleId: string | null = null;

    if (visibility === 'role_private') {
      const sourceRoleId = v.visible_to_role_id as string | null;
      const mapped = sourceRoleId ? roleMap.get(sourceRoleId) ?? null : null;
      if (mapped) {
        visibleToSessionRoleId = mapped;
      } else {
        // If role can't be mapped, fall back to leader_only to avoid leaking.
        mappedVisibility = 'leader_only';
      }
    }

    variantInserts.push({
      session_artifact_id: sessionArtifactId,
      source_variant_id: (v.id as string) ?? null,
      visibility: mappedVisibility,
      visible_to_session_role_id: visibleToSessionRoleId,
      title: (v.title as string | null) ?? null,
      body: (v.body as string | null) ?? null,
      media_ref: (v.media_ref as string | null) ?? null,
      variant_order: (v.variant_order as number) ?? 0,
      metadata: ((v.metadata ?? null) as Json) ?? null,
    });
  }

  if (variantInserts.length > 0) {
    const { error: ivErr } = await service.from('session_artifact_variants').insert(variantInserts);
    if (ivErr) return jsonError('Failed to snapshot session artifact variants', 500);
  }

  await broadcastPlayEvent(sessionId, {
    type: 'artifact_update',
    payload: { action: 'snapshot' },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      success: true,
      artifacts: insertedArtifacts.length,
      variants: variantInserts.length,
    },
    { status: 201 }
  );
}
