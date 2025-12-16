import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';

type SessionStatus = 'active' | 'paused' | 'locked' | 'ended' | 'archived' | 'cancelled';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session, error } = await supabase
    .from('participant_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.host_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      sessionCode: session.session_code,
      displayName: session.display_name,
      status: session.status,
      participantCount: session.participant_count,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
      gameId: session.game_id,
      planId: session.plan_id,
      settings: session.settings,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = (body?.action || '').toString();

  const { data: session, error } = await supabase
    .from('participant_sessions')
    .select('id, host_user_id, status')
    .eq('id', id)
    .single();

  if (error || !session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.host_user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let nextStatus: SessionStatus | null = null;
  if (action === 'start' || action === 'resume') nextStatus = 'active';
  if (action === 'pause') nextStatus = 'paused';
  if (action === 'end') nextStatus = 'ended';

  if (!nextStatus) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('participant_sessions')
    .update({
      status: nextStatus,
      paused_at: nextStatus === 'paused' ? new Date().toISOString() : null,
      ended_at: nextStatus === 'ended' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: nextStatus });
}
