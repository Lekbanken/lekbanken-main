import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ParticipantSessionService } from '@/lib/services/participants/session-service';
import type { Tables } from '@/types/supabase';

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

type Viewer =
  | { type: 'host'; userId: string }
  | { type: 'participant'; participantId: string; participantName: string };

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; collectionId: string }> }
) {
  const { id: sessionId, collectionId } = await params;

  const session = await ParticipantSessionService.getSessionById(sessionId);
  if (!session) return jsonError('Session not found', 404);

  const viewer = await resolveViewer(sessionId, request);
  if (!viewer) return jsonError('Unauthorized', 401);

  const service = createServiceRoleClient();

  const { data: collection, error: cErr } = await service
    .from('conversation_card_collections')
    .select('id, scope_type, tenant_id, title, description, status')
    .eq('id', collectionId)
    .eq('status', 'published')
    .single();

  if (cErr || !collection) return jsonError('Collection not found', 404);

  // Ensure tenant scoped collections cannot leak across sessions
  const scopeType = collection.scope_type;
  const tenantId = collection.tenant_id;
  if (scopeType === 'tenant' && tenantId && tenantId !== session.tenant_id) {
    return jsonError('Collection not found', 404);
  }

  const { data: cards, error: cardsErr } = await service
    .from('conversation_cards')
    .select('id, collection_id, sort_order, card_title, primary_prompt, followup_1, followup_2, followup_3, leader_tip')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true });

  if (cardsErr) return jsonError('Failed to load cards', 500);

  return NextResponse.json(
    {
      collection: {
        id: collection.id,
        title: collection.title,
        description: collection.description,
      },
      cards: (cards as Tables<'conversation_cards'>[]) ?? [],
      viewer: { type: viewer.type },
    },
    { status: 200 }
  );
}
