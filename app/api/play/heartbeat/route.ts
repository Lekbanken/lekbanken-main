import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const token = request.headers.get('x-participant-token');
  const url = new URL(request.url);
  const sessionCode = url.searchParams.get('session_code');

  if (!token || !sessionCode) {
    return NextResponse.json({ error: 'Missing participant token or session_code' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const { data: participant, error } = await supabase
    .from('participants')
    .select('id, session_id')
    .eq('participant_token', token)
    .single();

  if (error || !participant) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
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
