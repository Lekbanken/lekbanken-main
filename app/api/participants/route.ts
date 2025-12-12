import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type ParticipantResponse = {
  id: string;
  name: string;
  email?: string;
  tenantName: string;
  lastActive: string;
  risk: 'none' | 'low' | 'high';
};

const mockParticipants: ParticipantResponse[] = [
  {
    id: 'p-1',
    name: 'Nora Nilsson',
    email: 'nora@example.com',
    tenantName: 'Lekbanken',
    lastActive: '2025-12-12T09:05:00Z',
    risk: 'none',
  },
  {
    id: 'p-2',
    name: 'Oskar Öhman',
    email: 'oskar@example.com',
    tenantName: 'Campus Nord',
    lastActive: '2025-12-11T14:00:00Z',
    risk: 'low',
  },
  {
    id: 'p-3',
    name: 'Mia Månsson',
    email: 'mia@example.com',
    tenantName: 'Lekbanken',
    lastActive: '2025-12-12T08:50:00Z',
    risk: 'high',
  },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');

  try {
    const supabase = await createServerRlsClient();
    type ParticipantRow = Database['public']['Tables']['participants']['Row'] & {
      tenant?: { id: string; name: string | null };
    };
    const query = supabase
      .from('participants')
      .select(
        `
          id,
          name,
          email,
          last_active,
          risk_level,
          tenant:tenant_id ( id, name )
        `
      )
      .order('last_active', { ascending: false })
      .limit(200);

    const { data, error } = tenantId ? await query.eq('tenant_id', tenantId) : await query;
    if (error) throw error;

    const participants: ParticipantResponse[] =
      data?.map((row) => {
        const r = row as ParticipantRow;
        return {
          id: r.id ?? 'unknown',
          name: r.name ?? 'Okänd',
          email: r.email ?? undefined,
          tenantName: r.tenant?.name ?? 'Okänd',
          lastActive: r.last_active ?? (r as { updated_at?: string }).updated_at ?? new Date().toISOString(),
          risk: (r.risk_level as ParticipantResponse['risk']) ?? 'none',
        };
      }) || [];

    return NextResponse.json({ participants });
  } catch (err) {
    console.warn('[api/participants] fallback to mock', err);
    return NextResponse.json({ participants: mockParticipants });
  }
}
