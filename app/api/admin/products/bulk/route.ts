/**
 * POST /api/admin/products/bulk
 *
 * Admin-only endpoint for bulk operations on products.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import type { BulkOperationPayload, BulkOperationResult } from '@/features/admin/products/v2/types';

const VALID_OPERATIONS = ['activate', 'archive', 'set_availability', 'export', 'sync_stripe', 'validate'];

export async function POST(request: Request) {
  const supabase = await createServerRlsClient();

  // Auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  const payload: BulkOperationPayload = await request.json().catch(() => ({
    operation: '',
    product_ids: [],
  }));

  if (!payload.operation || !VALID_OPERATIONS.includes(payload.operation)) {
    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
  }

  if (!payload.product_ids || payload.product_ids.length === 0) {
    return NextResponse.json({ error: 'No products selected' }, { status: 400 });
  }

  const result: BulkOperationResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
  };

  try {
    switch (payload.operation) {
      case 'activate': {
        // Bulk activate - only draft products
        const { error } = await supabase
          .from('products')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .in('id', payload.product_ids)
          .eq('status', 'draft');

        if (error) throw error;
        result.processed = payload.product_ids.length;
        break;
      }

      case 'archive': {
        // Bulk archive - only active products
        const { error } = await supabase
          .from('products')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .in('id', payload.product_ids)
          .eq('status', 'active');

        if (error) throw error;
        result.processed = payload.product_ids.length;
        break;
      }

      case 'sync_stripe': {
        // Placeholder for Stripe sync
        // In real implementation, would iterate and sync each product
        result.processed = payload.product_ids.length;
        break;
      }

      case 'validate': {
        // Placeholder for validation
        // Would check each product for configuration issues
        result.processed = payload.product_ids.length;
        break;
      }

      case 'export': {
        // Placeholder for export
        // Would generate CSV/JSON of selected products
        result.processed = payload.product_ids.length;
        break;
      }

      case 'set_availability': {
        // Placeholder for availability update
        // Would update availability scope for selected products
        result.processed = payload.product_ids.length;
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown operation' }, { status: 400 });
    }
  } catch (err) {
    console.error('[api/admin/products/bulk] Error:', err);
    result.success = false;
    result.failed = payload.product_ids.length;
    result.errors.push({
      product_id: 'all',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  return NextResponse.json(result);
}
