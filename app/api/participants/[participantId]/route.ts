import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type ParticipantDetail = {
  id: string;
  name: string;
  email?: string;
  tenantName: string;
  lastActive: string;
  risk: 'none' | 'low' | 'high';
  notes?: string | null;
};

const mockParticipant: ParticipantDetail = {
  id: 'p-1',
  name: 'Nora Nilsson',
  email: 'nora@example.com',
  tenantName: 'Lekbanken',
  lastActive: '2025-12-12T09:05:00Z',
  risk: 'none',
  notes: 'Mockdata',
};

const mockLog = [
  { id: 'p-log-1', at: '2025-12-12T09:02:00Z', actor: 'Anna', action: 'Lades till i session' },
  { id: 'p-log-2', at: '2025-12-12T09:05:00Z', actor: 'System', action: 'Risknivå: låg' },
];

export async function GET(_: Request, { params }: { params: Promise<{ participantId: string }> }) {
  const { participantId } = await params;
  try {
    const supabase = await createServerRlsClient();
    type ParticipantRow = Database['public']['Tables']['participants']['Row'] & {
      session?: { tenant?: { id: string; name: string | null } | null } | null;
      updated_at?: string | null;
      created_at?: string | null;
    };

    const { data, error } = await supabase
      .from('participants')
      .select(
        `
          id,
          display_name,
          last_seen_at,
          updated_at,
          created_at,
          status,
          session:session_id (
            tenant:tenant_id ( id, name )
          )
        `
      )
      .eq('id', participantId)
      .single();

    if (error) throw error;

    const r = data as ParticipantRow;
    const status = (r.status as Database['public']['Enums']['participant_status'] | null) ?? 'active';
    const risk: ParticipantDetail['risk'] =
      status === 'blocked' || status === 'kicked' ? 'high' : status === 'disconnected' ? 'low' : 'none';

    const participant: ParticipantDetail = {
      id: r.id ?? participantId,
      name: r.display_name ?? 'Okänd',
      email: undefined,
      tenantName: r.session?.tenant?.name ?? 'Okänd',
      lastActive: r.last_seen_at ?? r.updated_at ?? r.created_at ?? new Date().toISOString(),
      risk,
      notes: null,
    };

    return NextResponse.json({ participant, log: [] });
  } catch (err) {
    console.warn('[api/participants/:id] fallback to mock', err);
    return NextResponse.json({ participant: mockParticipant, log: mockLog });
  }
}
