import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { renderSpatialSvg } from '@/features/admin/library/spatial-editor/lib/svg-export';
import type { SpatialDocumentV1 } from '@/features/admin/library/spatial-editor/lib/types';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Typed helper for spatial_artifacts (not yet in generated types)
// ---------------------------------------------------------------------------

type SpatialArtifactsRow = {
  id: string;
  tenant_id: string | null;
  visibility: string;
  document: unknown; // jsonb — SpatialDocumentV1
};

type DatabaseWithSpatialArtifacts = Database & {
  public: {
    Tables: Database['public']['Tables'] & {
      spatial_artifacts: {
        Row: SpatialArtifactsRow;
        Insert: Partial<SpatialArtifactsRow>;
        Update: Partial<SpatialArtifactsRow>;
        Relationships: [];
      };
    };
  };
};

// ---------------------------------------------------------------------------
// GET /api/spatial-artifacts/[artifactId]/svg
// ---------------------------------------------------------------------------
// Auth model (3-tier):
//   1. Authenticated admin/facilitator → always allowed (verified via RLS)
//   2. Participant with x-participant-token → allowed if session's game
//      references this artifact via game_media chain
//   3. Anonymous without token → 401
//
// SVG is rendered on-demand from the stored document (doc-as-SSoT).
// Cache-Control: private, no-store (v1 — correctness first).
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> },
) {
  const { artifactId } = await params;

  // Determine requester identity
  const participantToken = _req.headers.get('x-participant-token');
  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithSpatialArtifacts>;

  // ---- Unauthenticated: validate participant token chain ----
  if (!user) {
    if (!participantToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Validate participant token
    const { data: participant } = await (admin as unknown as SupabaseClient<Database>)
      .from('participants')
      .select('session_id, status, token_expires_at')
      .eq('participant_token', participantToken)
      .maybeSingle();

    if (
      !participant ||
      participant.status === 'blocked' ||
      participant.status === 'kicked'
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      participant.token_expires_at &&
      new Date(participant.token_expires_at) < new Date()
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 2: Get game_id from session
    const { data: session } = await (admin as unknown as SupabaseClient<Database>)
      .from('participant_sessions')
      .select('game_id')
      .eq('id', participant.session_id)
      .maybeSingle();

    if (!session?.game_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 3: Check if artifact is referenced by game steps via game_media chain
    // game_steps.media_ref -> game_media.id -> game_media.media_id == artifactId
    const { data: refs } = await (admin as unknown as SupabaseClient<Database>)
      .from('game_steps')
      .select('media_ref')
      .eq('game_id', session.game_id)
      .not('media_ref', 'is', null);

    const gameMediaIds = Array.from(
      new Set(
        (refs ?? [])
          .map((r) => r.media_ref)
          .filter((v): v is string => typeof v === 'string'),
      ),
    );

    if (gameMediaIds.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: gameMedia } = await (admin as unknown as SupabaseClient<Database>)
      .from('game_media')
      .select('id, media_id')
      .in('id', gameMediaIds);

    const allowed = (gameMedia ?? []).some((gm) => gm.media_id === artifactId);
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ---- Fetch the artifact document ----
  const { data, error } = await admin
    .from('spatial_artifacts')
    .select('id, tenant_id, visibility, document')
    .eq('id', artifactId)
    .single();

  if (error || !data) {
    return new NextResponse('Not found', { status: 404 });
  }

  // ---- Render SVG on-demand from document (SSoT) ----
  const doc = data.document as SpatialDocumentV1 | null;
  if (!doc) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Determine baseUrl for absolute image hrefs
  const proto = _req.headers.get('x-forwarded-proto') ?? 'https';
  const host = _req.headers.get('host') ?? 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  const svg = renderSpatialSvg(doc, { baseUrl, includeGrid: false });

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
  });
}
