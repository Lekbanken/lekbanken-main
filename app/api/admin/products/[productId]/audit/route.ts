/**
 * GET /api/admin/products/[productId]/audit
 *
 * Admin-only endpoint to get product audit log.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import type { ProductAuditEvent, ProductAuditEventType } from '@/features/admin/products/v2/types';

type RouteParams = {
  params: Promise<{ productId: string }>;
};

// Type for raw audit log row (since not in generated types yet)
type AuditLogRow = {
  id: string;
  product_id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { productId } = await params;
  const supabase = await createServerRlsClient();

  // Auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const eventType = searchParams.get('event_type');

  // Use service role client to fetch audit log
  // Type cast since product_audit_log is not in generated types yet
  const adminClient = createServiceRoleClient();
  
  let query = adminClient
    .from('product_audit_log' as 'users')
    .select('*', { count: 'exact' })
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (eventType) {
    query = query.eq('event_type', eventType);
  }

  const result = await query as unknown as { 
    data: AuditLogRow[] | null; 
    error: Error | null; 
    count: number | null 
  };

  if (result.error) {
    console.error('[api/admin/products/[productId]/audit] Fetch error:', result.error);
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }

  const events: ProductAuditEvent[] = (result.data ?? []).map(row => ({
    id: row.id,
    product_id: row.product_id,
    tenant_id: '', // Not used - products are global
    event_type: row.event_type as ProductAuditEventType,
    event_data: row.event_data ?? {},
    actor_id: row.actor_id,
    actor_email: row.actor_email,
    created_at: row.created_at,
  }));

  return NextResponse.json({ 
    events,
    total: result.count ?? 0,
    limit,
    offset,
  });
}
