import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session } = await supabase
    .from('participant_sessions')
    .select('host_user_id')
    .eq('id', id)
    .single();

  if (!session || session.host_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: participants, error } = await supabase
    .from('participants')
    .select('*')
    .eq('session_id', id)
    .order('joined_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch participants', details: error.message }, { status: 500 });
  }

  // Transform to camelCase for frontend
  const transformed = (participants || []).map((p) => {
    const progress = (p.progress as Record<string, unknown>) || {};
    return {
      id: p.id,
      displayName: p.display_name,
      role: p.role,
      status: p.status,
      joinedAt: p.joined_at,
      lastSeenAt: p.last_seen_at,
      position: typeof progress.position === 'number' ? progress.position : null,
      isNextStarter: progress.isNextStarter === true,
    };
  });

  return NextResponse.json({ participants: transformed });
}
