import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { readTenantIdFromCookies } from '@/lib/utils/tenantCookie';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

type ParticipantResponse = {
  id: string;
  name: string;
  email?: string;
  tenantId: string | null;
  tenantName: string;
  lastActive: string;
  risk: 'none' | 'low' | 'high';
};

type ParticipantRow = {
  id: string;
  display_name: string;
  last_seen_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  status?: Database['public']['Enums']['participant_status'] | null;
  session?: { tenant_id?: string | null; display_name?: string | null } | null;
};

export async function GET(request: Request) {
  const supabase = await createServerRlsClient();
  const cookieStore = await cookies();
  const activeTenantId = await readTenantIdFromCookies(cookieStore);
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') || activeTenantId || null;

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
          tenant_id,
          display_name
        )
      `
    );

  if (error) {
    console.error('[api/participants] fetch error', error);
    return NextResponse.json({ error: 'Failed to load participants' }, { status: 500 });
  }

  const rows = (data as ParticipantRow[] | null) ?? [];

  const mapped: ParticipantResponse[] = rows
    .filter((row) => {
      if (tenantId) {
        return row.session?.tenant_id === tenantId;
      }
      return true;
    })
    .map((row) => {
      const status = row.status ?? 'active';
      const risk: ParticipantResponse['risk'] =
        status === 'blocked' || status === 'kicked' ? 'high' : status === 'disconnected' ? 'low' : 'none';

      return {
        id: row.id,
        name: row.display_name,
        email: undefined,
        tenantId: row.session?.tenant_id ?? null,
        tenantName: row.session?.display_name || 'Okänd',
        lastActive: row.last_seen_at || row.updated_at || row.created_at || '',
        risk,
      };
    });

  return NextResponse.json({ participants: mapped });
}
