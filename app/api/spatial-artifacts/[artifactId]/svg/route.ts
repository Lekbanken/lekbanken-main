/**
 * GET /api/spatial-artifacts/[artifactId]/svg
 *
 * Serve on-demand rendered SVG for a spatial artifact.
 * Mixed auth (3-tier): authenticated user → allowed, participant → allowed if
 * session's game references artifact via media chain or game_artifacts with
 * variant visibility, anonymous → 401.
 *
 * Batch 6d: Wrapped with apiHandler (auth: 'public'). Inline dual-auth retained.
 */

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { REJECTED_PARTICIPANT_STATUSES } from '@/lib/api/play-auth';
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
// Auth model (3-tier):
//   1. Authenticated admin/facilitator → always allowed (verified via RLS)
//   2. Participant with x-participant-token → allowed if session's game
//      references this artifact via:
//      (A) step media chain (game_steps.media_ref → game_media.media_id), or
//      (B) game_artifacts with artifact_type='spatial_map', matching
//          metadata.spatial_artifact_id, AND at least one variant that is
//          participant-accessible (public, or role_private with matching role).
//          leader_only variants are never accessible to participants.
//   3. Anonymous without token → 401
//
// All auth failures for participants return a uniform 403 to prevent
// artifact-ID enumeration.
//
// SVG is rendered on-demand from the stored document (doc-as-SSoT).
// Cache-Control: private, no-store (v1 — correctness first).
// ---------------------------------------------------------------------------

export const GET = apiHandler({
  auth: 'public',
  handler: async ({ req, params }) => {
    const artifactId = params.artifactId;

    // Determine requester identity
    const participantToken = req.headers.get('x-participant-token');
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
        .select('id, session_id, status, token_expires_at')
        .eq('participant_token', participantToken)
        .maybeSingle();

      if (
        !participant ||
        REJECTED_PARTICIPANT_STATUSES.has(participant.status ?? '')
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (
        participant.token_expires_at &&
        new Date(participant.token_expires_at) < new Date()
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Step 2: Get game_id from session
      const { data: session } = await (admin as unknown as SupabaseClient<Database>)
        .from('participant_sessions')
        .select('game_id')
        .eq('id', participant.session_id)
        .maybeSingle();

      if (!session?.game_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Step 3: Check if artifact is referenced by the game.
      // Path A: game_steps.media_ref -> game_media.media_id == artifactId
      // Path B: game_artifacts.metadata->>'spatial_artifact_id' == artifactId
      let allowed = false;

      // Path A: game_steps media chain
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

      if (gameMediaIds.length > 0) {
        const { data: gameMedia } = await (admin as unknown as SupabaseClient<Database>)
          .from('game_media')
          .select('id, media_id')
          .in('id', gameMediaIds);

        allowed = (gameMedia ?? []).some((gm) => gm.media_id === artifactId);
      }

      // Path B: game_artifacts with spatial_artifact_id in metadata
      // SECURITY: Must check artifact_type AND variant visibility per participant.
      //   - leader_only → never accessible
      //   - public → accessible
      //   - role_private → only if participant holds the matching role
      if (!allowed) {
        const { data: artifacts } = await (admin as unknown as SupabaseClient<Database>)
          .from('game_artifacts')
          .select('id, metadata, artifact_type')
          .eq('game_id', session.game_id)
          .eq('artifact_type', 'spatial_map');

        const matchingArtifact = (artifacts ?? []).find((a) => {
          const meta = a.metadata as Record<string, unknown> | null;
          return meta?.spatial_artifact_id === artifactId;
        });

        if (matchingArtifact) {
          // Fetch variants for this artifact
          const { data: variants } = await (admin as unknown as SupabaseClient<Database>)
            .from('game_artifact_variants')
            .select('id, visibility, visible_to_role_id')
            .eq('artifact_id', matchingArtifact.id as string);

          // Resolve participant's session roles for role_private check
          // game_role → session_role mapping via session_roles table
          let mySessionRoleIds = new Set<string>();

          const hasRolePrivateVariant = (variants ?? []).some(
            (v) => v.visibility === 'role_private',
          );

          if (hasRolePrivateVariant) {
            // Build game_role → session_role mapping
            const { data: sessionRoles } = await (admin as unknown as SupabaseClient<Database>)
              .from('session_roles')
              .select('id, source_role_id')
              .eq('session_id', participant.session_id);

            const gameRoleToSessionRole = new Map<string, string>();
            for (const r of sessionRoles ?? []) {
              if (r.source_role_id) {
                gameRoleToSessionRole.set(r.source_role_id as string, r.id as string);
              }
            }

            // Get participant's assigned session roles
            const { data: myRoles } = await (admin as unknown as SupabaseClient<Database>)
              .from('participant_role_assignments')
              .select('session_role_id')
              .eq('session_id', participant.session_id)
              .eq('participant_id', participant.id);

            mySessionRoleIds = new Set(
              (myRoles ?? []).map((r) => r.session_role_id as string).filter(Boolean),
            );

            // Remap variant game_role_id → session_role_id for comparison
            for (const v of variants ?? []) {
              if (v.visibility === 'role_private' && v.visible_to_role_id) {
                const sessionRoleId = gameRoleToSessionRole.get(v.visible_to_role_id as string);
                if (sessionRoleId) {
                  (v as Record<string, unknown>)._sessionRoleId = sessionRoleId;
                }
              }
            }
          }

          // Check if at least one variant is accessible to this participant
          allowed = (variants ?? []).some((v) => {
            const vis = v.visibility as string;
            if (vis === 'leader_only') return false;
            if (vis === 'public') return true;
            if (vis === 'role_private') {
              const sessionRoleId = (v as Record<string, unknown>)._sessionRoleId as string | undefined;
              return sessionRoleId ? mySessionRoleIds.has(sessionRoleId) : false;
            }
            // Unknown visibility → deny
            return false;
          });
        }
      }

      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // ---- Fetch the artifact document ----
    const { data, error } = await admin
      .from('spatial_artifacts')
      .select('id, tenant_id, visibility, document')
      .eq('id', artifactId)
      .single();

    if (error || !data) {
      // Participants get uniform 403 to prevent ID enumeration;
      // authenticated users get standard 404.
      if (!user) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return new NextResponse('Not found', { status: 404 });
    }

    // ---- Render SVG on-demand from document (SSoT) ----
    const doc = data.document as SpatialDocumentV1 | null;
    if (!doc) {
      if (!user) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return new NextResponse('Not found', { status: 404 });
    }

    // Determine baseUrl for absolute image hrefs
    const proto = req.headers.get('x-forwarded-proto') ?? 'https';
    const host = req.headers.get('host') ?? 'localhost:3000';
    const baseUrl = `${proto}://${host}`;

    const svg = renderSpatialSvg(doc, { baseUrl, includeGrid: false });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    });
  },
});
