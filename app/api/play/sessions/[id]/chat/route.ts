import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';

type Visibility = 'public' | 'host';

type Viewer =
  | { type: 'host'; userId: string }
  | { type: 'participant'; participantId: string; participantName: string };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function safeTrimMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Keep this conservative; adjust if you want longer messages.
  if (trimmed.length > 1000) return null;
  return trimmed;
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
    if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) {
      return null;
    }

    return {
      type: 'participant',
      participantId: participant.id,
      participantName: participant.display_name,
    };
  }

  // Host path (cookie/session auth)
  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Verify host
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

async function getSessionExists(sessionId: string): Promise<boolean> {
  const service = await createServiceRoleClient();
  const { data } = await service.from('participant_sessions').select('id').eq('id', sessionId).single();
  return Boolean(data);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  if (!(await getSessionExists(sessionId))) {
    return jsonError('Session not found', 404);
  }

  const viewer = await resolveViewer(sessionId, request);
  if (!viewer) return jsonError('Unauthorized', 401);

  const url = new URL(request.url);
  const since = url.searchParams.get('since');

  const service = await createServiceRoleClient();

  let query = service
    .from('play_chat_messages')
    .select(
      'id, session_id, visibility, message, anonymous, sender_participant_id, sender_user_id, sender_name, created_at'
    )
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (since) {
    // Best-effort ISO parse
    const sinceDate = new Date(since);
    if (!Number.isNaN(sinceDate.getTime())) {
      query = query.gt('created_at', sinceDate.toISOString());
    }
  } else {
    // Default to last 50
    query = query.limit(50);
  }

  const { data, error } = await query;
  if (error) {
    return jsonError('Failed to load chat messages', 500);
  }

  const visible = (data ?? []).filter((row) => {
    if (viewer.type === 'host') return true;
    if (row.visibility === 'public') return true;
    // Private-to-host: only sender sees their own
    return row.sender_participant_id === viewer.participantId;
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

      // Participant viewer
      if (isMine) return 'Du';
      if (row.sender_user_id) return 'Lekledare';
      return row.sender_name;
    })();

    return {
      id: row.id as string,
      createdAt: row.created_at as string,
      visibility: row.visibility as Visibility,
      message: row.message as string,
      senderLabel,
      isMine,
    };
  });

  return NextResponse.json({ messages }, { status: 200 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  if (!(await getSessionExists(sessionId))) {
    return jsonError('Session not found', 404);
  }

  const viewer = await resolveViewer(sessionId, request);
  if (!viewer) return jsonError('Unauthorized', 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return jsonError('Invalid body', 400);
  }

  const bodyObj = body as Record<string, unknown>;

  const message = safeTrimMessage(bodyObj.message);
  if (!message) {
    return jsonError('Invalid message', 400);
  }

  const visibilityRaw = bodyObj.visibility;
  const visibility = typeof visibilityRaw === 'string' ? (visibilityRaw as Visibility) : null;
  if (visibility !== 'public' && visibility !== 'host') {
    return jsonError('Invalid visibility', 400);
  }

  const anonymous = Boolean(bodyObj.anonymous);

  // Enforce anonymity rules
  if (visibility === 'public' && anonymous) {
    return jsonError('Anonymous is only allowed for private messages to host', 400);
  }

  // Enforce that host only sends public messages
  if (viewer.type === 'host' && visibility !== 'public') {
    return jsonError('Host can only send public messages', 400);
  }

  const service = await createServiceRoleClient();

  const insert = {
    session_id: sessionId,
    visibility,
    message,
    anonymous: visibility === 'host' ? anonymous : false,
    sender_participant_id: viewer.type === 'participant' ? viewer.participantId : null,
    sender_user_id: viewer.type === 'host' ? viewer.userId : null,
    sender_name: viewer.type === 'participant' ? viewer.participantName : 'Lekledare',
  };

  const { data, error } = await service
    .from('play_chat_messages')
    .insert(insert)
    .select('id, created_at')
    .single();

  if (error || !data) {
    return jsonError('Failed to send message', 500);
  }

  return NextResponse.json(
    { success: true, id: data.id, createdAt: data.created_at },
    { status: 201 }
  );
}
