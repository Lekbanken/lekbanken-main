import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type SessionDetail = {
  id: string;
  title: string;
  tenantName: string;
  host: string;
  participants: number;
  startedAt: string | null;
  status: 'active' | 'completed' | 'flagged';
  notes?: string | null;
};

const mockSession: SessionDetail = {
  id: 'mock-session',
  title: 'Fredagslek',
  tenantName: 'Lekbanken',
  host: 'Anna',
  participants: 12,
  startedAt: '2025-12-12T09:00:00Z',
  status: 'active',
  notes: 'Mockdata',
};

const mockLog = [
  { id: 'log-1', at: '2025-12-12T09:02:00Z', actor: 'Anna', action: 'Session startad' },
  { id: 'log-2', at: '2025-12-12T09:05:00Z', actor: 'System', action: 'Flaggor registrerades' },
];

export async function GET(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  try {
    const supabase = await createServerRlsClient();
    type SessionRow = Database['public']['Tables']['participant_sessions']['Row'] & {
      tenant?: { id: string; name: string | null } | null;
    };
    const { data, error } = await supabase
      .from('participant_sessions')
      .select(
        `
          id,
          display_name,
          host_user_id,
          status,
          started_at,
          participant_count,
          description,
          tenant:tenant_id ( id, name )
        `
      )
      .eq('id', sessionId)
      .single();
    if (error) throw error;

    const r = data as SessionRow;
    const status = (r.status as Database['public']['Enums']['participant_session_status'] | null) ?? 'active';
    const normalizedStatus: SessionDetail['status'] =
      status === 'ended' || status === 'archived' || status === 'cancelled' ? 'completed' : 'active';

    const session: SessionDetail = {
      id: r.id ?? sessionId,
      title: r.display_name ?? 'Session',
      tenantName: r.tenant?.name ?? 'Okänd',
      host: r.host_user_id ?? 'Okänd',
      participants: r.participant_count ?? 0,
      startedAt: r.started_at ?? null,
      status: normalizedStatus,
      notes: (r as { description?: string | null }).description ?? null,
    };

    return NextResponse.json({ session, log: [] });
  } catch (err) {
    console.warn('[api/sessions/:id] fallback to mock', err);
    return NextResponse.json({ session: mockSession, log: mockLog });
  }
}
