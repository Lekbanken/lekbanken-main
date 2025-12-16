import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';

export async function GET(request: Request) {
  const token = request.headers.get('x-participant-token');
  const url = new URL(request.url);
  const sessionCode = url.searchParams.get('session_code');

  if (!token || !sessionCode) {
    return NextResponse.json(
      { error: 'Missing participant token or session_code' },
      { status: 400 }
    );
  }

  const normalizedCode = normalizeSessionCode(sessionCode);
  const supabase = await createServiceRoleClient();

  const { data: session, error: sessionError } = await supabase
    .from('participant_sessions')
    .select('*')
    .eq('session_code', normalizedCode)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('*')
    .eq('participant_token', token)
    .eq('session_id', session.id)
    .single();

  if (participantError || !participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 401 });
  }

  return NextResponse.json({
    participant: {
      id: participant.id,
      displayName: participant.display_name,
      role: participant.role,
      status: participant.status,
      joinedAt: participant.joined_at,
      lastSeenAt: participant.last_seen_at,
    },
    session: {
      id: session.id,
      sessionCode: session.session_code,
      displayName: session.display_name,
      description: session.description,
      status: session.status,
      participantCount: session.participant_count,
      settings: session.settings,
      expiresAt: session.expires_at,
    },
  });
}
