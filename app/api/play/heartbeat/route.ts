import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { normalizeSessionCode } from '@/lib/services/participants/session-code-generator';
import { REJECTED_PARTICIPANT_STATUSES } from '@/lib/api/play-auth';

export async function POST(request: Request) {
  const token = request.headers.get('x-participant-token');
  const url = new URL(request.url);
  const sessionCode = url.searchParams.get('session_code');

  if (!token || !sessionCode) {
    return NextResponse.json({ error: 'Missing participant token or session_code' }, { status: 400 });
  }

  const normalizedCode = normalizeSessionCode(sessionCode);
  const supabase = await createServiceRoleClient();

  // Validate session exists
  const { data: session } = await supabase
    .from('participant_sessions')
    .select('id')
    .eq('session_code', normalizedCode)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data: participant, error } = await supabase
    .from('participants')
    .select('id, session_id, status, token_expires_at')
    .eq('participant_token', token)
    .eq('session_id', session.id)
    .single();

  if (error || !participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  // Reject blocked/kicked participants — never re-activate them
  if (REJECTED_PARTICIPANT_STATUSES.has(participant.status ?? '')) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  if (participant.token_expires_at && new Date(participant.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 401 });
  }

  await supabase
    .from('participants')
    .update({
      last_seen_at: new Date().toISOString(),
      status: 'active',
      disconnected_at: null,
    })
    .eq('id', participant.id);

  return NextResponse.json({ success: true });
}
