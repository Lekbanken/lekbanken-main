import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { resolveSessionViewer } from '@/lib/api/play-auth';
import { apiHandler } from '@/lib/api/route-handler';
import { assertSessionStatus } from '@/lib/play/session-guards';

type Visibility = 'public' | 'host';

function safeTrimMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Keep this conservative; adjust if you want longer messages.
  if (trimmed.length > 1000) return null;
  return trimmed;
}

async function getSessionExists(sessionId: string): Promise<boolean> {
  const service = await createServiceRoleClient();
  const { data } = await service.from('participant_sessions').select('id').eq('id', sessionId).single();
  return Boolean(data);
}

async function getSessionStatus(sessionId: string): Promise<string | null> {
  const service = await createServiceRoleClient();
  const { data } = await service.from('participant_sessions').select('id, status').eq('id', sessionId).single();
  return data?.status ?? null;
}

export const GET = apiHandler({
  auth: 'public',
  handler: async ({ req, params }) => {
    const { id: sessionId } = params;

    if (!(await getSessionExists(sessionId))) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const viewer = await resolveSessionViewer(sessionId, req);
    if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const since = url.searchParams.get('since');

    const service = await createServiceRoleClient();

    let query = service
      .from('play_chat_messages')
      .select(
        'id, session_id, visibility, message, anonymous, sender_participant_id, sender_user_id, sender_name, recipient_participant_id, created_at'
      )
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        query = query.gt('created_at', sinceDate.toISOString());
      }
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to load chat messages' }, { status: 500 });
    }

    const visible = (data ?? []).filter((row) => {
      if (viewer.type === 'host') return true;
      if (row.visibility === 'public') return true;
      if (row.visibility === 'host') {
        if (row.sender_participant_id === viewer.participantId) return true;
        if (row.recipient_participant_id === viewer.participantId) return true;
      }
      return false;
    });

    const messages = visible.map((row) => {
      const isMine =
        viewer.type === 'participant'
          ? row.sender_participant_id === viewer.participantId
          : viewer.type === 'host'
            ? row.sender_user_id === viewer.userId
            : false;

      const senderLabel = (() => {
        if (viewer.type === 'host') {
          if (row.sender_user_id) return 'Lekledare';
          if (row.visibility === 'host' && row.anonymous) return 'Anonym';
          return row.sender_name;
        }

        if (isMine) return 'Du';
        if (row.sender_user_id) return 'Lekledare';
        return row.sender_name;
      })();

      const participantId = row.sender_participant_id ?? row.recipient_participant_id ?? undefined;

      return {
        id: row.id as string,
        createdAt: row.created_at as string,
        visibility: row.visibility as Visibility,
        message: row.message as string,
        senderLabel,
        isMine,
        participantId: participantId as string | undefined,
      };
    });

    return NextResponse.json({ messages }, { status: 200 });
  },
});

export const POST = apiHandler({
  auth: 'public',
  rateLimit: 'strict',
  handler: async ({ req, params }) => {
    const { id: sessionId } = params;

    const sessionStatus = await getSessionStatus(sessionId);
    if (!sessionStatus) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const statusError = assertSessionStatus(sessionStatus, 'chat');
    if (statusError) return statusError;

    const viewer = await resolveSessionViewer(sessionId, req);
    if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const bodyObj = body as Record<string, unknown>;

    const message = safeTrimMessage(bodyObj.message);
    if (!message) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const visibilityRaw = bodyObj.visibility;
    const visibility = typeof visibilityRaw === 'string' ? (visibilityRaw as Visibility) : null;
    if (visibility !== 'public' && visibility !== 'host') {
      return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
    }

    const anonymous = Boolean(bodyObj.anonymous);

    const service = await createServiceRoleClient();

    if (visibility === 'public' && anonymous) {
      return NextResponse.json({ error: 'Anonymous is only allowed for private messages to host' }, { status: 400 });
    }

    if (viewer.type === 'host' && visibility === 'host') {
      const recipientParticipantId = bodyObj.recipientParticipantId;
      if (!recipientParticipantId || typeof recipientParticipantId !== 'string') {
        return NextResponse.json({ error: 'Host must specify recipientParticipantId for private messages' }, { status: 400 });
      }
      
      const { data: participant } = await service
        .from('participants')
        .select('id, display_name')
        .eq('id', recipientParticipantId)
        .eq('session_id', sessionId)
        .single();
        
      if (!participant) {
        return NextResponse.json({ error: 'Recipient participant not found' }, { status: 404 });
      }
    }

    const insert = {
      session_id: sessionId,
      visibility,
      message,
      anonymous: visibility === 'host' ? anonymous : false,
      sender_participant_id: viewer.type === 'participant' ? viewer.participantId : null,
      sender_user_id: viewer.type === 'host' ? viewer.userId : null,
      sender_name: viewer.type === 'participant' ? viewer.participantName : 'Lekledare',
      recipient_participant_id: viewer.type === 'host' && visibility === 'host' 
        ? (bodyObj.recipientParticipantId as string) 
        : null,
    };

    const { data, error } = await service
      .from('play_chat_messages')
      .insert(insert)
      .select('id, created_at')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, id: data.id, createdAt: data.created_at },
      { status: 201 }
    );
  },
});
