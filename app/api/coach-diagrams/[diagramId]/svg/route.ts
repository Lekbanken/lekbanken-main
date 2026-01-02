import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type CoachDiagramExportsTable = {
  Row: {
    id: string;
    tenant_id: string | null;
    scope_type: string;
    svg: string;
  };
  Insert: {
    id?: string;
    tenant_id?: string | null;
    scope_type: string;
    svg: string;
  };
  Update: {
    id?: string;
    tenant_id?: string | null;
    scope_type?: string;
    svg?: string;
  };
  Relationships: [];
};

type DatabaseWithCoachDiagramExports = Database & {
  public: {
    Tables: Database['public']['Tables'] & {
      coach_diagram_exports: CoachDiagramExportsTable;
    };
  };
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ diagramId: string }> }) {
  const { diagramId } = await params;

  // Access model:
  // - Facilitators/admins (authenticated) can always fetch if they have access elsewhere.
  // - Participants (no auth session) can fetch only if their x-participant-token belongs
  //   to a session whose game references this diagram.
  const participantToken = _req.headers.get('x-participant-token');

  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithCoachDiagramExports>;

  if (!user) {
    if (!participantToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate participant token -> session -> game
    const { data: participant } = await (admin as unknown as SupabaseClient<Database>)
      .from('participants')
      .select('session_id, status, token_expires_at')
      .eq('participant_token', participantToken)
      .maybeSingle();

    if (!participant || participant.status === 'blocked' || participant.status === 'kicked') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: session } = await (admin as unknown as SupabaseClient<Database>)
      .from('participant_sessions')
      .select('game_id')
      .eq('id', participant.session_id)
      .maybeSingle();

    if (!session?.game_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure this diagram is referenced by the session's game steps.
    // game_steps.media_ref -> game_media.id -> game_media.media_id == diagramId
    const { data: refs } = await (admin as unknown as SupabaseClient<Database>)
      .from('game_steps')
      .select('media_ref')
      .eq('game_id', session.game_id)
      .not('media_ref', 'is', null);

    const gameMediaIds = Array.from(
      new Set((refs ?? []).map((r) => r.media_ref).filter((v): v is string => typeof v === 'string'))
    );

    if (gameMediaIds.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: gameMedia } = await (admin as unknown as SupabaseClient<Database>)
      .from('game_media')
      .select('id, media_id')
      .in('id', gameMediaIds);

    const allowed = (gameMedia ?? []).some((gm) => gm.media_id === diagramId);
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { data, error } = await admin
    .from('coach_diagram_exports')
    .select('id, scope_type, tenant_id, svg')
    .eq('id', diagramId)
    .single();

  if (error || !data) {
    return new NextResponse('Not found', { status: 404 });
  }

  const svg = data.svg;
  if (!svg) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
