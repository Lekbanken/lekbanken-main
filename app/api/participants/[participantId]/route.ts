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

export async function GET(_: Request, { params }: { params: { participantId: string } }) {
  const { participantId } = params;
  try {
    const supabase = await createServerRlsClient();
    type ParticipantRow = Database['public']['Tables']['participants']['Row'] & {
      tenant?: { id: string; name: string | null };
    };
    const { data, error } = await supabase
      .from('participants')
      .select(
        `
          id,
          name,
          email,
          last_active,
          risk_level,
          notes,
          tenant:tenant_id ( id, name )
        `
      )
      .eq('id', participantId)
      .single();
    if (error) throw error;

    const r = data as ParticipantRow;
    const participant: ParticipantDetail = {
      id: r.id ?? participantId,
      name: r.name ?? 'Okänd',
      email: r.email ?? undefined,
      tenantName: r.tenant?.name ?? 'Okänd',
      lastActive: r.last_active ?? (r as { updated_at?: string }).updated_at ?? new Date().toISOString(),
      risk: (r.risk_level as ParticipantDetail['risk']) ?? 'none',
      notes: r.notes ?? null,
    };

    return NextResponse.json({ participant, log: [] });
  } catch (err) {
    console.warn('[api/participants/:id] fallback to mock', err);
    return NextResponse.json({ participant: mockParticipant, log: mockLog });
  }
}
