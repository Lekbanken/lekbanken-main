import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type SessionResponse = {
  id: string;
  title: string;
  tenantName: string;
  host: string;
  participants: number;
  startedAt: string;
  status: 'active' | 'completed' | 'flagged';
  notes?: string | null;
};

const mockSessions: SessionResponse[] = [
  {
    id: 'sess-1',
    title: 'Fredagslek',
    tenantName: 'Lekbanken',
    host: 'Anna',
    participants: 12,
    startedAt: '2025-12-12T09:00:00Z',
    status: 'active',
    notes: 'Mockdata',
  },
  {
    id: 'sess-2',
    title: 'Workshop QA',
    tenantName: 'Campus Nord',
    host: 'Oskar',
    participants: 8,
    startedAt: '2025-12-11T15:00:00Z',
    status: 'completed',
    notes: 'Mockdata',
  },
  {
    id: 'sess-3',
    title: 'Trygghetspass',
    tenantName: 'Lekbanken',
    host: 'Mia',
    participants: 15,
    startedAt: '2025-12-12T08:30:00Z',
    status: 'flagged',
    notes: 'Mockdata',
  },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');

  try {
    const supabase = await createServerRlsClient();
    type SessionRow = Database['public']['Tables']['sessions']['Row'] & {
      tenant?: { id: string; name: string | null };
    };
    const query = supabase
      .from('sessions')
      .select(
        `
          id,
          title,
          host,
          status,
          started_at,
          participant_count,
          notes,
          tenant:tenant_id ( id, name )
        `
      )
      .order('started_at', { ascending: false })
      .limit(200);

    const { data, error } = tenantId ? await query.eq('tenant_id', tenantId) : await query;
    if (error) throw error;

    const sessions: SessionResponse[] =
      data?.map((row) => {
        const r = row as SessionRow;
        return {
          id: r.id ?? 'unknown',
          title: r.title ?? 'Session',
          tenantName: r.tenant?.name ?? 'Okänd',
          host: r.host ?? 'Okänd',
          participants: r.participant_count ?? 0,
          startedAt: r.started_at ?? r.created_at ?? new Date().toISOString(),
          status: (r.status as SessionResponse['status']) ?? 'active',
          notes: r.notes ?? null,
        };
      }) || [];

    return NextResponse.json({ sessions });
  } catch (err) {
    console.warn('[api/sessions] fallback to mock', err);
    return NextResponse.json({ sessions: mockSessions });
  }
}
